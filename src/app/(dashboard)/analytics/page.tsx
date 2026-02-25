import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Aggregate event counts by type
  const { data: events } = await supabase
    .from("analytics")
    .select("event_type, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const counts: Record<string, number> = {};
  for (const e of events ?? []) {
    counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const labels: Record<string, string> = {
    optimization: "Prompt Optimizations",
    swarm_run: "Swarm Runs",
    critique: "Code Critiques",
    memory_store: "Memories Stored",
    memory_search: "Memory Searches",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vibe Profile &amp; Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Your coding vibe at a glance. Track usage patterns and tool engagement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-3xl font-bold text-primary-light">{total}</p>
          <p className="mt-1 text-xs text-muted">Total Events</p>
        </div>

        {Object.entries(counts).map(([type, count]) => (
          <div
            key={type}
            className="rounded-lg border border-border bg-surface p-4 text-center"
          >
            <p className="text-2xl font-bold">{count}</p>
            <p className="mt-1 text-xs text-muted">
              {labels[type] ?? type}
            </p>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            No activity yet. Use the Optimizer, Agent Swarm, or Critique tools
            to start building your vibe profile.
          </p>
        </div>
      )}
    </div>
  );
}
