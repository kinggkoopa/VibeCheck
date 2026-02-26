import { GodotProjectUI } from "@/components/GodotProjectUI";

export const dynamic = "force-dynamic";

export default function GodotPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Godot Viber</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent swarm for vibe-coding Godot games. Describe your game
          idea and the agents will generate scenes, GDScript, assets, validate
          game math, and suggest monetization — all in a Godot-ready project
          structure.
        </p>
      </div>

      <GodotProjectUI />
    </div>
  );
}
