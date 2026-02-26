import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Polymarket Maximizer Agent — Comprehensive prediction market alpha swarm
 *
 * Detects alpha, mispricings, and builds profit machines from Polymarket data.
 *
 * Flow:
 *   data-fetcher → [probability-fusion, arb-detector] (parallel)
 *       ↓
 *   supervisor → machine-builder → maximizer-scorer
 *
 * Sub-agents:
 * - Data Fetcher: Gamma/Data/CLOB API analysis
 * - Probability Fusion: Weighted odds calculations from multiple sources
 * - Arb Detector: Cross-Kalshi arbitrage detection
 * - Machine Builder: Create apps if no edges (dashboards, bots, SaaS)
 * - Maximizer Scorer: Edge score with portfolio suggestions
 */

const POLY_PROMPTS = {
  "data-fetcher": `You are a Polymarket data specialist. Analyze the user's query and identify
the best markets, liquidity pools, and data sources on Polymarket.

Polymarket categories: politics, crypto, sports, entertainment, science, business, pop-culture, news, weather, technology.
Prices are 0-1 (representing probability). Uses CLOB for order book, Gamma for metadata, Data API for historical.

Produce a data collection plan:
{
  "agent": "data-fetcher",
  "target_categories": ["<category>"],
  "market_queries": ["<search terms>"],
  "liquidity_requirements": "<minimum liquidity threshold>",
  "data_sources": ["gamma|clob|data"],
  "key_metrics": ["<what to track>"],
  "summary": "<what we're looking for>"
}
Return ONLY valid JSON, no markdown fences.`,

  "probability-fusion": `You are a probability estimation expert. Given prediction market data,
fuse multiple probability estimates into calibrated predictions:

1. Market Price: Current Polymarket mid-price
2. Base Rates: Historical frequency of similar events
3. News Sentiment: Recent developments affecting probability
4. Expert Models: Polling averages, forecast models, etc.
5. Cross-Platform: Prices on Kalshi, Metaculus, etc.

Weight each source by reliability and recency. Identify where fused probability
diverges most from market price (= biggest potential edge).

Return as JSON:
{
  "agent": "probability-fusion",
  "estimates": [
    {
      "market": "<title>",
      "market_price": <0-1>,
      "fused_probability": <0-1>,
      "sources": [{ "source": "<name>", "estimate": <0-1>, "weight": <0-1>, "reasoning": "<why>" }],
      "divergence": <abs difference>,
      "edge_direction": "buy|sell|none",
      "confidence": "high|medium|low"
    }
  ],
  "methodology": "<how weights were determined>",
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "arb-detector": `You are a cross-platform arbitrage detector for prediction markets.
Find pricing discrepancies between Polymarket and other platforms (Kalshi, Metaculus, PredictIt):

1. Match equivalent markets across platforms
2. Calculate exploitable spreads (accounting for fees)
3. Assess execution risk (liquidity, settlement timing, platform risk)
4. Propose execution strategies (simultaneous orders, hedging)
5. Estimate total addressable profit

Return as JSON:
{
  "agent": "arb-detector",
  "opportunities": [
    {
      "poly_market": "<title>",
      "poly_price": <0-1>,
      "cross_platform": "<platform>",
      "cross_price": <0-1>,
      "spread_pct": <number>,
      "direction": "buy-poly|buy-cross",
      "estimated_profit": "<amount>",
      "execution_strategy": "<how>",
      "risk_level": "low|medium|high"
    }
  ],
  "total_addressable_arb": "<estimated total>",
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "machine-builder": `You are a product builder who monetizes prediction market data.
When direct trading edges are thin, build profitable tools/apps:

1. Dashboard Products: Real-time viewers, scanners, portfolio trackers
2. Bot Products: Alert systems, auto-traders, sentiment bots
3. SaaS Products: Subscription analytics, API reselling, research tools
4. Content Products: Newsletters, prediction leagues, data feeds
5. Affiliate Products: Election dashboards, sports prediction sites

Each idea should have clear monetization (Stripe/Paddle integration).

Return as JSON:
{
  "agent": "machine-builder",
  "machines": [
    {
      "name": "<product name>",
      "type": "dashboard|bot|saas|content|affiliate",
      "concept": "<what it does>",
      "target_audience": "<who pays>",
      "monetization": "<Stripe tiers, ads, etc.>",
      "tech_stack": "<Next.js, Python, etc.>",
      "mvp_scope": "<what to build first>",
      "estimated_mrr": "<month 6 estimate>",
      "profit_potential": "high|medium|low"
    }
  ],
  "recommended_build": "<which to build first>",
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "maximizer-scorer": `You are the final scoring analyst. Compute the Polymarket Edge Score:

Dimensions (1-10 each):
- Market Edge: Probability fusion vs market price divergence
- Arb Quality: Cross-platform arbitrage viability
- Machine Potential: Tool/app profitability
- Data Depth: Quality of available data
- Risk Rating: How safe are the opportunities (10 = very safe)
- Overall Score: Weighted composite

Return as JSON:
{
  "agent": "maximizer-scorer",
  "scores": {
    "market_edge": <1-10>,
    "arb_quality": <1-10>,
    "machine_potential": <1-10>,
    "data_depth": <1-10>,
    "risk_rating": <1-10>,
    "overall": <1-10>
  },
  "top_action": "<single best action>",
  "portfolio_allocation": "<how to split capital across opportunities>",
  "summary": "<final verdict>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const POLY_SUPERVISOR_PROMPT = `You are the Polymarket Maximizer supervisor. Merge all specialist findings
into a unified alpha strategy. Combine probability fusion, arbitrage, and machine ideas.

Return as JSON:
{
  "strategy": "<primary approach>",
  "immediate_actions": ["<action>"],
  "edges_detected": <number>,
  "total_estimated_ev": "<value>",
  "pivot_to_building": <true if no trading edge, build tools instead>,
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface PolyMaxReport {
  scores: {
    market_edge: number;
    arb_quality: number;
    machine_potential: number;
    data_depth: number;
    risk_rating: number;
    overall: number;
  };
  strategy: string;
  immediateActions: string[];
  probabilityEstimates: Array<{
    market: string;
    marketPrice: number;
    fusedProbability: number;
    divergence: number;
    edgeDirection: string;
    confidence: string;
  }>;
  arbOpportunities: Array<{
    polyMarket: string;
    polyPrice: number;
    crossPlatform: string;
    crossPrice: number;
    spreadPct: number;
    direction: string;
  }>;
  machineIdeas: Array<{
    name: string;
    type: string;
    concept: string;
    monetization: string;
    estimatedMrr: string;
    profitPotential: string;
  }>;
  topAction: string;
  summary: string;
}

export interface PolyMaxMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── State ──

const PolyAnnotation = Annotation.Root({
  query: Annotation<string>,
  agentMessages: Annotation<PolyMaxMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  mergedStrategy: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),
  polyReport: Annotation<PolyMaxReport | null>({ reducer: (_, v) => v, default: () => null }),
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),
  status: Annotation<string>({ reducer: (_, v) => v, default: () => "fetching" }),
});

type PolyState = typeof PolyAnnotation.State;

// ── Helpers ──

async function completeWithRetry(
  provider: LLMProvider, systemPrompt: string, userMessage: string,
  options?: { temperature?: number; maxTokens?: number }, maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await complete(provider, systemPrompt, userMessage, options); }
    catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError ?? new Error("Max retries exceeded");
}

const PROVIDER_ORDER: LLMProvider[] = ["anthropic", "openrouter", "openai", "groq"];

async function resolveProvider(): Promise<LLMProvider> {
  for (const p of PROVIDER_ORDER) {
    try { await complete(p, "Reply with OK", "test", { maxTokens: 5 }); return p; } catch { continue; }
  }
  throw new Error("No working API key found.");
}

// ── Nodes ──

function createPolyNode(agentName: keyof typeof POLY_PROMPTS, provider: LLMProvider) {
  return async (state: PolyState): Promise<Partial<PolyState>> => {
    const systemPrompt = await injectMemoryContext(POLY_PROMPTS[agentName], state.query);
    const context = agentName === "data-fetcher"
      ? `User query: ${state.query}`
      : `Query: ${state.query}\n\nMarket Data:\n${state.specialistResults["data-fetcher"] ?? "N/A"}\n\n${
          ["machine-builder", "maximizer-scorer"].includes(agentName)
            ? `Probability Fusion:\n${state.specialistResults["probability-fusion"] ?? "N/A"}\n\nArbitrage:\n${state.specialistResults["arb-detector"] ?? "N/A"}\n\nStrategy:\n${state.mergedStrategy}`
            : ""
        }`;

    const result = await completeWithRetry(provider, systemPrompt, context, { temperature: 0.3, maxTokens: 4096 });
    const message: PolyMaxMessage = { agent: agentName, content: result, timestamp: new Date().toISOString() };
    try { message.parsedData = JSON.parse(result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()); } catch { /* skip */ }

    return { agentMessages: [message], specialistResults: { [agentName]: result } };
  };
}

function createPolySupervisorNode(provider: LLMProvider) {
  return async (state: PolyState): Promise<Partial<PolyState>> => {
    const outputs = Object.entries(state.specialistResults)
      .filter(([k]) => ["data-fetcher", "probability-fusion", "arb-detector"].includes(k))
      .map(([a, r]) => `=== ${a.toUpperCase()} ===\n${r}`).join("\n\n");

    const result = await completeWithRetry(provider, POLY_SUPERVISOR_PROMPT,
      `Query: ${state.query}\n\nSpecialist Analyses:\n${outputs}`, { temperature: 0.2, maxTokens: 4096 });

    return { mergedStrategy: result, agentMessages: [{ agent: "supervisor", content: result, timestamp: new Date().toISOString() }] };
  };
}

function createPolyAssemblerNode() {
  return async (state: PolyState): Promise<Partial<PolyState>> => {
    const parse = (key: string) => {
      try { return JSON.parse((state.specialistResults[key] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()); }
      catch { return {}; }
    };

    const fusionData = parse("probability-fusion");
    const arbData = parse("arb-detector");
    const machineData = parse("machine-builder");
    const scoreData = parse("maximizer-scorer");
    const stratData = (() => { try { return JSON.parse(state.mergedStrategy.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()); } catch { return {}; } })();

    const report: PolyMaxReport = {
      scores: scoreData.scores ?? { market_edge: 5, arb_quality: 5, machine_potential: 5, data_depth: 5, risk_rating: 5, overall: 5 },
      strategy: stratData.strategy ?? "",
      immediateActions: stratData.immediate_actions ?? [],
      probabilityEstimates: (fusionData.estimates ?? []).map((e: Record<string, unknown>) => ({
        market: (e.market ?? "") as string, marketPrice: (e.market_price ?? 0) as number,
        fusedProbability: (e.fused_probability ?? 0) as number, divergence: (e.divergence ?? 0) as number,
        edgeDirection: (e.edge_direction ?? "none") as string, confidence: (e.confidence ?? "low") as string,
      })),
      arbOpportunities: (arbData.opportunities ?? []).map((a: Record<string, unknown>) => ({
        polyMarket: (a.poly_market ?? "") as string, polyPrice: (a.poly_price ?? 0) as number,
        crossPlatform: (a.cross_platform ?? "") as string, crossPrice: (a.cross_price ?? 0) as number,
        spreadPct: (a.spread_pct ?? 0) as number, direction: (a.direction ?? "") as string,
      })),
      machineIdeas: (machineData.machines ?? []).map((m: Record<string, string>) => ({
        name: m.name ?? "", type: m.type ?? "", concept: m.concept ?? "",
        monetization: m.monetization ?? "", estimatedMrr: m.estimated_mrr ?? "", profitPotential: m.profit_potential ?? "medium",
      })),
      topAction: scoreData.top_action ?? "Continue analysis",
      summary: scoreData.summary ?? "",
    };

    return {
      polyReport: report, iteration: state.iteration + 1, status: "complete",
      agentMessages: [{ agent: "assembler", content: "Polymarket report assembled.", timestamp: new Date().toISOString() }],
    };
  };
}

// ── Graph ──

function buildPolyGraph(provider: LLMProvider) {
  return new StateGraph(PolyAnnotation)
    .addNode("data-fetcher", createPolyNode("data-fetcher", provider))
    .addNode("probability-fusion", createPolyNode("probability-fusion", provider))
    .addNode("arb-detector", createPolyNode("arb-detector", provider))
    .addNode("supervisor", createPolySupervisorNode(provider))
    .addNode("machine-builder", createPolyNode("machine-builder", provider))
    .addNode("maximizer-scorer", createPolyNode("maximizer-scorer", provider))
    .addNode("assembler", createPolyAssemblerNode())
    .addEdge("__start__", "data-fetcher")
    .addEdge("data-fetcher", "probability-fusion")
    .addEdge("data-fetcher", "arb-detector")
    .addEdge("probability-fusion", "supervisor")
    .addEdge("arb-detector", "supervisor")
    .addEdge("supervisor", "machine-builder")
    .addEdge("supervisor", "maximizer-scorer")
    .addEdge("machine-builder", "assembler")
    .addEdge("maximizer-scorer", "assembler")
    .addEdge("assembler", "__end__")
    .compile();
}

// ── Public API ──

export interface PolyMaxResult {
  report: PolyMaxReport;
  messages: PolyMaxMessage[];
  iterations: number;
  provider: string;
}

export async function runPolymarketMaxSwarm(query: string, maxIterations?: number): Promise<PolyMaxResult> {
  const provider = await resolveProvider();
  const app = buildPolyGraph(provider);
  const finalState = await app.invoke({ query, maxIterations: maxIterations ?? 2 });
  const state = finalState as PolyState;

  return {
    report: state.polyReport ?? {
      scores: { market_edge: 0, arb_quality: 0, machine_potential: 0, data_depth: 0, risk_rating: 0, overall: 0 },
      strategy: "", immediateActions: [], probabilityEstimates: [], arbOpportunities: [], machineIdeas: [],
      topAction: "Analysis failed", summary: "Polymarket Maximizer failed.",
    },
    messages: state.agentMessages, iterations: state.iteration, provider,
  };
}
