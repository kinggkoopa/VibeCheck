import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatCompletion } from "@/lib/llm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiResponse, Critique } from "@/types";

const RequestSchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().optional(),
});

const CRITIQUE_SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the provided code and return a JSON response with this exact structure:

{
  "issues": [
    {
      "severity": "info" | "warning" | "error",
      "category": "string (e.g. security, performance, readability, bug, style)",
      "message": "string describing the issue",
      "line": number or null,
      "suggestion": "string with fix suggestion or null"
    }
  ],
  "overall_score": number from 0 to 100,
  "summary": "2-3 sentence summary of code quality"
}

Rules:
- Be thorough but fair. Production code is the standard.
- Check for: bugs, security vulnerabilities, performance issues, readability, error handling, edge cases.
- Score 80+ means production-ready. Score 50-79 means needs work. Below 50 means significant issues.
- Output ONLY valid JSON, no markdown fences.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code, language } = parsed.data;
    const langHint = language ? ` (Language: ${language})` : "";

    const raw = await chatCompletion(
      [
        { role: "system", content: CRITIQUE_SYSTEM_PROMPT },
        { role: "user", content: `Review this code${langHint}:\n\n${code}` },
      ],
      { temperature: 0.3, maxTokens: 3000 }
    );

    // Parse the JSON response — strip markdown fences if the model adds them
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let critiqueData: { issues: Critique["issues"]; overall_score: number; summary: string };

    try {
      critiqueData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Failed to parse critique response" },
        { status: 502 }
      );
    }

    // Persist
    const { data: record } = await supabase
      .from("critiques")
      .insert({
        user_id: user.id,
        code_snippet: code,
        issues: critiqueData.issues,
        overall_score: critiqueData.overall_score,
        summary: critiqueData.summary,
      })
      .select()
      .single();

    const critique: Critique = record ?? {
      id: "unsaved",
      user_id: user.id,
      swarm_run_id: null,
      code_snippet: code,
      issues: critiqueData.issues,
      overall_score: critiqueData.overall_score,
      summary: critiqueData.summary,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json<ApiResponse<Critique>>({
      data: critique,
      error: null,
    });
  } catch (err) {
    console.error("Critique error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
