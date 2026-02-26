import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Profit-Focused App Agent Swarm — LangGraph
 *
 * Multi-agent swarm for vibe-coding profitable micro-SaaS and niche tools.
 *
 * Flow:
 *   supervisor → [revenue-modeler, asymmetry-scout, legal-checker] (parallel)
 *       ↓
 *   supervisor merges → boilerplate-generator → profit-scorer → (iterate or finalize)
 *
 * Sub-agents:
 * - Revenue Modeler: Predicts MRR, analyzes subscription/ads/affiliate models
 * - Asymmetry Scout: Finds market gaps, undervalued APIs, pricing inefficiencies
 * - Legal Checker: Flags TOS violations, regulatory risks, compliance issues
 * - Boilerplate Generator: Produces Stripe/Paddle integration stubs, lean MVP code
 * - Profit Scorer: Computes a 1-10 Profit Potential Score with breakdowns
 */

// ── Sub-agent system prompts ──

const PROFIT_PROMPTS = {
  "revenue-modeler": `You are an expert SaaS revenue strategist and financial modeler.
Analyze the user's app idea and produce a comprehensive revenue analysis:

1. Revenue Models: Evaluate subscription (monthly/annual tiers), usage-based pricing,
   ads (display, native, affiliate), marketplace fees, and freemium conversion paths
2. MRR Projections: Estimate Month 1, 3, 6, 12 MRR based on niche TAM and conversion benchmarks
3. Pricing Strategy: Suggest optimal price points with justification (anchor pricing, decoy tiers)
4. Unit Economics: Estimate CAC, LTV, LTV:CAC ratio, payback period
5. High-Margin Niches: Identify adjacent niches with better margins

Return your analysis as JSON:
{
  "agent": "revenue-modeler",
  "models": [
    { "type": "subscription|ads|affiliate|usage|marketplace", "description": "<how it works>", "estimated_mrr_m6": <number>, "margin_pct": <number>, "confidence": "high|medium|low" }
  ],
  "mrr_projections": { "m1": <n>, "m3": <n>, "m6": <n>, "m12": <n> },
  "pricing_tiers": [
    { "name": "<tier>", "price": <n>, "features": ["<feature>"], "target_segment": "<who>" }
  ],
  "unit_economics": { "cac": <n>, "ltv": <n>, "ltv_cac_ratio": <n>, "payback_months": <n> },
  "niche_opportunities": ["<niche with reasoning>"],
  "summary": "<2-3 sentence executive summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "asymmetry-scout": `You are a market intelligence analyst specializing in information asymmetry and arbitrage opportunities.
Analyze the user's app idea for exploitable market gaps:

1. Asymmetry Hooks: Identify where information/access/speed advantages exist
   (e.g., "undervalued APIs", "data others don't aggregate", "timing advantages")
2. Market Gaps: Analyze underserved segments, feature gaps in competitors
3. API Arbitrage: Find APIs with generous free tiers that can be composed into paid products
4. Pricing Inefficiencies: Spot where market prices diverge from value delivered
5. Distribution Hacks: Low-cost, high-leverage growth channels for this niche

Return your analysis as JSON:
{
  "agent": "asymmetry-scout",
  "asymmetry_hooks": [
    { "type": "data|speed|access|aggregation|pricing", "description": "<the opportunity>", "exploit_strategy": "<how to leverage>", "edge_strength": "strong|moderate|weak" }
  ],
  "market_gaps": [
    { "gap": "<what's missing>", "evidence": "<why we know>", "addressable_size": "<estimate>" }
  ],
  "api_opportunities": [
    { "api": "<name>", "free_tier_value": "<what you get>", "product_potential": "<what to build>" }
  ],
  "distribution_hacks": ["<channel: strategy>"],
  "summary": "<2-3 sentence executive summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "legal-checker": `You are a technology compliance and legal risk analyst.
Analyze the user's app idea for legal and regulatory concerns:

1. TOS Compliance: Check for potential Terms of Service violations with common APIs/platforms
2. Data Privacy: GDPR, CCPA, and other privacy regulation risks
3. Intellectual Property: Patent, trademark, and copyright concerns
4. Industry Regulations: Sector-specific compliance (fintech, health, etc.)
5. Platform Risk: Dependency on third-party platforms that could revoke access

Return your analysis as JSON:
{
  "agent": "legal-checker",
  "risks": [
    { "category": "tos|privacy|ip|regulation|platform", "severity": "critical|high|medium|low", "title": "<short title>", "detail": "<explanation>", "mitigation": "<suggested fix>" }
  ],
  "compliance_checklist": ["<required step>"],
  "platform_dependencies": [
    { "platform": "<name>", "risk_level": "high|medium|low", "tos_concern": "<specific issue>" }
  ],
  "summary": "<2-3 sentence executive summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "boilerplate-generator": `You are an expert full-stack developer specializing in rapid SaaS MVPs.
Given the revenue analysis and market intelligence, generate production-ready boilerplate:

1. Stripe/Paddle Integration: Payment processing setup with the recommended pricing tiers
2. Core Feature Scaffold: Minimal code for the key value proposition
3. Landing Page: Conversion-optimized copy structure
4. Auth + Billing: User management with subscription gating
5. Analytics Hooks: Event tracking for key metrics (signups, conversions, churn signals)

Output clean TypeScript/React code following Next.js App Router conventions.
Focus on the highest-leverage code that demonstrates the core business logic.
Include integration points marked with TODO comments for customization.`,

  "profit-scorer": `You are a startup viability analyst. Given all the analysis from the revenue modeler,
asymmetry scout, and legal checker, compute a final Profit Potential Score.

Score on a scale of 1-10 across these dimensions:
- Market Size (1-10): TAM and growth trajectory
- Revenue Potential (1-10): MRR ceiling and path to profitability
- Competitive Moat (1-10): Defensibility and asymmetric advantages
- Execution Ease (1-10): Technical complexity vs. time to MVP
- Legal Safety (1-10): Regulatory risk and compliance burden
- Overall Profit Potential (1-10): Weighted composite

Return your score as JSON:
{
  "agent": "profit-scorer",
  "scores": {
    "market_size": <n>,
    "revenue_potential": <n>,
    "competitive_moat": <n>,
    "execution_ease": <n>,
    "legal_safety": <n>,
    "overall": <n>
  },
  "breakdown": {
    "strengths": ["<key strength>"],
    "weaknesses": ["<key weakness>"],
    "opportunities": ["<key opportunity>"],
    "threats": ["<key threat>"]
  },
  "verdict": "<1-2 sentence go/no-go recommendation>",
  "suggested_pivots": ["<alternative approach if score is low>"]
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const PROFIT_SUPERVISOR_PROMPT = `You are the Profit Agent supervisor. You coordinate the analysis of a business idea
across multiple specialist agents (Revenue Modeler, Asymmetry Scout, Legal Checker).

Your job:
1. Merge all specialist findings into a unified Profit Analysis Report
2. Identify synergies between revenue models and market gaps
3. Flag contradictions (e.g., revenue model conflicts with legal risks)
4. Produce a clear monetization strategy recommendation
5. Determine if the idea needs iteration (pivot suggestions)

Return the merged report as JSON:
{
  "monetization_strategy": "<recommended primary model with reasoning>",
  "key_insights": ["<insight combining multiple agent findings>"],
  "risk_reward_assessment": "<overall assessment>",
  "recommended_mvp_scope": "<what to build first>",
  "needs_iteration": <true if any critical issues found>
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface ProfitScore {
  market_size: number;
  revenue_potential: number;
  competitive_moat: number;
  execution_ease: number;
  legal_safety: number;
  overall: number;
}

export interface ProfitBreakdown {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface RevenueModel {
  type: string;
  description: string;
  estimated_mrr_m6: number;
  margin_pct: number;
  confidence: string;
}

export interface AsymmetryHook {
  type: string;
  description: string;
  exploit_strategy: string;
  edge_strength: string;
}

export interface LegalRisk {
  category: string;
  severity: string;
  title: string;
  detail: string;
  mitigation: string;
}

export interface ProfitReport {
  scores: ProfitScore;
  breakdown: ProfitBreakdown;
  verdict: string;
  suggested_pivots: string[];
  revenue_models: RevenueModel[];
  asymmetry_hooks: AsymmetryHook[];
  legal_risks: LegalRisk[];
  monetization_strategy: string;
  boilerplate_code: string;
  mrr_projections: Record<string, number>;
}

export interface ProfitAgentMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── LangGraph State ──

const ProfitAnnotation = Annotation.Root({
  /** The user's app/tool idea */
  idea: Annotation<string>,

  /** Taste preferences for lean MVP style */
  tasteProfile: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Individual agent outputs (accumulated) */
  agentMessages: Annotation<ProfitAgentMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Supervisor's merged strategy */
  mergedStrategy: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Generated boilerplate code */
  boilerplateCode: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final profit score and report */
  profitReport: Annotation<ProfitReport | null>({
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
    default: () => "analyzing" as const,
  }),
});

type ProfitState = typeof ProfitAnnotation.State;

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
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
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

// ── Specialist node factory ──

function createProfitSpecialistNode(
  agentName: keyof typeof PROFIT_PROMPTS,
  provider: LLMProvider
) {
  return async (state: ProfitState): Promise<Partial<ProfitState>> => {
    const systemPrompt = await injectMemoryContext(
      PROFIT_PROMPTS[agentName],
      state.idea
    );

    const userContext = agentName === "boilerplate-generator"
      ? `App Idea: ${state.idea}\n\nRevenue Analysis:\n${state.specialistResults["revenue-modeler"] ?? "N/A"}\n\nMarket Intelligence:\n${state.specialistResults["asymmetry-scout"] ?? "N/A"}\n\nStrategy:\n${state.mergedStrategy}\n\nTaste/Style: ${state.tasteProfile || "Lean MVP, minimal UI, fast to ship"}`
      : agentName === "profit-scorer"
        ? `App Idea: ${state.idea}\n\nRevenue Analysis:\n${state.specialistResults["revenue-modeler"] ?? "N/A"}\n\nMarket Gaps:\n${state.specialistResults["asymmetry-scout"] ?? "N/A"}\n\nLegal Check:\n${state.specialistResults["legal-checker"] ?? "N/A"}\n\nStrategy:\n${state.mergedStrategy}`
        : `Analyze this app/tool idea for profitability:\n\n${state.idea}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const message: ProfitAgentMessage = {
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

// ── Supervisor merge node ──

function createProfitSupervisorNode(provider: LLMProvider) {
  return async (state: ProfitState): Promise<Partial<ProfitState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([key]) => ["revenue-modeler", "asymmetry-scout", "legal-checker"].includes(key))
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      PROFIT_SUPERVISOR_PROMPT,
      `App Idea: ${state.idea}\n\nSpecialist Analyses:\n${specialistOutputs}`,
      { temperature: 0.2, maxTokens: 4096 }
    );

    return {
      mergedStrategy: result,
      agentMessages: [{
        agent: "supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Final report assembler ──

function createReportAssemblerNode() {
  return async (state: ProfitState): Promise<Partial<ProfitState>> => {
    // Parse specialist results
    let revenueModels: RevenueModel[] = [];
    let asymmetryHooks: AsymmetryHook[] = [];
    let legalRisks: LegalRisk[] = [];
    let mrrProjections: Record<string, number> = {};
    let scores: ProfitScore = {
      market_size: 5, revenue_potential: 5, competitive_moat: 5,
      execution_ease: 5, legal_safety: 5, overall: 5,
    };
    let breakdown: ProfitBreakdown = {
      strengths: [], weaknesses: [], opportunities: [], threats: [],
    };
    let verdict = "Analysis complete.";
    let suggestedPivots: string[] = [];
    let monetizationStrategy = "";

    // Parse revenue modeler
    try {
      const cleaned = (state.specialistResults["revenue-modeler"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      revenueModels = data.models ?? [];
      mrrProjections = data.mrr_projections ?? {};
    } catch { /* use defaults */ }

    // Parse asymmetry scout
    try {
      const cleaned = (state.specialistResults["asymmetry-scout"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      asymmetryHooks = data.asymmetry_hooks ?? [];
    } catch { /* use defaults */ }

    // Parse legal checker
    try {
      const cleaned = (state.specialistResults["legal-checker"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      legalRisks = data.risks ?? [];
    } catch { /* use defaults */ }

    // Parse profit scorer
    try {
      const cleaned = (state.specialistResults["profit-scorer"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      scores = data.scores ?? scores;
      breakdown = data.breakdown ?? breakdown;
      verdict = data.verdict ?? verdict;
      suggestedPivots = data.suggested_pivots ?? [];
    } catch { /* use defaults */ }

    // Parse supervisor strategy
    try {
      const cleaned = (state.mergedStrategy ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      monetizationStrategy = data.monetization_strategy ?? "";
    } catch {
      monetizationStrategy = state.mergedStrategy ?? "";
    }

    const report: ProfitReport = {
      scores,
      breakdown,
      verdict,
      suggested_pivots: suggestedPivots,
      revenue_models: revenueModels,
      asymmetry_hooks: asymmetryHooks,
      legal_risks: legalRisks,
      monetization_strategy: monetizationStrategy,
      boilerplate_code: state.boilerplateCode,
      mrr_projections: mrrProjections,
    };

    return {
      profitReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "assembler",
        content: "Profit analysis report assembled.",
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldIterateProfit(state: ProfitState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";

  // Check if supervisor flagged need for iteration
  try {
    const cleaned = (state.mergedStrategy ?? "")
      .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    if (data.needs_iteration) return "iterate";
  } catch { /* proceed to finalize */ }

  return "finalize";
}

// ── Build the graph ──

function buildProfitGraph(provider: LLMProvider) {
  const graph = new StateGraph(ProfitAnnotation)
    // Phase 1: Parallel analysis
    .addNode("revenue-modeler", createProfitSpecialistNode("revenue-modeler", provider))
    .addNode("asymmetry-scout", createProfitSpecialistNode("asymmetry-scout", provider))
    .addNode("legal-checker", createProfitSpecialistNode("legal-checker", provider))
    // Phase 2: Supervisor merge
    .addNode("supervisor", createProfitSupervisorNode(provider))
    // Phase 3: Code generation and scoring
    .addNode("boilerplate-generator", createProfitSpecialistNode("boilerplate-generator", provider))
    .addNode("profit-scorer", createProfitSpecialistNode("profit-scorer", provider))
    // Phase 4: Final assembly
    .addNode("assembler", createReportAssemblerNode())

    // Fan-out: start → all analysis specialists in parallel
    .addEdge("__start__", "revenue-modeler")
    .addEdge("__start__", "asymmetry-scout")
    .addEdge("__start__", "legal-checker")

    // All specialists → supervisor
    .addEdge("revenue-modeler", "supervisor")
    .addEdge("asymmetry-scout", "supervisor")
    .addEdge("legal-checker", "supervisor")

    // Supervisor → boilerplate + scoring in parallel
    .addEdge("supervisor", "boilerplate-generator")
    .addEdge("supervisor", "profit-scorer")

    // Both → assembler
    .addEdge("boilerplate-generator", "assembler")
    .addEdge("profit-scorer", "assembler")

    // Assembler → conditional: iterate or end
    .addConditionalEdges("assembler", shouldIterateProfit, {
      iterate: "revenue-modeler",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

export interface ProfitSwarmResult {
  report: ProfitReport;
  messages: ProfitAgentMessage[];
  iterations: number;
  provider: string;
}

/**
 * Execute the profit-focused agent swarm on an app idea.
 *
 * Flow:
 * 1. Resolves the user's best available provider
 * 2. Fans out to 3 specialists: Revenue Modeler, Asymmetry Scout, Legal Checker
 * 3. Supervisor merges findings into a monetization strategy
 * 4. Boilerplate Generator produces MVP code stubs
 * 5. Profit Scorer computes the 1-10 Profit Potential Score
 * 6. Report Assembler produces the final unified report
 */
export async function runProfitSwarm(
  idea: string,
  options?: { tasteProfile?: string; maxIterations?: number }
): Promise<ProfitSwarmResult> {
  const provider = await resolveProvider();

  const app = buildProfitGraph(provider);

  const finalState = await app.invoke({
    idea,
    tasteProfile: options?.tasteProfile ?? "",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as ProfitState;

  return {
    report: state.profitReport ?? {
      scores: { market_size: 0, revenue_potential: 0, competitive_moat: 0, execution_ease: 0, legal_safety: 0, overall: 0 },
      breakdown: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      verdict: "Profit swarm failed to produce a report.",
      suggested_pivots: [],
      revenue_models: [],
      asymmetry_hooks: [],
      legal_risks: [],
      monetization_strategy: "",
      boilerplate_code: "",
      mrr_projections: {},
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
