/**
 * Math Parser — Formula extraction and verification utilities
 *
 * Extracts mathematical formulas, variables, and dependencies from code.
 * Provides symbolic verification stubs for math-heavy applications
 * (arbitrage algos, Kelly criterion, EV calculations, etc.).
 */

// ── Types ──

export interface MathFormula {
  id: string;
  expression: string;
  variables: string[];
  dependencies: string[];
  location: {
    file: string;
    line: number;
    column: number;
  };
  category: MathCategory;
  complexity: "simple" | "moderate" | "complex";
  description: string;
}

export type MathCategory =
  | "probability"
  | "statistics"
  | "financial"
  | "optimization"
  | "linear-algebra"
  | "calculus"
  | "game-theory"
  | "general";

export interface MathVariable {
  name: string;
  type: "parameter" | "computed" | "constant" | "input";
  usedIn: string[];
  definedAt: { file: string; line: number };
  constraints?: string;
}

export interface MathDependency {
  from: string;
  to: string;
  relationship: "computes" | "depends-on" | "validates" | "constrains";
}

export interface MathSystem {
  formulas: MathFormula[];
  variables: MathVariable[];
  dependencies: MathDependency[];
  entryPoints: string[];
  criticalPaths: string[][];
}

export interface VerificationResult {
  formulaId: string;
  isCorrect: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

export interface MathParseReport {
  system: MathSystem;
  verifications: VerificationResult[];
  respectScore: number;
  summary: string;
  warnings: string[];
}

// ── Pattern matchers for common math constructs ──

const MATH_PATTERNS: Array<{
  pattern: RegExp;
  category: MathCategory;
  description: string;
}> = [
  {
    pattern: /(?:kelly|kelley)\s*(?:criterion|fraction|bet|size)/i,
    category: "financial",
    description: "Kelly Criterion — optimal bet sizing",
  },
  {
    pattern: /(?:expected\s*value|EV|expectation)\s*[=:]/i,
    category: "probability",
    description: "Expected Value calculation",
  },
  {
    pattern: /(?:variance|std_?dev|standard\s*deviation|σ|sigma)/i,
    category: "statistics",
    description: "Variance/Standard Deviation",
  },
  {
    pattern: /(?:sharpe|sortino|calmar)\s*(?:ratio)?/i,
    category: "financial",
    description: "Risk-adjusted return ratio",
  },
  {
    pattern: /(?:monte\s*carlo|simulation|random\s*walk)/i,
    category: "probability",
    description: "Monte Carlo simulation",
  },
  {
    pattern: /(?:arbitrage|arb|mispricing|spread)\s*(?:calc|detect|find|opp)/i,
    category: "financial",
    description: "Arbitrage/mispricing detection",
  },
  {
    pattern: /(?:regression|linear\s*model|OLS|least\s*squares)/i,
    category: "statistics",
    description: "Regression analysis",
  },
  {
    pattern: /(?:bayesian|bayes|posterior|prior|likelihood)/i,
    category: "probability",
    description: "Bayesian inference",
  },
  {
    pattern: /(?:black\s*scholes|options?\s*pricing|greeks?|delta|gamma|theta|vega)/i,
    category: "financial",
    description: "Options pricing model",
  },
  {
    pattern: /(?:poisson|binomial|normal\s*dist|gaussian|chi\s*squared)/i,
    category: "probability",
    description: "Statistical distribution",
  },
  {
    pattern: /(?:gradient|derivative|partial|d\/d[a-z]|∂)/i,
    category: "calculus",
    description: "Derivative/gradient computation",
  },
  {
    pattern: /(?:matrix|eigen|SVD|PCA|determinant)/i,
    category: "linear-algebra",
    description: "Linear algebra operation",
  },
  {
    pattern: /(?:nash|minimax|payoff\s*matrix|zero\s*sum)/i,
    category: "game-theory",
    description: "Game theory model",
  },
  {
    pattern: /(?:LP|linear\s*program|simplex|convex\s*opt|minimize|maximize)\s*(?:\(|{|:)/i,
    category: "optimization",
    description: "Optimization problem",
  },
  {
    pattern: /Math\.\s*(?:pow|sqrt|log|exp|abs|min|max|floor|ceil|round)\s*\(/,
    category: "general",
    description: "Mathematical function call",
  },
];

// ── Formula extraction patterns ──

const FORMULA_EXTRACTORS: Array<{
  pattern: RegExp;
  type: string;
}> = [
  // Direct assignment with arithmetic: const x = a * b + c
  { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*([^;{]+(?:[+\-*/^%]|Math\.)[^;{]*);/g, type: "assignment" },
  // Function that computes: function calcX(a, b) { return ... }
  { pattern: /function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{[^}]*return\s+([^;]+);/g, type: "function" },
  // Arrow function: const calcX = (a, b) => a * b
  { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*=>\s*([^;{]+);/g, type: "arrow" },
  // Arrow function with block body
  { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*=>\s*\{[^}]*return\s+([^;]+);/g, type: "arrow-block" },
];

// ── Core extraction ──

/**
 * Extract mathematical formulas from source code.
 */
export function extractFormulas(code: string, filePath: string = "unknown"): MathFormula[] {
  const formulas: MathFormula[] = [];
  const lines = code.split("\n");
  let formulaCount = 0;

  // Scan each line for math patterns
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    for (const { pattern, category, description } of MATH_PATTERNS) {
      if (pattern.test(line)) {
        // Try to extract the full expression
        for (const extractor of FORMULA_EXTRACTORS) {
          // Reset lastIndex for global regexes
          extractor.pattern.lastIndex = 0;
          const fullContext = lines.slice(Math.max(0, lineIdx - 2), Math.min(lines.length, lineIdx + 5)).join("\n");
          let match: RegExpExecArray | null;

          while ((match = extractor.pattern.exec(fullContext)) !== null) {
            formulaCount++;
            const expression = match[3] ?? match[2] ?? match[1];
            const variables = extractVariables(expression);

            formulas.push({
              id: `formula-${formulaCount}`,
              expression: expression.trim(),
              variables,
              dependencies: [],
              location: { file: filePath, line: lineIdx + 1, column: 0 },
              category,
              complexity: classifyComplexity(expression),
              description,
            });
          }
        }

        // If no extractor matched, record the pattern match itself
        if (!formulas.some((f) => f.location.line === lineIdx + 1)) {
          formulaCount++;
          const variables = extractVariables(line);
          formulas.push({
            id: `formula-${formulaCount}`,
            expression: line.trim(),
            variables,
            dependencies: [],
            location: { file: filePath, line: lineIdx + 1, column: 0 },
            category,
            complexity: classifyComplexity(line),
            description,
          });
        }
      }
    }
  }

  // Resolve inter-formula dependencies
  for (const formula of formulas) {
    formula.dependencies = formulas
      .filter((other) =>
        other.id !== formula.id &&
        formula.variables.some((v) => other.expression.includes(v))
      )
      .map((other) => other.id);
  }

  return deduplicateFormulas(formulas);
}

/**
 * Extract variable names from an expression.
 */
function extractVariables(expression: string): string[] {
  // Match identifiers that aren't JS keywords or built-in objects
  const reserved = new Set([
    "const", "let", "var", "function", "return", "if", "else", "for",
    "while", "true", "false", "null", "undefined", "Math", "Number",
    "String", "Array", "Object", "console", "this", "new", "typeof",
  ]);

  const matches = expression.match(/\b([a-zA-Z_$][\w$]*)\b/g) ?? [];
  const unique = [...new Set(matches)].filter((m) => !reserved.has(m));
  return unique;
}

/**
 * Classify the complexity of a mathematical expression.
 */
function classifyComplexity(expression: string): "simple" | "moderate" | "complex" {
  const operators = (expression.match(/[+\-*/^%]/g) ?? []).length;
  const functionCalls = (expression.match(/\w+\s*\(/g) ?? []).length;
  const nestedParens = maxNestingDepth(expression);

  const score = operators + functionCalls * 2 + nestedParens * 3;

  if (score <= 3) return "simple";
  if (score <= 8) return "moderate";
  return "complex";
}

function maxNestingDepth(s: string): number {
  let max = 0;
  let current = 0;
  for (const char of s) {
    if (char === "(") { current++; max = Math.max(max, current); }
    if (char === ")") { current = Math.max(0, current - 1); }
  }
  return max;
}

function deduplicateFormulas(formulas: MathFormula[]): MathFormula[] {
  const seen = new Set<string>();
  return formulas.filter((f) => {
    const key = `${f.location.file}:${f.location.line}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build a complete math system from extracted formulas.
 */
export function buildMathSystem(formulas: MathFormula[]): MathSystem {
  // Extract all variables
  const varMap = new Map<string, MathVariable>();
  for (const formula of formulas) {
    for (const v of formula.variables) {
      if (!varMap.has(v)) {
        varMap.set(v, {
          name: v,
          type: "computed",
          usedIn: [formula.id],
          definedAt: formula.location,
        });
      } else {
        varMap.get(v)!.usedIn.push(formula.id);
      }
    }
  }

  // Build dependency edges
  const dependencies: MathDependency[] = [];
  for (const formula of formulas) {
    for (const dep of formula.dependencies) {
      dependencies.push({
        from: formula.id,
        to: dep,
        relationship: "depends-on",
      });
    }
  }

  // Find entry points (formulas with no dependents)
  const depTargets = new Set(dependencies.map((d) => d.to));
  const entryPoints = formulas
    .filter((f) => !depTargets.has(f.id))
    .map((f) => f.id);

  // Find critical paths (longest dependency chains)
  const criticalPaths = findCriticalPaths(formulas, dependencies);

  return {
    formulas,
    variables: [...varMap.values()],
    dependencies,
    entryPoints,
    criticalPaths,
  };
}

function findCriticalPaths(
  formulas: MathFormula[],
  dependencies: MathDependency[]
): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!adjacency.has(dep.from)) adjacency.set(dep.from, []);
    adjacency.get(dep.from)!.push(dep.to);
  }

  const paths: string[][] = [];

  function dfs(node: string, path: string[], visited: Set<string>): void {
    if (visited.has(node)) return;
    visited.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) ?? [];
    if (neighbors.length === 0) {
      paths.push([...path]);
    } else {
      for (const neighbor of neighbors) {
        dfs(neighbor, path, visited);
      }
    }

    path.pop();
    visited.delete(node);
  }

  for (const formula of formulas) {
    dfs(formula.id, [], new Set());
  }

  // Return top 5 longest paths
  return paths.sort((a, b) => b.length - a.length).slice(0, 5);
}

/**
 * Verify mathematical correctness of extracted formulas.
 * Stub — in production would use sympy/mpmath via a Python microservice.
 */
export function verifyFormulas(formulas: MathFormula[]): VerificationResult[] {
  return formulas.map((formula) => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 0.7;

    // Check for common math errors
    if (formula.expression.includes("/ 0") || formula.expression.includes("/0")) {
      issues.push("Potential division by zero");
      suggestions.push("Add a zero-check guard before division");
      confidence = 0.3;
    }

    if (formula.expression.includes("Math.log") && !formula.expression.includes("Math.abs")) {
      issues.push("Math.log may receive negative input");
      suggestions.push("Ensure log argument is positive (use Math.abs or guard)");
      confidence = Math.min(confidence, 0.5);
    }

    if (formula.expression.includes("Math.sqrt") && !formula.expression.includes("Math.abs")) {
      issues.push("Math.sqrt may receive negative input");
      suggestions.push("Guard against negative values before sqrt");
      confidence = Math.min(confidence, 0.5);
    }

    if (formula.category === "financial" && !formula.expression.includes("Math.max")) {
      suggestions.push("Consider adding floor/ceiling bounds for financial calculations");
    }

    if (formula.complexity === "complex" && formula.variables.length > 5) {
      suggestions.push("Complex formula with many variables — consider breaking into sub-expressions for clarity");
    }

    // Check for floating point issues
    if (formula.expression.includes("===") && formula.expression.match(/\d+\.\d+/)) {
      issues.push("Exact floating-point comparison may fail");
      suggestions.push("Use epsilon-based comparison for floating-point equality");
      confidence = Math.min(confidence, 0.4);
    }

    return {
      formulaId: formula.id,
      isCorrect: issues.length === 0,
      confidence,
      issues,
      suggestions,
    };
  });
}

/**
 * Compute a Respect Score (1-10) for how well the math system is understood.
 */
export function computeRespectScore(system: MathSystem, verifications: VerificationResult[]): number {
  let score = 5; // baseline

  // Bonus for thorough extraction
  if (system.formulas.length > 0) score += 1;
  if (system.formulas.length > 5) score += 1;

  // Bonus for resolved dependencies
  const resolvedDeps = system.dependencies.length;
  if (resolvedDeps > 0) score += 1;

  // Penalty for verification issues
  const totalIssues = verifications.reduce((acc, v) => acc + v.issues.length, 0);
  if (totalIssues > 0) score -= 1;
  if (totalIssues > 3) score -= 1;

  // Bonus for high confidence verifications
  const avgConfidence = verifications.length > 0
    ? verifications.reduce((acc, v) => acc + v.confidence, 0) / verifications.length
    : 0.5;
  if (avgConfidence > 0.8) score += 1;

  return Math.max(1, Math.min(10, score));
}

/**
 * Generate a complete math parse report for a codebase.
 */
export function generateMathReport(code: string, filePath: string = "unknown"): MathParseReport {
  const formulas = extractFormulas(code, filePath);
  const system = buildMathSystem(formulas);
  const verifications = verifyFormulas(formulas);
  const respectScore = computeRespectScore(system, verifications);

  const warnings: string[] = [];
  if (formulas.length === 0) {
    warnings.push("No mathematical formulas detected in the code.");
  }
  if (system.criticalPaths.some((p) => p.length > 4)) {
    warnings.push("Deep dependency chains detected — changes may cascade through multiple formulas.");
  }

  const issueCount = verifications.reduce((acc, v) => acc + v.issues.length, 0);

  const summary = formulas.length === 0
    ? "No mathematical system detected in the provided code."
    : `Found ${formulas.length} formula(s) across ${new Set(formulas.map((f) => f.category)).size} categories. ` +
      `${system.dependencies.length} inter-dependencies mapped. ` +
      `${issueCount} potential issue(s) identified. ` +
      `Respect Score: ${respectScore}/10.`;

  return { system, verifications, respectScore, summary, warnings };
}
