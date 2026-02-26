import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Math Guardian Agent — Pre-modification analysis swarm
 *
 * Supervisor agent that deeply understands and respects math/algorithm code
 * before allowing any modifications. Scans all math-related code and produces
 * a comprehensive breakdown report.
 *
 * Flow:
 *   code-parser → [math-verifier, alpha-preserver] (parallel)
 *       ↓
 *   documentation-generator → guardian-supervisor → approval gate
 *
 * Sub-agents:
 * - Code Parser: Extract formulas, variables, dependencies
 * - Math Verifier: Symbolic verification, correctness validation
 * - Alpha Preserver: Simulate impact of changes on EV/Kelly/edges
 * - Documentation Generator: Auto-document the math system
 * - Guardian Supervisor: Produce final "Respect Score" and approval gate
 */

// ── Sub-agent prompts ──

const GUARDIAN_PROMPTS = {
  "code-parser": `You are an expert code analyst specializing in mathematical and algorithmic code.
Parse the provided code and extract ALL mathematical constructs:

1. Formulas & Equations: Every calculation, transformation, and mathematical operation
2. Variables: Parameters, constants, computed values, and their types/ranges
3. Dependencies: Which formulas depend on which variables and other formulas
4. Data Flow: How inputs flow through the math pipeline to outputs
5. Patterns: Identify named algorithms (Kelly criterion, Black-Scholes, Monte Carlo, etc.)

Return your analysis as JSON:
{
  "agent": "code-parser",
  "formulas": [
    { "id": "<unique>", "expression": "<the formula>", "variables": ["<var>"], "category": "<probability|statistics|financial|optimization|general>", "complexity": "simple|moderate|complex", "description": "<what it computes>" }
  ],
  "variables": [
    { "name": "<var>", "type": "parameter|computed|constant|input", "usedIn": ["<formula-id>"], "constraints": "<valid range or type>" }
  ],
  "dependencies": [
    { "from": "<formula-id>", "to": "<formula-id>", "relationship": "computes|depends-on|validates|constrains" }
  ],
  "named_algorithms": ["<algorithm name with brief description>"],
  "entry_points": ["<formula-id that starts the computation>"],
  "critical_paths": [["<formula-id chain that forms critical computation>"]],
  "summary": "<overview of the math system>"
}
Return ONLY valid JSON, no markdown fences.`,

  "math-verifier": `You are a mathematical verification specialist. Given extracted formulas and code,
verify the mathematical correctness of each formula:

1. Symbolic Verification: Check formula derivations and mathematical identities
2. Domain Validation: Ensure inputs stay within valid domains (no division by zero, negative logs, etc.)
3. Numerical Stability: Check for floating-point issues, overflow/underflow risks
4. Correctness: Compare against known reference implementations of named algorithms
5. Edge Cases: Identify boundary conditions that could produce incorrect results

Return your verification as JSON:
{
  "agent": "math-verifier",
  "verifications": [
    {
      "formulaId": "<id>",
      "isCorrect": <boolean>,
      "confidence": <0-1>,
      "issues": ["<issue description>"],
      "suggestions": ["<improvement>"],
      "reference": "<known correct form if applicable>"
    }
  ],
  "overall_integrity": <0-100>,
  "critical_issues": ["<any formula that is mathematically incorrect>"],
  "numerical_risks": ["<floating point or stability concerns>"],
  "summary": "<2-3 sentence assessment>"
}
Return ONLY valid JSON, no markdown fences.`,

  "alpha-preserver": `You are a quantitative analyst specializing in alpha preservation and edge protection.
Given the math system, analyze the impact sensitivity of each formula:

1. Alpha Mapping: Identify which formulas directly contribute to "edge" or "alpha"
2. Sensitivity Analysis: Which parameters, if changed, would degrade performance most?
3. Kelly/EV Impact: How do changes propagate through betting/trading calculations?
4. Variance Impact: How do changes affect variance, drawdown, and risk metrics?
5. Safe Zones: Which parts can be modified without degrading alpha?

Return your analysis as JSON:
{
  "agent": "alpha-preserver",
  "alpha_components": [
    { "formulaId": "<id>", "alpha_contribution": "critical|high|medium|low|none", "sensitivity": <0-1>, "safe_to_modify": <boolean>, "modification_guidance": "<what changes are safe>" }
  ],
  "sensitivity_ranking": [
    { "parameter": "<name>", "impact_if_changed": "<description>", "impact_magnitude": "catastrophic|major|moderate|minor" }
  ],
  "safe_modification_zones": ["<area of code that can be safely changed>"],
  "danger_zones": ["<area of code that MUST NOT be changed without full understanding>"],
  "ev_dependencies": ["<formula chain that feeds into expected value calculations>"],
  "summary": "<2-3 sentence alpha preservation assessment>"
}
Return ONLY valid JSON, no markdown fences.`,

  "doc-generator": `You are a technical documentation specialist for mathematical systems.
Given the parsed math system and verification results, generate comprehensive documentation:

1. System Overview: High-level description of what the math system does
2. Formula Explanations: Natural language description of each formula with its purpose
3. Variable Dictionary: Complete glossary of all variables with meanings and ranges
4. Dependency Diagrams: Text-based dependency flow descriptions
5. Algorithm References: Links to academic/reference material for named algorithms
6. Modification Guide: Safe editing guidelines that preserve mathematical integrity

Write clear, thorough documentation that a developer unfamiliar with the math
could read to fully understand the system before making changes.

Return as JSON:
{
  "agent": "doc-generator",
  "system_overview": "<comprehensive overview>",
  "formula_docs": [
    { "formulaId": "<id>", "name": "<human name>", "explanation": "<natural language>", "purpose": "<why it exists>", "latex": "<LaTeX representation>" }
  ],
  "variable_glossary": [
    { "name": "<var>", "meaning": "<description>", "valid_range": "<range>", "unit": "<unit if applicable>" }
  ],
  "dependency_flow": "<text description of how data flows through the system>",
  "algorithm_references": [
    { "algorithm": "<name>", "description": "<what it does>", "reference": "<academic reference>" }
  ],
  "modification_guide": "<safe editing guidelines>",
  "summary": "<1-2 sentence doc summary>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const GUARDIAN_SUPERVISOR_PROMPT = `You are the Math Guardian — a supervisor agent responsible for ensuring
mathematical systems are fully understood before any modifications are allowed.

You have received analyses from 4 specialist agents:
1. Code Parser: Extracted formulas, variables, dependencies
2. Math Verifier: Checked correctness, stability, edge cases
3. Alpha Preserver: Mapped alpha contributions and modification sensitivity
4. Documentation Generator: Produced comprehensive documentation

Your job:
1. Synthesize all findings into a unified "Math Comprehension Report"
2. Compute a "Respect Score" (1-10) measuring understanding depth
3. Identify any critical gaps in understanding that must be resolved
4. Make a CLEAR recommendation: APPROVE (safe to edit) or BLOCK (need more analysis)
5. List specific conditions for safe editing

Respect Score Guidelines:
- 1-3: Critical gaps — DO NOT proceed with edits
- 4-6: Partial understanding — proceed with extreme caution, limited scope
- 7-8: Good understanding — safe for targeted edits
- 9-10: Deep mastery — safe for refactoring and enhancement

Return your assessment as JSON:
{
  "respect_score": <1-10>,
  "recommendation": "approve|block|caution",
  "understanding_gaps": ["<what we don't fully understand>"],
  "conditions_for_editing": ["<specific condition that must be met>"],
  "safe_edit_scope": ["<what can safely be modified>"],
  "protected_components": ["<what must NOT be changed>"],
  "risk_assessment": "<overall risk summary>",
  "summary": "<3-4 sentence comprehensive assessment>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface GuardianReport {
  respectScore: number;
  recommendation: "approve" | "block" | "caution";
  understandingGaps: string[];
  conditionsForEditing: string[];
  safeEditScope: string[];
  protectedComponents: string[];
  riskAssessment: string;
  summary: string;
  formulaDocs: Array<{
    formulaId: string;
    name: string;
    explanation: string;
    purpose: string;
    latex: string;
  }>;
  variableGlossary: Array<{
    name: string;
    meaning: string;
    validRange: string;
    unit: string;
  }>;
  verificationResults: Array<{
    formulaId: string;
    isCorrect: boolean;
    confidence: number;
    issues: string[];
  }>;
  alphaComponents: Array<{
    formulaId: string;
    alphaContribution: string;
    sensitivity: number;
    safeToModify: boolean;
  }>;
  dependencyFlow: string;
  modificationGuide: string;
}

export interface GuardianMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── LangGraph State ──

const GuardianAnnotation = Annotation.Root({
  /** The code to analyze */
  code: Annotation<string>,

  /** Optional file paths for context */
  filePaths: Annotation<string[]>({
    reducer: (_, v) => v,
    default: () => [],
  }),

  /** Agent messages (accumulated) */
  agentMessages: Annotation<GuardianMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw specialist results */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Final guardian report */
  guardianReport: Annotation<GuardianReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),

  /** Current phase */
  status: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "parsing" as const,
  }),
});

type GuardianState = typeof GuardianAnnotation.State;

// ── Retry helper ──

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

// ── Provider resolution ──

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

// ── Node factories ──

function createGuardianSpecialistNode(
  agentName: keyof typeof GUARDIAN_PROMPTS,
  provider: LLMProvider
) {
  return async (state: GuardianState): Promise<Partial<GuardianState>> => {
    const systemPrompt = await injectMemoryContext(
      GUARDIAN_PROMPTS[agentName],
      state.code
    );

    let userMessage: string;
    if (agentName === "code-parser") {
      userMessage = `Analyze this code for mathematical constructs:\n\nFiles: ${state.filePaths.join(", ") || "unknown"}\n\n${state.code}`;
    } else {
      const parserResults = state.specialistResults["code-parser"] ?? "No parser results available.";
      userMessage = agentName === "doc-generator"
        ? `Code:\n${state.code.slice(0, 3000)}\n\nParser Analysis:\n${parserResults}\n\nVerification:\n${state.specialistResults["math-verifier"] ?? "N/A"}\n\nAlpha Analysis:\n${state.specialistResults["alpha-preserver"] ?? "N/A"}`
        : `Code:\n${state.code.slice(0, 3000)}\n\nParser Analysis:\n${parserResults}`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userMessage,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: GuardianMessage = {
      agent: agentName,
      content: result,
      timestamp: new Date().toISOString(),
    };

    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      message.parsedData = JSON.parse(cleaned);
    } catch {
      message.parsedData = { raw: result.slice(0, 500) };
    }

    return {
      agentMessages: [message],
      specialistResults: { [agentName]: result },
    };
  };
}

function createGuardianSupervisorNode(provider: LLMProvider) {
  return async (state: GuardianState): Promise<Partial<GuardianState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      GUARDIAN_SUPERVISOR_PROMPT,
      `Code being analyzed:\n${state.code.slice(0, 2000)}\n\nSpecialist Analyses:\n${specialistOutputs}`,
      { temperature: 0.1, maxTokens: 4096 }
    );

    // Parse the supervisor result into a GuardianReport
    let report: GuardianReport;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Also parse sub-agent results for the full report
      let formulaDocs: GuardianReport["formulaDocs"] = [];
      let variableGlossary: GuardianReport["variableGlossary"] = [];
      let verificationResults: GuardianReport["verificationResults"] = [];
      let alphaComponents: GuardianReport["alphaComponents"] = [];
      let dependencyFlow = "";
      let modificationGuide = "";

      try {
        const docData = JSON.parse(
          (state.specialistResults["doc-generator"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        formulaDocs = (docData.formula_docs ?? []).map((f: Record<string, string>) => ({
          formulaId: f.formulaId ?? f.id ?? "",
          name: f.name ?? "",
          explanation: f.explanation ?? "",
          purpose: f.purpose ?? "",
          latex: f.latex ?? "",
        }));
        variableGlossary = (docData.variable_glossary ?? []).map((v: Record<string, string>) => ({
          name: v.name ?? "",
          meaning: v.meaning ?? "",
          validRange: v.valid_range ?? "",
          unit: v.unit ?? "",
        }));
        dependencyFlow = docData.dependency_flow ?? "";
        modificationGuide = docData.modification_guide ?? "";
      } catch { /* use defaults */ }

      try {
        const verData = JSON.parse(
          (state.specialistResults["math-verifier"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        verificationResults = (verData.verifications ?? []).map((v: Record<string, unknown>) => ({
          formulaId: (v.formulaId ?? "") as string,
          isCorrect: (v.isCorrect ?? false) as boolean,
          confidence: (v.confidence ?? 0) as number,
          issues: (v.issues ?? []) as string[],
        }));
      } catch { /* use defaults */ }

      try {
        const alphaData = JSON.parse(
          (state.specialistResults["alpha-preserver"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        alphaComponents = (alphaData.alpha_components ?? []).map((a: Record<string, unknown>) => ({
          formulaId: (a.formulaId ?? "") as string,
          alphaContribution: (a.alpha_contribution ?? "none") as string,
          sensitivity: (a.sensitivity ?? 0) as number,
          safeToModify: (a.safe_to_modify ?? false) as boolean,
        }));
      } catch { /* use defaults */ }

      report = {
        respectScore: parsed.respect_score ?? 5,
        recommendation: parsed.recommendation ?? "caution",
        understandingGaps: parsed.understanding_gaps ?? [],
        conditionsForEditing: parsed.conditions_for_editing ?? [],
        safeEditScope: parsed.safe_edit_scope ?? [],
        protectedComponents: parsed.protected_components ?? [],
        riskAssessment: parsed.risk_assessment ?? "",
        summary: parsed.summary ?? "",
        formulaDocs,
        variableGlossary,
        verificationResults,
        alphaComponents,
        dependencyFlow,
        modificationGuide,
      };
    } catch {
      report = {
        respectScore: 3,
        recommendation: "block",
        understandingGaps: ["Failed to fully parse math system"],
        conditionsForEditing: ["Re-run analysis with cleaner code input"],
        safeEditScope: [],
        protectedComponents: ["All mathematical code"],
        riskAssessment: "Analysis incomplete — blocking edits as a precaution.",
        summary: result.slice(0, 500),
        formulaDocs: [],
        variableGlossary: [],
        verificationResults: [],
        alphaComponents: [],
        dependencyFlow: "",
        modificationGuide: "",
      };
    }

    return {
      guardianReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "guardian-supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldDeepen(state: GuardianState): "deepen" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  if (state.guardianReport && state.guardianReport.respectScore < 4) return "deepen";
  return "finalize";
}

// ── Build the graph ──

function buildGuardianGraph(provider: LLMProvider) {
  const graph = new StateGraph(GuardianAnnotation)
    // Phase 1: Parse code
    .addNode("code-parser", createGuardianSpecialistNode("code-parser", provider))
    // Phase 2: Parallel verification and alpha analysis
    .addNode("math-verifier", createGuardianSpecialistNode("math-verifier", provider))
    .addNode("alpha-preserver", createGuardianSpecialistNode("alpha-preserver", provider))
    // Phase 3: Documentation
    .addNode("doc-generator", createGuardianSpecialistNode("doc-generator", provider))
    // Phase 4: Supervisor assessment
    .addNode("guardian-supervisor", createGuardianSupervisorNode(provider))

    // Flow
    .addEdge("__start__", "code-parser")
    // Parser → parallel verification + alpha analysis
    .addEdge("code-parser", "math-verifier")
    .addEdge("code-parser", "alpha-preserver")
    // Both → doc generator
    .addEdge("math-verifier", "doc-generator")
    .addEdge("alpha-preserver", "doc-generator")
    // Doc → supervisor
    .addEdge("doc-generator", "guardian-supervisor")
    // Supervisor → conditional
    .addConditionalEdges("guardian-supervisor", shouldDeepen, {
      deepen: "code-parser",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

export interface GuardianSwarmResult {
  report: GuardianReport;
  messages: GuardianMessage[];
  iterations: number;
  provider: string;
}

/**
 * Execute the Math Guardian swarm on code to analyze before editing.
 *
 * Flow:
 * 1. Code Parser extracts all mathematical constructs
 * 2. Math Verifier validates correctness in parallel with Alpha Preserver
 * 3. Documentation Generator produces comprehensive docs
 * 4. Guardian Supervisor produces Respect Score and edit recommendation
 */
export async function runMathGuardianSwarm(
  code: string,
  options?: { filePaths?: string[]; maxIterations?: number }
): Promise<GuardianSwarmResult> {
  const provider = await resolveProvider();

  const app = buildGuardianGraph(provider);

  const finalState = await app.invoke({
    code,
    filePaths: options?.filePaths ?? [],
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as GuardianState;

  return {
    report: state.guardianReport ?? {
      respectScore: 0,
      recommendation: "block",
      understandingGaps: ["Analysis failed"],
      conditionsForEditing: [],
      safeEditScope: [],
      protectedComponents: [],
      riskAssessment: "Guardian swarm failed to produce a report.",
      summary: "Analysis failed.",
      formulaDocs: [],
      variableGlossary: [],
      verificationResults: [],
      alphaComponents: [],
      dependencyFlow: "",
      modificationGuide: "",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
