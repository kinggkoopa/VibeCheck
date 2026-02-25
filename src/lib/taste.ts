import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Taste / Vibe Profile — Personalizes ALL LLM interactions.
 *
 * The taste profile is the user's coding DNA: preferred styles, patterns,
 * frameworks, and personal preferences that get injected into every
 * system prompt across the platform.
 *
 * Stored in `taste_prefs` table, loaded once per request, cached in-module.
 */

export interface TasteProfile {
  // Coding style
  language_preferences: string[];      // e.g. ["TypeScript", "Python", "Rust"]
  framework_preferences: string[];     // e.g. ["Next.js", "FastAPI", "Tailwind"]
  code_style: string;                  // e.g. "functional", "OOP", "mixed"
  comment_style: string;               // e.g. "minimal", "jsdoc", "inline"
  naming_convention: string;           // e.g. "camelCase", "snake_case"

  // Personal preferences
  tone: string;                        // e.g. "direct", "friendly", "technical"
  verbosity: string;                   // e.g. "concise", "detailed", "balanced"
  timezone: string;                    // e.g. "America/New_York"
  locale_city: string;                 // e.g. "Tampa, FL"

  // Vibe customizations
  vibe_mode: string;                   // e.g. "flow-state", "learning", "shipping"
  custom_instructions: string;         // Free-form personal instructions
  avoided_patterns: string[];          // e.g. ["classes", "ternary chains", "any"]

  // Meta
  updated_at: string;
}

const DEFAULT_TASTE: TasteProfile = {
  language_preferences: ["TypeScript"],
  framework_preferences: ["Next.js", "React", "Tailwind CSS"],
  code_style: "functional",
  comment_style: "minimal",
  naming_convention: "camelCase",
  tone: "direct",
  verbosity: "concise",
  timezone: "America/New_York",
  locale_city: "Tampa, FL",
  vibe_mode: "flow-state",
  custom_instructions: "",
  avoided_patterns: [],
  updated_at: new Date().toISOString(),
};

/**
 * Load the current user's taste profile from Supabase.
 * Returns defaults if no profile exists yet.
 */
export async function loadTasteProfile(): Promise<TasteProfile> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_TASTE;

    const { data } = await supabase
      .from("taste_prefs")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!data) return DEFAULT_TASTE;

    return {
      language_preferences: data.language_preferences ?? DEFAULT_TASTE.language_preferences,
      framework_preferences: data.framework_preferences ?? DEFAULT_TASTE.framework_preferences,
      code_style: data.code_style ?? DEFAULT_TASTE.code_style,
      comment_style: data.comment_style ?? DEFAULT_TASTE.comment_style,
      naming_convention: data.naming_convention ?? DEFAULT_TASTE.naming_convention,
      tone: data.tone ?? DEFAULT_TASTE.tone,
      verbosity: data.verbosity ?? DEFAULT_TASTE.verbosity,
      timezone: data.timezone ?? DEFAULT_TASTE.timezone,
      locale_city: data.locale_city ?? DEFAULT_TASTE.locale_city,
      vibe_mode: data.vibe_mode ?? DEFAULT_TASTE.vibe_mode,
      custom_instructions: data.custom_instructions ?? DEFAULT_TASTE.custom_instructions,
      avoided_patterns: data.avoided_patterns ?? DEFAULT_TASTE.avoided_patterns,
      updated_at: data.updated_at ?? DEFAULT_TASTE.updated_at,
    };
  } catch {
    return DEFAULT_TASTE;
  }
}

/**
 * Save/update the user's taste profile.
 */
export async function saveTasteProfile(
  profile: Partial<TasteProfile>
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("taste_prefs").upsert(
    {
      user_id: user.id,
      ...profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/**
 * Generate a taste injection block for system prompts.
 *
 * This is the core integration point — call this from any route that
 * makes LLM calls, and append the result to the system prompt.
 *
 * Usage:
 *   const tasteBlock = await getTasteInjection();
 *   const fullPrompt = baseSystemPrompt + tasteBlock;
 */
export async function getTasteInjection(): Promise<string> {
  const taste = await loadTasteProfile();

  const parts: string[] = [
    "\n\n<user_preferences>",
    "The user has the following coding preferences — respect these in all output:",
  ];

  if (taste.language_preferences.length > 0) {
    parts.push(`- Preferred languages: ${taste.language_preferences.join(", ")}`);
  }
  if (taste.framework_preferences.length > 0) {
    parts.push(`- Preferred frameworks: ${taste.framework_preferences.join(", ")}`);
  }
  if (taste.code_style) {
    parts.push(`- Code style: ${taste.code_style}`);
  }
  if (taste.comment_style) {
    parts.push(`- Comments: ${taste.comment_style}`);
  }
  if (taste.naming_convention) {
    parts.push(`- Naming: ${taste.naming_convention}`);
  }
  if (taste.tone) {
    parts.push(`- Communication tone: ${taste.tone}`);
  }
  if (taste.verbosity) {
    parts.push(`- Verbosity: ${taste.verbosity}`);
  }
  if (taste.avoided_patterns.length > 0) {
    parts.push(`- AVOID these patterns: ${taste.avoided_patterns.join(", ")}`);
  }
  if (taste.vibe_mode) {
    parts.push(`- Current vibe mode: ${taste.vibe_mode}`);
  }
  if (taste.custom_instructions) {
    parts.push(`- Custom instructions: ${taste.custom_instructions}`);
  }
  if (taste.locale_city) {
    parts.push(`- User location: ${taste.locale_city} (${taste.timezone})`);
  }

  parts.push("</user_preferences>");

  return parts.join("\n");
}
