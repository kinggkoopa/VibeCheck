"use server";

import { createClient } from "@/lib/supabase/server";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider, OptimizationStrategy, PromptLibraryEntry } from "@/types";

// ── Strategy system prompts ──

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

// ── Provider priority (Anthropic first) ──

const PROVIDER_ORDER: LLMProvider[] = [
  "anthropic",
  "openrouter",
  "openai",
  "groq",
];

// ── Result types ──

export interface OptimizeResult {
  success: boolean;
  error: string | null;
  optimizedPrompt: string | null;
  strategy: OptimizationStrategy | null;
  provider: string | null;
}

export interface LibraryResult {
  success: boolean;
  error: string | null;
  entries: PromptLibraryEntry[];
}

// ── Core optimization action ──

/**
 * Server Action: optimize a raw prompt idea.
 *
 * Flow:
 * 1. Auth check
 * 2. Inject relevant memory context into system prompt
 * 3. Try providers in order (Anthropic/Opus 4.6 first)
 * 4. Persist optimization record
 * 5. Return optimized prompt
 */
export async function optimizePrompt(
  rawPrompt: string,
  strategy: OptimizationStrategy
): Promise<OptimizeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Not authenticated.",
      optimizedPrompt: null,
      strategy: null,
      provider: null,
    };
  }

  if (!rawPrompt || rawPrompt.trim().length < 5) {
    return {
      success: false,
      error: "Prompt must be at least 5 characters.",
      optimizedPrompt: null,
      strategy: null,
      provider: null,
    };
  }

  const basePrompt = STRATEGY_PROMPTS[strategy];
  if (!basePrompt) {
    return {
      success: false,
      error: "Invalid strategy.",
      optimizedPrompt: null,
      strategy: null,
      provider: null,
    };
  }

  // Inject relevant memory context
  const systemPrompt = await injectMemoryContext(basePrompt, rawPrompt);

  // Try providers in priority order (Anthropic/Opus 4.6 first)
  let optimized: string | null = null;
  let usedProvider: string | null = null;

  for (const provider of PROVIDER_ORDER) {
    try {
      optimized = await complete(provider, systemPrompt, rawPrompt, {
        temperature: 0.4,
        maxTokens: 4096,
      });
      usedProvider = provider;
      break;
    } catch {
      continue;
    }
  }

  if (!optimized) {
    return {
      success: false,
      error: "No working API key found. Add one in Settings.",
      optimizedPrompt: null,
      strategy: null,
      provider: null,
    };
  }

  // Persist the optimization record
  await supabase.from("prompt_optimizations").insert({
    user_id: user.id,
    original_prompt: rawPrompt.trim(),
    optimized_prompt: optimized,
    strategy,
  });

  // Log analytics
  await supabase.from("analytics").insert({
    user_id: user.id,
    event_type: "optimization",
    metadata: { strategy, provider: usedProvider },
  });

  return {
    success: true,
    error: null,
    optimizedPrompt: optimized,
    strategy,
    provider: usedProvider,
  };
}

// ── Prompt Library actions ──

/** Save an optimized prompt to the library for reuse. */
export async function saveToLibrary(
  title: string,
  content: string,
  tags: string[]
): Promise<LibraryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated.", entries: [] };
  }

  if (!title.trim() || !content.trim()) {
    return {
      success: false,
      error: "Title and content are required.",
      entries: [],
    };
  }

  const { error } = await supabase.from("prompt_library").insert({
    user_id: user.id,
    title: title.trim(),
    content: content.trim(),
    tags,
  });

  if (error) {
    return {
      success: false,
      error: `Failed to save: ${error.message}`,
      entries: [],
    };
  }

  return loadLibrary();
}

/** Load all library entries, sorted by usage count (most used first). */
export async function loadLibrary(): Promise<LibraryResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_library")
    .select("id, user_id, title, content, tags, usage_count, created_at")
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      success: false,
      error: `Failed to load library: ${error.message}`,
      entries: [],
    };
  }

  return {
    success: true,
    error: null,
    entries: (data ?? []) as PromptLibraryEntry[],
  };
}

/** Increment usage count when a library prompt is reused. */
export async function bumpLibraryUsage(entryId: string): Promise<void> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("prompt_library")
    .select("usage_count")
    .eq("id", entryId)
    .single();

  if (data) {
    await supabase
      .from("prompt_library")
      .update({
        usage_count: (data.usage_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId);
  }
}

/** Delete a library entry. */
export async function deleteLibraryEntry(
  entryId: string
): Promise<LibraryResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prompt_library")
    .delete()
    .eq("id", entryId);

  if (error) {
    return {
      success: false,
      error: `Failed to delete: ${error.message}`,
      entries: [],
    };
  }

  return loadLibrary();
}
