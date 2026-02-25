"use server";

import { createClient } from "@/lib/supabase/server";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

// ── Types ──

export type IterationPhase =
  | "critique"
  | "test-gen"
  | "preview"
  | "vibe-check"
  | "refine"
  | "complete";

export interface PhaseResult {
  phase: IterationPhase;
  output: string;
  score: number | null;
  timestamp: string;
}

export interface IterationStep {
  iteration: number;
  phases: PhaseResult[];
  code: string;
  vibeScore: number | null;
}

export interface AutoIterateResult {
  success: boolean;
  error: string | null;
  steps: IterationStep[];
  finalCode: string;
  finalVibeScore: number;
  totalIterations: number;
  provider: string | null;
}

// ── Provider resolution ──

const PROVIDER_ORDER: LLMProvider[] = [
  "anthropic",
  "openrouter",
  "openai",
  "groq",
];

async function resolveProvider(): Promise<LLMProvider> {
  for (const p of PROVIDER_ORDER) {
    try {
      await complete(p, "Reply OK", "test", { maxTokens: 5 });
      return p;
    } catch {
      continue;
    }
  }
  throw new Error("No working API key found. Add one in Settings.");
}

// ── Phase prompts ──

const CRITIQUE_PROMPT = `You are an expert code reviewer. Analyze the code and return a JSON object:
{
  "score": <0-100>,
  "issues": [
    { "severity": "error|warning|info", "message": "<issue>", "suggestion": "<fix>" }
  ],
  "summary": "<2 sentence summary>"
}
Focus on correctness, security, and maintainability. Return ONLY valid JSON, no markdown fences.`;

const TEST_GEN_PROMPT = `You are a test engineer. Given the code, generate Jest test cases that cover:
- Core functionality (happy path)
- Edge cases and error handling
- Input validation

Return ONLY valid TypeScript Jest test code using describe/it/expect.
Include imports. The tests should be immediately runnable.`;

const PREVIEW_PROMPT = `You are a code improvement specialist. Given the code and its critique, produce an improved version that fixes the identified issues.

Rules:
- Fix ALL errors and warnings from the critique
- Maintain the same API/interface
- Keep the code style consistent
- Add missing error handling
- Do NOT add unnecessary complexity

Return ONLY the improved code, no explanations.`;

const VIBE_CHECK_PROMPT = `You are a "vibe checker" — you evaluate overall code quality holistically.
Assess the code on these dimensions and return a JSON object:
{
  "vibe_score": <0-100>,
  "readability": <0-100>,
  "correctness": <0-100>,
  "security": <0-100>,
  "dx": <0-100>,
  "test_coverage_potential": <0-100>,
  "verdict": "ship_it" | "needs_work" | "start_over",
  "summary": "<2-3 sentence vibe check>"
}
Be honest. 80+ means production-ready. Below 60 means significant issues remain.
Return ONLY valid JSON, no markdown fences.`;

const REFINE_PROMPT = `You are an expert developer performing a refinement pass. You have:
1. The current code
2. The critique results
3. Generated test cases
4. The vibe check results

Produce a refined version of the code that:
- Addresses all remaining critique issues
- Ensures the generated tests would pass
- Improves the vibe score
- Maintains backward compatibility

Return ONLY the refined code, no explanations.`;

// ── Helper: parse JSON from LLM ──

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ── Core iteration loop ──

/**
 * Server Action: Auto-iterate on code.
 *
 * Loop (up to maxIterations):
 *   1. Critique — score the code
 *   2. Test-gen — generate Jest tests
 *   3. Preview — produce improved code based on critique
 *   4. Vibe-check — holistic quality assessment
 *   5. If vibe_score < 80 and iterations remain → Refine and loop
 */
export async function autoIterate(
  initialCode: string,
  maxIterations: number = 3
): Promise<AutoIterateResult> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Not authenticated.",
      steps: [],
      finalCode: initialCode,
      finalVibeScore: 0,
      totalIterations: 0,
      provider: null,
    };
  }

  if (!initialCode || initialCode.trim().length < 10) {
    return {
      success: false,
      error: "Code must be at least 10 characters.",
      steps: [],
      finalCode: initialCode,
      finalVibeScore: 0,
      totalIterations: 0,
      provider: null,
    };
  }

  let provider: LLMProvider;
  try {
    provider = await resolveProvider();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "No provider available.",
      steps: [],
      finalCode: initialCode,
      finalVibeScore: 0,
      totalIterations: 0,
      provider: null,
    };
  }

  const clampedMax = Math.min(Math.max(maxIterations, 1), 3);
  const steps: IterationStep[] = [];
  let currentCode = initialCode.trim();
  let vibeScore = 0;

  for (let i = 0; i < clampedMax; i++) {
    const phases: PhaseResult[] = [];

    // ── Phase 1: Critique ──
    const critiqueSystemPrompt = await injectMemoryContext(
      CRITIQUE_PROMPT,
      currentCode
    );
    const critiqueRaw = await complete(provider, critiqueSystemPrompt, currentCode, {
      temperature: 0.2,
      maxTokens: 4096,
    });
    const critique = parseJSON(critiqueRaw, {
      score: 50,
      issues: [],
      summary: critiqueRaw.slice(0, 200),
    });

    phases.push({
      phase: "critique",
      output: critiqueRaw,
      score: critique.score,
      timestamp: new Date().toISOString(),
    });

    // ── Phase 2: Test Generation ──
    const testGenResult = await complete(
      provider,
      TEST_GEN_PROMPT,
      `Code to test:\n\n${currentCode}\n\nCritique findings:\n${JSON.stringify(critique.issues)}`,
      { temperature: 0.3, maxTokens: 4096 }
    );

    phases.push({
      phase: "test-gen",
      output: testGenResult,
      score: null,
      timestamp: new Date().toISOString(),
    });

    // ── Phase 3: Preview (improved code) ──
    const previewResult = await complete(
      provider,
      PREVIEW_PROMPT,
      `Original code:\n\n${currentCode}\n\nCritique:\n${critiqueRaw}`,
      { temperature: 0.2, maxTokens: 8192 }
    );

    phases.push({
      phase: "preview",
      output: previewResult,
      score: null,
      timestamp: new Date().toISOString(),
    });

    // ── Phase 4: Vibe Check ──
    const vibeCheckRaw = await complete(
      provider,
      VIBE_CHECK_PROMPT,
      `Code:\n\n${previewResult}\n\nGenerated tests:\n${testGenResult}`,
      { temperature: 0.3, maxTokens: 2048 }
    );
    const vibeCheck = parseJSON<{
      vibe_score: number;
      verdict: "ship_it" | "needs_work" | "start_over";
      summary: string;
    }>(vibeCheckRaw, {
      vibe_score: 50,
      verdict: "needs_work",
      summary: vibeCheckRaw.slice(0, 200),
    });

    vibeScore = vibeCheck.vibe_score ?? 50;

    phases.push({
      phase: "vibe-check",
      output: vibeCheckRaw,
      score: vibeScore,
      timestamp: new Date().toISOString(),
    });

    // Update current code to the preview version
    currentCode = previewResult;

    // ── Check: should we stop or refine? ──
    if (vibeScore >= 80 || i === clampedMax - 1) {
      phases.push({
        phase: "complete",
        output: vibeCheck.verdict === "ship_it" ? "Ship it!" : "Completed max iterations.",
        score: vibeScore,
        timestamp: new Date().toISOString(),
      });

      steps.push({
        iteration: i + 1,
        phases,
        code: currentCode,
        vibeScore,
      });
      break;
    }

    // ── Phase 5: Refine for next iteration ──
    const refineResult = await complete(
      provider,
      REFINE_PROMPT,
      `Current code:\n\n${currentCode}\n\nCritique:\n${critiqueRaw}\n\nTests:\n${testGenResult}\n\nVibe check:\n${vibeCheckRaw}`,
      { temperature: 0.2, maxTokens: 8192 }
    );

    phases.push({
      phase: "refine",
      output: refineResult,
      score: null,
      timestamp: new Date().toISOString(),
    });

    currentCode = refineResult;

    steps.push({
      iteration: i + 1,
      phases,
      code: currentCode,
      vibeScore,
    });
  }

  // Persist analytics
  try {
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "critique",
      metadata: {
        auto_iterate: true,
        iterations: steps.length,
        final_vibe_score: vibeScore,
        provider,
      },
    });
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    error: null,
    steps,
    finalCode: currentCode,
    finalVibeScore: vibeScore,
    totalIterations: steps.length,
    provider,
  };
}
