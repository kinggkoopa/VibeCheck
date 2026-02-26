import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runUnrealVibeSwarm } from "@/core/agents/unreal-vibe-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/unreal — execute the Unreal Pro agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { idea, template, max_iterations } = await request.json();

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

    const result = await runUnrealVibeSwarm(idea.trim(), {
      template: typeof template === "string" ? template : undefined,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "unreal_vibe",
        provider: result.provider,
        iterations: result.iterations,
        fidelity_score: result.report.fidelityScore.overall,
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
