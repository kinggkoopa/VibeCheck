import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyInsights } from "@/lib/journal-logger";

/**
 * GET /api/insights — Generate weekly vibe journal insights.
 *
 * Analyzes the past 7 days of analytics events and returns patterns,
 * session types, success rates, streaks, and suggestions.
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

    const insights = await generateWeeklyInsights();

    return NextResponse.json({ data: insights, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
