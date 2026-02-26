import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runKalshiAlphaSwarm } from "@/core/agents/kalshi-alpha-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/kalshi — execute the Kalshi alpha agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json(
        { error: "Query is required (min 5 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(query, MAX_SIZES.task, "Query");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runKalshiAlphaSwarm(query.trim());

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "kalshi_alpha",
        provider: result.provider,
        iterations: result.iterations,
        edge_score: result.report.scores.overall,
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
