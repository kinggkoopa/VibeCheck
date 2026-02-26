import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runGodotVibeSwarm } from "@/core/agents/godot-vibe-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/godot — execute the Godot Viber agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { idea, game_type, template, max_iterations } = await request.json();

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return NextResponse.json(
        { error: "Game idea is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(idea, MAX_SIZES.task, "Idea");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runGodotVibeSwarm(idea.trim(), {
      gameType: game_type === "3d" ? "3d" : "2d",
      template: typeof template === "string" ? template : undefined,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "godot_vibe",
        provider: result.provider,
        iterations: result.iterations,
        game_alpha_score: result.report.gameAlphaScore.overall,
      },
    });

    return NextResponse.json({
      data: {
        report: result.report,
        messages: result.messages,
        iterations: result.iterations,
        provider: result.provider,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
