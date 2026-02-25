"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import type { AnalyticsOverview } from "@/features/analytics/actions";

// ── Colors ──

const CHART_COLORS = [
  "#6366f1", // indigo (primary)
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
];

const EVENT_LABELS: Record<string, string> = {
  optimization: "Optimizations",
  swarm_run: "Swarm Runs",
  critique: "Critiques",
  memory_store: "Memories",
  memory_search: "Searches",
  iterate: "Iterations",
};

interface ProfileDashboardProps {
  overview: AnalyticsOverview;
}

export function ProfileDashboard({ overview }: ProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "scores" | "providers">("activity");

  const {
    totalEvents,
    eventCounts,
    dailyActivity,
    scoreHistory,
    providerUsage,
    suggestions,
  } = overview;

  // Pie chart data for event breakdown
  const pieData = Object.entries(eventCounts).map(([type, count]) => ({
    name: EVENT_LABELS[type] ?? type,
    value: count,
  }));

  // Provider pie data
  const providerPieData = Object.entries(providerUsage).map(([prov, count]) => ({
    name: prov,
    value: count,
  }));

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Total Events"
          value={totalEvents}
          accent="text-primary-light"
        />
        <SummaryCard
          label="Critiques"
          value={eventCounts.critique ?? 0}
          accent="text-red-400"
        />
        <SummaryCard
          label="Optimizations"
          value={eventCounts.optimization ?? 0}
          accent="text-green-400"
        />
        <SummaryCard
          label="Avg Score"
          value={
            scoreHistory.length > 0
              ? Math.round(
                  scoreHistory.reduce((s, e) => s + e.score, 0) /
                    scoreHistory.length
                )
              : "—"
          }
          accent="text-yellow-400"
        />
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {(["activity", "scores", "providers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary/15 text-primary-light"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab === "activity"
              ? "Activity"
              : tab === "scores"
                ? "Score Trends"
                : "Providers"}
          </button>
        ))}
      </div>

      {/* ── Activity Tab ── */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {/* Daily activity chart */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Daily Activity (30 days)</h3>
            {dailyActivity.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#888" }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid #333",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted">No activity yet</p>
            )}
          </div>

          {/* Event breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">Event Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #333",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted">No data</p>
              )}
            </div>

            {/* Event type bars */}
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">By Type</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#888" }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #333",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted">No data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scores Tab ── */}
      {activeTab === "scores" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Score Trends Over Time</h3>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#888" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#888" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #333",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Date: ${v}`}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 3 }}
                />
                {/* Reference lines for quality thresholds */}
                <Line
                  type="monotone"
                  dataKey={() => 80}
                  stroke="#6366f1"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Ship-it threshold"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No score data yet. Run a critique or optimization to start tracking.
            </p>
          )}
        </div>
      )}

      {/* ── Providers Tab ── */}
      {activeTab === "providers" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Provider Usage</h3>
          {providerPieData.length > 0 ? (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={providerPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {providerPieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid #333",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {providerPieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-sm">{entry.name}</span>
                    <span className="text-sm text-muted">({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No provider data yet.
            </p>
          )}
        </div>
      )}

      {/* ── Suggestions ── */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-primary-light">
            Improvement Suggestions
          </h3>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-muted">
                &bull; {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Summary Card ──

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
