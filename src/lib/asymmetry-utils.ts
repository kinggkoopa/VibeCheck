/**
 * Asymmetry Utilities — Market gap analysis and scraper stubs
 *
 * Provides tools for identifying information asymmetries, pricing inefficiencies,
 * and undervalued APIs that can be composed into profitable products.
 *
 * These are stub implementations that define the interfaces and logic structure.
 * In production, they would connect to real data sources, APIs, and web scrapers.
 */

// ── Types ──

export interface MarketGap {
  niche: string;
  description: string;
  evidence: string[];
  estimated_demand: "high" | "medium" | "low";
  competition_level: "saturated" | "moderate" | "underserved" | "blue-ocean";
  suggested_approach: string;
}

export interface APIOpportunity {
  name: string;
  provider: string;
  free_tier: {
    requests_per_month: number;
    features: string[];
  };
  paid_tier_start: number;
  arbitrage_potential: string;
  product_ideas: string[];
}

export interface PricingInefficiency {
  market: string;
  description: string;
  current_price_range: { low: number; high: number };
  fair_value_estimate: number;
  inefficiency_type: "overpriced" | "underpriced" | "mispriced-tier" | "bundling-gap";
  exploit_strategy: string;
}

export interface AsymmetryReport {
  gaps: MarketGap[];
  api_opportunities: APIOpportunity[];
  pricing_inefficiencies: PricingInefficiency[];
  composite_score: number;
  top_opportunity: string;
}

// ── Known API directory (curated high-value free tiers) ──

const KNOWN_API_OPPORTUNITIES: APIOpportunity[] = [
  {
    name: "OpenAI API",
    provider: "OpenAI",
    free_tier: { requests_per_month: 0, features: ["$5 free credits for new accounts"] },
    paid_tier_start: 0.002,
    arbitrage_potential: "Wrap GPT in niche-specific UI for 10-50x markup",
    product_ideas: ["Niche content generators", "Domain-specific chatbots", "AI writing tools for specific industries"],
  },
  {
    name: "Serper API",
    provider: "Serper",
    free_tier: { requests_per_month: 2500, features: ["Google search results", "News", "Images"] },
    paid_tier_start: 50,
    arbitrage_potential: "Build SEO/competitor analysis tools on top of search data",
    product_ideas: ["Rank trackers", "Competitor monitors", "Lead gen tools"],
  },
  {
    name: "Hunter.io",
    provider: "Hunter",
    free_tier: { requests_per_month: 25, features: ["Email finder", "Email verifier"] },
    paid_tier_start: 49,
    arbitrage_potential: "Compose with enrichment APIs for outbound sales tools",
    product_ideas: ["Sales prospecting platforms", "Lead enrichment tools", "Outreach automators"],
  },
  {
    name: "Alpha Vantage",
    provider: "Alpha Vantage",
    free_tier: { requests_per_month: 500, features: ["Stock data", "Forex", "Crypto", "Technical indicators"] },
    paid_tier_start: 49.99,
    arbitrage_potential: "Build financial analysis dashboards and screeners",
    product_ideas: ["Stock screeners", "Arbitrage finders", "Portfolio trackers"],
  },
  {
    name: "Abstract API",
    provider: "Abstract",
    free_tier: { requests_per_month: 1000, features: ["IP geolocation", "Email validation", "Phone validation"] },
    paid_tier_start: 9,
    arbitrage_potential: "Compose into verification/compliance tools",
    product_ideas: ["KYC tools", "Fraud detection", "User verification flows"],
  },
];

// ── High-margin niche database ──

const HIGH_MARGIN_NICHES: MarketGap[] = [
  {
    niche: "Legal Document Automation",
    description: "AI-powered legal document generation for small businesses",
    evidence: ["$25B legal tech market", "Lawyers bill $200-500/hr", "Most small businesses can't afford legal review"],
    estimated_demand: "high",
    competition_level: "moderate",
    suggested_approach: "Template-based with AI customization, $29-99/mo SaaS",
  },
  {
    niche: "Niche Job Board Aggregators",
    description: "Vertical-specific job boards for underserved industries",
    evidence: ["Job boards have 80%+ margins", "Niche boards convert 3-5x better", "Low customer acquisition cost"],
    estimated_demand: "high",
    competition_level: "underserved",
    suggested_approach: "Scrape + curate for specific industry, charge employers $99-299/posting",
  },
  {
    niche: "API Usage Analytics",
    description: "Track, analyze, and optimize API spending across providers",
    evidence: ["Companies spend $50K+/yr on APIs", "No good unified dashboard exists", "Easy to show ROI"],
    estimated_demand: "medium",
    competition_level: "blue-ocean",
    suggested_approach: "Connect via API keys, show spend analytics, suggest optimizations, $49-199/mo",
  },
  {
    niche: "Micro-SaaS for Accountants",
    description: "Specialized tools for niche accounting workflows",
    evidence: ["400K+ accounting firms in US", "Willing to pay for productivity", "Low churn in B2B"],
    estimated_demand: "high",
    competition_level: "moderate",
    suggested_approach: "Focus on one painful workflow (e.g., client onboarding), $19-79/mo per seat",
  },
  {
    niche: "Content Repurposing Tools",
    description: "Auto-convert long-form content into social media posts, newsletters, threads",
    evidence: ["Content creators need 10+ platforms", "Manual repurposing takes hours", "Growing creator economy"],
    estimated_demand: "high",
    competition_level: "moderate",
    suggested_approach: "AI-powered with templates per platform, freemium with $15-49/mo pro tier",
  },
];

// ── Core functions ──

/**
 * Scan for market gaps relevant to a given idea/niche.
 * In production, this would query trend APIs, scrape forums, and analyze search data.
 */
export function scanMarketGaps(idea: string): MarketGap[] {
  const ideaLower = idea.toLowerCase();
  const keywords = ideaLower.split(/\s+/);

  // Score each niche by relevance to the idea
  const scored = HIGH_MARGIN_NICHES.map((gap) => {
    const nicheText = `${gap.niche} ${gap.description} ${gap.suggested_approach}`.toLowerCase();
    const score = keywords.reduce((acc, kw) => {
      return acc + (nicheText.includes(kw) ? 1 : 0);
    }, 0);
    return { gap, score };
  });

  // Return relevant gaps sorted by score, plus always include top opportunities
  const relevant = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.gap);

  // Always include at least 2 suggestions
  if (relevant.length < 2) {
    const topGaps = HIGH_MARGIN_NICHES
      .filter((g) => !relevant.includes(g))
      .slice(0, 2 - relevant.length);
    return [...relevant, ...topGaps];
  }

  return relevant;
}

/**
 * Find API arbitrage opportunities relevant to an idea.
 * In production, this would dynamically discover and evaluate API pricing.
 */
export function findAPIOpportunities(idea: string): APIOpportunity[] {
  const ideaLower = idea.toLowerCase();

  const scored = KNOWN_API_OPPORTUNITIES.map((api) => {
    const apiText = `${api.name} ${api.arbitrage_potential} ${api.product_ideas.join(" ")}`.toLowerCase();
    const score = ideaLower.split(/\s+/).reduce((acc, kw) => {
      return acc + (apiText.includes(kw) ? 1 : 0);
    }, 0);
    return { api, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.api);
}

/**
 * Detect pricing inefficiencies in a market segment.
 * Stub — in production would scrape competitor pricing pages and analyze.
 */
export function detectPricingInefficiencies(niche: string): PricingInefficiency[] {
  // Stub patterns based on common inefficiency types
  return [
    {
      market: niche,
      description: `Most ${niche} tools bundle features that solo users don't need`,
      current_price_range: { low: 29, high: 199 },
      fair_value_estimate: 15,
      inefficiency_type: "bundling-gap",
      exploit_strategy: "Offer unbundled, focused tool at 1/3 the price of full suites",
    },
    {
      market: niche,
      description: `Enterprise-grade solutions overcharge small teams in ${niche}`,
      current_price_range: { low: 99, high: 499 },
      fair_value_estimate: 39,
      inefficiency_type: "mispriced-tier",
      exploit_strategy: "Target the underserved SMB segment with right-sized pricing",
    },
  ];
}

/**
 * Generate a complete asymmetry analysis report for an idea.
 */
export function generateAsymmetryReport(idea: string): AsymmetryReport {
  const gaps = scanMarketGaps(idea);
  const apiOpportunities = findAPIOpportunities(idea);
  const pricingInefficiencies = detectPricingInefficiencies(idea);

  // Composite score: weighted average of opportunity indicators
  const gapScore = Math.min(gaps.length * 2, 10);
  const apiScore = Math.min(apiOpportunities.length * 3, 10);
  const pricingScore = Math.min(pricingInefficiencies.length * 4, 10);
  const compositeScore = Math.round((gapScore * 0.4 + apiScore * 0.3 + pricingScore * 0.3) * 10) / 10;

  const topOpportunity = gaps.length > 0
    ? `${gaps[0].niche}: ${gaps[0].suggested_approach}`
    : "Explore adjacent niches for better market fit";

  return {
    gaps,
    api_opportunities: apiOpportunities,
    pricing_inefficiencies: pricingInefficiencies,
    composite_score: compositeScore,
    top_opportunity: topOpportunity,
  };
}

/**
 * Estimate simulated profitability based on revenue model + costs.
 * Used by the usage tracker integration for profitability simulations.
 */
export function simulateProfitability(params: {
  monthly_users: number;
  conversion_rate: number;
  avg_revenue_per_user: number;
  cac: number;
  monthly_fixed_costs: number;
  monthly_variable_cost_per_user: number;
}): {
  mrr: number;
  monthly_costs: number;
  monthly_profit: number;
  months_to_breakeven: number;
  ltv_cac_ratio: number;
  is_viable: boolean;
} {
  const paying_users = Math.floor(params.monthly_users * params.conversion_rate);
  const mrr = paying_users * params.avg_revenue_per_user;
  const monthly_costs = params.monthly_fixed_costs +
    (params.monthly_users * params.monthly_variable_cost_per_user);
  const monthly_profit = mrr - monthly_costs;

  const total_cac = paying_users * params.cac;
  const months_to_breakeven = monthly_profit > 0
    ? Math.ceil(total_cac / monthly_profit)
    : Infinity;

  // Assume 12-month average customer lifetime for LTV
  const ltv = params.avg_revenue_per_user * 12;
  const ltv_cac_ratio = params.cac > 0 ? ltv / params.cac : Infinity;

  return {
    mrr,
    monthly_costs,
    monthly_profit,
    months_to_breakeven: Number.isFinite(months_to_breakeven) ? months_to_breakeven : -1,
    ltv_cac_ratio: Number.isFinite(ltv_cac_ratio) ? Math.round(ltv_cac_ratio * 10) / 10 : 0,
    is_viable: monthly_profit > 0 && ltv_cac_ratio >= 3,
  };
}
