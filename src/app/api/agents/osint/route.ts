import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runOSINTSwarm } from "@/core/agents/osint-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/osint — execute the OSINT Hunter agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { idea, focus, ethical_mode, max_iterations } = await request.json();

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return NextResponse.json(
        { error: "OSINT tool idea is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(idea, MAX_SIZES.task, "Idea");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const validFocus = ["recon", "profile", "network-analysis", "tool-building", "full-investigation"] as const;

    const result = await runOSINTSwarm(idea.trim(), {
      focus: validFocus.includes(focus) ? focus : undefined,
      ethicalMode: ethical_mode !== false,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "osint",
        provider: result.provider,
        iterations: result.iterations,
        intelligence_score: result.report.intelligenceScore.overall,
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
