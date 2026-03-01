import { OSINTGraphUI } from "@/components/OSINTGraphUI";

export const dynamic = "force-dynamic";

export default function OSINTPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OSINT Hunter</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent swarm for vibe-coding open-source intelligence tools.
          Data aggregation, entity graph analysis, pattern detection, privacy
          compliance, and OSINT tool generation — all with built-in ethical
          guardrails.
        </p>
      </div>

      <OSINTGraphUI />
    </div>
  );
}
