import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tts-config — Load TTS settings.
 * POST /api/tts-config — Save TTS settings.
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

    const { data } = await supabase
      .from("user_settings")
      .select("tts_voice, tts_rate, tts_pitch, tts_auto_speak")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      return NextResponse.json({
        data: { voice: "default", rate: 1.0, pitch: 1.0, autoSpeak: false },
        error: null,
      });
    }

    return NextResponse.json({
      data: {
        voice: data.tts_voice ?? "default",
        rate: data.tts_rate ?? 1.0,
        pitch: data.tts_pitch ?? 1.0,
        autoSpeak: data.tts_auto_speak ?? false,
      },
      error: null,
    });
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

    const body = await request.json();

    await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        tts_voice: body.voice ?? "default",
        tts_rate: Math.max(0.1, Math.min(10, body.rate ?? 1.0)),
        tts_pitch: Math.max(0, Math.min(2, body.pitch ?? 1.0)),
        tts_auto_speak: body.autoSpeak === true,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ data: { message: "TTS config saved." }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
