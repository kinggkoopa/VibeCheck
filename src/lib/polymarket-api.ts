/**
 * Polymarket API Client — Gamma, Data, and CLOB integration
 *
 * Provides typed access to Polymarket prediction markets:
 * - Gamma API: Market discovery, metadata, resolution
 * - Data API: Historical pricing, volume, liquidity
 * - CLOB API: Order book, trades, on-chain settlement
 *
 * Supports all market categories: elections, news, sports, crypto, entertainment.
 */

// ── Types ──

export interface PolyMarket {
  id: string;
  condition_id: string;
  question: string;
  description: string;
  category: string;
  end_date_iso: string;
  active: boolean;
  closed: boolean;
  tokens: PolyToken[];
  volume: number;
  liquidity: number;
  outcome_prices: Record<string, number>;
  market_slug: string;
}

export interface PolyToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean | null;
}

export interface PolyTrade {
  id: string;
  market_id: string;
  side: "BUY" | "SELL";
  outcome: string;
  size: number;
  price: number;
  timestamp: string;
}

export interface PolyOrderbook {
  market_id: string;
  asset_id: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  spread: number;
  mid_price: number;
}

export interface PolyHistoricalPrice {
  timestamp: string;
  price: number;
  volume: number;
}

export interface PolyEdgeScore {
  market_id: string;
  question: string;
  category: string;
  edge_score: number;
  ev_per_outcome: Record<string, number>;
  kelly_per_outcome: Record<string, number>;
  liquidity_score: number;
  volume_24h: number;
  recommendation: "strong-buy" | "lean-buy" | "no-edge" | "lean-sell" | "strong-sell";
  reasoning: string;
}

export interface CrossPlatformArb {
  poly_market_id: string;
  poly_question: string;
  poly_price: number;
  cross_platform: string;
  cross_price: number;
  spread: number;
  direction: "buy-poly" | "buy-cross";
  estimated_profit_pct: number;
  confidence: number;
}

// ── API Configuration ──

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const CLOB_API_BASE = "https://clob.polymarket.com";
const DATA_API_BASE = "https://data-api.polymarket.com";

// ── Category definitions ──

export const POLY_CATEGORIES = [
  "politics",
  "crypto",
  "sports",
  "entertainment",
  "science",
  "business",
  "pop-culture",
  "news",
  "weather",
  "technology",
] as const;

export type PolyCategory = (typeof POLY_CATEGORIES)[number];

// ── Gamma API Client (Market Discovery) ──

export class GammaClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? GAMMA_API_BASE;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gamma API ${res.status}: ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  /** Fetch active markets, optionally filtered */
  async getMarkets(params?: {
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
    order?: "volume" | "liquidity" | "created_at";
  }): Promise<PolyMarket[]> {
    const searchParams = new URLSearchParams();
    if (params?.active !== undefined) searchParams.set("active", String(params.active));
    if (params?.closed !== undefined) searchParams.set("closed", String(params.closed));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    if (params?.order) searchParams.set("order", params.order);

    const query = searchParams.toString();
    return this.request(`/markets${query ? `?${query}` : ""}`);
  }

  /** Fetch a single market by ID or slug */
  async getMarket(idOrSlug: string): Promise<PolyMarket> {
    return this.request(`/markets/${encodeURIComponent(idOrSlug)}`);
  }

  /** Search markets by query string */
  async searchMarkets(query: string, limit?: number): Promise<PolyMarket[]> {
    const params = new URLSearchParams({ query });
    if (limit) params.set("limit", String(limit));
    return this.request(`/markets?${params.toString()}`);
  }
}

// ── CLOB API Client (Order Book) ──

export class CLOBClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? CLOB_API_BASE;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`CLOB API ${res.status}: ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  /** Fetch order book for a token */
  async getOrderbook(tokenId: string): Promise<PolyOrderbook> {
    return this.request(`/book?token_id=${encodeURIComponent(tokenId)}`);
  }

  /** Fetch recent trades for a market */
  async getTrades(marketId: string, limit?: number): Promise<PolyTrade[]> {
    const params = limit ? `&limit=${limit}` : "";
    return this.request(`/trades?market=${encodeURIComponent(marketId)}${params}`);
  }

  /** Fetch midpoint prices for multiple markets */
  async getMidpoints(tokenIds: string[]): Promise<Record<string, number>> {
    const params = tokenIds.map((id) => `token_ids=${id}`).join("&");
    return this.request(`/midpoints?${params}`);
  }
}

// ── Data API Client (Historical) ──

export class DataClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? DATA_API_BASE;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Data API ${res.status}: ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  /** Fetch historical price data for a token */
  async getPriceHistory(
    tokenId: string,
    interval?: "1m" | "5m" | "1h" | "1d"
  ): Promise<PolyHistoricalPrice[]> {
    const params = interval ? `?interval=${interval}` : "";
    return this.request(`/prices/${encodeURIComponent(tokenId)}${params}`);
  }

  /** Fetch volume data for a market */
  async getVolumeHistory(marketId: string): Promise<Array<{ timestamp: string; volume: number }>> {
    return this.request(`/volume/${encodeURIComponent(marketId)}`);
  }
}

// ── Edge detection utilities ──

/**
 * Calculate expected value for a Polymarket position.
 * Prices are in dollars (0-1), representing probability.
 */
export function calculateEV(
  currentPrice: number,
  estimatedProbability: number
): number {
  // EV = estimated_prob * (1 - price) - (1 - estimated_prob) * price
  const ev = estimatedProbability * (1 - currentPrice) - (1 - estimatedProbability) * currentPrice;
  return Math.round(ev * 10000) / 10000;
}

/**
 * Calculate Kelly fraction for a Polymarket position.
 */
export function calculateKelly(
  currentPrice: number,
  estimatedProbability: number
): number {
  if (currentPrice <= 0 || currentPrice >= 1) return 0;

  const odds = (1 - currentPrice) / currentPrice;
  const kelly = (estimatedProbability * odds - (1 - estimatedProbability)) / odds;
  return Math.max(0, Math.round(kelly * 10000) / 10000);
}

/**
 * Score a market for edge potential.
 */
export function scoreMarketEdge(
  market: PolyMarket,
  estimatedProbabilities?: Record<string, number>
): PolyEdgeScore {
  const evPerOutcome: Record<string, number> = {};
  const kellyPerOutcome: Record<string, number> = {};
  let maxEV = 0;

  for (const token of market.tokens) {
    const estProb = estimatedProbabilities?.[token.outcome] ?? token.price;
    const ev = calculateEV(token.price, estProb);
    const kelly = calculateKelly(token.price, estProb);

    evPerOutcome[token.outcome] = ev;
    kellyPerOutcome[token.outcome] = kelly;
    maxEV = Math.max(maxEV, Math.abs(ev));
  }

  // Liquidity score (0-10)
  const liquidityScore = Math.min(10, Math.log10(Math.max(1, market.liquidity)) * 2);

  // Edge score
  const volumeBonus = market.volume > 100000 ? 2 : market.volume > 10000 ? 1 : 0;
  const rawScore = maxEV * 40 + liquidityScore * 0.3 + volumeBonus;
  const edgeScore = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  // Recommendation
  const bestOutcome = Object.entries(evPerOutcome).sort(([, a], [, b]) => b - a)[0];
  let recommendation: PolyEdgeScore["recommendation"] = "no-edge";
  if (bestOutcome) {
    const ev = bestOutcome[1];
    if (ev > 0.10) recommendation = "strong-buy";
    else if (ev > 0.03) recommendation = "lean-buy";
    else if (ev < -0.10) recommendation = "strong-sell";
    else if (ev < -0.03) recommendation = "lean-sell";
  }

  return {
    market_id: market.id,
    question: market.question,
    category: market.category,
    edge_score: edgeScore,
    ev_per_outcome: evPerOutcome,
    kelly_per_outcome: kellyPerOutcome,
    liquidity_score: Math.round(liquidityScore * 10) / 10,
    volume_24h: market.volume,
    recommendation,
    reasoning: `Tokens: ${market.tokens.map((t) => `${t.outcome}@${(t.price * 100).toFixed(0)}¢`).join(", ")} | Vol: $${market.volume.toLocaleString()} | Liq: $${market.liquidity.toLocaleString()}`,
  };
}

/**
 * Detect cross-platform arbitrage between Polymarket and another source.
 */
export function detectArbitrage(
  polyMarket: PolyMarket,
  crossPlatformPrices: Record<string, number>,
  crossPlatformName: string = "Kalshi"
): CrossPlatformArb[] {
  const arbs: CrossPlatformArb[] = [];

  for (const token of polyMarket.tokens) {
    const crossPrice = crossPlatformPrices[token.outcome];
    if (crossPrice === undefined) continue;

    const polyPrice = token.price;
    const spread = Math.abs(polyPrice - crossPrice);

    // Need at least 3% spread to overcome costs
    if (spread < 0.03) continue;

    arbs.push({
      poly_market_id: polyMarket.id,
      poly_question: polyMarket.question,
      poly_price: polyPrice,
      cross_platform: crossPlatformName,
      cross_price: crossPrice,
      spread: Math.round(spread * 10000) / 10000,
      direction: polyPrice < crossPrice ? "buy-poly" : "buy-cross",
      estimated_profit_pct: Math.round((spread / Math.min(polyPrice, crossPrice)) * 10000) / 100,
      confidence: Math.min(1, spread / 0.1),
    });
  }

  return arbs;
}

/**
 * Probability fusion: weighted average of multiple probability estimates.
 */
export function fuseProbabilities(
  estimates: Array<{ source: string; probability: number; weight: number }>
): number {
  const totalWeight = estimates.reduce((acc, e) => acc + e.weight, 0);
  if (totalWeight === 0) return 0.5;

  const weighted = estimates.reduce((acc, e) => acc + e.probability * e.weight, 0);
  return Math.round((weighted / totalWeight) * 10000) / 10000;
}
