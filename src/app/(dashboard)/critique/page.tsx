import { CritiqueSwarm } from "@/components/CritiqueSwarm";

export const dynamic = "force-dynamic";

export default function CritiquePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Code Critique Swarm</h1>
        <p className="mt-1 text-sm text-muted">
          4 specialist agents (Architect, Security, UX, Performance) analyze
          your code in parallel. A supervisor merges findings into a weighted
          report with reflection loops for critical issues.
        </p>
      </div>

      <CritiqueSwarm />
    </div>
  );
}
