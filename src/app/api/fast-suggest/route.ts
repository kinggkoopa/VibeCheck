import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";
import { complete } from "@/core/llm/provider";
import { cached, hashKey } from "@/lib/cache";
import { withLatencyTracking } from "@/lib/monitoring";

/**
 * POST /api/fast-suggest — Lightweight, fast suggestions endpoint.
 *
 * Uses the fastest available provider with low max_tokens for
 * near-instant feedback. Designed for inline suggestions,
 * autocomplete, and quick tips.
 *
 * Body: { input: string, context?: "optimize" | "critique" | "general" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkApiRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { input, context = "general" } = await request.json();

    if (!input || typeof input !== "string" || input.trim().length < 3) {
      return NextResponse.json(
        { error: "Input is required (min 3 characters)" },
        { status: 400 }
      );
    }

    // Truncate input for fast processing
    const truncated = input.slice(0, 500);
    const cacheKey = `fast:${context}:${hashKey(truncated)}`;

    const suggestion = await cached(
      cacheKey,
      () =>
        withLatencyTracking("fast-suggest", context, async () => {
          const systemPrompts: Record<string, string> = {
            optimize:
              "You are a prompt improvement assistant. Given the user's draft, suggest 1-2 short improvements (max 100 words total). Be specific and actionable.",
            critique:
              "You are a code review assistant. Given a code snippet, give 1-2 quick tips (max 100 words total). Focus on the most impactful improvement.",
            general:
              "You are a helpful coding assistant. Give a brief, actionable suggestion (max 100 words). Be concise.",
          };

          // Try fast providers first (Groq > OpenRouter > Anthropic > OpenAI > Ollama)
          const fastProviders = [
            "groq",
            "openrouter",
            "anthropic",
            "openai",
            "ollama",
          ] as const;

          for (const provider of fastProviders) {
            try {
              return await complete(
                provider,
                systemPrompts[context] ?? systemPrompts.general,
                truncated,
                { temperature: 0.3, maxTokens: 256 }
              );
            } catch {
              continue;
            }
          }
          throw new Error("No working API key found");
        }),
      120 // Cache for 2 minutes
    );

    return NextResponse.json({ data: { suggestion }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
