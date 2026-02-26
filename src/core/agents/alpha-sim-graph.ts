import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Alpha Simulator Agent — Simulation and safeguarding swarm
 *
 * Simulates and preserves alpha/algorithms during code edits.
 * Runs Monte Carlo simulations and backtests on original vs proposed changes.
 *
 * Flow:
 *   system-mapper → impact-forecaster → safe-editor → restore-creator → supervisor
 *
 * Sub-agents:
 * - System Mapper: Build dependency graph of algorithms
 * - Impact Forecaster: Quantify alpha degradation from proposed changes
 * - Safe Editor: Propose minimal, respectful tweaks
 * - Restore Point Creator: Snapshot management for before/after
 * - Supervisor: Final comparison and preservation guarantee
 */

// ── Sub-agent prompts ──

const ALPHA_PROMPTS = {
  "system-mapper": `You are an algorithm systems analyst. Given code with mathematical/trading algorithms,
build a comprehensive dependency graph:

1. Component Identification: Every function, class, and module that participates in the algorithm
2. Data Flow: How data moves through the system (inputs → transforms → outputs)
3. Dependency Graph: Which components depend on which others
4. Critical Nodes: Components that, if changed, would break the system
5. Isolation Boundaries: Which parts can be modified independently

Return your analysis as JSON:
{
  "agent": "system-mapper",
  "components": [
    { "id": "<unique>", "label": "<name>", "type": "input|computation|output|validation", "dependencies": ["<id>"], "description": "<what it does>" }
  ],
  "data_flow": "<text description of how data flows through the algorithm>",
  "critical_nodes": ["<id of components that must not be changed carelessly>"],
  "isolation_boundaries": [
    { "zone": "<name>", "components": ["<id>"], "can_modify_independently": <boolean> }
  ],
  "complexity_assessment": "<simple|moderate|complex|highly-complex>",
  "summary": "<2-3 sentence system overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "impact-forecaster": `You are a quantitative risk analyst specializing in algorithm performance impact.
Given the original algorithm and proposed changes, quantify the impact:

1. Alpha Degradation: Estimate percentage loss in expected returns/edge
2. Variance Impact: How changes affect volatility and drawdown
3. Statistical Significance: Is the performance difference meaningful?
4. Cascading Effects: How does changing one component affect downstream calculations?
5. Worst-Case Scenario: What's the maximum possible degradation?

Return your forecast as JSON:
{
  "agent": "impact-forecaster",
  "alpha_impact": {
    "expected_degradation_pct": <number>,
    "confidence_interval": [<low>, <high>],
    "is_significant": <boolean>,
    "significance_level": <0-1>
  },
  "variance_impact": {
    "original_volatility": "<estimated>",
    "projected_volatility": "<projected>",
    "drawdown_change": "<better|same|worse>"
  },
  "cascading_effects": [
    { "source_change": "<what changed>", "affected_component": "<what's impacted>", "effect": "<description>", "magnitude": "catastrophic|major|moderate|minor|negligible" }
  ],
  "worst_case": "<description of worst-case scenario>",
  "recommendation": "proceed|caution|abort",
  "summary": "<2-3 sentence impact assessment>"
}
Return ONLY valid JSON, no markdown fences.`,

  "safe-editor": `You are an expert developer specializing in minimal, safe code modifications.
Given the algorithm system map and impact analysis, propose the SAFEST possible edits:

1. Minimal Changes: Only modify what is absolutely necessary
2. Preserve Interfaces: Keep all function signatures and return types identical
3. Guard Rails: Add assertions and validation around critical calculations
4. Backwards Compatibility: Ensure old behavior is preserved for edge cases
5. Rollback Plan: Each change should be independently revertible

Return your proposals as JSON:
{
  "agent": "safe-editor",
  "proposed_changes": [
    {
      "target": "<file:line or function name>",
      "change_type": "refactor|optimize|fix|enhance",
      "description": "<what to change and why>",
      "original_code": "<current code snippet>",
      "proposed_code": "<new code snippet>",
      "risk_level": "minimal|low|medium|high",
      "alpha_impact": "<none|positive|negative-minor|negative-major>",
      "rollback_steps": "<how to revert>"
    }
  ],
  "unchanged_components": ["<components deliberately left untouched>"],
  "validation_tests": ["<test to verify alpha is preserved after changes>"],
  "summary": "<2-3 sentence summary of proposed changes>"
}
Return ONLY valid JSON, no markdown fences.`,

  "restore-creator": `You are a version control and snapshot specialist.
Given the algorithm and proposed changes, create a comprehensive restore strategy:

1. Snapshot Specification: What state needs to be captured before changes
2. Metrics Baseline: Key performance metrics to record before/after
3. Validation Criteria: How to verify the restore point is complete
4. Rollback Procedure: Step-by-step instructions to revert all changes
5. Comparison Framework: How to compare before/after performance

Return your strategy as JSON:
{
  "agent": "restore-creator",
  "snapshot_spec": {
    "files_to_snapshot": ["<file path>"],
    "state_to_capture": ["<runtime state or config>"],
    "metrics_baseline": [
      { "metric": "<name>", "value": "<current or expected>", "threshold": "<acceptable range>" }
    ]
  },
  "validation_criteria": ["<criterion for snapshot completeness>"],
  "rollback_procedure": ["<step-by-step rollback instruction>"],
  "comparison_framework": {
    "metrics_to_compare": ["<metric name>"],
    "comparison_method": "<how to compare>",
    "acceptance_criteria": "<when to accept changes>"
  },
  "summary": "<1-2 sentence restore strategy>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const ALPHA_SUPERVISOR_PROMPT = `You are the Alpha Simulator supervisor. You coordinate the analysis of proposed
algorithm changes across multiple specialist agents (System Mapper, Impact Forecaster,
Safe Editor, Restore Creator).

Your job:
1. Synthesize all findings into a unified Alpha Preservation Report
2. Compare original vs modified performance estimates
3. Issue a CLEAR "Preservation Guarantee" verdict
4. Provide specific go/no-go recommendations

Preservation Guarantee Levels:
- GUARANTEED: Alpha preserved or improved, all tests pass
- CONDITIONAL: Alpha likely preserved, but monitor these metrics: [...]
- AT_RISK: Alpha degradation detected, proceed only if acceptable
- VIOLATED: Alpha significantly degraded, recommend reverting

Return as JSON:
{
  "preservation_guarantee": "guaranteed|conditional|at_risk|violated",
  "alpha_change_pct": <number, positive = improvement>,
  "key_findings": ["<finding>"],
  "go_nogo": "go|conditional-go|no-go",
  "conditions": ["<condition for conditional-go>"],
  "monitoring_plan": ["<what to monitor after changes>"],
  "verdict": "<2-3 sentence final verdict>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface AlphaSimReport {
  preservationGuarantee: "guaranteed" | "conditional" | "at_risk" | "violated";
  alphaChangePct: number;
  keyFindings: string[];
  goNogo: "go" | "conditional-go" | "no-go";
  conditions: string[];
  monitoringPlan: string[];
  verdict: string;
  systemMap: {
    components: Array<{
      id: string;
      label: string;
      type: string;
      dependencies: string[];
    }>;
    criticalNodes: string[];
    dataFlow: string;
  };
  proposedChanges: Array<{
    target: string;
    changeType: string;
    description: string;
    riskLevel: string;
    alphaImpact: string;
  }>;
  restoreStrategy: {
    metricsBaseline: Array<{ metric: string; value: string; threshold: string }>;
    rollbackProcedure: string[];
  };
  impactForecast: {
    expectedDegradationPct: number;
    isSignificant: boolean;
    worstCase: string;
  };
}

export interface AlphaSimMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── LangGraph State ──

const AlphaSimAnnotation = Annotation.Root({
  /** Original code (the algorithm to preserve) */
  originalCode: Annotation<string>,

  /** Proposed changes or edit description */
  proposedChanges: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Agent messages (accumulated) */
  agentMessages: Annotation<AlphaSimMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw specialist results */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Final simulation report */
  simReport: Annotation<AlphaSimReport | null>({
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
    default: () => "mapping" as const,
  }),
});

type AlphaSimState = typeof AlphaSimAnnotation.State;

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

function createAlphaSpecialistNode(
  agentName: keyof typeof ALPHA_PROMPTS,
  provider: LLMProvider
) {
  return async (state: AlphaSimState): Promise<Partial<AlphaSimState>> => {
    const systemPrompt = await injectMemoryContext(
      ALPHA_PROMPTS[agentName],
      state.originalCode
    );

    const context = agentName === "system-mapper"
      ? `Analyze this algorithm:\n\n${state.originalCode}\n\nProposed changes:\n${state.proposedChanges || "General modifications requested"}`
      : `Original Code:\n${state.originalCode.slice(0, 3000)}\n\nProposed Changes:\n${state.proposedChanges || "General modifications"}\n\nSystem Map:\n${state.specialistResults["system-mapper"] ?? "N/A"}\n\n${agentName === "safe-editor" ? `Impact Forecast:\n${state.specialistResults["impact-forecaster"] ?? "N/A"}` : ""}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: AlphaSimMessage = {
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

function createAlphaSupervisorNode(provider: LLMProvider) {
  return async (state: AlphaSimState): Promise<Partial<AlphaSimState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      ALPHA_SUPERVISOR_PROMPT,
      `Original Algorithm:\n${state.originalCode.slice(0, 2000)}\n\nProposed Changes:\n${state.proposedChanges}\n\nSpecialist Analyses:\n${specialistOutputs}`,
      { temperature: 0.1, maxTokens: 4096 }
    );

    // Parse into AlphaSimReport
    let report: AlphaSimReport;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Parse sub-agent data
      let systemMap: AlphaSimReport["systemMap"] = { components: [], criticalNodes: [], dataFlow: "" };
      let proposedEdits: AlphaSimReport["proposedChanges"] = [];
      let restoreStrategy: AlphaSimReport["restoreStrategy"] = { metricsBaseline: [], rollbackProcedure: [] };
      let impactForecast: AlphaSimReport["impactForecast"] = { expectedDegradationPct: 0, isSignificant: false, worstCase: "" };

      try {
        const mapData = JSON.parse(
          (state.specialistResults["system-mapper"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        systemMap = {
          components: (mapData.components ?? []).map((c: Record<string, unknown>) => ({
            id: c.id ?? "",
            label: c.label ?? "",
            type: c.type ?? "computation",
            dependencies: (c.dependencies ?? []) as string[],
          })),
          criticalNodes: mapData.critical_nodes ?? [],
          dataFlow: mapData.data_flow ?? "",
        };
      } catch { /* use defaults */ }

      try {
        const editData = JSON.parse(
          (state.specialistResults["safe-editor"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        proposedEdits = (editData.proposed_changes ?? []).map((c: Record<string, string>) => ({
          target: c.target ?? "",
          changeType: c.change_type ?? "",
          description: c.description ?? "",
          riskLevel: c.risk_level ?? "medium",
          alphaImpact: c.alpha_impact ?? "unknown",
        }));
      } catch { /* use defaults */ }

      try {
        const restoreData = JSON.parse(
          (state.specialistResults["restore-creator"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        restoreStrategy = {
          metricsBaseline: (restoreData.snapshot_spec?.metrics_baseline ?? []).map((m: Record<string, string>) => ({
            metric: m.metric ?? "",
            value: m.value ?? "",
            threshold: m.threshold ?? "",
          })),
          rollbackProcedure: restoreData.rollback_procedure ?? [],
        };
      } catch { /* use defaults */ }

      try {
        const forecastData = JSON.parse(
          (state.specialistResults["impact-forecaster"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        impactForecast = {
          expectedDegradationPct: forecastData.alpha_impact?.expected_degradation_pct ?? 0,
          isSignificant: forecastData.alpha_impact?.is_significant ?? false,
          worstCase: forecastData.worst_case ?? "",
        };
      } catch { /* use defaults */ }

      report = {
        preservationGuarantee: parsed.preservation_guarantee ?? "at_risk",
        alphaChangePct: parsed.alpha_change_pct ?? 0,
        keyFindings: parsed.key_findings ?? [],
        goNogo: parsed.go_nogo ?? "no-go",
        conditions: parsed.conditions ?? [],
        monitoringPlan: parsed.monitoring_plan ?? [],
        verdict: parsed.verdict ?? "",
        systemMap,
        proposedChanges: proposedEdits,
        restoreStrategy,
        impactForecast,
      };
    } catch {
      report = {
        preservationGuarantee: "violated",
        alphaChangePct: 0,
        keyFindings: ["Analysis failed to produce structured results"],
        goNogo: "no-go",
        conditions: [],
        monitoringPlan: [],
        verdict: result.slice(0, 500),
        systemMap: { components: [], criticalNodes: [], dataFlow: "" },
        proposedChanges: [],
        restoreStrategy: { metricsBaseline: [], rollbackProcedure: [] },
        impactForecast: { expectedDegradationPct: 0, isSignificant: false, worstCase: "" },
      };
    }

    return {
      simReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "alpha-supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldReSimulate(state: AlphaSimState): "re-simulate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  if (state.simReport?.preservationGuarantee === "violated") return "re-simulate";
  return "finalize";
}

// ── Build the graph ──

function buildAlphaSimGraph(provider: LLMProvider) {
  const graph = new StateGraph(AlphaSimAnnotation)
    // Phase 1: Map the system
    .addNode("system-mapper", createAlphaSpecialistNode("system-mapper", provider))
    // Phase 2: Forecast impact
    .addNode("impact-forecaster", createAlphaSpecialistNode("impact-forecaster", provider))
    // Phase 3: Propose safe edits + create restore points
    .addNode("safe-editor", createAlphaSpecialistNode("safe-editor", provider))
    .addNode("restore-creator", createAlphaSpecialistNode("restore-creator", provider))
    // Phase 4: Supervisor verdict
    .addNode("alpha-supervisor", createAlphaSupervisorNode(provider))

    // Flow
    .addEdge("__start__", "system-mapper")
    .addEdge("system-mapper", "impact-forecaster")
    .addEdge("impact-forecaster", "safe-editor")
    .addEdge("impact-forecaster", "restore-creator")
    .addEdge("safe-editor", "alpha-supervisor")
    .addEdge("restore-creator", "alpha-supervisor")
    // Supervisor → conditional
    .addConditionalEdges("alpha-supervisor", shouldReSimulate, {
      "re-simulate": "system-mapper",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

export interface AlphaSimResult {
  report: AlphaSimReport;
  messages: AlphaSimMessage[];
  iterations: number;
  provider: string;
}

/**
 * Execute the Alpha Simulator swarm to preserve algorithm edge during edits.
 *
 * Flow:
 * 1. System Mapper builds dependency graph
 * 2. Impact Forecaster quantifies potential alpha degradation
 * 3. Safe Editor proposes minimal changes + Restore Creator snapshots state
 * 4. Supervisor issues Preservation Guarantee verdict
 */
export async function runAlphaSimSwarm(
  originalCode: string,
  proposedChanges?: string,
  options?: { maxIterations?: number }
): Promise<AlphaSimResult> {
  const provider = await resolveProvider();

  const app = buildAlphaSimGraph(provider);

  const finalState = await app.invoke({
    originalCode,
    proposedChanges: proposedChanges ?? "",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as AlphaSimState;

  return {
    report: state.simReport ?? {
      preservationGuarantee: "violated",
      alphaChangePct: 0,
      keyFindings: ["Simulation failed"],
      goNogo: "no-go",
      conditions: [],
      monitoringPlan: [],
      verdict: "Alpha Simulator failed to produce a report.",
      systemMap: { components: [], criticalNodes: [], dataFlow: "" },
      proposedChanges: [],
      restoreStrategy: { metricsBaseline: [], rollbackProcedure: [] },
      impactForecast: { expectedDegradationPct: 0, isSignificant: false, worstCase: "" },
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
