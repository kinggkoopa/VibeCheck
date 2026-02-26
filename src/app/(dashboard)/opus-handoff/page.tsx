import { OpusHandoff } from "@/components/OpusHandoff";

export const dynamic = "force-dynamic";

export default function OpusHandoffPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opus Handoff</h1>
        <p className="mt-1 text-sm text-muted">
          Bridge your swarm output to Claude Opus for deep refinement.
          Auto-injects context, sends to Opus for enhancement, and fuses
          results for production-ready output.
        </p>
      </div>

      <OpusHandoff />
    </div>
  );
}
