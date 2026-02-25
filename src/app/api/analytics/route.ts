import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/analytics — Fetch personal analytics metrics.
 *
 * Returns event counts, daily activity, score history, and provider usage
 * for the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: events } = await supabase
      .from("analytics")
      .select("event_type, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    const allEvents = events ?? [];

    // Aggregate by type
    const eventCounts: Record<string, number> = {};
    for (const e of allEvents) {
      eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
    }

    // Score history
    const scoreHistory: { date: string; score: number; event_type: string }[] = [];
    for (const e of allEvents) {
      const meta = e.metadata as Record<string, unknown>;
      const score = (meta?.score as number) ?? (meta?.score_after as number);
      if (typeof score === "number") {
        scoreHistory.push({
          date: new Date(e.created_at).toISOString().slice(0, 10),
          score,
          event_type: e.event_type,
        });
      }
    }

    return NextResponse.json({
      data: {
        totalEvents: allEvents.length,
        eventCounts,
        recentEvents: allEvents.slice(0, 20),
        scoreHistory: scoreHistory.reverse(),
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
