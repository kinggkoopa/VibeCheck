"use client";

import { useState, useEffect } from "react";

/**
 * VibeJournal — Dashboard widget for daily vibe journal and weekly insights.
 *
 * Shows:
 * - Current streak counter
 * - Weekly session summary
 * - Pattern insights
 * - AI-generated suggestions
 */

interface WeeklyInsight {
  period: string;
  totalSessions: number;
  totalTimeSaved: number;
  topSessionTypes: Array<{ type: string; count: number }>;
  successRate: number;
  streak: number;
  patterns: string[];
  suggestions: string[];
}

export function VibeJournal() {
  const [insights, setInsights] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setInsights(data.data);
        if (data.error) setError(data.error);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading insights...
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          {error ?? "No insights available yet. Start using MetaVibeCoder to build your journal!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Streak"
          value={`${insights.streak}d`}
          color={insights.streak >= 7 ? "text-success" : insights.streak >= 3 ? "text-warning" : "text-muted"}
        />
        <StatCard
          label="Sessions"
          value={String(insights.totalSessions)}
          color="text-primary-light"
        />
        <StatCard
          label="Time Saved"
          value={`${insights.totalTimeSaved}m`}
          color="text-success"
        />
        <StatCard
          label="Success"
          value={`${insights.successRate}%`}
          color={insights.successRate >= 80 ? "text-success" : insights.successRate >= 50 ? "text-warning" : "text-danger"}
        />
      </div>

      {/* ── Top Activity ── */}
      {insights.topSessionTypes.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h4 className="text-sm font-semibold">This Week&apos;s Activity</h4>
          <div className="mt-3 space-y-2">
            {insights.topSessionTypes.map(({ type, count }) => {
              const max = insights.topSessionTypes[0].count;
              const pct = Math.round((count / max) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs font-medium capitalize">
                    {type.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-surface-elevated">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Patterns ── */}
      {insights.patterns.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h4 className="text-sm font-semibold">Patterns Detected</h4>
          <ul className="mt-2 space-y-1">
            {insights.patterns.map((pattern, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {pattern}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Suggestions ── */}
      {insights.suggestions.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h4 className="text-sm font-semibold text-primary-light">Suggestions</h4>
          <ul className="mt-2 space-y-1">
            {insights.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Period ── */}
      <p className="text-xs text-muted">Period: {insights.period}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}
