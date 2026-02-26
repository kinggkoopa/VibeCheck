/**
 * Math Simulator — Monte Carlo, backtest, and alpha preservation utilities
 *
 * Provides simulation tools for quantifying the impact of code changes
 * on mathematical systems (arbitrage algos, betting models, financial calcs).
 *
 * Stubs for statsmodels/PuLP-equivalent functionality in TypeScript.
 */

// ── Types ──

export interface SimulationConfig {
  iterations: number;
  seed?: number;
  confidenceLevel: number;
  timeHorizon: number;
}

export interface MonteCarloResult {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
  distribution: number[];
  confidenceInterval: [number, number];
}

export interface BacktestResult {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: number;
  equityCurve: number[];
}

export interface AlphaComparison {
  original: BacktestResult;
  modified: BacktestResult;
  alphaDegradation: number;
  edgeChange: number;
  isPreserved: boolean;
  verdict: string;
  impactDetails: AlphaImpactDetail[];
}

export interface AlphaImpactDetail {
  metric: string;
  original: number;
  modified: number;
  change: number;
  changePct: number;
  severity: "none" | "minor" | "moderate" | "critical";
}

export interface SystemMap {
  nodes: SystemNode[];
  edges: SystemEdge[];
  criticalNodes: string[];
}

export interface SystemNode {
  id: string;
  label: string;
  type: "input" | "computation" | "output" | "validation";
  weight: number;
}

export interface SystemEdge {
  from: string;
  to: string;
  label: string;
  weight: number;
}

export interface RestorePoint {
  id: string;
  timestamp: string;
  description: string;
  snapshot: Record<string, unknown>;
  metrics: BacktestResult;
}

// ── Seeded PRNG (Mulberry32) ──

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Statistical helpers ──

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// ── Monte Carlo Simulation ──

/**
 * Run Monte Carlo simulation with a given return-generating function.
 *
 * @param generateReturn - Function that produces a single simulated return
 * @param config - Simulation configuration
 */
export function runMonteCarlo(
  generateReturn: (rng: () => number) => number,
  config: SimulationConfig
): MonteCarloResult {
  const rng = mulberry32(config.seed ?? Date.now());
  const results: number[] = [];

  for (let i = 0; i < config.iterations; i++) {
    let cumulative = 0;
    for (let t = 0; t < config.timeHorizon; t++) {
      cumulative += generateReturn(rng);
    }
    results.push(cumulative);
  }

  const m = mean(results);
  const sd = stdDev(results);
  const alpha = (1 - config.confidenceLevel) / 2;

  return {
    mean: round(m),
    median: round(median(results)),
    stdDev: round(sd),
    min: round(Math.min(...results)),
    max: round(Math.max(...results)),
    percentiles: {
      "5": round(percentile(results, 5)),
      "25": round(percentile(results, 25)),
      "50": round(percentile(results, 50)),
      "75": round(percentile(results, 75)),
      "95": round(percentile(results, 95)),
    },
    distribution: results.map(round),
    confidenceInterval: [
      round(percentile(results, alpha * 100)),
      round(percentile(results, (1 - alpha) * 100)),
    ],
  };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── Backtest Engine ──

/**
 * Run a simple backtest on a series of returns.
 *
 * @param returns - Array of period returns (e.g., daily returns)
 * @param periodsPerYear - Number of periods in a year (252 for daily, 12 for monthly)
 */
export function runBacktest(
  returns: number[],
  periodsPerYear: number = 252
): BacktestResult {
  if (returns.length === 0) {
    return {
      totalReturn: 0, annualizedReturn: 0, sharpeRatio: 0,
      maxDrawdown: 0, winRate: 0, profitFactor: 0, trades: 0, equityCurve: [1],
    };
  }

  const equityCurve: number[] = [1];
  let peak = 1;
  let maxDrawdown = 0;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const r of returns) {
    const newEquity = equityCurve[equityCurve.length - 1] * (1 + r);
    equityCurve.push(newEquity);

    if (newEquity > peak) peak = newEquity;
    const drawdown = (peak - newEquity) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    if (r > 0) {
      wins++;
      grossProfit += r;
    } else {
      grossLoss += Math.abs(r);
    }
  }

  const totalReturn = equityCurve[equityCurve.length - 1] / equityCurve[0] - 1;
  const years = returns.length / periodsPerYear;
  const annualizedReturn = years > 0
    ? Math.pow(1 + totalReturn, 1 / years) - 1
    : totalReturn;

  const avgReturn = mean(returns);
  const returnStdDev = stdDev(returns);
  const sharpeRatio = returnStdDev > 0
    ? (avgReturn * Math.sqrt(periodsPerYear)) / returnStdDev
    : 0;

  const winRate = returns.length > 0 ? wins / returns.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    totalReturn: round(totalReturn),
    annualizedReturn: round(annualizedReturn),
    sharpeRatio: round(sharpeRatio),
    maxDrawdown: round(maxDrawdown),
    winRate: round(winRate),
    profitFactor: round(profitFactor),
    trades: returns.length,
    equityCurve: equityCurve.map(round),
  };
}

// ── Alpha Comparison ──

/**
 * Compare original vs. modified algorithm performance to detect alpha degradation.
 *
 * @param originalReturns - Returns from the original algorithm
 * @param modifiedReturns - Returns from the modified algorithm
 * @param threshold - Maximum acceptable alpha degradation (default 5%)
 */
export function compareAlpha(
  originalReturns: number[],
  modifiedReturns: number[],
  threshold: number = 0.05
): AlphaComparison {
  const original = runBacktest(originalReturns);
  const modified = runBacktest(modifiedReturns);

  const metrics: Array<{ key: keyof BacktestResult; label: string; higherIsBetter: boolean }> = [
    { key: "totalReturn", label: "Total Return", higherIsBetter: true },
    { key: "annualizedReturn", label: "Annualized Return", higherIsBetter: true },
    { key: "sharpeRatio", label: "Sharpe Ratio", higherIsBetter: true },
    { key: "maxDrawdown", label: "Max Drawdown", higherIsBetter: false },
    { key: "winRate", label: "Win Rate", higherIsBetter: true },
    { key: "profitFactor", label: "Profit Factor", higherIsBetter: true },
  ];

  const impactDetails: AlphaImpactDetail[] = metrics.map(({ key, label, higherIsBetter }) => {
    const origVal = original[key] as number;
    const modVal = modified[key] as number;
    const change = modVal - origVal;
    const changePct = origVal !== 0 ? change / Math.abs(origVal) : 0;

    const isWorse = higherIsBetter ? change < 0 : change > 0;
    const absChangePct = Math.abs(changePct);

    let severity: AlphaImpactDetail["severity"];
    if (absChangePct < 0.01) severity = "none";
    else if (absChangePct < 0.05) severity = "minor";
    else if (absChangePct < 0.15) severity = "moderate";
    else severity = "critical";

    if (!isWorse) severity = "none";

    return {
      metric: label,
      original: round(origVal),
      modified: round(modVal),
      change: round(change),
      changePct: round(changePct),
      severity,
    };
  });

  // Compute overall alpha degradation (weighted average of key metrics)
  const returnDeg = original.annualizedReturn !== 0
    ? (original.annualizedReturn - modified.annualizedReturn) / Math.abs(original.annualizedReturn)
    : 0;
  const sharpeDeg = original.sharpeRatio !== 0
    ? (original.sharpeRatio - modified.sharpeRatio) / Math.abs(original.sharpeRatio)
    : 0;

  const alphaDegradation = round(Math.max(0, returnDeg * 0.5 + sharpeDeg * 0.5));
  const edgeChange = round(modified.annualizedReturn - original.annualizedReturn);
  const isPreserved = alphaDegradation <= threshold;

  const criticalCount = impactDetails.filter((d) => d.severity === "critical").length;
  const moderateCount = impactDetails.filter((d) => d.severity === "moderate").length;

  let verdict: string;
  if (isPreserved && criticalCount === 0) {
    verdict = edgeChange >= 0
      ? "Alpha preserved or improved. Safe to proceed."
      : `Alpha preserved within threshold (${round(alphaDegradation * 100)}% degradation). Proceed with caution.`;
  } else {
    verdict = `Alpha degradation detected: ${round(alphaDegradation * 100)}% loss. ` +
      `${criticalCount} critical, ${moderateCount} moderate impacts. ` +
      `Recommend reverting or minimizing changes.`;
  }

  return {
    original,
    modified,
    alphaDegradation,
    edgeChange,
    isPreserved,
    verdict,
    impactDetails,
  };
}

// ── System Mapping ──

/**
 * Build a dependency graph (system map) from algorithm components.
 */
export function buildSystemMap(components: Array<{
  id: string;
  label: string;
  type: SystemNode["type"];
  dependencies: string[];
}>): SystemMap {
  const nodes: SystemNode[] = components.map((c) => ({
    id: c.id,
    label: c.label,
    type: c.type,
    weight: c.type === "computation" ? 2 : c.type === "validation" ? 1.5 : 1,
  }));

  const edges: SystemEdge[] = [];
  for (const comp of components) {
    for (const dep of comp.dependencies) {
      edges.push({
        from: dep,
        to: comp.id,
        label: "feeds",
        weight: 1,
      });
    }
  }

  // Critical nodes: high in-degree or computation type with many dependents
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
  }

  const criticalNodes = nodes
    .filter((n) => {
      const inD = inDegree.get(n.id) ?? 0;
      const outD = outDegree.get(n.id) ?? 0;
      return n.type === "computation" && (inD + outD) >= 2;
    })
    .map((n) => n.id);

  return { nodes, edges, criticalNodes };
}

// ── Restore Points ──

const restorePoints: RestorePoint[] = [];

/**
 * Create a restore point (snapshot) before making changes.
 */
export function createRestorePoint(
  description: string,
  snapshot: Record<string, unknown>,
  returns: number[]
): RestorePoint {
  const point: RestorePoint = {
    id: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    description,
    snapshot,
    metrics: runBacktest(returns),
  };
  restorePoints.push(point);
  return point;
}

/**
 * Get all restore points.
 */
export function getRestorePoints(): RestorePoint[] {
  return [...restorePoints];
}

/**
 * Get a specific restore point by ID.
 */
export function getRestorePoint(id: string): RestorePoint | undefined {
  return restorePoints.find((rp) => rp.id === id);
}

// ── Kelly Criterion Utilities ──

/**
 * Calculate optimal Kelly fraction for a bet/trade.
 */
export function kellyFraction(
  winProbability: number,
  winMultiplier: number,
  lossMultiplier: number = 1
): number {
  if (winProbability <= 0 || winProbability >= 1) return 0;
  if (winMultiplier <= 0 || lossMultiplier <= 0) return 0;

  const kelly = (winProbability * winMultiplier - (1 - winProbability) * lossMultiplier) /
    (winMultiplier * lossMultiplier);

  // Never bet more than 100%, and apply half-Kelly for safety
  return Math.max(0, Math.min(1, kelly));
}

/**
 * Simulate the impact of changing Kelly fraction on long-term returns.
 */
export function simulateKellyImpact(
  winProb: number,
  winMult: number,
  lossMult: number,
  fractions: number[],
  periods: number = 1000,
  simulations: number = 100
): Array<{ fraction: number; result: MonteCarloResult }> {
  return fractions.map((fraction) => {
    const generateReturn = (rng: () => number): number => {
      const isWin = rng() < winProb;
      return isWin ? fraction * winMult : -fraction * lossMult;
    };

    const result = runMonteCarlo(generateReturn, {
      iterations: simulations,
      confidenceLevel: 0.95,
      timeHorizon: periods,
    });

    return { fraction, result };
  });
}

// ── Expected Value ──

/**
 * Calculate expected value of a set of outcomes.
 */
export function expectedValue(
  outcomes: Array<{ probability: number; value: number }>
): number {
  return outcomes.reduce((acc, o) => acc + o.probability * o.value, 0);
}

/**
 * Simulate the impact of changing a parameter on EV.
 */
export function simulateEVImpact(
  baseOutcomes: Array<{ probability: number; value: number }>,
  parameterName: string,
  adjustments: number[]
): Array<{ adjustment: number; ev: number; change: number }> {
  const baseEV = expectedValue(baseOutcomes);

  return adjustments.map((adj) => {
    const modified = baseOutcomes.map((o) => ({
      ...o,
      value: o.value * (1 + adj),
    }));
    const modEV = expectedValue(modified);
    return {
      adjustment: adj,
      ev: round(modEV),
      change: round(modEV - baseEV),
    };
  });
}
