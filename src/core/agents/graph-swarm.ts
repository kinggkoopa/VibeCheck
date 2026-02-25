import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Multi-Agent Critique Swarm — LangGraph
 *
 * 4 specialist agents + 1 supervisor + reflection loop:
 *
 *   supervisor → [architect, security, ux, perf] (parallel fan-out)
 *       ↓
 *   supervisor merges → reflection check → (iterate or finalize)
 *
 * Each specialist produces a focused critique. The supervisor delegates,
 * merges findings, and decides if another pass is needed.
 *
 * All LLM calls use the owner's BYOK key with retry/backoff.
 */

// ── Specialist system prompts ──

const SPECIALIST_PROMPTS = {
  architect: `You are a senior software architect specializing in scalability and system design.
Analyze the provided code and critique ONLY architecture and scalability concerns:
- Design patterns (appropriate? misused?)
- Coupling and cohesion
- Scalability bottlenecks (N+1 queries, unbounded lists, missing pagination)
- Separation of concerns
- API contract design
- State management patterns

Return your critique as JSON:
{
  "agent": "architect",
  "score": <0-100>,
  "findings": [
    { "severity": "error|warning|info", "title": "<short title>", "detail": "<explanation>", "suggestion": "<fix>" }
  ],
  "summary": "<1-2 sentence summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  security: `You are a security engineer specializing in application security (OWASP Top 10).
Analyze the provided code and critique ONLY security vulnerabilities:
- Injection (SQL, NoSQL, command, XSS)
- Authentication / authorization flaws
- Sensitive data exposure (keys, tokens, PII in logs)
- CSRF, SSRF, open redirects
- Insecure deserialization
- Missing input validation / sanitization
- Dependency vulnerabilities

Return your critique as JSON:
{
  "agent": "security",
  "score": <0-100>,
  "findings": [
    { "severity": "error|warning|info", "title": "<short title>", "detail": "<explanation>", "suggestion": "<fix>" }
  ],
  "summary": "<1-2 sentence summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  ux: `You are a UX engineer and frontend specialist.
Analyze the provided code and critique ONLY user experience and frontend concerns:
- Accessibility (a11y): ARIA, keyboard nav, contrast, focus management
- Responsive design and mobile handling
- Loading states, error states, empty states
- Form validation and user feedback
- Component composition and reusability
- Interaction patterns and affordances

If the code is backend-only with no UI, note that and give a neutral score.

Return your critique as JSON:
{
  "agent": "ux",
  "score": <0-100>,
  "findings": [
    { "severity": "error|warning|info", "title": "<short title>", "detail": "<explanation>", "suggestion": "<fix>" }
  ],
  "summary": "<1-2 sentence summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  perf: `You are a performance engineer specializing in runtime optimization.
Analyze the provided code and critique ONLY performance concerns:
- Time complexity of algorithms and loops
- Memory leaks and excessive allocations
- Unnecessary re-renders (React) or recomputations
- Missing memoization, caching, or debouncing
- Bundle size impact (large imports, unused deps)
- Database query efficiency (N+1, missing indexes, large payloads)
- Async patterns (waterfall vs parallel, missing AbortController)

Return your critique as JSON:
{
  "agent": "perf",
  "score": <0-100>,
  "findings": [
    { "severity": "error|warning|info", "title": "<short title>", "detail": "<explanation>", "suggestion": "<fix>" }
  ],
  "summary": "<1-2 sentence summary>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const SUPERVISOR_MERGE_PROMPT = `You are the critique swarm supervisor. You have received specialist critiques from 4 agents (Architect, Security, UX, Performance).

Your job:
1. Merge all findings into a unified Critique Report
2. Deduplicate overlapping findings
3. Rank by severity (errors first, then warnings, then info)
4. Compute an overall weighted score:
   - Security: 30% weight
   - Architecture: 25% weight
   - Performance: 25% weight
   - UX: 20% weight
5. Write a concise executive summary

Return the merged report as JSON:
{
  "overall_score": <0-100 weighted>,
  "summary": "<executive summary, 2-3 sentences>",
  "agent_scores": { "architect": <n>, "security": <n>, "ux": <n>, "perf": <n> },
  "findings": [
    { "severity": "error|warning|info", "agent": "<source agent>", "title": "<title>", "detail": "<detail>", "suggestion": "<fix>" }
  ],
  "needs_reflection": <true if any agent scored below 50 or any critical security error>
}
Return ONLY valid JSON, no markdown fences.`;

const REFLECTION_PROMPT = `You are the critique swarm supervisor performing a reflection pass.

The previous critique round had critical issues (needs_reflection=true). Review the specialist findings again with fresh eyes:
- Were any findings false positives?
- Did specialists miss anything obvious given the other agents' findings?
- Are the severity levels accurate?
- Are suggestions actionable?

Produce a FINAL merged report (same JSON format), correcting any issues.

Return the final report as JSON:
{
  "overall_score": <0-100 weighted>,
  "summary": "<executive summary, 2-3 sentences>",
  "agent_scores": { "architect": <n>, "security": <n>, "ux": <n>, "perf": <n> },
  "findings": [
    { "severity": "error|warning|info", "agent": "<source agent>", "title": "<title>", "detail": "<detail>", "suggestion": "<fix>" }
  ],
  "needs_reflection": false
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface CritiqueFinding {
  severity: "error" | "warning" | "info";
  agent: string;
  title: string;
  detail: string;
  suggestion: string;
}

export interface CritiqueReport {
  overall_score: number;
  summary: string;
  agent_scores: Record<string, number>;
  findings: CritiqueFinding[];
  needs_reflection: boolean;
}

export interface AgentMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedReport?: {
    score: number;
    findings: CritiqueFinding[];
    summary: string;
  };
}

// ── LangGraph State ──

const CritiqueSwarmAnnotation = Annotation.Root({
  /** The code being critiqued */
  code: Annotation<string>,

  /** Individual agent critiques (accumulated) */
  agentMessages: Annotation<AgentMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** The merged critique report */
  mergedReport: Annotation<CritiqueReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration for reflection loop */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max reflection iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),
});

type CritiqueSwarmState = typeof CritiqueSwarmAnnotation.State;

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
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, backoff));
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
      // Attempt a minimal call to verify the key works
      await complete(p, "Reply with OK", "test", { maxTokens: 5 });
      return p;
    } catch {
      continue;
    }
  }
  throw new Error("No working API key found. Add one in Settings.");
}

// ── Specialist node factory ──

function createSpecialistNode(
  agentName: keyof typeof SPECIALIST_PROMPTS,
  provider: LLMProvider
) {
  return async (state: CritiqueSwarmState): Promise<Partial<CritiqueSwarmState>> => {
    const systemPrompt = await injectMemoryContext(
      SPECIALIST_PROMPTS[agentName],
      state.code
    );

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      state.code,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const message: AgentMessage = {
      agent: agentName,
      content: result,
      timestamp: new Date().toISOString(),
    };

    // Try to parse the JSON result
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      message.parsedReport = {
        score: parsed.score ?? 50,
        findings: (parsed.findings ?? []).map((f: Record<string, string>) => ({
          ...f,
          agent: agentName,
        })),
        summary: parsed.summary ?? "",
      };
    } catch {
      // If parsing fails, wrap raw text as a single finding
      message.parsedReport = {
        score: 50,
        findings: [{
          severity: "info" as const,
          agent: agentName,
          title: `${agentName} analysis`,
          detail: result.slice(0, 500),
          suggestion: "",
        }],
        summary: result.slice(0, 200),
      };
    }

    return {
      agentMessages: [message],
      specialistResults: { [agentName]: result },
    };
  };
}

// ── Supervisor merge node ──

function createSupervisorNode(provider: LLMProvider) {
  return async (state: CritiqueSwarmState): Promise<Partial<CritiqueSwarmState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const isReflection = state.iteration > 0;
    const prompt = isReflection ? REFLECTION_PROMPT : SUPERVISOR_MERGE_PROMPT;

    const result = await completeWithRetry(
      provider,
      prompt,
      `Code being critiqued:\n${state.code.slice(0, 2000)}\n\nSpecialist critiques:\n${specialistOutputs}`,
      { temperature: 0.2, maxTokens: 4096 }
    );

    let report: CritiqueReport;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      report = JSON.parse(cleaned);
    } catch {
      report = {
        overall_score: 50,
        summary: result.slice(0, 300),
        agent_scores: { architect: 50, security: 50, ux: 50, perf: 50 },
        findings: [],
        needs_reflection: false,
      };
    }

    const message: AgentMessage = {
      agent: "supervisor",
      content: isReflection ? "Reflection pass complete." : "Merged specialist critiques.",
      timestamp: new Date().toISOString(),
    };

    return {
      mergedReport: report,
      iteration: state.iteration + 1,
      agentMessages: [message],
    };
  };
}

// ── Routing: reflection or finalize ──

function shouldReflect(state: CritiqueSwarmState): "reflect" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  if (state.mergedReport?.needs_reflection) return "reflect";
  return "finalize";
}

// ── Build the graph ──

function buildCritiqueSwarmGraph(provider: LLMProvider) {
  const graph = new StateGraph(CritiqueSwarmAnnotation)
    // Specialist nodes
    .addNode("architect", createSpecialistNode("architect", provider))
    .addNode("security", createSpecialistNode("security", provider))
    .addNode("ux", createSpecialistNode("ux", provider))
    .addNode("perf", createSpecialistNode("perf", provider))
    // Supervisor
    .addNode("supervisor", createSupervisorNode(provider))

    // Fan-out: start → all specialists in parallel
    .addEdge("__start__", "architect")
    .addEdge("__start__", "security")
    .addEdge("__start__", "ux")
    .addEdge("__start__", "perf")

    // All specialists → supervisor
    .addEdge("architect", "supervisor")
    .addEdge("security", "supervisor")
    .addEdge("ux", "supervisor")
    .addEdge("perf", "supervisor")

    // Supervisor → conditional: reflect or end
    .addConditionalEdges("supervisor", shouldReflect, {
      reflect: "architect",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

export interface CritiqueSwarmResult {
  report: CritiqueReport;
  messages: AgentMessage[];
  iterations: number;
  provider: string;
}

/**
 * Execute the multi-agent critique swarm on a code snippet.
 *
 * Flow:
 * 1. Resolves the user's best available provider (Anthropic first)
 * 2. Fans out to 4 specialists in parallel (architect, security, ux, perf)
 * 3. Supervisor merges findings into a weighted report
 * 4. If needs_reflection is true, loops back for another specialist pass
 * 5. Returns the final merged CritiqueReport
 */
export async function runCritiqueSwarm(
  code: string,
  maxIterations: number = 2
): Promise<CritiqueSwarmResult> {
  const provider = await resolveProvider();

  const app = buildCritiqueSwarmGraph(provider);

  const finalState = await app.invoke({
    code,
    maxIterations,
  });

  const state = finalState as CritiqueSwarmState;

  return {
    report: state.mergedReport ?? {
      overall_score: 0,
      summary: "Critique swarm failed to produce a report.",
      agent_scores: {},
      findings: [],
      needs_reflection: false,
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
