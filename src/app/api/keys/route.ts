import { NextRequest, NextResponse } from "next/server";
import { storeUserKey, listUserKeys, deleteUserKey } from "@/lib/crypto/keys";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";
import type { LLMProvider } from "@/types";

const VALID_PROVIDERS = new Set(["anthropic", "openrouter", "groq", "openai", "ollama"]);

/** GET /api/keys — list all key metadata (never returns raw keys) */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await listUserKeys();
    return NextResponse.json({ data: keys, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/** POST /api/keys — store a new encrypted API key */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkApiRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { provider, api_key, display_label, model_default } = body;

    if (!provider || !VALID_PROVIDERS.has(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${[...VALID_PROVIDERS].join(", ")}` },
        { status: 400 }
      );
    }

    if (!api_key || typeof api_key !== "string" || api_key.trim().length < 8) {
      return NextResponse.json(
        { error: "API key is required and must be at least 8 characters" },
        { status: 400 }
      );
    }

    const id = await storeUserKey(
      provider as LLMProvider,
      api_key.trim(),
      display_label,
      model_default
    );

    // Log analytics event
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "optimization",
      metadata: { action: "key_stored", provider },
    });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/** DELETE /api/keys — remove a key by ID */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key_id } = await request.json();
    if (!key_id) {
      return NextResponse.json({ error: "key_id is required" }, { status: 400 });
    }

    await deleteUserKey(key_id);
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
