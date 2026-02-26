import { UnrealLevelUI } from "@/components/UnrealLevelUI";

export const dynamic = "force-dynamic";

export default function UnrealPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unreal Pro</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent swarm for vibe-coding Unreal Engine 5 games. Generates
          Blueprints, C++ classes, level layouts, Nanite/Lumen configs, and
          monetization strategy with a Fidelity Score dashboard.
        </p>
      </div>

      <UnrealLevelUI />
    </div>
  );
}
