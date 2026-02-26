import { GamePrototypeUI } from "@/components/GamePrototypeUI";

export const dynamic = "force-dynamic";

export default function GamingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game Creator</h1>
        <p className="mt-1 text-sm text-muted">
          Advanced multi-engine game creation swarm. Genre-specific templates
          for RPGs, platformers, shooters, and more. Cross-engine conversion,
          physics simulation, AI pathfinding, and optional monetization — with
          playtest simulation scoring.
        </p>
      </div>

      <GamePrototypeUI />
    </div>
  );
}
