import { SwarmCoordinatorUI } from "@/components/SwarmCoordinatorUI";

export const dynamic = "force-dynamic";

export default function SwarmCoordinatorPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Swarm Maestro</h1>
        <p className="mt-1 text-sm text-muted">
          Master coordinator that orchestrates all existing swarms into dynamic,
          self-adapting teams. Analyzes your idea, delegates to the best
          sub-swarms, fuses results, and auto-retries low-scoring outputs for
          superior vibe-coding results.
        </p>
      </div>

      <SwarmCoordinatorUI />
    </div>
  );
}
