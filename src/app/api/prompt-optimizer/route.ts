import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatCompletion } from "@/lib/llm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OptimizationStrategy, ApiResponse, PromptOptimization } from "@/types";

const RequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  strategy: z.enum(["clarity", "specificity", "chain-of-thought", "few-shot", "role-based"]),
});

const STRATEGY_INSTRUCTIONS: Record<OptimizationStrategy, string> = {
  clarity:
    "Rewrite the prompt to be clearer and less ambiguous. Remove jargon and make the intent obvious.",
  specificity:
    "Add specific details, constraints, and expected output format to the prompt. Be precise about what you want.",
  "chain-of-thought":
    "Restructure the prompt to encourage step-by-step reasoning. Add 'Let's think step by step' or break the task into sequential sub-questions.",
  "few-shot":
    "Add 2-3 concrete input/output examples that demonstrate the desired behavior before the actual task.",
  "role-based":
    "Add a role/persona prefix (e.g., 'You are an expert...') that primes the model for the task domain.",
};

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

    const { prompt, strategy } = parsed.data;

    const optimized = await chatCompletion([
      {
        role: "system",
        content: `You are a prompt engineering expert. Your job is to optimize prompts for AI coding assistants.
Strategy: ${strategy}
Instructions: ${STRATEGY_INSTRUCTIONS[strategy]}

Rules:
- Output ONLY the optimized prompt, nothing else.
- Preserve the user's original intent.
- Make the prompt production-ready.`,
      },
      {
        role: "user",
        content: `Optimize this prompt:\n\n${prompt}`,
      },
    ], { temperature: 0.4 });

    // Persist to database
    const { data: record, error: dbError } = await supabase
      .from("prompt_optimizations")
      .insert({
        user_id: user.id,
        original_prompt: prompt,
        optimized_prompt: optimized,
        strategy,
      })
      .select()
      .single();

    if (dbError) {
      // Non-fatal: log and return the optimization anyway
      console.error("Failed to persist optimization:", dbError.message);
    }

    return NextResponse.json<ApiResponse<PromptOptimization>>({
      data: record ?? {
        id: "unsaved",
        user_id: user.id,
        original_prompt: prompt,
        optimized_prompt: optimized,
        strategy,
        score_before: null,
        score_after: null,
        created_at: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err) {
    console.error("Prompt optimization error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
