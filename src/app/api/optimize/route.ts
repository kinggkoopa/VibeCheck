import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { OptimizationStrategy } from "@/types";

const VALID_STRATEGIES = new Set([
  "clarity", "specificity", "chain-of-thought", "few-shot", "role-based", "best-practice",
]);

const STRATEGY_PROMPTS: Record<OptimizationStrategy, string> = {
  clarity: `You are a prompt engineering expert. Rewrite the user's prompt to be
maximally clear and unambiguous. Remove vagueness, add structure, and ensure the
intent is unmistakable. Return ONLY the optimized prompt.`,

  specificity: `You are a prompt engineering expert. Rewrite the user's prompt to
be highly specific. Add concrete constraints, expected format, edge cases to handle,
and quality criteria. Return ONLY the optimized prompt.`,

  "chain-of-thought": `You are a prompt engineering expert. Rewrite the user's prompt
to include chain-of-thought reasoning instructions. Add "think step by step" guidance,
break complex tasks into sequential sub-tasks. Return ONLY the optimized prompt.`,

  "few-shot": `You are a prompt engineering expert. Rewrite the user's prompt and
add 2-3 concrete input/output examples that demonstrate the desired behavior.
Return ONLY the optimized prompt with examples.`,

  "role-based": `You are a prompt engineering expert. Rewrite the user's prompt with
an expert persona/role framing. Define the AI's role, expertise level, and behavioral
guidelines. Return ONLY the optimized prompt.`,

  "best-practice": `You are a world-class prompt engineering expert. Apply ALL best practices to rewrite the user's prompt:

1. Add a clear expert persona/role definition
2. Structure with chain-of-thought reasoning (step-by-step)
3. Include 1-2 concrete input/output examples (few-shot)
4. Add explicit constraints, edge cases, and quality criteria
5. Specify the exact output format expected

The result should be a production-grade prompt that maximizes LLM performance.
Return ONLY the optimized prompt.`,
};

/** POST /api/optimize — optimize a prompt using the user's BYOK key */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, strategy } = await request.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Prompt is required (min 5 characters)" },
        { status: 400 }
      );
    }

    if (!strategy || !VALID_STRATEGIES.has(strategy)) {
      return NextResponse.json(
        { error: `Invalid strategy. Must be one of: ${[...VALID_STRATEGIES].join(", ")}` },
        { status: 400 }
      );
    }

    const basePrompt = STRATEGY_PROMPTS[strategy as OptimizationStrategy];

    // Auto-inject relevant memory context into the system prompt
    const systemPrompt = await injectMemoryContext(basePrompt, prompt);

    // Try providers in order of preference until one works
    // Ollama (local) is last — serves as offline/free fallback
    const providers = ["anthropic", "openrouter", "openai", "groq", "ollama"] as const;
    let optimized: string | null = null;
    let lastError: string | null = null;

    for (const provider of providers) {
      try {
        optimized = await complete(provider, systemPrompt, prompt, {
          temperature: 0.4,
          maxTokens: 4096,
        });
        break;
      } catch {
        lastError = `No key for ${provider}`;
        continue;
      }
    }

    if (!optimized) {
      return NextResponse.json(
        { error: `No working API key found. ${lastError}. Add one in Settings.` },
        { status: 400 }
      );
    }

    // Persist the optimization
    await supabase.from("prompt_optimizations").insert({
      user_id: user.id,
      original_prompt: prompt,
      optimized_prompt: optimized,
      strategy,
    });

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "optimization",
      metadata: { strategy },
    });

    return NextResponse.json({
      data: { optimized_prompt: optimized, strategy },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
