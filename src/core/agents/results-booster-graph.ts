import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";
import {
  scoreOutput,
  detectHallucinations,
  suggestImprovements,
  type OutputScore,
  type Hallucination,
  type Improvement,
} from "@/lib/output-scorer";

/**
 * Results Booster Agent — Post-generation output optimizer swarm
 *
 * Scores generated code and iteratively improves it via 4 specialist agents.
 *
 * Flow:
 *   quality-scanner → [hallucination-reducer, enhancement-engine] (parallel)
 *       ↓
 *   boost-supervisor merges → final BoostReport
 *
 * Sub-agents:
 * - Quality Scanner: Analyzes output quality, identifies weak spots using local scorer + LLM
 * - Hallucination Reducer: Detects and flags potential hallucinations, suggests corrections
 * - Enhancement Engine: Proposes concrete improvements (error handling, types, tests)
 * - Boost Supervisor: Merges findings, produces final BoostReport with boosted code
 */

// ── Prompts ──

const BOOSTER_PROMPTS = {
  "quality-scanner": `You are a senior code quality analyst. You receive generated code along with an automated quality score breakdown.

Your job:
1. Review the automated scores and validate or refine them
2. Identify the weakest areas that need the most improvement
3. Highlight specific code sections that lower the score
4. Suggest which areas to prioritize for the biggest quality lift

You also receive the original context/prompt that generated this code. Use it to check if the output actually fulfills the requirements.

Return your analysis as JSON:
{
  "agent": "quality-scanner",
  "validatedScores": {
    "completeness": <0-10>,
    "correctness": <0-10>,
    "style": <0-10>,
    "security": <0-10>,
    "performance": <0-10>
  },
  "weakSpots": [
    { "area": "<dimension>", "description": "<what's weak>", "lines": "<line range or 'general'>", "priority": "high|medium|low" }
  ],
  "requirementsMet": <true|false>,
  "requirementGaps": ["<missing requirement>"],
  "summary": "<2-3 sentence quality assessment>"
}
Return ONLY valid JSON, no markdown fences.`,

  "hallucination-reducer": `You are a hallucination detection specialist for AI-generated code. You receive generated code along with automated hallucination detection results.

Your job:
1. Review the automated hallucination flags and confirm or dismiss each one
2. Find additional hallucinations the automated scanner may have missed:
   - Non-existent API methods or properties
   - Fake npm packages or libraries
   - Incorrect function signatures for real libraries
   - Made-up browser APIs or Node.js APIs
   - Incorrect TypeScript types for known libraries
3. For each confirmed hallucination, provide a concrete correction

Return your analysis as JSON:
{
  "agent": "hallucination-reducer",
  "confirmedHallucinations": [
    { "type": "<fake-api|fake-package|impossible-type|fake-browser-api|incorrect-signature>", "match": "<the problematic code>", "line": <number>, "explanation": "<why it's wrong>", "correction": "<what it should be>" }
  ],
  "dismissedFlags": [
    { "match": "<the flagged code>", "reason": "<why it's actually valid>" }
  ],
  "additionalFindings": [
    { "type": "<type>", "match": "<code>", "line": <number>, "explanation": "<why>", "correction": "<fix>" }
  ],
  "confidenceScore": <0-10>,
  "summary": "<1-2 sentence summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "enhancement-engine": `You are a code enhancement specialist. You receive generated code along with quality scores and improvement suggestions.

Your job:
1. Review automated improvement suggestions and prioritize them
2. Generate concrete code patches for the top improvements:
   - Better error handling (try/catch, error boundaries, validation)
   - Stronger TypeScript types (generics, union types, type guards)
   - Missing edge case handling
   - Test suggestions (what to test and example test code)
   - Documentation improvements
3. Produce a "boosted" version of the code incorporating the top improvements

IMPORTANT: The boosted code must be complete and runnable — not a diff or snippet.

Return your analysis as JSON:
{
  "agent": "enhancement-engine",
  "improvements": [
    { "area": "<completeness|correctness|style|security|performance>", "severity": "error|warning|info", "title": "<short title>", "description": "<what was improved>", "linesChanged": "<line range>" }
  ],
  "boostedCode": "<the complete improved code>",
  "testSuggestions": [
    { "name": "<test name>", "description": "<what to test>", "exampleCode": "<test code snippet>" }
  ],
  "estimatedScoreImprovement": {
    "completeness": <delta>,
    "correctness": <delta>,
    "style": <delta>,
    "security": <delta>,
    "performance": <delta>
  },
  "summary": "<1-2 sentence summary of enhancements>"
}
Return ONLY valid JSON, no markdown fences.`,

  "boost-supervisor": `You are the Results Booster supervisor. You receive:
1. Quality scan results with validated scores and weak spots
2. Hallucination detection results with confirmed issues and corrections
3. Enhancement engine results with boosted code and improvements

Your job:
1. Merge all findings into a unified BoostReport
2. Apply hallucination corrections to the boosted code (if the enhancement engine missed any)
3. Compute before/after score comparison
4. Produce the final boosted code that incorporates ALL improvements
5. Generate a clear summary of what changed and why

IMPORTANT: The final boosted code must be complete, runnable, and incorporate all corrections.

Return the final report as JSON:
{
  "agent": "boost-supervisor",
  "boostedCode": "<final complete improved code>",
  "beforeScores": { "completeness": <n>, "correctness": <n>, "style": <n>, "security": <n>, "performance": <n>, "overall": <n> },
  "afterScores": { "completeness": <n>, "correctness": <n>, "style": <n>, "security": <n>, "performance": <n>, "overall": <n> },
  "changesMade": [
    { "category": "<quality|hallucination|enhancement>", "title": "<short title>", "description": "<what changed>", "severity": "error|warning|info" }
  ],
  "hallucinationsFixed": <number>,
  "totalImprovements": <number>,
  "summary": "<executive summary, 2-3 sentences>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

// ── Types ──

export interface BoostChange {
  category: "quality" | "hallucination" | "enhancement";
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
}

export interface BoostReport {
  boostedCode: string;
  beforeScores: OutputScore;
  afterScores: OutputScore;
  changesMade: BoostChange[];
  hallucinations: Hallucination[];
  improvements: Improvement[];
  hallucinationsFixed: number;
  totalImprovements: number;
  summary: string;
}

export interface BoostMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface ResultsBoosterResult {
  report: BoostReport;
  messages: BoostMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const BoosterAnnotation = Annotation.Root({
  /** Original context/prompt that generated the code */
  originalCode: Annotation<string>,

  /** The generated code to boost */
  generatedCode: Annotation<string>,

  /** Automated local scores (from output-scorer.ts) */
  localScores: Annotation<OutputScore | null>({ reducer: (_, v) => v, default: () => null }),

  /** Automated hallucination detections */
  localHallucinations: Annotation<Hallucination[]>({ reducer: (_, v) => v, default: () => [] }),

  /** Automated improvement suggestions */
  localImprovements: Annotation<Improvement[]>({ reducer: (_, v) => v, default: () => [] }),

  /** Individual agent messages (accumulated) */
  agentMessages: Annotation<BoostMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** The final boost report */
  boostReport: Annotation<BoostReport | null>({ reducer: (_, v) => v, default: () => null }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 1 }),
});

type BoosterState = typeof BoosterAnnotation.State;

// ── Retry with backoff ──

async function completeWithRetry(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number },
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await complete(provider, systemPrompt, userMessage, options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError ?? new Error("Max retries exceeded");
}

// ── Resolve provider ──

const PROVIDER_ORDER: LLMProvider[] = ["anthropic", "openrouter", "openai", "groq"];

async function resolveProvider(): Promise<LLMProvider> {
  for (const p of PROVIDER_ORDER) {
    try {
      await complete(p, "Reply with OK", "test", { maxTokens: 5 });
      return p;
    } catch {
      continue;
    }
  }
  throw new Error("No working API key found. Add one in Settings.");
}

// ── Helper: parse JSON from LLM response ──

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json?\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Node: quality-scanner ──

function createQualityScannerNode(provider: LLMProvider) {
  return async (state: BoosterState): Promise<Partial<BoosterState>> => {
    // Run local scoring first
    const localScores = scoreOutput(state.generatedCode);
    const localHallucinations = detectHallucinations(state.generatedCode);
    const localImprovements = suggestImprovements(state.generatedCode, localScores);

    const systemPrompt = await injectMemoryContext(
      BOOSTER_PROMPTS["quality-scanner"],
      state.generatedCode
    );

    const context = `Original Context/Prompt:
${state.originalCode || "(No original context provided)"}

Generated Code:
${state.generatedCode}

Automated Quality Scores:
${JSON.stringify(localScores, null, 2)}

Automated Improvement Suggestions (${localImprovements.length} total):
${localImprovements.map((imp) => `- [${imp.severity}] ${imp.area}: ${imp.title} — ${imp.detail}`).join("\n")}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const message: BoostMessage = {
      agent: "quality-scanner",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      localScores,
      localHallucinations,
      localImprovements,
      agentMessages: [message],
      specialistResults: { "quality-scanner": result },
    };
  };
}

// ── Node: hallucination-reducer ──

function createHallucinationReducerNode(provider: LLMProvider) {
  return async (state: BoosterState): Promise<Partial<BoosterState>> => {
    const systemPrompt = await injectMemoryContext(
      BOOSTER_PROMPTS["hallucination-reducer"],
      state.generatedCode
    );

    const context = `Generated Code:
${state.generatedCode}

Automated Hallucination Flags (${state.localHallucinations.length} found):
${state.localHallucinations.length > 0
  ? state.localHallucinations
      .map((h) => `- [${h.confidence}] Line ${h.line}: ${h.type} — "${h.match}" — ${h.explanation}`)
      .join("\n")
  : "(None detected by automated scanner)"}

Quality Scanner Analysis:
${state.specialistResults["quality-scanner"]?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: BoostMessage = {
      agent: "hallucination-reducer",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "hallucination-reducer": result },
    };
  };
}

// ── Node: enhancement-engine ──

function createEnhancementEngineNode(provider: LLMProvider) {
  return async (state: BoosterState): Promise<Partial<BoosterState>> => {
    const systemPrompt = await injectMemoryContext(
      BOOSTER_PROMPTS["enhancement-engine"],
      state.generatedCode
    );

    const context = `Original Context/Prompt:
${state.originalCode || "(No original context provided)"}

Generated Code:
${state.generatedCode}

Quality Scores:
${JSON.stringify(state.localScores, null, 2)}

Improvement Suggestions (${state.localImprovements.length} total):
${state.localImprovements.map((imp) => `- [${imp.severity}] ${imp.area}: ${imp.title} — ${imp.detail}. Suggestion: ${imp.suggestion}`).join("\n")}

Quality Scanner Analysis:
${state.specialistResults["quality-scanner"]?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: BoostMessage = {
      agent: "enhancement-engine",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "enhancement-engine": result },
    };
  };
}

// ── Node: boost-supervisor ──

function createBoostSupervisorNode(provider: LLMProvider) {
  return async (state: BoosterState): Promise<Partial<BoosterState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const systemPrompt = await injectMemoryContext(
      BOOSTER_PROMPTS["boost-supervisor"],
      state.generatedCode
    );

    const context = `Original Generated Code:
${state.generatedCode.slice(0, 3000)}

Before Scores:
${JSON.stringify(state.localScores, null, 2)}

Specialist Analyses:
${specialistOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 8192 }
    );

    // Parse the supervisor's final report
    let report: BoostReport;
    try {
      const parsed = parseJSON(result);
      report = {
        boostedCode: (parsed.boostedCode as string) ?? state.generatedCode,
        beforeScores: (parsed.beforeScores as OutputScore) ?? state.localScores ?? {
          completeness: 5, correctness: 5, style: 5, security: 5, performance: 5, overall: 5,
        },
        afterScores: (parsed.afterScores as OutputScore) ?? {
          completeness: 7, correctness: 7, style: 7, security: 7, performance: 7, overall: 7,
        },
        changesMade: ((parsed.changesMade as BoostChange[]) ?? []).map((c) => ({
          category: c.category ?? "enhancement",
          title: c.title ?? "",
          description: c.description ?? "",
          severity: c.severity ?? "info",
        })),
        hallucinations: state.localHallucinations,
        improvements: state.localImprovements,
        hallucinationsFixed: (parsed.hallucinationsFixed as number) ?? 0,
        totalImprovements: (parsed.totalImprovements as number) ?? 0,
        summary: (parsed.summary as string) ?? "Boost complete.",
      };
    } catch {
      // Fallback: use local data if supervisor JSON fails
      report = {
        boostedCode: state.generatedCode,
        beforeScores: state.localScores ?? {
          completeness: 5, correctness: 5, style: 5, security: 5, performance: 5, overall: 5,
        },
        afterScores: state.localScores ?? {
          completeness: 5, correctness: 5, style: 5, security: 5, performance: 5, overall: 5,
        },
        changesMade: [],
        hallucinations: state.localHallucinations,
        improvements: state.localImprovements,
        hallucinationsFixed: 0,
        totalImprovements: 0,
        summary: result.slice(0, 500),
      };
    }

    const message: BoostMessage = {
      agent: "boost-supervisor",
      content: "Boost report assembled.",
      timestamp: new Date().toISOString(),
    };

    return {
      boostReport: report,
      iteration: state.iteration + 1,
      agentMessages: [message],
    };
  };
}

// ── Build the graph ──

function buildResultsBoosterGraph(provider: LLMProvider) {
  return new StateGraph(BoosterAnnotation)
    // Nodes
    .addNode("quality-scanner", createQualityScannerNode(provider))
    .addNode("hallucination-reducer", createHallucinationReducerNode(provider))
    .addNode("enhancement-engine", createEnhancementEngineNode(provider))
    .addNode("boost-supervisor", createBoostSupervisorNode(provider))

    // Flow: start → quality-scanner
    .addEdge("__start__", "quality-scanner")

    // quality-scanner → [hallucination-reducer, enhancement-engine] (parallel)
    .addEdge("quality-scanner", "hallucination-reducer")
    .addEdge("quality-scanner", "enhancement-engine")

    // Both → boost-supervisor
    .addEdge("hallucination-reducer", "boost-supervisor")
    .addEdge("enhancement-engine", "boost-supervisor")

    // boost-supervisor → end
    .addEdge("boost-supervisor", "__end__")

    .compile();
}

// ── Public API ──

/**
 * Execute the Results Booster multi-agent swarm on generated code.
 *
 * Flow:
 * 1. Resolves the user's best available provider (Anthropic first)
 * 2. Quality Scanner analyzes code with local scorer + LLM validation
 * 3. Hallucination Reducer and Enhancement Engine run in parallel
 * 4. Boost Supervisor merges everything into a final BoostReport
 * 5. Returns boosted code, score comparison, changes made
 */
export async function runResultsBooster(
  originalCode: string,
  generatedCode: string
): Promise<ResultsBoosterResult> {
  const provider = await resolveProvider();

  const app = buildResultsBoosterGraph(provider);

  const finalState = await app.invoke({
    originalCode,
    generatedCode,
  });

  const state = finalState as BoosterState;

  const fallbackScores: OutputScore = {
    completeness: 0,
    correctness: 0,
    style: 0,
    security: 0,
    performance: 0,
    overall: 0,
  };

  return {
    report: state.boostReport ?? {
      boostedCode: generatedCode,
      beforeScores: fallbackScores,
      afterScores: fallbackScores,
      changesMade: [],
      hallucinations: [],
      improvements: [],
      hallucinationsFixed: 0,
      totalImprovements: 0,
      summary: "Results Booster failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
