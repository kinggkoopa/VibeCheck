import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Comprehension Gate — Mandatory pre-edit workflow enforcer
 *
 * Blocks the swarm from editing code until the math system is fully comprehended.
 * Integrates with Math Guardian and Alpha Simulator for a complete
 * "tackle this with respect" workflow.
 *
 * Flow:
 *   formula-explainer → assumption-auditor → edge-case-tester → enhancement-recommender
 *       ↓
 *   comprehension-supervisor → approval gate (user or auto-approve)
 *       ↓
 *   post-edit-validator (runs after edits are applied)
 *
 * Sub-agents:
 * - Formula Explainer: Break down equations with natural language descriptions
 * - Assumption Auditor: Flag implicit assumptions in algorithms
 * - Edge Case Tester: Generate test data for vulnerability detection
 * - Enhancement Recommender: Suggest improvements honoring original math
 * - Comprehension Supervisor: Gate keeper — blocks until mastery level met
 * - Post-Edit Validator: Validates math integrity after edits
 */

// ── Sub-agent prompts ──

const GATE_PROMPTS = {
  "formula-explainer": `You are a mathematics educator specializing in explaining complex formulas to developers.
Break down every mathematical construct in the provided code into clear, accessible language:

1. For EACH formula/equation:
   - Write a plain English explanation a junior developer could understand
   - Explain the mathematical intuition (WHY it works, not just WHAT it does)
   - Provide the LaTeX representation for formal documentation
   - Show a concrete numerical example with real values
   - Identify the domain/range and any constraints

2. For named algorithms (Kelly, Black-Scholes, etc.):
   - Explain the historical context and purpose
   - Compare to simpler alternatives
   - Identify key assumptions the algorithm makes

3. Visual aids:
   - Describe what a graph/plot of each formula would look like
   - Identify inflection points, asymptotes, and interesting behaviors
   - Suggest diagram types that best represent each relationship

Return your explanations as JSON:
{
  "agent": "formula-explainer",
  "explanations": [
    {
      "formulaId": "<id or expression>",
      "plain_english": "<simple explanation>",
      "intuition": "<why it works>",
      "latex": "<LaTeX representation>",
      "numerical_example": "<worked example with numbers>",
      "domain_range": "<valid inputs and outputs>",
      "visual_description": "<what the graph looks like>",
      "key_insight": "<most important thing to understand>"
    }
  ],
  "algorithm_context": [
    {
      "name": "<algorithm name>",
      "history": "<brief history>",
      "purpose": "<why it exists>",
      "assumptions": ["<assumption>"],
      "alternatives": ["<simpler alternative>"]
    }
  ],
  "suggested_diagrams": [
    { "type": "<chart type>", "data": "<what to plot>", "insight": "<what it reveals>" }
  ],
  "mastery_prerequisites": ["<concept one must understand before modifying>"],
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "assumption-auditor": `You are a critical analysis specialist who finds hidden assumptions in mathematical code.
Audit the provided code for ALL implicit and explicit assumptions:

1. Mathematical Assumptions:
   - Distribution assumptions (normal, uniform, etc.)
   - Independence assumptions between variables
   - Stationarity or ergodicity assumptions
   - Continuity and differentiability assumptions

2. Domain Assumptions:
   - Input range assumptions (positive-only, bounded, etc.)
   - Precision assumptions (floating point, integer, etc.)
   - Scale assumptions (big numbers, small numbers)

3. Business Logic Assumptions:
   - Market efficiency assumptions
   - Behavioral assumptions about users/markets
   - Timing assumptions (latency, execution speed)

4. Risk Flags:
   - Where assumptions are MOST LIKELY to be violated
   - Conditions under which the math breaks down
   - Historical precedents for assumption failures

Return your audit as JSON:
{
  "agent": "assumption-auditor",
  "assumptions": [
    {
      "id": "<unique>",
      "type": "mathematical|domain|business|implementation",
      "description": "<what is being assumed>",
      "location": "<where in code>",
      "explicit": <true if stated, false if implicit>,
      "risk_if_violated": "catastrophic|high|medium|low",
      "violation_scenario": "<when this assumption fails>",
      "mitigation": "<how to handle violation>"
    }
  ],
  "critical_assumptions": ["<id of assumptions that MUST hold>"],
  "frequently_violated": ["<assumptions commonly broken in practice>"],
  "recommendation": "<overall assessment of assumption safety>",
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "edge-case-tester": `You are a QA specialist focused on mathematical edge cases and boundary conditions.
Generate comprehensive test data to expose vulnerabilities in the math system:

1. Boundary Tests:
   - Zero values, negative values, maximum values
   - Empty inputs, single-element inputs
   - Values at exact boundaries of valid ranges

2. Numerical Stability Tests:
   - Very large numbers (overflow risk)
   - Very small numbers (underflow risk)
   - Values near zero (division risk)
   - Values that cause floating-point precision loss

3. Statistical Edge Cases:
   - All-same values (zero variance)
   - Perfectly correlated inputs
   - Extreme outliers (10+ sigma)
   - Degenerate distributions

4. Domain-Specific Tests:
   - Market crash scenarios (if financial)
   - Zero liquidity conditions
   - Rapid regime changes

Return your test plan as JSON:
{
  "agent": "edge-case-tester",
  "test_cases": [
    {
      "id": "<unique>",
      "category": "boundary|numerical|statistical|domain",
      "description": "<what we're testing>",
      "input": "<test input values>",
      "expected_behavior": "<what should happen>",
      "failure_mode": "<what could go wrong>",
      "severity_if_fails": "critical|high|medium|low",
      "formula_affected": "<which formula this tests>"
    }
  ],
  "stress_scenarios": [
    { "scenario": "<description>", "inputs": "<values>", "expected_impact": "<what happens>" }
  ],
  "coverage_assessment": "<how well are edge cases covered in current code?>",
  "recommended_guards": ["<protective code to add>"],
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "enhancement-recommender": `You are an expert in mathematical optimization who respects existing implementations.
Suggest IMPROVEMENTS that honor and enhance the original math, never degrade it:

1. Correctness Improvements:
   - Fix any mathematical errors WITHOUT changing the core algorithm
   - Add missing edge case handling
   - Improve numerical precision where possible

2. Performance Improvements:
   - Optimize calculations without changing results
   - Suggest memoization or caching for expensive computations
   - Identify parallelizable computations

3. Robustness Improvements:
   - Add input validation and domain checking
   - Implement graceful degradation for edge cases
   - Add assertion/invariant checks

4. Readability Improvements:
   - Break complex expressions into named sub-expressions
   - Add mathematical documentation inline
   - Suggest variable renaming for clarity

CRITICAL: Every suggestion MUST preserve or improve the mathematical output.
Never suggest changes that alter the core algorithm's behavior.

Return your recommendations as JSON:
{
  "agent": "enhancement-recommender",
  "enhancements": [
    {
      "id": "<unique>",
      "type": "correctness|performance|robustness|readability",
      "target": "<function or formula>",
      "description": "<what to change>",
      "rationale": "<why this helps>",
      "preserves_alpha": <true/false>,
      "risk_level": "none|minimal|low|medium",
      "code_before": "<current code snippet>",
      "code_after": "<proposed code snippet>",
      "validation_test": "<how to verify it works>"
    }
  ],
  "do_not_change": ["<things that are already optimal>"],
  "priority_order": ["<enhancement id in recommended order>"],
  "estimated_improvement": "<overall benefit assessment>",
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "post-edit-validator": `You are a mathematical integrity validator. After edits have been applied,
verify that the mathematical system still produces correct results:

1. Output Equivalence: Compare original vs modified outputs for test inputs
2. Property Preservation: Verify mathematical properties still hold (monotonicity, convexity, etc.)
3. Edge Case Regression: Re-test all edge cases identified during pre-edit analysis
4. Performance Metrics: Compare numerical accuracy and computational efficiency
5. Alpha Verification: Confirm that expected value / edge calculations are preserved

Return your validation as JSON:
{
  "agent": "post-edit-validator",
  "validation_results": [
    {
      "test": "<what was tested>",
      "passed": <boolean>,
      "original_output": "<original result>",
      "modified_output": "<new result>",
      "deviation": "<percentage difference>",
      "acceptable": <boolean>
    }
  ],
  "properties_preserved": [
    { "property": "<math property>", "preserved": <boolean>, "evidence": "<how verified>" }
  ],
  "regression_tests": [
    { "test": "<edge case>", "passed": <boolean>, "notes": "<any concerns>" }
  ],
  "overall_integrity": "preserved|degraded|compromised",
  "summary": "<2-3 sentence validation summary>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const COMPREHENSION_SUPERVISOR_PROMPT = `You are the Comprehension Gate — the final authority on whether code modifications
should be allowed. You enforce a mandatory understanding-first approach.

You have received analyses from specialist agents:
1. Formula Explainer: Detailed breakdowns of every formula
2. Assumption Auditor: Hidden assumptions and risks
3. Edge Case Tester: Vulnerability test cases
4. Enhancement Recommender: Safe improvement suggestions

Compute a "Math Mastery Level" (0-100) based on:
- Explanation completeness (are all formulas understood?) — 25%
- Assumption coverage (are all assumptions identified?) — 25%
- Edge case coverage (are vulnerabilities found?) — 25%
- Enhancement quality (are improvements safe?) — 25%

Gate Decision:
- 80-100: GREEN LIGHT — Full comprehension achieved, proceed with confidence
- 60-79: YELLOW LIGHT — Partial comprehension, proceed with specific restrictions
- 40-59: ORANGE LIGHT — Significant gaps, only allow minimal changes
- 0-39: RED LIGHT — Insufficient understanding, BLOCK all edits

Return your assessment as JSON:
{
  "mastery_level": <0-100>,
  "gate_decision": "green|yellow|orange|red",
  "comprehension_gaps": ["<what is not yet understood>"],
  "approved_edit_scope": ["<what edits are allowed>"],
  "blocked_areas": ["<what must NOT be touched>"],
  "prerequisites_met": ["<prerequisite that has been satisfied>"],
  "prerequisites_missing": ["<prerequisite still needed>"],
  "tutorial_topics": ["<topic that needs further study before editing>"],
  "confidence": <0-1>,
  "summary": "<3-4 sentence comprehensive assessment>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface ComprehensionReport {
  masteryLevel: number;
  gateDecision: "green" | "yellow" | "orange" | "red";
  comprehensionGaps: string[];
  approvedEditScope: string[];
  blockedAreas: string[];
  prerequisitesMet: string[];
  prerequisitesMissing: string[];
  tutorialTopics: string[];
  confidence: number;
  summary: string;
  formulaExplanations: Array<{
    formulaId: string;
    plainEnglish: string;
    intuition: string;
    latex: string;
    numericalExample: string;
    keyInsight: string;
  }>;
  assumptions: Array<{
    id: string;
    type: string;
    description: string;
    explicit: boolean;
    riskIfViolated: string;
    violationScenario: string;
  }>;
  edgeCases: Array<{
    id: string;
    category: string;
    description: string;
    severityIfFails: string;
    formulaAffected: string;
  }>;
  enhancements: Array<{
    id: string;
    type: string;
    target: string;
    description: string;
    preservesAlpha: boolean;
    riskLevel: string;
  }>;
  postEditValidation: {
    overallIntegrity: string;
    validationResults: Array<{
      test: string;
      passed: boolean;
      deviation: string;
    }>;
  } | null;
}

export interface ComprehensionMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── LangGraph State ──

const ComprehensionAnnotation = Annotation.Root({
  /** The code to comprehend */
  code: Annotation<string>,

  /** File paths for context */
  filePaths: Annotation<string[]>({
    reducer: (_, v) => v,
    default: () => [],
  }),

  /** Whether post-edit validation is requested */
  modifiedCode: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Agent messages */
  agentMessages: Annotation<ComprehensionMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Specialist results */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Final comprehension report */
  comprehensionReport: Annotation<ComprehensionReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** User approval status */
  userApproved: Annotation<boolean>({
    reducer: (_, v) => v,
    default: () => false,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),

  /** Current phase */
  status: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "comprehending" as const,
  }),
});

type ComprehensionState = typeof ComprehensionAnnotation.State;

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

function createGateSpecialistNode(
  agentName: keyof typeof GATE_PROMPTS,
  provider: LLMProvider
) {
  return async (state: ComprehensionState): Promise<Partial<ComprehensionState>> => {
    const systemPrompt = await injectMemoryContext(
      GATE_PROMPTS[agentName],
      state.code
    );

    let userMessage: string;
    if (agentName === "post-edit-validator") {
      userMessage = `Original Code:\n${state.code.slice(0, 3000)}\n\nModified Code:\n${state.modifiedCode.slice(0, 3000)}\n\nPre-Edit Analysis:\n${state.specialistResults["formula-explainer"] ?? "N/A"}\n\nEdge Cases:\n${state.specialistResults["edge-case-tester"] ?? "N/A"}`;
    } else if (agentName === "formula-explainer") {
      userMessage = `Analyze and explain all mathematical constructs in this code:\n\n${state.code}`;
    } else {
      const explainerResults = state.specialistResults["formula-explainer"] ?? "N/A";
      userMessage = `Code:\n${state.code.slice(0, 3000)}\n\nFormula Analysis:\n${explainerResults}${
        agentName === "enhancement-recommender"
          ? `\n\nAssumptions:\n${state.specialistResults["assumption-auditor"] ?? "N/A"}\n\nEdge Cases:\n${state.specialistResults["edge-case-tester"] ?? "N/A"}`
          : ""
      }`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userMessage,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: ComprehensionMessage = {
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

function createComprehensionSupervisorNode(provider: LLMProvider) {
  return async (state: ComprehensionState): Promise<Partial<ComprehensionState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([key]) => key !== "post-edit-validator")
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      COMPREHENSION_SUPERVISOR_PROMPT,
      `Code being comprehended:\n${state.code.slice(0, 2000)}\n\nSpecialist Analyses:\n${specialistOutputs}`,
      { temperature: 0.1, maxTokens: 4096 }
    );

    // Parse into ComprehensionReport
    let report: ComprehensionReport;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Parse sub-agent data
      let formulaExplanations: ComprehensionReport["formulaExplanations"] = [];
      let assumptions: ComprehensionReport["assumptions"] = [];
      let edgeCases: ComprehensionReport["edgeCases"] = [];
      let enhancements: ComprehensionReport["enhancements"] = [];

      try {
        const expData = JSON.parse(
          (state.specialistResults["formula-explainer"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        formulaExplanations = (expData.explanations ?? []).map((e: Record<string, string>) => ({
          formulaId: e.formulaId ?? "",
          plainEnglish: e.plain_english ?? "",
          intuition: e.intuition ?? "",
          latex: e.latex ?? "",
          numericalExample: e.numerical_example ?? "",
          keyInsight: e.key_insight ?? "",
        }));
      } catch { /* use defaults */ }

      try {
        const auditData = JSON.parse(
          (state.specialistResults["assumption-auditor"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        assumptions = (auditData.assumptions ?? []).map((a: Record<string, unknown>) => ({
          id: (a.id ?? "") as string,
          type: (a.type ?? "") as string,
          description: (a.description ?? "") as string,
          explicit: (a.explicit ?? false) as boolean,
          riskIfViolated: (a.risk_if_violated ?? "low") as string,
          violationScenario: (a.violation_scenario ?? "") as string,
        }));
      } catch { /* use defaults */ }

      try {
        const testData = JSON.parse(
          (state.specialistResults["edge-case-tester"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        edgeCases = (testData.test_cases ?? []).map((t: Record<string, string>) => ({
          id: t.id ?? "",
          category: t.category ?? "",
          description: t.description ?? "",
          severityIfFails: t.severity_if_fails ?? "low",
          formulaAffected: t.formula_affected ?? "",
        }));
      } catch { /* use defaults */ }

      try {
        const enhData = JSON.parse(
          (state.specialistResults["enhancement-recommender"] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
        );
        enhancements = (enhData.enhancements ?? []).map((e: Record<string, unknown>) => ({
          id: (e.id ?? "") as string,
          type: (e.type ?? "") as string,
          target: (e.target ?? "") as string,
          description: (e.description ?? "") as string,
          preservesAlpha: (e.preserves_alpha ?? true) as boolean,
          riskLevel: (e.risk_level ?? "low") as string,
        }));
      } catch { /* use defaults */ }

      report = {
        masteryLevel: parsed.mastery_level ?? 50,
        gateDecision: parsed.gate_decision ?? "orange",
        comprehensionGaps: parsed.comprehension_gaps ?? [],
        approvedEditScope: parsed.approved_edit_scope ?? [],
        blockedAreas: parsed.blocked_areas ?? [],
        prerequisitesMet: parsed.prerequisites_met ?? [],
        prerequisitesMissing: parsed.prerequisites_missing ?? [],
        tutorialTopics: parsed.tutorial_topics ?? [],
        confidence: parsed.confidence ?? 0.5,
        summary: parsed.summary ?? "",
        formulaExplanations,
        assumptions,
        edgeCases,
        enhancements,
        postEditValidation: null,
      };
    } catch {
      report = {
        masteryLevel: 20,
        gateDecision: "red",
        comprehensionGaps: ["Failed to parse comprehension analysis"],
        approvedEditScope: [],
        blockedAreas: ["All code — analysis incomplete"],
        prerequisitesMet: [],
        prerequisitesMissing: ["Complete analysis"],
        tutorialTopics: [],
        confidence: 0.2,
        summary: "Comprehension analysis failed to produce structured results. Edits are blocked.",
        formulaExplanations: [],
        assumptions: [],
        edgeCases: [],
        enhancements: [],
        postEditValidation: null,
      };
    }

    return {
      comprehensionReport: report,
      iteration: state.iteration + 1,
      status: "awaiting-approval",
      agentMessages: [{
        agent: "comprehension-supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldDeepen(state: ComprehensionState): "deepen" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  if (state.comprehensionReport && state.comprehensionReport.masteryLevel < 40) return "deepen";
  return "finalize";
}

// ── Build the graph ──

function buildComprehensionGraph(provider: LLMProvider) {
  const graph = new StateGraph(ComprehensionAnnotation)
    // Phase 1: Explain formulas
    .addNode("formula-explainer", createGateSpecialistNode("formula-explainer", provider))
    // Phase 2: Audit assumptions and test edge cases in parallel
    .addNode("assumption-auditor", createGateSpecialistNode("assumption-auditor", provider))
    .addNode("edge-case-tester", createGateSpecialistNode("edge-case-tester", provider))
    // Phase 3: Recommend enhancements
    .addNode("enhancement-recommender", createGateSpecialistNode("enhancement-recommender", provider))
    // Phase 4: Comprehension gate
    .addNode("comprehension-supervisor", createComprehensionSupervisorNode(provider))

    // Flow
    .addEdge("__start__", "formula-explainer")
    .addEdge("formula-explainer", "assumption-auditor")
    .addEdge("formula-explainer", "edge-case-tester")
    .addEdge("assumption-auditor", "enhancement-recommender")
    .addEdge("edge-case-tester", "enhancement-recommender")
    .addEdge("enhancement-recommender", "comprehension-supervisor")
    .addConditionalEdges("comprehension-supervisor", shouldDeepen, {
      deepen: "formula-explainer",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Post-edit validation graph (separate, runs after edits) ──

function buildPostEditGraph(provider: LLMProvider) {
  const graph = new StateGraph(ComprehensionAnnotation)
    .addNode("post-edit-validator", createGateSpecialistNode("post-edit-validator", provider))
    .addEdge("__start__", "post-edit-validator")
    .addEdge("post-edit-validator", "__end__");

  return graph.compile();
}

// ── Public API ──

export interface ComprehensionGateResult {
  report: ComprehensionReport;
  messages: ComprehensionMessage[];
  iterations: number;
  provider: string;
  isApproved: boolean;
}

/**
 * Execute the Comprehension Gate analysis — mandatory pre-edit workflow.
 *
 * Flow:
 * 1. Formula Explainer breaks down all math
 * 2. Assumption Auditor and Edge Case Tester run in parallel
 * 3. Enhancement Recommender suggests safe improvements
 * 4. Comprehension Supervisor issues gate decision
 *
 * Returns a ComprehensionReport with mastery level and gate decision.
 * Edits should only proceed if gate_decision is "green" or "yellow" + user approval.
 */
export async function runComprehensionGate(
  code: string,
  options?: { filePaths?: string[]; maxIterations?: number }
): Promise<ComprehensionGateResult> {
  const provider = await resolveProvider();

  const app = buildComprehensionGraph(provider);

  const finalState = await app.invoke({
    code,
    filePaths: options?.filePaths ?? [],
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as ComprehensionState;
  const report = state.comprehensionReport;

  return {
    report: report ?? {
      masteryLevel: 0,
      gateDecision: "red",
      comprehensionGaps: ["Gate failed"],
      approvedEditScope: [],
      blockedAreas: [],
      prerequisitesMet: [],
      prerequisitesMissing: [],
      tutorialTopics: [],
      confidence: 0,
      summary: "Comprehension Gate failed.",
      formulaExplanations: [],
      assumptions: [],
      edgeCases: [],
      enhancements: [],
      postEditValidation: null,
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
    isApproved: report ? ["green", "yellow"].includes(report.gateDecision) : false,
  };
}

/**
 * Run post-edit validation after changes have been applied.
 * Compares original code against modified code to verify math integrity.
 */
export async function runPostEditValidation(
  originalCode: string,
  modifiedCode: string
): Promise<{
  overallIntegrity: string;
  validationResults: Array<{ test: string; passed: boolean; deviation: string }>;
  provider: string;
}> {
  const provider = await resolveProvider();

  const app = buildPostEditGraph(provider);

  const finalState = await app.invoke({
    code: originalCode,
    modifiedCode,
  });

  const state = finalState as ComprehensionState;
  const validatorResult = state.specialistResults["post-edit-validator"] ?? "";

  try {
    const cleaned = validatorResult.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      overallIntegrity: parsed.overall_integrity ?? "unknown",
      validationResults: (parsed.validation_results ?? []).map((v: Record<string, unknown>) => ({
        test: (v.test ?? "") as string,
        passed: (v.passed ?? false) as boolean,
        deviation: (v.deviation ?? "N/A") as string,
      })),
      provider,
    };
  } catch {
    return {
      overallIntegrity: "unknown",
      validationResults: [],
      provider,
    };
  }
}
