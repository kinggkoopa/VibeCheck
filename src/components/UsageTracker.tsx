"use client";

import { useState, useEffect, useCallback } from "react";

interface UsageStats {
  totalEvents: number;
  thisWeek: number;
  streak: number;
  estimatedHoursSaved: number;
  estimatedTokensSaved: number;
  topAction: string;
  improvementLogs: Array<{
    metadata: { analysis?: string; patterns?: string[]; suggestions?: string[] };
    created_at: string;
  }>;
}

/**
 * UsageTracker — Personal usage stats and savings tracker.
 *
 * Displays:
 * - Hours saved estimate (based on task complexity)
 * - Token savings (via taste/efficiency)
 * - Usage streaks
 * - Self-improvement logs
 */
export function UsageTracker() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [improving, setImproving] = useState(false);
  const [improvementResult, setImprovementResult] = useState<{
    message: string;
    patterns: string[];
    suggestions: string[];
  } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch analytics overview and improvement logs in parallel
      const [analyticsRes, improveRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/improve"),
      ]);

      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;
      const improveData = improveRes.ok ? await improveRes.json() : null;

      const overview = analyticsData?.data;
      if (!overview) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Calculate estimates
      const totalEvents = overview.totalEvents ?? 0;
      const eventCounts = (overview.eventCounts ?? {}) as Record<string, number>;

      // Estimate hours saved: critique ~0.5h, swarm ~1h, iterate ~1.5h, optimize ~0.3h
      const hoursSaved =
        (eventCounts.critique ?? 0) * 0.5 +
        (eventCounts.swarm_run ?? 0) * 1.0 +
        (eventCounts.optimization ?? 0) * 0.3;

      // Estimate tokens saved: ~2000 tokens per avoided retry
      const tokensSaved = totalEvents * 800;

      // Calculate streak (consecutive days with events)
      const daily = (overview.dailyActivity ?? []) as Array<{
        date: string;
        count: number;
      }>;
      let streak = 0;
      const today = new Date().toISOString().split("T")[0];
      for (let i = 0; i < daily.length; i++) {
        const d = daily[i];
        const expectedDate = new Date(
          Date.now() - i * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0];
        if (d.date === expectedDate && d.count > 0) {
          streak++;
        } else if (i === 0 && d.date !== today) {
          // Today might not have events yet — check if yesterday had
          continue;
        } else {
          break;
        }
      }

      // Top action
      const topEntry = Object.entries(eventCounts).sort(
        (a, b) => (b[1] as number) - (a[1] as number)
      )[0];

      setStats({
        totalEvents,
        thisWeek: daily
          .slice(0, 7)
          .reduce((acc, d) => acc + d.count, 0),
        streak,
        estimatedHoursSaved: Math.round(hoursSaved * 10) / 10,
        estimatedTokensSaved: tokensSaved,
        topAction: topEntry ? `${topEntry[0]} (${topEntry[1]}x)` : "none",
        improvementLogs: improveData?.data ?? [],
      });
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function runImprovement() {
    setImproving(true);
    setImprovementResult(null);
    try {
      const res = await fetch("/api/improve", { method: "POST" });
      const data = await res.json();
      if (data.data) {
        setImprovementResult(data.data);
        fetchStats(); // Refresh
      }
    } catch {
      // ignore
    } finally {
      setImproving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-xl bg-surface" />
        <div className="h-24 rounded-xl bg-surface" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">No usage data yet. Start using MetaVibeCoder!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Hours Saved"
          value={`~${stats.estimatedHoursSaved}h`}
          sub="estimated from task complexity"
          color="text-success"
        />
        <StatCard
          label="Tokens Saved"
          value={`~${(stats.estimatedTokensSaved / 1000).toFixed(0)}K`}
          sub="via taste + efficiency"
          color="text-primary-light"
        />
        <StatCard
          label="Streak"
          value={`${stats.streak} day${stats.streak !== 1 ? "s" : ""}`}
          sub="consecutive active days"
          color="text-warning"
        />
        <StatCard
          label="This Week"
          value={String(stats.thisWeek)}
          sub={`of ${stats.totalEvents} total events`}
          color="text-foreground"
        />
      </div>

      {/* ── Self-Improvement ── */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Self-Improvement</h3>
          <button
            onClick={runImprovement}
            disabled={improving}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-light transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {improving ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>

        {improvementResult && (
          <div className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm">{improvementResult.message}</p>
            {improvementResult.patterns.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted">Patterns:</p>
                <ul className="mt-1 space-y-0.5">
                  {improvementResult.patterns.map((p, i) => (
                    <li key={i} className="text-xs text-foreground">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {improvementResult.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted">Suggestions:</p>
                <ul className="mt-1 space-y-0.5">
                  {improvementResult.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-primary-light">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {stats.improvementLogs.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted">Recent analyses:</p>
            {stats.improvementLogs.map((log, i) => (
              <div
                key={i}
                className="rounded-lg bg-background p-2 text-xs text-muted"
              >
                <span className="text-foreground">
                  {new Date(log.created_at).toLocaleDateString()}
                </span>
                {" — "}
                {(log.metadata?.patterns ?? []).join(", ") || "No patterns"}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}
