import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Meta-Improver — Self-improving taste profile.
 *
 * Analyzes accepted/rejected outputs from the past week,
 * identifies patterns, and auto-updates the user's prompt library
 * and taste preferences.
 *
 * Runs via /api/improve (Vercel cron or manual trigger).
 */

export interface ImprovementLog {
  id: string;
  user_id: string;
  analysis: string;
  preferences_added: string[];
  prompts_updated: number;
  created_at: string;
}

/** Analyze recent session patterns for a user. */
export async function analyzeRecentSessions(userId: string): Promise<{
  totalEvents: number;
  patterns: string[];
  suggestions: string[];
}> {
  const supabase = await createClient();

  // Get last 7 days of analytics
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await supabase
    .from("analytics")
    .select("event_type, metadata, created_at")
    .eq("user_id", userId)
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!events || events.length === 0) {
    return { totalEvents: 0, patterns: [], suggestions: [] };
  }

  // Analyze patterns
  const patterns: string[] = [];
  const suggestions: string[] = [];

  // Count event types
  const typeCounts: Record<string, number> = {};
  for (const e of events) {
    typeCounts[e.event_type] = (typeCounts[e.event_type] ?? 0) + 1;
  }

  // Identify heavy usage patterns
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  if (topType) {
    patterns.push(`Most used: ${topType[0]} (${topType[1]}x this week)`);
  }

  // Check for repeated strategies
  const strategies: Record<string, number> = {};
  for (const e of events) {
    const meta = e.metadata as Record<string, unknown> | null;
    if (meta?.strategy && typeof meta.strategy === "string") {
      strategies[meta.strategy] = (strategies[meta.strategy] ?? 0) + 1;
    }
  }
  const topStrategy = Object.entries(strategies).sort((a, b) => b[1] - a[1])[0];
  if (topStrategy && topStrategy[1] >= 3) {
    patterns.push(
      `Preferred strategy: ${topStrategy[0]} (used ${topStrategy[1]}x)`
    );
    suggestions.push(
      `Consider setting "${topStrategy[0]}" as your default optimization strategy`
    );
  }

  // Check for voice usage
  const voiceCount = typeCounts["voice_transcription"] ?? 0;
  if (voiceCount > 0) {
    patterns.push(`Voice input used ${voiceCount}x`);
  }

  // Check for shipping patterns
  const shipCount = typeCounts["github_ship"] ?? 0;
  if (shipCount > 0) {
    patterns.push(`Shipped ${shipCount} PR${shipCount > 1 ? "s" : ""} this week`);
  }

  // Suggest improvements
  if (events.length > 20) {
    suggestions.push(
      "High usage week! Consider saving your best prompts to the library for reuse."
    );
  }

  if (!typeCounts["memory_store"]) {
    suggestions.push(
      "Try storing memories — they auto-enrich your future prompts with past context."
    );
  }

  return {
    totalEvents: events.length,
    patterns,
    suggestions,
  };
}

/** Log an improvement run. */
export async function logImprovement(
  userId: string,
  analysis: string,
  preferencesAdded: string[]
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("analytics").insert({
    user_id: userId,
    event_type: "meta_improvement",
    metadata: {
      analysis,
      preferences_added: preferencesAdded,
    },
  });
}
