import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMathGuardianSwarm } from "@/core/agents/math-guardian-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/math-guardian — execute the math guardian pre-edit analysis */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { code, file_paths, max_iterations } = await request.json();

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return NextResponse.json(
        { error: "Code is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(code, MAX_SIZES.code, "Code");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runMathGuardianSwarm(code.trim(), {
      filePaths: Array.isArray(file_paths) ? file_paths : [],
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "math-guardian",
        provider: result.provider,
        iterations: result.iterations,
        respect_score: result.report.respectScore,
        recommendation: result.report.recommendation,
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
