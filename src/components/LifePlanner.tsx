"use client";

import { useState } from "react";

/**
 * LifePlanner — Personal daily planning UI powered by Life Swarm agent.
 *
 * Input goals/tasks → Prioritizer → Scheduler → Motivator → Full daily plan.
 */
export function LifePlanner() {
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<{
    plan: string;
    priorities: string;
    schedule: string;
    provider: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "priorities" | "schedule">("plan");

  async function handleGenerate() {
    if (input.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Planning failed (${res.status})`);
      }

      setPlan(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planning failed");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: "plan" as const, label: "Full Plan" },
    { key: "priorities" as const, label: "Priorities" },
    { key: "schedule" as const, label: "Schedule" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Input ── */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-base font-semibold">What are your goals today?</h3>
        <p className="mt-1 text-sm text-muted">
          List tasks, goals, appointments, or anything you want to accomplish.
          The AI will prioritize, schedule, and create your optimal day.
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
          placeholder="e.g., Finish project proposal, grocery shopping, gym session, call mom, review budget spreadsheet, read 30 pages..."
        />

        <button
          onClick={handleGenerate}
          disabled={loading || input.trim().length < 5}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Planning your day...
            </span>
          ) : (
            "Plan My Day"
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Result ── */}
      {plan && (
        <div className="rounded-xl border border-border bg-surface">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? "border-b-2 border-primary text-primary-light"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary-light">
                via {plan.provider}
              </span>
              <button
                onClick={() => {
                  const content =
                    activeTab === "plan"
                      ? plan.plan
                      : activeTab === "priorities"
                        ? plan.priorities
                        : plan.schedule;
                  navigator.clipboard.writeText(content);
                }}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-surface-elevated"
              >
                Copy
              </button>
            </div>
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {activeTab === "plan" && plan.plan}
              {activeTab === "priorities" && plan.priorities}
              {activeTab === "schedule" && plan.schedule}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
