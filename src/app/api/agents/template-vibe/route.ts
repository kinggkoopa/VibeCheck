import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTemplateVibeSwarm } from "@/core/agents/template-vibe-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/template-vibe — execute the template vibe agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { task, taste_profile, profit_context, max_iterations } = await request.json();

    if (!task || typeof task !== "string" || task.trim().length < 10) {
      return NextResponse.json(
        { error: "Task is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(task, MAX_SIZES.task, "Task");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runTemplateVibeSwarm(task.trim(), {
      tasteProfile: typeof taste_profile === "string" ? taste_profile : undefined,
      profitContext: typeof profit_context === "string" ? profit_context : undefined,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "template-vibe",
        provider: result.provider,
        iterations: result.iterations,
        vibe_score: result.report.vibeScore.overall,
        app_type: result.report.detectedAppType,
        template: result.report.selectedTemplateId,
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
