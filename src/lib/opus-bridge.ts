/**
 * Opus Bridge — Claude Code ↔ MetaVibeCoder Handoff Library
 *
 * Enables seamless handoff between the MetaVibeCoder swarm pipeline
 * and Claude Opus for deeper reasoning passes. Builds structured
 * context from swarm output, sends it to Opus, and fuses the results
 * back into a single production-ready output.
 *
 * Flow: Swarm Output → buildHandoffContext → createHandoffMessage → Opus API → fuseResults
 */

// ── Types ──

export interface OpusBridgeConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  contextWindow: number;
}

export interface HandoffParams {
  task: string;
  code: string;
  swarmResults: string;
  memoryContext?: string;
  preferences?: string;
}

export interface HandoffContext {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  metadata: {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    complexityScore: number;
    taskSummary: string;
  };
}

export interface Change {
  location: string;
  description: string;
  reason: string;
  source: "swarm" | "opus";
  type: "improvement" | "fix" | "refactor";
}

export interface FusedResult {
  fusedCode: string;
  changes: Change[];
  confidence: number;
  summary: string;
}

// ── Default Config ──

export const DEFAULT_OPUS_CONFIG: OpusBridgeConfig = {
  model: "claude-opus-4-20250514",
  baseUrl: "https://api.anthropic.com/v1",
  maxTokens: 4096,
  contextWindow: 200000,
};

// ── Token Estimation ──

/**
 * Estimate token count using a simple word/4 heuristic.
 * This is a rough approximation — actual tokenization varies by model.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Split on whitespace and punctuation boundaries, count ~4 chars per token
  const charCount = text.length;
  return Math.ceil(charCount / 4);
}

// ── Complexity Scoring ──

/**
 * Score the complexity of the task + code on a 0-100 scale.
 * Higher scores indicate the task would benefit more from Opus-level reasoning.
 */
function computeComplexityScore(params: HandoffParams): number {
  let score = 0;

  // Code length factor (longer code = more complex)
  const codeLines = params.code.split("\n").length;
  if (codeLines > 200) score += 25;
  else if (codeLines > 100) score += 15;
  else if (codeLines > 50) score += 10;
  else score += 5;

  // Swarm results length (more findings = more complex)
  const swarmLength = params.swarmResults.length;
  if (swarmLength > 5000) score += 20;
  else if (swarmLength > 2000) score += 12;
  else if (swarmLength > 500) score += 6;

  // Task description complexity
  const taskWords = params.task.split(/\s+/).length;
  if (taskWords > 50) score += 15;
  else if (taskWords > 20) score += 10;
  else score += 5;

  // Code complexity indicators
  const complexPatterns = [
    /async\s+/g,
    /Promise/g,
    /try\s*\{/g,
    /catch\s*\(/g,
    /class\s+/g,
    /interface\s+/g,
    /generic|<T[>,\s]/g,
    /recursion|recursive/gi,
    /algorithm/gi,
  ];
  for (const pattern of complexPatterns) {
    const matches = params.code.match(pattern);
    if (matches) score += Math.min(matches.length * 2, 10);
  }

  // Memory context adds complexity
  if (params.memoryContext) score += 5;

  // Preferences add nuance
  if (params.preferences) score += 5;

  return Math.min(score, 100);
}

// ── Context Building ──

/**
 * Build a structured handoff context from the swarm output and task parameters.
 * The context includes a system prompt instructing Opus on how to continue
 * from where the swarm left off, plus the conversation messages array.
 */
export function buildHandoffContext(params: HandoffParams): HandoffContext {
  const complexityScore = computeComplexityScore(params);

  // Build the system prompt that instructs Opus on its role
  const systemPrompt = [
    "You are Claude Opus, acting as the final-pass reviewer in the MetaVibeCoder pipeline.",
    "A swarm of specialized agents (Architect, Security, UX, Performance) has already analyzed and improved the code below.",
    "",
    "Your role is to:",
    "1. Review the swarm's collective output with your deeper reasoning capabilities",
    "2. Identify any issues the swarm missed — subtle bugs, edge cases, architectural concerns, or logic errors",
    "3. Apply production-level improvements: error handling, type safety, performance optimizations, and code clarity",
    "4. Fix any conflicts or inconsistencies between different agents' suggestions",
    "5. Produce a final, production-ready version of the code",
    "",
    "Guidelines:",
    "- Preserve the swarm's good decisions — only override when you have a clearly better approach",
    "- Explain every change you make and why it improves on the swarm's output",
    "- Output the complete, final code — not just diffs or snippets",
    "- If the swarm's output is already excellent, say so and make minimal changes",
    "- Format your response as: ANALYSIS section, then CHANGES section listing each change, then FINAL CODE section with the complete code",
    params.preferences
      ? `\nUser preferences to respect:\n${params.preferences}`
      : "",
    params.memoryContext
      ? `\nRelevant context from memory:\n${params.memoryContext}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Build the conversation messages
  const userMessage = [
    `## Task\n${params.task}`,
    `\n## Original Code\n\`\`\`\n${params.code}\n\`\`\``,
    `\n## Swarm Output\nThe following is the combined output from the MetaVibeCoder agent swarm:\n\n${params.swarmResults}`,
    "\n## Your Instructions",
    "Review the swarm's work above. Apply your deeper reasoning to produce the final, production-ready output.",
    "Structure your response with clear ANALYSIS, CHANGES, and FINAL CODE sections.",
  ].join("\n");

  const messages: Array<{ role: string; content: string }> = [
    { role: "user", content: userMessage },
  ];

  // Estimate tokens
  const inputText = systemPrompt + userMessage;
  const estimatedInputTokens = estimateTokens(inputText);
  const estimatedOutputTokens = Math.min(
    DEFAULT_OPUS_CONFIG.maxTokens,
    Math.ceil(estimatedInputTokens * 0.6)
  );

  return {
    systemPrompt,
    messages,
    metadata: {
      estimatedInputTokens,
      estimatedOutputTokens,
      complexityScore,
      taskSummary:
        params.task.length > 120
          ? params.task.slice(0, 117) + "..."
          : params.task,
    },
  };
}

// ── Message Formatting ──

/**
 * Format the handoff context into API-ready messages.
 * Returns the message array with the system prompt as the first system message
 * followed by the conversation messages.
 */
export function createHandoffMessage(
  context: HandoffContext
): Array<{ role: string; content: string }> {
  return [
    { role: "system", content: context.systemPrompt },
    ...context.messages,
  ];
}

// ── Results Fusion ──

/**
 * Parse the CHANGES section from Opus output into structured Change objects.
 */
function parseChanges(opusOutput: string): Change[] {
  const changes: Change[] = [];
  const changesSection = opusOutput.match(
    /##?\s*CHANGES\s*\n([\s\S]*?)(?=##?\s*FINAL\s*CODE|$)/i
  );

  if (!changesSection) return changes;

  const changeText = changesSection[1];
  // Split on numbered items or bullet points
  const items = changeText.split(/(?:^|\n)\s*(?:\d+[\.\)]\s*|\-\s*|\*\s*)/);

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || trimmed.length < 10) continue;

    // Determine change type from keywords
    let type: Change["type"] = "improvement";
    if (/\b(?:fix|bug|error|issue|broken|incorrect)\b/i.test(trimmed)) {
      type = "fix";
    } else if (
      /\b(?:refactor|rename|restructure|reorganize|extract|simplify)\b/i.test(
        trimmed
      )
    ) {
      type = "refactor";
    }

    // Try to extract a location (function name, line reference, etc.)
    const locationMatch = trimmed.match(
      /(?:in\s+|at\s+)?`([^`]+)`|(?:function|method|class|component)\s+(\w+)/i
    );
    const location = locationMatch
      ? locationMatch[1] ?? locationMatch[2] ?? "general"
      : "general";

    changes.push({
      location,
      description: trimmed.slice(0, 200),
      reason: trimmed,
      source: "opus",
      type,
    });
  }

  return changes;
}

/**
 * Extract the final code block from Opus output.
 */
function extractFinalCode(opusOutput: string): string | null {
  // Look for code inside the FINAL CODE section
  const finalSection = opusOutput.match(
    /##?\s*FINAL\s*CODE\s*\n([\s\S]*?)$/i
  );
  if (!finalSection) return null;

  // Extract code from fenced code block
  const codeBlock = finalSection[1].match(/```[\w]*\n([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // Fallback: take everything after the heading that looks like code
  const raw = finalSection[1].trim();
  return raw || null;
}

/**
 * Fuse swarm output with Opus improvements into a single result.
 *
 * Merges the swarm's code with Opus-level improvements, tracking
 * every change and computing a confidence score.
 */
export function fuseResults(
  swarmOutput: string,
  opusOutput: string
): FusedResult {
  // Parse structured changes from Opus response
  const opusChanges = parseChanges(opusOutput);

  // Extract final code from Opus output
  const opusFinalCode = extractFinalCode(opusOutput);

  // Extract code from swarm output (may be in a code block)
  const swarmCodeBlock = swarmOutput.match(/```[\w]*\n([\s\S]*?)```/);
  const swarmCode = swarmCodeBlock ? swarmCodeBlock[1].trim() : swarmOutput;

  // Determine the fused code — prefer Opus final code if available
  const fusedCode = opusFinalCode ?? swarmCode;

  // Compute confidence based on how well-structured the Opus response was
  let confidence = 0.5; // Base confidence

  // Opus provided structured changes
  if (opusChanges.length > 0) confidence += 0.15;

  // Opus provided final code
  if (opusFinalCode) confidence += 0.2;

  // Opus output has analysis section
  if (/##?\s*ANALYSIS/i.test(opusOutput)) confidence += 0.1;

  // Both outputs are non-trivial
  if (swarmOutput.length > 100 && opusOutput.length > 100) confidence += 0.05;

  confidence = Math.min(confidence, 1.0);

  // Build summary from Opus analysis section
  const analysisMatch = opusOutput.match(
    /##?\s*ANALYSIS\s*\n([\s\S]*?)(?=##?\s*CHANGES|$)/i
  );
  const analysisSummary = analysisMatch
    ? analysisMatch[1].trim().slice(0, 500)
    : "Opus reviewed the swarm output and applied improvements.";

  // Add swarm-sourced changes (the original swarm work)
  const swarmChanges: Change[] = [
    {
      location: "general",
      description: "Initial multi-agent swarm analysis and improvements",
      reason:
        "Swarm agents (Architect, Security, UX, Performance) collaboratively analyzed and improved the code",
      source: "swarm",
      type: "improvement",
    },
  ];

  const allChanges = [...swarmChanges, ...opusChanges];

  return {
    fusedCode,
    changes: allChanges,
    confidence: Math.round(confidence * 100) / 100,
    summary: analysisSummary,
  };
}
