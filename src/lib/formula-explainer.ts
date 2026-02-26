/**
 * Formula Explainer — sympy-style integration for math explanation
 *
 * Provides symbolic math manipulation, LaTeX rendering helpers,
 * and natural language explanation utilities for mathematical code.
 *
 * Stub for sympy/mpmath equivalents in TypeScript — uses pattern matching
 * and template-based explanations for common mathematical constructs.
 */

// ── Types ──

export interface FormulaExplanation {
  expression: string;
  plainEnglish: string;
  latex: string;
  category: string;
  variables: VariableExplanation[];
  numericalExample: NumericalExample;
  visualHint: string;
  relatedConcepts: string[];
}

export interface VariableExplanation {
  symbol: string;
  meaning: string;
  typicalRange: string;
  unit?: string;
}

export interface NumericalExample {
  inputs: Record<string, number>;
  output: number;
  explanation: string;
}

export interface DiagramSpec {
  type: "line" | "bar" | "scatter" | "heatmap" | "flow";
  title: string;
  xAxis: string;
  yAxis: string;
  dataDescription: string;
  insight: string;
}

export interface MathTutorial {
  topic: string;
  prerequisites: string[];
  explanation: string;
  examples: NumericalExample[];
  practiceProblems: string[];
  furtherReading: string[];
}

// ── Known formula database ──

const KNOWN_FORMULAS: Record<string, {
  name: string;
  latex: string;
  explanation: string;
  variables: VariableExplanation[];
  category: string;
  example: NumericalExample;
  visual: string;
  related: string[];
}> = {
  kelly: {
    name: "Kelly Criterion",
    latex: "f^* = \\frac{p \\cdot b - q}{b}",
    explanation: "The Kelly Criterion determines the optimal fraction of your bankroll to bet/invest. It maximizes long-term growth rate by balancing the trade-off between betting too much (risk of ruin) and too little (slow growth). The formula says: bet more when the edge is bigger relative to the odds.",
    variables: [
      { symbol: "f*", meaning: "Optimal fraction of bankroll to bet", typicalRange: "0 to 1", unit: "fraction" },
      { symbol: "p", meaning: "Probability of winning", typicalRange: "0 to 1", unit: "probability" },
      { symbol: "q", meaning: "Probability of losing (1-p)", typicalRange: "0 to 1", unit: "probability" },
      { symbol: "b", meaning: "Net odds received on the bet (payout ratio)", typicalRange: "> 0", unit: "ratio" },
    ],
    category: "financial",
    example: {
      inputs: { p: 0.6, q: 0.4, b: 1 },
      output: 0.2,
      explanation: "With a 60% win rate on even-money bets (b=1): f* = (0.6 × 1 - 0.4) / 1 = 0.2. Bet 20% of your bankroll each time.",
    },
    visual: "Plot f* vs p for fixed b: starts negative at p=0, crosses zero at p=q/b, rises linearly to 1. The curve shows that small edges require small bets.",
    related: ["Expected Value", "Geometric Growth Rate", "Risk of Ruin", "Half-Kelly"],
  },
  expectedValue: {
    name: "Expected Value",
    latex: "E[X] = \\sum_{i} p_i \\cdot x_i",
    explanation: "Expected Value (EV) is the probability-weighted average of all possible outcomes. It tells you what result to expect 'on average' over many repetitions. Positive EV means you'll profit long-term; negative EV means you'll lose.",
    variables: [
      { symbol: "E[X]", meaning: "Expected value of random variable X", typicalRange: "any real number", unit: "same as outcome" },
      { symbol: "p_i", meaning: "Probability of outcome i", typicalRange: "0 to 1", unit: "probability" },
      { symbol: "x_i", meaning: "Value of outcome i", typicalRange: "any real number", unit: "varies" },
    ],
    category: "probability",
    example: {
      inputs: { p_win: 0.4, win_amount: 100, p_lose: 0.6, lose_amount: -50 },
      output: 10,
      explanation: "Win $100 with 40% chance, lose $50 with 60% chance: EV = 0.4 × 100 + 0.6 × (-50) = 40 - 30 = $10. Positive EV — profitable long-term.",
    },
    visual: "Bar chart showing each outcome × probability. The EV line sits at the weighted center of mass.",
    related: ["Variance", "Standard Deviation", "Kelly Criterion", "Law of Large Numbers"],
  },
  sharpe: {
    name: "Sharpe Ratio",
    latex: "S = \\frac{R_p - R_f}{\\sigma_p}",
    explanation: "The Sharpe Ratio measures risk-adjusted return. It tells you how much excess return you get per unit of risk (volatility). Higher is better: >1 is good, >2 is great, >3 is exceptional. It penalizes strategies that achieve returns through excessive risk-taking.",
    variables: [
      { symbol: "S", meaning: "Sharpe Ratio", typicalRange: "-3 to 5", unit: "dimensionless" },
      { symbol: "R_p", meaning: "Portfolio return (annualized)", typicalRange: "-100% to +500%", unit: "percent" },
      { symbol: "R_f", meaning: "Risk-free rate", typicalRange: "0% to 10%", unit: "percent" },
      { symbol: "σ_p", meaning: "Standard deviation of returns (annualized)", typicalRange: "> 0", unit: "percent" },
    ],
    category: "financial",
    example: {
      inputs: { Rp: 0.15, Rf: 0.05, sigma: 0.10 },
      output: 1.0,
      explanation: "Portfolio returns 15%, risk-free rate 5%, volatility 10%: Sharpe = (15% - 5%) / 10% = 1.0. Decent but not spectacular risk-adjusted performance.",
    },
    visual: "Scatter plot of strategies: x-axis = volatility, y-axis = return. Sharpe is the slope from the risk-free point to the strategy. Steeper = better.",
    related: ["Sortino Ratio", "Calmar Ratio", "Maximum Drawdown", "Volatility"],
  },
  variance: {
    name: "Variance",
    latex: "\\sigma^2 = \\frac{1}{N-1} \\sum_{i=1}^{N} (x_i - \\bar{x})^2",
    explanation: "Variance measures how spread out values are from the mean. High variance means results are wildly different each time; low variance means results are consistent. It's the average of squared deviations — squaring ensures negative deviations don't cancel positive ones.",
    variables: [
      { symbol: "σ²", meaning: "Variance", typicalRange: ">= 0", unit: "squared units" },
      { symbol: "N", meaning: "Number of observations", typicalRange: ">= 2", unit: "count" },
      { symbol: "x_i", meaning: "Individual observation", typicalRange: "any", unit: "varies" },
      { symbol: "x̄", meaning: "Sample mean", typicalRange: "any", unit: "same as observations" },
    ],
    category: "statistics",
    example: {
      inputs: { values_csv: "2, 4, 4, 4, 5, 5, 7, 9" },
      output: 4,
      explanation: "Mean = 5. Deviations: [-3,-1,-1,-1,0,0,2,4]. Squared: [9,1,1,1,0,0,4,16]. Sum = 32. Variance = 32/7 ≈ 4.57.",
    },
    visual: "Histogram with mean line. Variance is visually the 'width' of the distribution. Narrow = low variance, wide = high variance.",
    related: ["Standard Deviation", "Covariance", "Normal Distribution", "Chebyshev's Inequality"],
  },
  blackScholes: {
    name: "Black-Scholes Option Pricing",
    latex: "C = S_0 N(d_1) - K e^{-rT} N(d_2)",
    explanation: "The Black-Scholes formula prices European-style options. It calculates the 'fair' price of a call option based on the current stock price, strike price, time to expiration, risk-free rate, and volatility. The key insight: options can be replicated by continuously rebalancing a stock/bond portfolio.",
    variables: [
      { symbol: "C", meaning: "Call option price", typicalRange: ">= 0", unit: "currency" },
      { symbol: "S₀", meaning: "Current stock price", typicalRange: "> 0", unit: "currency" },
      { symbol: "K", meaning: "Strike price", typicalRange: "> 0", unit: "currency" },
      { symbol: "r", meaning: "Risk-free interest rate", typicalRange: "0 to 0.15", unit: "annualized rate" },
      { symbol: "T", meaning: "Time to expiration", typicalRange: "> 0", unit: "years" },
      { symbol: "N()", meaning: "Cumulative standard normal distribution", typicalRange: "0 to 1", unit: "probability" },
    ],
    category: "financial",
    example: {
      inputs: { S0: 100, K: 100, r: 0.05, T: 1, sigma: 0.2 },
      output: 10.45,
      explanation: "At-the-money option: stock = strike = $100, 1 year, 5% rate, 20% vol. Fair price ≈ $10.45. This is the cost of insurance against the stock going up.",
    },
    visual: "3D surface: option price vs (stock price, volatility). Shows convexity — price increases faster as stock rises (gamma). The 'smile' pattern in implied vol.",
    related: ["Greeks (Delta, Gamma, Theta, Vega)", "Implied Volatility", "Put-Call Parity", "Risk-Neutral Pricing"],
  },
  monteCarlo: {
    name: "Monte Carlo Simulation",
    latex: "\\hat{\\mu} = \\frac{1}{N} \\sum_{i=1}^{N} f(X_i), \\quad X_i \\sim P",
    explanation: "Monte Carlo simulation estimates outcomes by running thousands of random trials. Instead of solving a complex equation analytically, you simulate the process many times and look at the distribution of results. It works for any system, no matter how complex — just simulate it enough times.",
    variables: [
      { symbol: "μ̂", meaning: "Estimated expected value", typicalRange: "any", unit: "varies" },
      { symbol: "N", meaning: "Number of simulations", typicalRange: "1000 to 1,000,000", unit: "count" },
      { symbol: "f(Xᵢ)", meaning: "Outcome of simulation i", typicalRange: "any", unit: "varies" },
      { symbol: "P", meaning: "Probability distribution of inputs", typicalRange: "any valid distribution", unit: "varies" },
    ],
    category: "probability",
    example: {
      inputs: { simulations: 10000, win_prob: 0.55, bet_size: 0.1, rounds: 100 },
      output: 1.42,
      explanation: "10,000 simulations of 100 bets at 55% win rate, betting 10% each time. Average final bankroll = 1.42× starting (42% profit). But some paths lead to ruin — the distribution matters as much as the mean.",
    },
    visual: "Fan chart: many equity curves diverging over time. The width shows uncertainty. Mean path in bold, percentile bands fading out.",
    related: ["Bootstrap Sampling", "Random Walk", "Central Limit Theorem", "Confidence Intervals"],
  },
};

// ── Core functions ──

/**
 * Explain a formula detected in code, matching against known formulas.
 */
export function explainFormula(expression: string, category?: string): FormulaExplanation | null {
  const exprLower = expression.toLowerCase();

  // Try to match against known formulas
  for (const [key, formula] of Object.entries(KNOWN_FORMULAS)) {
    const matchTerms: Record<string, string[]> = {
      kelly: ["kelly", "bankroll", "fraction", "bet_size", "f_star"],
      expectedValue: ["expected_value", "ev", "expectation", "probability * value", "p * x"],
      sharpe: ["sharpe", "risk_adjusted", "excess_return", "rp - rf"],
      variance: ["variance", "std_dev", "standard_deviation", "sigma"],
      blackScholes: ["black_scholes", "option_price", "call_price", "put_price", "d1", "d2"],
      monteCarlo: ["monte_carlo", "simulation", "random_walk", "num_sims"],
    };

    const terms = matchTerms[key] ?? [key];
    if (terms.some((term) => exprLower.includes(term)) || category === formula.category) {
      return {
        expression,
        plainEnglish: formula.explanation,
        latex: formula.latex,
        category: formula.category,
        variables: formula.variables,
        numericalExample: formula.example,
        visualHint: formula.visual,
        relatedConcepts: formula.related,
      };
    }
  }

  return null;
}

/**
 * Generate a complete explanation for all math in a code snippet.
 */
export function explainAllMath(code: string): FormulaExplanation[] {
  const explanations: FormulaExplanation[] = [];
  const seen = new Set<string>();

  for (const [key, formula] of Object.entries(KNOWN_FORMULAS)) {
    const matchPatterns: Record<string, RegExp> = {
      kelly: /kelly|bankroll.*fraction|bet.*size|f_?star/i,
      expectedValue: /expected.?value|EV\b|expectation/i,
      sharpe: /sharpe|risk.?adjusted|sortino|calmar/i,
      variance: /variance|std_?dev|standard.?deviation|σ/i,
      blackScholes: /black.?scholes|option.?pric|call.?price|put.?price/i,
      monteCarlo: /monte.?carlo|simulation|random.?walk/i,
    };

    const pattern = matchPatterns[key];
    if (pattern && pattern.test(code) && !seen.has(key)) {
      seen.add(key);
      explanations.push({
        expression: formula.name,
        plainEnglish: formula.explanation,
        latex: formula.latex,
        category: formula.category,
        variables: formula.variables,
        numericalExample: formula.example,
        visualHint: formula.visual,
        relatedConcepts: formula.related,
      });
    }
  }

  return explanations;
}

/**
 * Generate diagram specifications for visualizing a math system.
 */
export function generateDiagramSpecs(explanations: FormulaExplanation[]): DiagramSpec[] {
  const specs: DiagramSpec[] = [];

  for (const exp of explanations) {
    // Add formula-specific diagram
    specs.push({
      type: "line",
      title: `${exp.expression} Behavior`,
      xAxis: exp.variables[0]?.symbol ?? "x",
      yAxis: "Output",
      dataDescription: exp.visualHint,
      insight: `Shows how ${exp.expression} responds to changes in its primary input`,
    });

    // Add sensitivity diagram if multiple variables
    if (exp.variables.length > 1) {
      specs.push({
        type: "heatmap",
        title: `${exp.expression} Sensitivity`,
        xAxis: exp.variables[0]?.symbol ?? "x",
        yAxis: exp.variables[1]?.symbol ?? "y",
        dataDescription: `Output of ${exp.expression} across ranges of two primary variables`,
        insight: "Darker regions indicate higher output; reveals interaction effects between variables",
      });
    }
  }

  // Add dependency flow if multiple formulas
  if (explanations.length > 1) {
    specs.push({
      type: "flow",
      title: "Formula Dependency Graph",
      xAxis: "Computation Order",
      yAxis: "Data Flow",
      dataDescription: `How ${explanations.map((e) => e.expression).join(", ")} feed into each other`,
      insight: "Shows which formulas must be computed first and how errors propagate",
    });
  }

  return specs;
}

/**
 * Generate a tutorial for a specific mathematical topic.
 */
export function generateTutorial(topic: string): MathTutorial | null {
  const topicLower = topic.toLowerCase();

  // Match known topics
  for (const [key, formula] of Object.entries(KNOWN_FORMULAS)) {
    if (topicLower.includes(key) || topicLower.includes(formula.name.toLowerCase())) {
      return {
        topic: formula.name,
        prerequisites: formula.related.slice(0, 2),
        explanation: formula.explanation,
        examples: [formula.example],
        practiceProblems: [
          `Given ${formula.variables.map((v) => `${v.symbol} = ?`).join(", ")}, compute the result.`,
          `What happens to the output when ${formula.variables[0]?.symbol} approaches its maximum?`,
          `Under what conditions would this formula give a meaningless result?`,
        ],
        furtherReading: formula.related.map((r) => `Study: ${r}`),
      };
    }
  }

  return null;
}

/**
 * Convert a LaTeX string to a simple ASCII representation.
 * Used when LaTeX rendering is not available.
 */
export function latexToAscii(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)")
    .replace(/\\sum_\{([^}]+)\}\^?\{?([^}]*)\}?/g, "Σ[$1..$2]")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\sigma/g, "σ")
    .replace(/\\mu/g, "μ")
    .replace(/\\hat\{([^}]+)\}/g, "$1̂")
    .replace(/\\bar\{([^}]+)\}/g, "$1̄")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\pm/g, "±")
    .replace(/\\geq/g, "≥")
    .replace(/\\leq/g, "≤")
    .replace(/\\neq/g, "≠")
    .replace(/\\infty/g, "∞")
    .replace(/\\quad/g, "  ")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\$/g, "")
    .replace(/\\\\/g, "")
    .trim();
}

/**
 * Generate a voice-friendly narration of a formula explanation.
 */
export function generateVoiceNarration(explanation: FormulaExplanation): string {
  const parts: string[] = [];

  parts.push(`Let me explain ${explanation.expression}.`);
  parts.push(explanation.plainEnglish);

  if (explanation.variables.length > 0) {
    parts.push("The key variables are:");
    for (const v of explanation.variables.slice(0, 4)) {
      parts.push(`${v.symbol} represents ${v.meaning}, typically ranging from ${v.typicalRange}.`);
    }
  }

  parts.push(`Here's a concrete example: ${explanation.numericalExample.explanation}`);

  if (explanation.relatedConcepts.length > 0) {
    parts.push(`Related concepts to explore: ${explanation.relatedConcepts.slice(0, 3).join(", ")}.`);
  }

  return parts.join(" ");
}
