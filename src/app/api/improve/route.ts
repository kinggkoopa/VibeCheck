import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeRecentSessions, logImprovement } from "@/lib/meta-improver";

/**
 * POST /api/improve — Self-improving meta-agent.
 *
 * Analyzes recent session patterns and suggests taste improvements.
 * Can be triggered:
 *   - Manually from the dashboard
 *   - Via Vercel Cron (add to vercel.json: { "path": "/api/improve", "schedule": "0 0 * * 0" })
 *
 * GET /api/improve — Returns latest improvement logs.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Support both authenticated user and cron (via secret header)
    const cronSecret = request.headers.get("x-cron-secret");
    const isCron =
      cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!user && !isCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User context required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeRecentSessions(userId);

    if (analysis.totalEvents === 0) {
      return NextResponse.json({
        data: {
          message: "No recent activity to analyze.",
          patterns: [],
          suggestions: [],
        },
        error: null,
      });
    }

    // Log the improvement
    await logImprovement(userId, JSON.stringify(analysis), analysis.patterns);

    return NextResponse.json({
      data: {
        message: `Analyzed ${analysis.totalEvents} events from the past week.`,
        patterns: analysis.patterns,
        suggestions: analysis.suggestions,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent improvement logs
    const { data } = await supabase
      .from("analytics")
      .select("metadata, created_at")
      .eq("user_id", user.id)
      .eq("event_type", "meta_improvement")
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({ data: data ?? [], error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
