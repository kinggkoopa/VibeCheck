import { GameEngineSelector } from "@/components/GameEngineSelector";

export const dynamic = "force-dynamic";

export default function GameEnginePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game Engine Master</h1>
        <p className="mt-1 text-sm text-muted">
          Universal game development swarm supporting Unity, GameMaker, Bevy,
          Defold, Godot, and Unreal. Auto-detects the best engine for your
          idea, generates engine-specific code, handles multi-platform export,
          and includes cross-engine remix capabilities.
        </p>
      </div>

      <GameEngineSelector />
    </div>
  );
}
