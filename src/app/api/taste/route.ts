import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";
import { loadTasteProfile, saveTasteProfile } from "@/lib/taste";

/**
 * GET /api/taste — Load the user's taste profile.
 * POST /api/taste — Save/update the user's taste profile.
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

    const profile = await loadTasteProfile();
    return NextResponse.json({ data: profile, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkApiRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();

    // Validate and sanitize — only allow known taste fields
    const allowedFields = [
      "language_preferences",
      "framework_preferences",
      "code_style",
      "comment_style",
      "naming_convention",
      "tone",
      "verbosity",
      "timezone",
      "locale_city",
      "vibe_mode",
      "custom_instructions",
      "avoided_patterns",
    ];

    const safeProfile: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        safeProfile[field] = body[field];
      }
    }

    await saveTasteProfile(safeProfile);

    // Log analytics
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "taste_update",
        metadata: { fields_updated: Object.keys(safeProfile) },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      data: { message: "Taste profile saved." },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
