/**
 * Output Scorer — Fast local scoring for generated code/content
 *
 * Provides regex-based heuristic analysis (no LLM calls) for:
 * - Code quality scoring across 5 dimensions + overall
 * - Hallucination detection (fake APIs, phantom packages, impossible patterns)
 * - Improvement suggestions based on low-scoring areas
 */

// ── Types ──

export interface OutputScore {
  completeness: number; // 0-10
  correctness: number; // 0-10
  style: number; // 0-10
  security: number; // 0-10
  performance: number; // 0-10
  overall: number; // 0-10 weighted average
}

export interface Hallucination {
  type: "fake-api" | "fake-package" | "impossible-type" | "fake-browser-api";
  match: string;
  line: number;
  explanation: string;
  confidence: "high" | "medium" | "low";
}

export interface Improvement {
  area: keyof Omit<OutputScore, "overall">;
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  suggestion: string;
  line?: number;
}

// ── Scoring weights for overall calculation ──

const WEIGHTS: Record<keyof Omit<OutputScore, "overall">, number> = {
  completeness: 0.2,
  correctness: 0.3,
  style: 0.1,
  security: 0.25,
  performance: 0.15,
};

// ── Completeness checks ──

function scoreCompleteness(code: string): { score: number; details: string[] } {
  let score = 10;
  const details: string[] = [];

  // Check for imports
  const hasImports =
    /^import\s+/m.test(code) || /^const\s+\w+\s*=\s*require\(/m.test(code);
  if (!hasImports && code.length > 200) {
    score -= 2;
    details.push("No imports found — likely missing dependencies");
  }

  // Check for exports
  const hasExports =
    /^export\s+/m.test(code) ||
    /module\.exports/m.test(code) ||
    /^export\s+default/m.test(code);
  if (!hasExports && code.length > 200) {
    score -= 1;
    details.push("No exports found — module may not be reusable");
  }

  // Check for error handling
  const hasTryCatch = /try\s*\{/.test(code);
  const hasCatch = /\.catch\s*\(/.test(code);
  const hasErrorBoundary = /catch\s*\(\s*\w+/.test(code);
  if (!hasTryCatch && !hasCatch && !hasErrorBoundary && code.length > 300) {
    score -= 2;
    details.push("No error handling (try/catch or .catch) found");
  }

  // Check for TypeScript types
  const hasTypes =
    /:\s*(?:string|number|boolean|Record|Array|Promise|void|any|unknown)/.test(code) ||
    /interface\s+\w+/.test(code) ||
    /type\s+\w+\s*=/.test(code);
  if (!hasTypes && code.length > 200) {
    score -= 1.5;
    details.push("No type annotations — consider adding TypeScript types");
  }

  // Check for return type annotations on functions
  const functionCount = (code.match(/(?:function\s+\w+|=>\s*\{|=>\s*[^{])/g) ?? []).length;
  const returnTypeCount = (code.match(/\)\s*:\s*\w+/g) ?? []).length;
  if (functionCount > 2 && returnTypeCount === 0) {
    score -= 1;
    details.push("Functions lack return type annotations");
  }

  // Check for JSDoc or comments
  const hasComments = /\/\*\*/.test(code) || /\/\/\s*.{5,}/.test(code);
  if (!hasComments && code.length > 500) {
    score -= 0.5;
    details.push("No documentation comments found");
  }

  return { score: clamp(score), details };
}

// ── Correctness checks ──

function scoreCorrectness(code: string): { score: number; details: string[] } {
  let score = 10;
  const details: string[] = [];

  // Balanced brackets
  const brackets = { "(": 0, "[": 0, "{": 0 };
  const closers: Record<string, keyof typeof brackets> = {
    ")": "(",
    "]": "[",
    "}": "{",
  };
  // Skip brackets inside strings
  let inString: string | null = null;
  let escaped = false;
  for (const ch of code) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      if (inString === ch) inString = null;
      else if (!inString) inString = ch;
      continue;
    }
    if (inString) continue;

    if (ch in brackets) brackets[ch as keyof typeof brackets]++;
    if (ch in closers) brackets[closers[ch]]--;
  }
  for (const [bracket, count] of Object.entries(brackets)) {
    if (count !== 0) {
      score -= 3;
      details.push(`Unbalanced bracket: '${bracket}' (off by ${Math.abs(count)})`);
    }
  }

  // Check for obvious syntax issues
  if (/\bconst\s+const\b/.test(code) || /\blet\s+let\b/.test(code)) {
    score -= 2;
    details.push("Duplicate keyword declaration detected");
  }

  // Check for unterminated template literals (rough check)
  const backtickCount = (code.match(/`/g) ?? []).length;
  if (backtickCount % 2 !== 0) {
    score -= 2;
    details.push("Possibly unterminated template literal (odd backtick count)");
  }

  // Check for = vs == in conditions (not inside JSX attributes)
  const dangerousAssignInCondition = /if\s*\(\s*\w+\s*=[^=]/.test(code);
  if (dangerousAssignInCondition) {
    score -= 1.5;
    details.push("Assignment inside if-condition (did you mean == or ===?)");
  }

  // Check for unreachable code patterns
  if (/return\s+[^;]+;\s*\n\s*(?:const|let|var|function)\s/.test(code)) {
    score -= 1;
    details.push("Possibly unreachable code after return statement");
  }

  // Check for missing await on async calls
  const asyncFunctionCount = (code.match(/async\s+(?:function|\()/g) ?? []).length;
  const awaitCount = (code.match(/await\s+/g) ?? []).length;
  if (asyncFunctionCount > 0 && awaitCount === 0) {
    score -= 1;
    details.push("Async function(s) without any await — might be missing await");
  }

  return { score: clamp(score), details };
}

// ── Style checks ──

function scoreStyle(code: string): { score: number; details: string[] } {
  let score = 10;
  const details: string[] = [];
  const lines = code.split("\n");

  // Check indentation consistency
  const indentTypes = { spaces2: 0, spaces4: 0, tabs: 0 };
  for (const line of lines) {
    if (line.trim() === "") continue;
    const leadingWhitespace = line.match(/^(\s+)/)?.[1];
    if (!leadingWhitespace) continue;
    if (leadingWhitespace.includes("\t")) indentTypes.tabs++;
    else if (leadingWhitespace.length % 4 === 0) indentTypes.spaces4++;
    else if (leadingWhitespace.length % 2 === 0) indentTypes.spaces2++;
  }
  const indentValues = Object.values(indentTypes).filter((v) => v > 0);
  if (indentValues.length > 1) {
    score -= 1.5;
    details.push("Mixed indentation styles detected (tabs vs spaces)");
  }

  // Check naming conventions
  const camelCase = (code.match(/\b(?:const|let|var|function)\s+[a-z][a-zA-Z0-9]*\b/g) ?? []).length;
  const snakeCase = (code.match(/\b(?:const|let|var|function)\s+[a-z]+_[a-z]+\b/g) ?? []).length;
  if (camelCase > 0 && snakeCase > 0) {
    const ratio = Math.min(camelCase, snakeCase) / Math.max(camelCase, snakeCase);
    if (ratio > 0.3) {
      score -= 1;
      details.push("Mixed naming conventions (camelCase and snake_case)");
    }
  }

  // Check for magic numbers
  const magicNumbers = code.match(
    /(?<![\w.])\b(?!0\b|1\b|2\b|-1\b|100\b|1000\b|0\.\d+\b)\d{2,}\b(?!\s*[:\]])/g
  ) ?? [];
  if (magicNumbers.length > 3) {
    score -= 1;
    details.push(`${magicNumbers.length} magic numbers found — consider named constants`);
  }

  // Check for very long lines
  const longLines = lines.filter((l) => l.length > 120).length;
  if (longLines > 5) {
    score -= 1;
    details.push(`${longLines} lines exceed 120 characters`);
  }

  // Check for console.log left in code
  const consoleLogs = (code.match(/console\.\s*log\s*\(/g) ?? []).length;
  if (consoleLogs > 2) {
    score -= 0.5;
    details.push(`${consoleLogs} console.log statements — consider removing debug logs`);
  }

  // Check for deeply nested code (rough heuristic)
  let maxIndent = 0;
  for (const line of lines) {
    const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    maxIndent = Math.max(maxIndent, leading);
  }
  if (maxIndent > 24) {
    score -= 1;
    details.push("Deeply nested code detected — consider extracting functions");
  }

  return { score: clamp(score), details };
}

// ── Security checks ──

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  severity: "error" | "warning" | "info";
  penalty: number;
}> = [
  {
    pattern: /\.innerHTML\s*=/,
    title: "Direct innerHTML assignment (XSS risk)",
    severity: "error",
    penalty: 2.5,
  },
  {
    pattern: /\beval\s*\(/,
    title: "eval() usage (code injection risk)",
    severity: "error",
    penalty: 3,
  },
  {
    pattern: /new\s+Function\s*\(/,
    title: "new Function() constructor (code injection risk)",
    severity: "error",
    penalty: 2.5,
  },
  {
    pattern: /(?:password|secret|api_?key|token|auth)\s*[:=]\s*["'`][^"'`]{3,}["'`]/i,
    title: "Hardcoded secret or credential",
    severity: "error",
    penalty: 3,
  },
  {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\$\{/i,
    title: "SQL injection via template literal interpolation",
    severity: "error",
    penalty: 3,
  },
  {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:req|input|params|query)/i,
    title: "SQL injection via string concatenation",
    severity: "error",
    penalty: 3,
  },
  {
    pattern: /document\.write\s*\(/,
    title: "document.write usage (XSS and performance risk)",
    severity: "warning",
    penalty: 1.5,
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    title: "dangerouslySetInnerHTML (XSS risk if unsanitized)",
    severity: "warning",
    penalty: 1.5,
  },
  {
    pattern: /child_process|exec\s*\(|execSync\s*\(/,
    title: "Shell command execution (command injection risk)",
    severity: "warning",
    penalty: 2,
  },
  {
    pattern: /cors\(\s*\)|Access-Control-Allow-Origin.*\*/,
    title: "Overly permissive CORS configuration",
    severity: "warning",
    penalty: 1,
  },
  {
    pattern: /https?:\/\/[^\s"'`]+/,
    title: "Hardcoded URL — consider using environment variables",
    severity: "info",
    penalty: 0.5,
  },
];

function scoreSecurity(code: string): { score: number; details: string[] } {
  let score = 10;
  const details: string[] = [];

  for (const { pattern, title, penalty } of SECURITY_PATTERNS) {
    if (pattern.test(code)) {
      score -= penalty;
      details.push(title);
    }
  }

  return { score: clamp(score), details };
}

// ── Performance checks ──

const PERFORMANCE_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  penalty: number;
}> = [
  {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*(?:await\s+fetch|await\s+\w+\.(?:find|query|get))/,
    title: "Await inside loop — possible N+1 query pattern",
    penalty: 2,
  },
  {
    pattern: /\.forEach\s*\([^)]*=>\s*\{[^}]*await/,
    title: "Await inside forEach — use Promise.all with map instead",
    penalty: 1.5,
  },
  {
    pattern: /JSON\.parse\s*\(\s*JSON\.stringify/,
    title: "JSON.parse(JSON.stringify()) for deep clone — use structuredClone",
    penalty: 1,
  },
  {
    pattern: /import\s+(?:\*\s+as\s+\w+|{[^}]{100,}})\s+from\s+["']/,
    title: "Large import — possible bundle size concern",
    penalty: 0.5,
  },
  {
    pattern: /new\s+RegExp\s*\(/,
    title: "Dynamic RegExp inside potential hot path — consider pre-compiling",
    penalty: 0.5,
  },
  {
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/,
    title: "useEffect with no dependency array — runs on every render",
    penalty: 1.5,
  },
  {
    pattern: /Array\s*\(\s*\d{5,}\s*\)/,
    title: "Very large array allocation",
    penalty: 1,
  },
  {
    pattern: /\.filter\([^)]+\)\.map\(/,
    title: "filter().map() chain — consider .reduce() for single pass",
    penalty: 0.5,
  },
  {
    pattern: /(?:useState|useSelector)\s*\([^)]*\)\s*;[\s\S]{0,200}(?:useState|useSelector)\s*\([^)]*\)\s*;[\s\S]{0,200}(?:useState|useSelector)\s*\([^)]*\)\s*;[\s\S]{0,200}(?:useState|useSelector)\s*\([^)]*\)\s*;[\s\S]{0,200}(?:useState|useSelector)/,
    title: "Many individual state hooks — consider consolidating with useReducer",
    penalty: 0.5,
  },
  {
    pattern: /(?:window|document)\.\w+\s*=\s*/,
    title: "Global mutation — may cause memory leaks or side effects",
    penalty: 1,
  },
];

function scorePerformance(code: string): { score: number; details: string[] } {
  let score = 10;
  const details: string[] = [];

  for (const { pattern, title, penalty } of PERFORMANCE_PATTERNS) {
    if (pattern.test(code)) {
      score -= penalty;
      details.push(title);
    }
  }

  // Check for missing memoization hints in React components
  const hasUseCallback = /useCallback/.test(code);
  const hasUseMemo = /useMemo/.test(code);
  const hasReactComponent =
    /function\s+[A-Z]\w*\s*\(/.test(code) || /const\s+[A-Z]\w*\s*=/.test(code);
  const inlineFunctionPropsCount = (
    code.match(/\w+=\{\s*\(\)\s*=>/g) ?? []
  ).length;
  if (hasReactComponent && inlineFunctionPropsCount > 3 && !hasUseCallback) {
    score -= 1;
    details.push("Multiple inline function props without useCallback — may cause unnecessary re-renders");
  }
  if (hasReactComponent && /\.map\s*\(/.test(code) && !hasUseMemo && code.length > 500) {
    score -= 0.5;
    details.push("List rendering without useMemo — consider memoizing computed lists");
  }

  return { score: clamp(score), details };
}

// ── Hallucination detection ──

const FAKE_BROWSER_APIS = [
  "navigator.ai",
  "navigator.ml",
  "window.queryAI",
  "document.createAISession",
  "navigator.scheduling.isInputPending",
  "navigator.virtualKeyboard",
  "window.showDirectoryPicker",
  "CSS.paintWorklet",
  "navigator.getBattery",
  "navigator.connection.effectiveType",
  "document.hasStorageAccess",
  "window.queryLocalFonts",
  "navigator.userAgentData.getHighEntropyValues",
];

const FAKE_API_PATTERNS: Array<{ pattern: RegExp; explanation: string }> = [
  {
    pattern: /fetch\s*\(\s*["'`]\/api\/(?:ai|generate|complete|predict|chat)["'`]/,
    explanation: "Common hallucinated API endpoint — verify this route actually exists",
  },
  {
    pattern: /(?:React|react)\.use(?:AI|Model|Prediction|Generate)\s*\(/,
    explanation: "Non-existent React hook — no such hook exists in React",
  },
  {
    pattern: /NextResponse\.ai\s*\(|NextRequest\.parse(?:AI|ML)\s*\(/,
    explanation: "Non-existent Next.js API — no such method exists",
  },
  {
    pattern: /prisma\.\$(?:ai|predict|generate|vector)\b/,
    explanation: "Non-existent Prisma method — not part of the Prisma client API",
  },
  {
    pattern: /zod\.ai\s*\(|z\.inference\s*\(/,
    explanation: "Non-existent Zod API — no such method exists in Zod",
  },
];

const KNOWN_FAKE_PACKAGES = [
  "react-ai-components",
  "next-ai-utils",
  "ai-form-validator",
  "auto-test-generator",
  "smart-cache-ai",
  "react-native-ai",
  "neural-css",
  "css-intelligence",
  "turborepo-ai",
  "auto-optimize",
  "prisma-ai",
  "next-ml",
  "react-ml-hooks",
  "auto-i18n",
  "ai-router",
  "smart-bundler",
  "auto-schema",
  "graphql-ai",
  "ai-state-manager",
  "auto-accessibility",
];

const IMPOSSIBLE_TYPE_PATTERNS: Array<{ pattern: RegExp; explanation: string }> = [
  {
    pattern: /as\s+never\s+as\s+/,
    explanation: "Double type assertion through never — unsafe cast bypassing TypeScript checks",
  },
  {
    pattern: /as\s+unknown\s+as\s+(?!string|number|boolean|Record|Array)/,
    explanation: "Suspicious double type assertion — may indicate a type system bypass",
  },
  {
    pattern: /Promise<void>\s*&\s*(?:string|number|boolean)/,
    explanation: "Impossible intersection type — Promise<void> cannot intersect with primitives",
  },
  {
    pattern: /:\s*string\s*&\s*number/,
    explanation: "Impossible intersection of string & number — always results in never",
  },
];

/**
 * Detect potential hallucinations in generated code.
 */
export function detectHallucinations(code: string): Hallucination[] {
  const hallucinations: Hallucination[] = [];
  const lines = code.split("\n");

  // Check for fake browser APIs
  for (let i = 0; i < lines.length; i++) {
    for (const api of FAKE_BROWSER_APIS) {
      if (lines[i].includes(api)) {
        hallucinations.push({
          type: "fake-browser-api",
          match: api,
          line: i + 1,
          explanation: `"${api}" is not a standard browser API or has extremely limited support`,
          confidence: "medium",
        });
      }
    }
  }

  // Check for fake API patterns
  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, explanation } of FAKE_API_PATTERNS) {
      if (pattern.test(lines[i])) {
        const match = lines[i].match(pattern);
        hallucinations.push({
          type: "fake-api",
          match: match?.[0] ?? lines[i].trim(),
          line: i + 1,
          explanation,
          confidence: "high",
        });
      }
    }
  }

  // Check for fake package imports
  for (let i = 0; i < lines.length; i++) {
    for (const pkg of KNOWN_FAKE_PACKAGES) {
      const importPattern = new RegExp(
        `(?:import\\s+.*from\\s+|require\\s*\\()\\s*["'\`]${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`
      );
      if (importPattern.test(lines[i])) {
        hallucinations.push({
          type: "fake-package",
          match: pkg,
          line: i + 1,
          explanation: `"${pkg}" is a commonly hallucinated package name — verify it exists on npm`,
          confidence: "high",
        });
      }
    }
  }

  // Check for impossible type assertions
  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, explanation } of IMPOSSIBLE_TYPE_PATTERNS) {
      if (pattern.test(lines[i])) {
        const match = lines[i].match(pattern);
        hallucinations.push({
          type: "impossible-type",
          match: match?.[0] ?? lines[i].trim(),
          line: i + 1,
          explanation,
          confidence: "high",
        });
      }
    }
  }

  return hallucinations;
}

// ── Improvement suggestions ──

/**
 * Generate specific improvement suggestions based on low-scoring areas.
 */
export function suggestImprovements(
  code: string,
  score: OutputScore
): Improvement[] {
  const improvements: Improvement[] = [];
  const lines = code.split("\n");

  // Completeness improvements
  if (score.completeness < 7) {
    if (!/^import\s+/m.test(code) && !/require\(/m.test(code) && code.length > 200) {
      improvements.push({
        area: "completeness",
        severity: "warning",
        title: "Missing imports",
        detail: "No import statements found in a file of significant size.",
        suggestion: "Add explicit imports for all external dependencies used in the code.",
      });
    }
    if (!/try\s*\{/.test(code) && !/\.catch\s*\(/.test(code) && code.length > 300) {
      improvements.push({
        area: "completeness",
        severity: "warning",
        title: "No error handling",
        detail: "The code lacks try/catch blocks or .catch() handlers.",
        suggestion:
          "Wrap async operations and external calls in try/catch blocks with meaningful error messages.",
      });
    }
    if (!/interface\s+\w+/.test(code) && !/type\s+\w+\s*=/.test(code) && code.length > 200) {
      improvements.push({
        area: "completeness",
        severity: "info",
        title: "No TypeScript interfaces/types",
        detail: "Consider defining explicit types for better type safety.",
        suggestion: "Define interfaces for function parameters, return types, and data structures.",
      });
    }
  }

  // Correctness improvements
  if (score.correctness < 7) {
    // Find lines with specific issues
    for (let i = 0; i < lines.length; i++) {
      if (/if\s*\(\s*\w+\s*=[^=]/.test(lines[i])) {
        improvements.push({
          area: "correctness",
          severity: "error",
          title: "Assignment in condition",
          detail: `Line ${i + 1} contains an assignment (=) inside a condition instead of comparison (=== or ==).`,
          suggestion: "Use === for strict equality comparison.",
          line: i + 1,
        });
      }
    }

    const asyncCount = (code.match(/async\s+(?:function|\()/g) ?? []).length;
    const awaitUsage = (code.match(/await\s+/g) ?? []).length;
    if (asyncCount > 0 && awaitUsage === 0) {
      improvements.push({
        area: "correctness",
        severity: "warning",
        title: "Async without await",
        detail: "Async function(s) declared but no await expressions found.",
        suggestion: "Either add await for async operations or remove the async keyword.",
      });
    }
  }

  // Style improvements
  if (score.style < 7) {
    const longLineNumbers: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 120) longLineNumbers.push(i + 1);
    }
    if (longLineNumbers.length > 3) {
      improvements.push({
        area: "style",
        severity: "info",
        title: "Long lines",
        detail: `${longLineNumbers.length} lines exceed 120 characters (lines ${longLineNumbers.slice(0, 5).join(", ")}${longLineNumbers.length > 5 ? "..." : ""}).`,
        suggestion: "Break long lines for readability. Use destructuring, intermediate variables, or line breaks.",
        line: longLineNumbers[0],
      });
    }

    const consoleLogs = (code.match(/console\.\s*log\s*\(/g) ?? []).length;
    if (consoleLogs > 2) {
      improvements.push({
        area: "style",
        severity: "warning",
        title: "Debug logs left in code",
        detail: `${consoleLogs} console.log statements found.`,
        suggestion: "Remove debug console.log statements or replace with a proper logging utility.",
      });
    }
  }

  // Security improvements
  if (score.security < 7) {
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, title, severity } of SECURITY_PATTERNS) {
        if (severity !== "info" && pattern.test(lines[i])) {
          improvements.push({
            area: "security",
            severity,
            title,
            detail: `Security concern detected on line ${i + 1}.`,
            suggestion: getSuggestionForSecurityIssue(title),
            line: i + 1,
          });
          break; // One security improvement per line is enough
        }
      }
    }
  }

  // Performance improvements
  if (score.performance < 7) {
    for (const { pattern, title } of PERFORMANCE_PATTERNS) {
      if (pattern.test(code)) {
        improvements.push({
          area: "performance",
          severity: "warning",
          title,
          detail: "Performance pattern detected that may impact runtime efficiency.",
          suggestion: getSuggestionForPerfIssue(title),
        });
      }
    }
  }

  return improvements;
}

// ── Security suggestion lookup ──

function getSuggestionForSecurityIssue(title: string): string {
  if (title.includes("innerHTML")) {
    return "Use textContent or a sanitization library (e.g., DOMPurify) instead of innerHTML.";
  }
  if (title.includes("eval")) {
    return "Replace eval() with JSON.parse(), Function constructors with strict input, or a safe expression parser.";
  }
  if (title.includes("Hardcoded secret")) {
    return "Move secrets to environment variables (process.env) and use .env files with .gitignore.";
  }
  if (title.includes("SQL injection")) {
    return "Use parameterized queries or an ORM (Prisma, Drizzle) instead of string interpolation in SQL.";
  }
  if (title.includes("CORS")) {
    return "Restrict CORS origins to specific allowed domains instead of using wildcards.";
  }
  return "Review and remediate the security concern following OWASP guidelines.";
}

// ── Performance suggestion lookup ──

function getSuggestionForPerfIssue(title: string): string {
  if (title.includes("N+1")) {
    return "Batch queries or use Promise.all() to execute multiple async operations in parallel.";
  }
  if (title.includes("forEach")) {
    return "Replace forEach+await with Promise.all(array.map(async (item) => ...)) for parallel execution.";
  }
  if (title.includes("JSON.parse(JSON.stringify")) {
    return "Use structuredClone() for deep cloning (available in modern runtimes).";
  }
  if (title.includes("useEffect")) {
    return "Add a dependency array to useEffect to prevent running on every render.";
  }
  if (title.includes("filter().map()")) {
    return "Combine filter and map into a single .reduce() call for one-pass processing.";
  }
  return "Review the performance pattern and optimize for the specific use case.";
}

// ── Main scorer ──

/**
 * Score generated code across 5 quality dimensions plus an overall weighted score.
 * All scoring is regex/heuristic based — no LLM calls.
 */
export function scoreOutput(code: string): OutputScore {
  if (!code || code.trim().length === 0) {
    return {
      completeness: 0,
      correctness: 0,
      style: 0,
      security: 0,
      performance: 0,
      overall: 0,
    };
  }

  const completeness = scoreCompleteness(code).score;
  const correctness = scoreCorrectness(code).score;
  const style = scoreStyle(code).score;
  const security = scoreSecurity(code).score;
  const performance = scorePerformance(code).score;

  const overall =
    completeness * WEIGHTS.completeness +
    correctness * WEIGHTS.correctness +
    style * WEIGHTS.style +
    security * WEIGHTS.security +
    performance * WEIGHTS.performance;

  return {
    completeness: round(completeness),
    correctness: round(correctness),
    style: round(style),
    security: round(security),
    performance: round(performance),
    overall: round(overall),
  };
}

// ── Helpers ──

function clamp(value: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
