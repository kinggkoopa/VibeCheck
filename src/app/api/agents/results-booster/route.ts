import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runResultsBooster } from "@/core/agents/results-booster-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/results-booster — boost generated code quality */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { original_code, generated_code } = await request.json();

    if (!generated_code || typeof generated_code !== "string" || generated_code.trim().length < 10) {
      return NextResponse.json(
        { error: "Generated code is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(generated_code, MAX_SIZES.task, "Generated code");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runResultsBooster(
      typeof original_code === "string" ? original_code.trim() : "",
      generated_code.trim()
    );

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "results_booster",
        provider: result.provider,
        iterations: result.iterations,
        score_before: result.report.beforeScores,
        score_after: result.report.afterScores,
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
