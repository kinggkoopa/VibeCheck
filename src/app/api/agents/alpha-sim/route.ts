import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAlphaSimSwarm } from "@/core/agents/alpha-sim-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/alpha-sim — execute the alpha simulator swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { original_code, proposed_changes, max_iterations } = await request.json();

    if (!original_code || typeof original_code !== "string" || original_code.trim().length < 10) {
      return NextResponse.json(
        { error: "Original code is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(original_code, MAX_SIZES.code, "Code");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runAlphaSimSwarm(
      original_code.trim(),
      typeof proposed_changes === "string" ? proposed_changes.trim() : undefined,
      { maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5) }
    );

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "alpha-sim",
        provider: result.provider,
        iterations: result.iterations,
        preservation_guarantee: result.report.preservationGuarantee,
        go_nogo: result.report.goNogo,
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
