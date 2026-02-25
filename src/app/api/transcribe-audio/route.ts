import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";
import { getDecryptedKey } from "@/lib/crypto/keys";
import { withLatencyTracking } from "@/lib/monitoring";

/**
 * POST /api/transcribe-audio — Transcribe audio using OpenAI Whisper API.
 *
 * Accepts multipart/form-data with an "audio" field (webm/mp3/wav/m4a).
 * Uses the user's stored OpenAI or Groq API key for Whisper transcription.
 *
 * Falls back through providers: OpenAI → Groq (both support Whisper).
 */

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI Whisper limit)

interface WhisperProvider {
  name: string;
  provider: "openai" | "groq";
  url: string;
  model: string;
}

const WHISPER_PROVIDERS: WhisperProvider[] = [
  {
    name: "OpenAI",
    provider: "openai",
    url: "https://api.openai.com/v1/audio/transcriptions",
    model: "whisper-1",
  },
  {
    name: "Groq",
    provider: "groq",
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    model: "whisper-large-v3",
  },
];

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

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file provided. Send as multipart/form-data with field 'audio'." },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large. Max size: ${MAX_AUDIO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (audioFile.size < 100) {
      return NextResponse.json(
        { error: "Audio file too small — recording may be empty." },
        { status: 400 }
      );
    }

    // Try Whisper providers in order
    let lastError = "";

    for (const wp of WHISPER_PROVIDERS) {
      try {
        const apiKey = await getDecryptedKey(wp.provider);
        if (!apiKey) {
          lastError = `No ${wp.name} key configured`;
          continue;
        }

        const text = await withLatencyTracking(
          wp.provider,
          "transcribe",
          async () => {
            const whisperForm = new FormData();
            whisperForm.append("file", audioFile, "recording.webm");
            whisperForm.append("model", wp.model);
            whisperForm.append("language", "en");
            whisperForm.append("response_format", "json");

            const res = await fetch(wp.url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              body: whisperForm,
            });

            if (!res.ok) {
              const errText = await res.text();
              throw new Error(
                `${wp.name} Whisper error (${res.status}): ${errText.slice(0, 200)}`
              );
            }

            const data = (await res.json()) as { text: string };
            return data.text;
          },
          wp.model
        );

        // Log analytics
        try {
          await supabase.from("analytics").insert({
            user_id: user.id,
            event_type: "voice_transcription",
            metadata: {
              provider: wp.name,
              model: wp.model,
              audio_size: audioFile.size,
              text_length: text.length,
            },
          });
        } catch {
          // Non-fatal
        }

        return NextResponse.json({
          data: { text, provider: wp.name, model: wp.model },
          error: null,
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : `${wp.name} failed`;
        continue;
      }
    }

    return NextResponse.json(
      {
        error: `No working Whisper provider found. ${lastError}. Add an OpenAI or Groq key in Settings.`,
      },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
