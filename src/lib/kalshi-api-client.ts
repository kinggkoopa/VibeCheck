/**
 * Kalshi API Client — REST and WebSocket integration
 *
 * Provides typed access to the Kalshi prediction market API:
 * - REST: Markets, events, trades, portfolio
 * - WebSocket: Real-time orderbook and trade updates
 * - Fixed-point cent pricing per Kalshi 2026 spec
 *
 * SECURITY: API keys are encrypted in Supabase via BYOK, never logged.
 */

// ── Types ──

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle: string;
  category: string;
  status: "open" | "closed" | "settled";
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  close_time: string;
  result: "yes" | "no" | null;
  rules_primary: string;
}

export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  markets: KalshiMarket[];
  status: "open" | "closed" | "settled";
}

export interface KalshiTrade {
  trade_id: string;
  ticker: string;
  side: "yes" | "no";
  count: number;
  price: number;
  timestamp: string;
}

export interface KalshiPosition {
  ticker: string;
  market_title: string;
  side: "yes" | "no";
  count: number;
  average_price: number;
  current_price: number;
  pnl: number;
}

export interface KalshiOrderbook {
  ticker: string;
  yes_bids: Array<{ price: number; quantity: number }>;
  yes_asks: Array<{ price: number; quantity: number }>;
  no_bids: Array<{ price: number; quantity: number }>;
  no_asks: Array<{ price: number; quantity: number }>;
}

export interface KalshiEdgeScore {
  ticker: string;
  title: string;
  category: string;
  edge_score: number;
  ev_yes: number;
  ev_no: number;
  kelly_yes: number;
  kelly_no: number;
  spread: number;
  volume_signal: "high" | "medium" | "low";
  mispricing_confidence: number;
  recommendation: "strong-yes" | "lean-yes" | "no-edge" | "lean-no" | "strong-no";
  reasoning: string;
}

export interface KalshiArbOpportunity {
  kalshi_ticker: string;
  kalshi_price: number;
  cross_platform: string;
  cross_price: number;
  spread: number;
  direction: "buy-kalshi" | "buy-cross";
  estimated_profit_pct: number;
  confidence: number;
}

// ── API Configuration ──

const KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const KALSHI_WS_BASE = "wss://api.elections.kalshi.com/trade-api/ws/v2";

// ── Category definitions ──

export const KALSHI_CATEGORIES = [
  "politics",
  "economics",
  "weather",
  "crypto",
  "finance",
  "sports",
  "entertainment",
  "science",
  "tech",
  "culture",
] as const;

export type KalshiCategory = (typeof KALSHI_CATEGORIES)[number];

// ── Client class ──

export class KalshiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? KALSHI_API_BASE;
  }

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Kalshi API ${res.status}: ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  /** Fetch all active markets, optionally filtered by category */
  async getMarkets(params?: {
    category?: KalshiCategory;
    status?: "open" | "closed" | "settled";
    limit?: number;
    cursor?: string;
  }): Promise<{ markets: KalshiMarket[]; cursor: string }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);

    const query = searchParams.toString();
    return this.request(`/markets${query ? `?${query}` : ""}`);
  }

  /** Fetch a single market by ticker */
  async getMarket(ticker: string): Promise<{ market: KalshiMarket }> {
    return this.request(`/markets/${encodeURIComponent(ticker)}`);
  }

  /** Fetch an event and its associated markets */
  async getEvent(eventTicker: string): Promise<{ event: KalshiEvent }> {
    return this.request(`/events/${encodeURIComponent(eventTicker)}`);
  }

  /** Fetch the orderbook for a market */
  async getOrderbook(ticker: string): Promise<KalshiOrderbook> {
    return this.request(`/markets/${encodeURIComponent(ticker)}/orderbook`);
  }

  /** Fetch trade history for a market */
  async getTrades(ticker: string, limit?: number): Promise<{ trades: KalshiTrade[] }> {
    const params = limit ? `?limit=${limit}` : "";
    return this.request(`/markets/${encodeURIComponent(ticker)}/trades${params}`);
  }

  /** Fetch user portfolio positions */
  async getPositions(): Promise<{ positions: KalshiPosition[] }> {
    return this.request("/portfolio/positions");
  }

  /** Fetch user balance */
  async getBalance(): Promise<{ balance: number }> {
    return this.request("/portfolio/balance");
  }
}

// ── Edge detection utilities ──

/**
 * Calculate expected value for a Kalshi market.
 * Prices are in cents (0-99), representing probability × 100.
 */
export function calculateEV(
  price: number,
  estimatedProbability: number
): { ev_yes: number; ev_no: number } {
  const priceFraction = price / 100;
  const ev_yes = estimatedProbability * (1 - priceFraction) - (1 - estimatedProbability) * priceFraction;
  const ev_no = (1 - estimatedProbability) * (1 - (1 - priceFraction)) - estimatedProbability * (1 - priceFraction);

  return {
    ev_yes: Math.round(ev_yes * 10000) / 10000,
    ev_no: Math.round(ev_no * 10000) / 10000,
  };
}

/**
 * Calculate Kelly fraction for a Kalshi market position.
 */
export function calculateKelly(
  price: number,
  estimatedProbability: number
): { kelly_yes: number; kelly_no: number } {
  const p = price / 100;

  // Kelly for YES: (prob * odds - (1-prob)) / odds
  const odds_yes = (1 - p) / p;
  const kelly_yes = odds_yes > 0
    ? (estimatedProbability * odds_yes - (1 - estimatedProbability)) / odds_yes
    : 0;

  // Kelly for NO: ((1-prob) * odds - prob) / odds
  const odds_no = p / (1 - p);
  const kelly_no = odds_no > 0
    ? ((1 - estimatedProbability) * odds_no - estimatedProbability) / odds_no
    : 0;

  return {
    kelly_yes: Math.max(0, Math.round(kelly_yes * 10000) / 10000),
    kelly_no: Math.max(0, Math.round(kelly_no * 10000) / 10000),
  };
}

/**
 * Score a market for mispricing/edge potential.
 */
export function scoreMarketEdge(
  market: KalshiMarket,
  estimatedProbability?: number
): KalshiEdgeScore {
  const midPrice = (market.yes_bid + market.yes_ask) / 2;
  const spread = market.yes_ask - market.yes_bid;
  const estProb = estimatedProbability ?? midPrice / 100;

  const { ev_yes, ev_no } = calculateEV(midPrice, estProb);
  const { kelly_yes, kelly_no } = calculateKelly(midPrice, estProb);

  // Volume signal
  const volumeSignal: "high" | "medium" | "low" =
    market.volume > 10000 ? "high" : market.volume > 1000 ? "medium" : "low";

  // Edge score (0-10)
  const evEdge = Math.max(Math.abs(ev_yes), Math.abs(ev_no));
  const spreadPenalty = spread > 5 ? 2 : spread > 2 ? 1 : 0;
  const volumeBonus = volumeSignal === "high" ? 1 : volumeSignal === "medium" ? 0.5 : 0;
  const rawScore = evEdge * 50 + volumeBonus - spreadPenalty;
  const edgeScore = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  // Recommendation
  let recommendation: KalshiEdgeScore["recommendation"] = "no-edge";
  if (ev_yes > 0.05) recommendation = ev_yes > 0.15 ? "strong-yes" : "lean-yes";
  else if (ev_no > 0.05) recommendation = ev_no > 0.15 ? "strong-no" : "lean-no";

  const mispricingConfidence = Math.min(1, evEdge * 5);

  return {
    ticker: market.ticker,
    title: market.title,
    category: market.category,
    edge_score: edgeScore,
    ev_yes,
    ev_no,
    kelly_yes,
    kelly_no,
    spread,
    volume_signal: volumeSignal,
    mispricing_confidence: Math.round(mispricingConfidence * 100) / 100,
    recommendation,
    reasoning: `Mid: ${midPrice}¢ | Est. Prob: ${Math.round(estProb * 100)}% | EV(Y): ${(ev_yes * 100).toFixed(1)}¢ | EV(N): ${(ev_no * 100).toFixed(1)}¢ | Spread: ${spread}¢ | Vol: ${market.volume}`,
  };
}

/**
 * Detect cross-platform arbitrage between Kalshi and another source.
 */
export function detectArbitrage(
  kalshiMarket: KalshiMarket,
  crossPlatformPrice: number,
  crossPlatformName: string = "Polymarket"
): KalshiArbOpportunity | null {
  const kalshiMid = (kalshiMarket.yes_bid + kalshiMarket.yes_ask) / 2;
  const spread = Math.abs(kalshiMid - crossPlatformPrice);

  // Need at least 3 cents of spread to overcome transaction costs
  if (spread < 3) return null;

  const direction: "buy-kalshi" | "buy-cross" =
    kalshiMid < crossPlatformPrice ? "buy-kalshi" : "buy-cross";

  const estimatedProfitPct = (spread / Math.min(kalshiMid, crossPlatformPrice)) * 100;

  return {
    kalshi_ticker: kalshiMarket.ticker,
    kalshi_price: kalshiMid,
    cross_platform: crossPlatformName,
    cross_price: crossPlatformPrice,
    spread,
    direction,
    estimated_profit_pct: Math.round(estimatedProfitPct * 100) / 100,
    confidence: Math.min(1, spread / 10),
  };
}

/**
 * Create a WebSocket connection spec for real-time market data.
 * Returns configuration — actual connection managed by the component.
 */
export function createWSConfig(apiKey: string, tickers: string[]): {
  url: string;
  headers: Record<string, string>;
  subscribeMessage: string;
} {
  return {
    url: KALSHI_WS_BASE,
    headers: { Authorization: `Bearer ${apiKey}` },
    subscribeMessage: JSON.stringify({
      type: "subscribe",
      channels: tickers.map((t) => ({
        name: "orderbook",
        market_ticker: t,
      })),
    }),
  };
}
