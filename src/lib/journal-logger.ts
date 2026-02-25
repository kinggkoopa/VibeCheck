import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Journal Logger — Automated session logging for the Vibe Journal.
 *
 * After each session (swarm, critique, iteration, optimization, etc.),
 * logs what was done, success/failure, and estimated time saved.
 *
 * Used by the Weekly Insights generator to analyze patterns and suggest improvements.
 */

export interface JournalEntry {
  id: string;
  user_id: string;
  session_type: string;
  prompt_summary: string;
  outcome: "success" | "partial" | "failed";
  time_saved_minutes: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WeeklyInsight {
  period: string;
  totalSessions: number;
  totalTimeSaved: number;
  topSessionTypes: Array<{ type: string; count: number }>;
  successRate: number;
  streak: number;
  patterns: string[];
  suggestions: string[];
}

/**
 * Log a session to the journal.
 */
export async function logSession(entry: {
  sessionType: string;
  promptSummary: string;
  outcome: "success" | "partial" | "failed";
  timeSavedMinutes: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "journal_entry",
      metadata: {
        session_type: entry.sessionType,
        prompt_summary: entry.promptSummary.slice(0, 500),
        outcome: entry.outcome,
        time_saved_minutes: entry.timeSavedMinutes,
        ...entry.metadata,
      },
    });
  } catch {
    // Non-fatal — journal logging should never break the main flow
  }
}

/**
 * Analyze recent sessions and generate weekly insights.
 * Looks at the past 7 days of analytics events.
 */
export async function generateWeeklyInsights(): Promise<WeeklyInsight> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all analytics events from the past week
  const { data: events } = await supabase
    .from("analytics")
    .select("event_type, metadata, created_at")
    .eq("user_id", user.id)
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(500);

  const allEvents = events ?? [];

  // Journal entries specifically
  const journalEntries = allEvents
    .filter((e) => e.event_type === "journal_entry")
    .map((e) => e.metadata as Record<string, unknown>);

  // Count session types
  const typeCounts: Record<string, number> = {};
  for (const event of allEvents) {
    typeCounts[event.event_type] = (typeCounts[event.event_type] ?? 0) + 1;
  }

  const topSessionTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Calculate success rate from journal entries
  const successCount = journalEntries.filter((e) => e.outcome === "success").length;
  const successRate = journalEntries.length > 0
    ? Math.round((successCount / journalEntries.length) * 100)
    : 100;

  // Calculate total time saved
  const totalTimeSaved = journalEntries.reduce(
    (sum, e) => sum + (Number(e.time_saved_minutes) || 0),
    0
  );

  // Calculate streak (consecutive days with at least one event)
  const daySet = new Set(
    allEvents.map((e) => new Date(e.created_at).toISOString().split("T")[0])
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    if (daySet.has(day)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Generate pattern insights
  const patterns: string[] = [];
  const suggestions: string[] = [];

  if (topSessionTypes.length > 0) {
    patterns.push(`Most used: ${topSessionTypes[0].type} (${topSessionTypes[0].count} times)`);
  }
  if (typeCounts["optimization"] > 5) {
    patterns.push(`Heavy prompt optimizer usage (${typeCounts["optimization"]} optimizations)`);
  }
  if (typeCounts["swarm_run"] > 3) {
    patterns.push(`Active multi-agent user (${typeCounts["swarm_run"]} swarm runs)`);
  }
  if (typeCounts["creative_remix"]) {
    patterns.push(`Creative mode active (${typeCounts["creative_remix"]} remixes)`);
  }

  if (!typeCounts["creative_remix"]) {
    suggestions.push("Try the Creative Remix mode for fresh UI inspiration");
  }
  if (!typeCounts["vision_analysis"]) {
    suggestions.push("Use Vision Analysis to analyze UI screenshots for feedback");
  }
  if (successRate < 70) {
    suggestions.push("Success rate is below 70% — consider adjusting your taste profile");
  }
  if (totalTimeSaved > 60) {
    suggestions.push(`Great week! You saved ~${totalTimeSaved} minutes with AI assistance`);
  }

  return {
    period: `${weekAgo.split("T")[0]} to ${new Date().toISOString().split("T")[0]}`,
    totalSessions: allEvents.length,
    totalTimeSaved,
    topSessionTypes,
    successRate,
    streak,
    patterns,
    suggestions,
  };
}
