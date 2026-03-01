import { LifePlanner } from "@/components/LifePlanner";

export const dynamic = "force-dynamic";

export default function LifePlanPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Life Planner</h1>
        <p className="mt-1 text-sm text-muted">
          Personal daily planning powered by a 3-agent swarm: Prioritizer,
          Scheduler, and Motivator. For non-code tasks and life goals.
        </p>
      </div>

      <LifePlanner />
    </div>
  );
}
