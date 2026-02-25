import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

const BASE_CRITIQUE_PROMPT = `You are an expert code reviewer. Analyze the provided code and return a JSON object with this exact structure:
{
  "overall_score": <number 0-100>,
  "summary": "<brief 1-2 sentence summary>",
  "issues": [
    {
      "severity": "<error|warning|info>",
      "category": "<security|performance|correctness|style|types>",
      "message": "<description of the issue>",
      "suggestion": "<how to fix it>"
    }
  ]
}

Be thorough. Check for: security vulnerabilities (XSS, injection, etc.), type safety issues, error handling gaps, performance problems, and code quality. Return ONLY valid JSON, no markdown fences.`;

/** POST /api/critique — run a code critique using the user's BYOK key */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit LLM calls
    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { code } = await request.json();

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return NextResponse.json(
        { error: "Code is required (min 10 characters)" },
        { status: 400 }
      );
    }

    // Validate input size
    const sizeErr = validateInputSize(code, MAX_SIZES.code, "Code");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    // Auto-inject relevant memory context (e.g. project conventions, past reviews)
    const systemPrompt = await injectMemoryContext(BASE_CRITIQUE_PROMPT, code);

    // Try providers in preference order
    // Ollama (local) is last — serves as offline/free fallback
    const providers = ["anthropic", "openrouter", "openai", "groq", "ollama"] as const;
    let rawResult: string | null = null;

    for (const provider of providers) {
      try {
        rawResult = await complete(provider, systemPrompt, code, {
          temperature: 0.2,
          maxTokens: 4096,
        });
        break;
      } catch {
        continue;
      }
    }

    if (!rawResult) {
      return NextResponse.json(
        { error: "No working API key found. Add one in Settings." },
        { status: 400 }
      );
    }

    // Parse the JSON response from the LLM
    let parsed: { overall_score: number; summary: string; issues: unknown[] };
    try {
      // Strip markdown code fences if present
      const cleaned = rawResult.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, create a basic result from the raw text
      parsed = {
        overall_score: 50,
        summary: rawResult.slice(0, 200),
        issues: [],
      };
    }

    // Persist the critique
    await supabase.from("critiques").insert({
      user_id: user.id,
      code_snippet: code.trim(),
      issues: parsed.issues,
      overall_score: Math.min(100, Math.max(0, parsed.overall_score)),
      summary: parsed.summary,
    });

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "critique",
      metadata: { score: parsed.overall_score },
    });

    return NextResponse.json({ data: parsed, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
