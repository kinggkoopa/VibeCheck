import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Kalshi Alpha Agent — Prediction market edge detection swarm
 *
 * Detects mispricings, arbitrage, and generates profit tools for Kalshi markets.
 *
 * Flow:
 *   fetcher → [mispricing-analyzer, arb-enhancer] (parallel)
 *       ↓
 *   supervisor → profit-creator → edge-scorer
 *
 * Sub-agents:
 * - Fetcher: Analyze available market data (REST API context)
 * - Mispricing Analyzer: EV/Kelly calculations, probability assessment
 * - Arb Enhancer: Cross-platform arbitrage detection (Polymarket, etc.)
 * - Profit Creator: Generate tool ideas (dashboards, bots) if no direct edge
 * - Edge Scorer: Compute Kalshi Edge Score dashboard data
 */

// ── Prompts ──

const KALSHI_PROMPTS = {
  fetcher: `You are a Kalshi prediction market data analyst. Given a user's query about prediction markets,
identify the most relevant markets, categories, and data points to analyze.

Kalshi categories: politics, economics, weather, crypto, finance, sports, entertainment, science, tech, culture.
Kalshi uses fixed-point cent pricing (0-99 cents = 0-99% probability).

Analyze the query and produce a market discovery plan:
{
  "agent": "fetcher",
  "target_categories": ["<category>"],
  "market_queries": ["<specific market search terms>"],
  "data_requirements": ["<what data to pull>"],
  "time_sensitivity": "real-time|daily|weekly",
  "summary": "<what we're looking for>"
}
Return ONLY valid JSON, no markdown fences.`,

  "mispricing-analyzer": `You are a quantitative analyst for prediction markets specializing in mispricing detection.
Given market data, calculate expected values and optimal bet sizing:

1. For each market: Estimate true probability vs. market price
2. Calculate EV for YES and NO positions
3. Apply Kelly Criterion for optimal position sizing
4. Identify markets where the edge exceeds transaction costs (typically 2-5%)
5. Rate confidence in each mispricing assessment

Consider: base rates, recent news, market liquidity, historical accuracy of similar markets.

Return your analysis as JSON:
{
  "agent": "mispricing-analyzer",
  "mispricings": [
    {
      "market": "<title>",
      "current_price": <cents>,
      "estimated_true_prob": <0-1>,
      "ev_yes": <number>,
      "ev_no": <number>,
      "kelly_yes": <0-1>,
      "kelly_no": <0-1>,
      "confidence": "high|medium|low",
      "reasoning": "<why mispriced>"
    }
  ],
  "top_opportunities": ["<best edge descriptions>"],
  "risk_factors": ["<what could go wrong>"],
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "arb-enhancer": `You are a cross-platform arbitrage specialist for prediction markets.
Compare pricing across Kalshi, Polymarket, and other prediction platforms:

1. Identify matching markets across platforms
2. Calculate price spreads and arbitrage opportunities
3. Account for fees, settlement differences, and platform risk
4. Suggest hedging strategies for risk-free profit extraction
5. Assess execution feasibility (liquidity, timing, etc.)

Return your analysis as JSON:
{
  "agent": "arb-enhancer",
  "arbitrage_opportunities": [
    {
      "kalshi_market": "<title>",
      "kalshi_price": <cents>,
      "cross_platform": "<platform>",
      "cross_price": <equivalent cents>,
      "spread": <cents>,
      "direction": "buy-kalshi|buy-cross",
      "estimated_profit_pct": <number>,
      "execution_notes": "<how to execute>",
      "risks": ["<risk>"]
    }
  ],
  "hedging_strategies": ["<strategy description>"],
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "profit-creator": `You are a creative product builder who turns prediction market insights into profitable tools.
When direct betting edges are small, create tool/app ideas that monetize prediction market data:

1. Dashboard Ideas: Real-time market viewers, edge scanners, portfolio trackers
2. Bot Ideas: Alert bots, auto-rebalancers, sentiment aggregators
3. SaaS Ideas: Subscription tools for serious traders/researchers
4. Content Ideas: Newsletter, API reseller, data analytics platform
5. Integration Ideas: Stripe-powered premium features, affiliate programs

For each idea, provide: concept, target user, monetization, tech stack, and time-to-MVP.

Return as JSON:
{
  "agent": "profit-creator",
  "tool_ideas": [
    {
      "name": "<tool name>",
      "concept": "<what it does>",
      "target_user": "<who uses it>",
      "monetization": "<how it makes money>",
      "tech_stack": "<suggested stack>",
      "time_to_mvp": "<estimate>",
      "profit_potential": "high|medium|low"
    }
  ],
  "best_opportunity": "<which idea to build first and why>",
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "edge-scorer": `You are a scoring analyst for prediction market opportunities.
Given all analysis from the team, compute a final Kalshi Edge Score:

Score dimensions (each 1-10):
- Market Edge: Strength of identified mispricings
- Arb Quality: Cross-platform arbitrage feasibility
- Tool Potential: Viability of profit tools if no direct edge
- Data Quality: Confidence in analysis based on available data
- Risk Level: How risky are the identified opportunities (10 = low risk)
- Overall Edge Score: Weighted composite

Return as JSON:
{
  "agent": "edge-scorer",
  "scores": {
    "market_edge": <1-10>,
    "arb_quality": <1-10>,
    "tool_potential": <1-10>,
    "data_quality": <1-10>,
    "risk_level": <1-10>,
    "overall": <1-10>
  },
  "top_action": "<single best action to take>",
  "portfolio_suggestion": "<how to allocate across opportunities>",
  "summary": "<verdict>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const KALSHI_SUPERVISOR_PROMPT = `You are the Kalshi Alpha supervisor. Synthesize findings from all specialists
into a unified edge-finding strategy. Merge mispricing data, arbitrage opportunities,
and tool ideas into a clear action plan.

Return as JSON:
{
  "strategy": "<primary recommended approach>",
  "immediate_actions": ["<do this now>"],
  "edges_found": <number>,
  "total_estimated_ev": "<estimated total EV>",
  "needs_more_data": <boolean>,
  "summary": "<2-3 sentence strategy overview>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface KalshiAlphaReport {
  scores: {
    market_edge: number;
    arb_quality: number;
    tool_potential: number;
    data_quality: number;
    risk_level: number;
    overall: number;
  };
  strategy: string;
  immediateActions: string[];
  mispricings: Array<{
    market: string;
    currentPrice: number;
    estimatedProb: number;
    evYes: number;
    evNo: number;
    confidence: string;
    reasoning: string;
  }>;
  arbOpportunities: Array<{
    kalshiMarket: string;
    kalshiPrice: number;
    crossPlatform: string;
    crossPrice: number;
    spread: number;
    estimatedProfitPct: number;
  }>;
  toolIdeas: Array<{
    name: string;
    concept: string;
    monetization: string;
    profitPotential: string;
  }>;
  topAction: string;
  summary: string;
}

export interface KalshiAlphaMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── LangGraph State ──

const KalshiAnnotation = Annotation.Root({
  query: Annotation<string>,
  agentMessages: Annotation<KalshiAlphaMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  mergedStrategy: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),
  kalshiReport: Annotation<KalshiAlphaReport | null>({ reducer: (_, v) => v, default: () => null }),
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),
  status: Annotation<string>({ reducer: (_, v) => v, default: () => "fetching" }),
});

type KalshiState = typeof KalshiAnnotation.State;

// ── Helpers ──

async function completeWithRetry(
  provider: LLMProvider, systemPrompt: string, userMessage: string,
  options?: { temperature?: number; maxTokens?: number }, maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await complete(provider, systemPrompt, userMessage, options);
    } catch (err) {
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
  throw new Error("No working API key found. Add one in Settings.");
}

// ── Nodes ──

function createKalshiNode(agentName: keyof typeof KALSHI_PROMPTS, provider: LLMProvider) {
  return async (state: KalshiState): Promise<Partial<KalshiState>> => {
    const systemPrompt = await injectMemoryContext(KALSHI_PROMPTS[agentName], state.query);
    const context = agentName === "fetcher"
      ? `User query: ${state.query}`
      : `Query: ${state.query}\n\nMarket Data:\n${state.specialistResults["fetcher"] ?? "N/A"}\n\n${
          ["profit-creator", "edge-scorer"].includes(agentName)
            ? `Mispricings:\n${state.specialistResults["mispricing-analyzer"] ?? "N/A"}\n\nArbitrage:\n${state.specialistResults["arb-enhancer"] ?? "N/A"}\n\nStrategy:\n${state.mergedStrategy}`
            : ""
        }`;

    const result = await completeWithRetry(provider, systemPrompt, context, { temperature: 0.3, maxTokens: 4096 });
    const message: KalshiAlphaMessage = { agent: agentName, content: result, timestamp: new Date().toISOString() };
    try { message.parsedData = JSON.parse(result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()); } catch { /* skip */ }

    return { agentMessages: [message], specialistResults: { [agentName]: result } };
  };
}

function createKalshiSupervisorNode(provider: LLMProvider) {
  return async (state: KalshiState): Promise<Partial<KalshiState>> => {
    const outputs = Object.entries(state.specialistResults)
      .filter(([k]) => ["fetcher", "mispricing-analyzer", "arb-enhancer"].includes(k))
      .map(([a, r]) => `=== ${a.toUpperCase()} ===\n${r}`)
      .join("\n\n");

    const result = await completeWithRetry(provider, KALSHI_SUPERVISOR_PROMPT,
      `Query: ${state.query}\n\nSpecialist Analyses:\n${outputs}`, { temperature: 0.2, maxTokens: 4096 });

    return { mergedStrategy: result, agentMessages: [{ agent: "supervisor", content: result, timestamp: new Date().toISOString() }] };
  };
}

function createKalshiAssemblerNode() {
  return async (state: KalshiState): Promise<Partial<KalshiState>> => {
    const parse = (key: string) => {
      try { return JSON.parse((state.specialistResults[key] ?? "{}").replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()); }
      catch { return {}; }
    };

    const mispricingData = parse("mispricing-analyzer");
    const arbData = parse("arb-enhancer");
    const profitData = parse("profit-creator");
    const scoreData = parse("edge-scorer");
    const strategyData = parse("supervisor") || (() => { try { return JSON.parse(state.mergedStrategy.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()); } catch { return {}; } })();

    const report: KalshiAlphaReport = {
      scores: scoreData.scores ?? { market_edge: 5, arb_quality: 5, tool_potential: 5, data_quality: 5, risk_level: 5, overall: 5 },
      strategy: strategyData.strategy ?? state.mergedStrategy ?? "",
      immediateActions: strategyData.immediate_actions ?? [],
      mispricings: (mispricingData.mispricings ?? []).map((m: Record<string, unknown>) => ({
        market: (m.market ?? "") as string, currentPrice: (m.current_price ?? 0) as number,
        estimatedProb: (m.estimated_true_prob ?? 0) as number, evYes: (m.ev_yes ?? 0) as number,
        evNo: (m.ev_no ?? 0) as number, confidence: (m.confidence ?? "low") as string, reasoning: (m.reasoning ?? "") as string,
      })),
      arbOpportunities: (arbData.arbitrage_opportunities ?? []).map((a: Record<string, unknown>) => ({
        kalshiMarket: (a.kalshi_market ?? "") as string, kalshiPrice: (a.kalshi_price ?? 0) as number,
        crossPlatform: (a.cross_platform ?? "") as string, crossPrice: (a.cross_price ?? 0) as number,
        spread: (a.spread ?? 0) as number, estimatedProfitPct: (a.estimated_profit_pct ?? 0) as number,
      })),
      toolIdeas: (profitData.tool_ideas ?? []).map((t: Record<string, string>) => ({
        name: t.name ?? "", concept: t.concept ?? "", monetization: t.monetization ?? "", profitPotential: t.profit_potential ?? "medium",
      })),
      topAction: scoreData.top_action ?? "Continue monitoring markets",
      summary: scoreData.summary ?? "",
    };

    return {
      kalshiReport: report, iteration: state.iteration + 1, status: "complete",
      agentMessages: [{ agent: "assembler", content: "Kalshi Alpha report assembled.", timestamp: new Date().toISOString() }],
    };
  };
}

// ── Graph ──

function buildKalshiGraph(provider: LLMProvider) {
  return new StateGraph(KalshiAnnotation)
    .addNode("fetcher", createKalshiNode("fetcher", provider))
    .addNode("mispricing-analyzer", createKalshiNode("mispricing-analyzer", provider))
    .addNode("arb-enhancer", createKalshiNode("arb-enhancer", provider))
    .addNode("supervisor", createKalshiSupervisorNode(provider))
    .addNode("profit-creator", createKalshiNode("profit-creator", provider))
    .addNode("edge-scorer", createKalshiNode("edge-scorer", provider))
    .addNode("assembler", createKalshiAssemblerNode())
    .addEdge("__start__", "fetcher")
    .addEdge("fetcher", "mispricing-analyzer")
    .addEdge("fetcher", "arb-enhancer")
    .addEdge("mispricing-analyzer", "supervisor")
    .addEdge("arb-enhancer", "supervisor")
    .addEdge("supervisor", "profit-creator")
    .addEdge("supervisor", "edge-scorer")
    .addEdge("profit-creator", "assembler")
    .addEdge("edge-scorer", "assembler")
    .addEdge("assembler", "__end__")
    .compile();
}

// ── Public API ──

export interface KalshiAlphaResult {
  report: KalshiAlphaReport;
  messages: KalshiAlphaMessage[];
  iterations: number;
  provider: string;
}

export async function runKalshiAlphaSwarm(query: string, maxIterations?: number): Promise<KalshiAlphaResult> {
  const provider = await resolveProvider();
  const app = buildKalshiGraph(provider);
  const finalState = await app.invoke({ query, maxIterations: maxIterations ?? 2 });
  const state = finalState as KalshiState;

  return {
    report: state.kalshiReport ?? {
      scores: { market_edge: 0, arb_quality: 0, tool_potential: 0, data_quality: 0, risk_level: 0, overall: 0 },
      strategy: "", immediateActions: [], mispricings: [], arbOpportunities: [], toolIdeas: [],
      topAction: "Analysis failed", summary: "Kalshi Alpha swarm failed to produce a report.",
    },
    messages: state.agentMessages, iterations: state.iteration, provider,
  };
}
