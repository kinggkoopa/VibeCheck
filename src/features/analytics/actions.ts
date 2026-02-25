"use server";

import { createClient } from "@/lib/supabase/server";

export interface AnalyticsOverview {
  totalEvents: number;
  eventCounts: Record<string, number>;
  recentEvents: {
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
  dailyActivity: { date: string; count: number }[];
  scoreHistory: { date: string; score: number; event_type: string }[];
  providerUsage: Record<string, number>;
  suggestions: string[];
}

/**
 * Server Action: Fetch analytics overview for the current user.
 * Returns aggregated metrics, daily activity, score trends, and improvement suggestions.
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalEvents: 0,
      eventCounts: {},
      recentEvents: [],
      dailyActivity: [],
      scoreHistory: [],
      providerUsage: {},
      suggestions: ["Sign in to start tracking your vibe metrics."],
    };
  }

  // Fetch last 500 events for aggregation
  const { data: events } = await supabase
    .from("analytics")
    .select("event_type, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const allEvents = events ?? [];

  // Event counts by type
  const eventCounts: Record<string, number> = {};
  for (const e of allEvents) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
  }

  // Daily activity (last 30 days)
  const dailyMap: Record<string, number> = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const e of allEvents) {
    const d = new Date(e.created_at);
    if (d >= thirtyDaysAgo) {
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] ?? 0) + 1;
    }
  }

  // Fill missing days with 0
  const dailyActivity: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyActivity.push({ date: key, count: dailyMap[key] ?? 0 });
  }

  // Score history from critique and optimization events
  const scoreHistory: { date: string; score: number; event_type: string }[] = [];
  for (const e of allEvents) {
    const meta = e.metadata as Record<string, unknown>;
    const score = (meta?.score as number) ?? (meta?.score_after as number);
    if (typeof score === "number") {
      scoreHistory.push({
        date: new Date(e.created_at).toISOString().slice(0, 10),
        score,
        event_type: e.event_type,
      });
    }
  }
  scoreHistory.reverse(); // chronological order

  // Provider usage breakdown
  const providerUsage: Record<string, number> = {};
  for (const e of allEvents) {
    const meta = e.metadata as Record<string, unknown>;
    const prov = meta?.provider as string | undefined;
    if (prov) {
      providerUsage[prov] = (providerUsage[prov] ?? 0) + 1;
    }
  }

  // Generate improvement suggestions
  const suggestions = generateSuggestions(eventCounts, scoreHistory, allEvents.length);

  return {
    totalEvents: allEvents.length,
    eventCounts,
    recentEvents: allEvents.slice(0, 20),
    dailyActivity,
    scoreHistory,
    providerUsage,
    suggestions,
  };
}

function generateSuggestions(
  counts: Record<string, number>,
  scores: { score: number; event_type: string }[],
  total: number
): string[] {
  const suggestions: string[] = [];

  if (total === 0) {
    suggestions.push("Start using the Optimizer, Critique, or Agent Swarm to build your vibe profile.");
    return suggestions;
  }

  if (!counts.critique) {
    suggestions.push("Try the Code Critique swarm to get multi-agent security and architecture feedback.");
  }

  if (!counts.optimization) {
    suggestions.push("Use the Prompt Optimizer to refine your prompts — better prompts = better code.");
  }

  if (!counts.memory_store) {
    suggestions.push("Store project context in Memory Vault to improve all LLM interactions.");
  }

  // Check average score trends
  const recentScores = scores.slice(-10);
  if (recentScores.length >= 3) {
    const avg = recentScores.reduce((s, e) => s + e.score, 0) / recentScores.length;
    if (avg < 60) {
      suggestions.push("Your recent scores average below 60. Try running Auto-Iterate for automatic improvement loops.");
    } else if (avg >= 80) {
      suggestions.push("Excellent vibe! Your recent scores average 80+. Keep shipping quality code.");
    }
  }

  if ((counts.critique ?? 0) > 5 && !counts.memory_store) {
    suggestions.push("You've run several critiques. Store key learnings in Memory Vault to improve future results.");
  }

  if (suggestions.length === 0) {
    suggestions.push("You're using all the tools. Keep iterating to improve your vibe score!");
  }

  return suggestions;
}
