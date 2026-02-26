import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runProfitSwarm } from "@/core/agents/profit-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/profit — execute the profit-focused agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { idea, taste_profile, max_iterations } = await request.json();

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return NextResponse.json(
        { error: "Idea is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(idea, MAX_SIZES.task, "Idea");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runProfitSwarm(idea.trim(), {
      tasteProfile: typeof taste_profile === "string" ? taste_profile : undefined,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "profit",
        provider: result.provider,
        iterations: result.iterations,
        profit_score: result.report.scores.overall,
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
