import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";

/**
 * POST /api/import-setup — Import a MetaVibeCoder setup from JSON.
 *
 * Restores:
 * - Taste profile (user_settings)
 * - Memory vault entries (re-stored without embeddings — will be regenerated on use)
 * - Prompt optimization history
 *
 * SECURITY:
 * - Validates format version
 * - Caps import size (5MB)
 * - Skips any key-like fields in taste profile
 * - All inserts are scoped to the authenticated user
 */
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

    // Size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5_000_000) {
      return NextResponse.json(
        { error: "Import file too large (max 5MB)" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate format
    if (body._meta?.format !== "metavibecoder-setup-v1") {
      return NextResponse.json(
        { error: "Invalid export format. Expected metavibecoder-setup-v1." },
        { status: 400 }
      );
    }

    const stats = {
      tasteProfile: false,
      memories: 0,
      optimizations: 0,
    };

    // ── Import taste profile ──
    if (body.tasteProfile && typeof body.tasteProfile === "object") {
      const safeSettings: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body.tasteProfile)) {
        // Skip sensitive fields that might have been injected
        if (
          key.includes("key") ||
          key.includes("token") ||
          key.includes("secret") ||
          key === "id" ||
          key === "user_id"
        ) {
          continue;
        }
        safeSettings[key] = value;
      }

      if (Object.keys(safeSettings).length > 0) {
        // Upsert user settings
        const { error } = await supabase
          .from("user_settings")
          .upsert(
            { user_id: user.id, ...safeSettings },
            { onConflict: "user_id" }
          );

        if (!error) stats.tasteProfile = true;
      }
    }

    // ── Import memories ──
    if (Array.isArray(body.memories)) {
      const memoryBatch = body.memories.slice(0, 500).map(
        (m: { content: string; metadata?: Record<string, unknown> }) => ({
          user_id: user.id,
          content: String(m.content).slice(0, 10_000),
          metadata: {
            ...(m.metadata ?? {}),
            _imported: true,
            _imported_at: new Date().toISOString(),
            _no_embedding: true, // Will be regenerated on first retrieval
          },
        })
      );

      if (memoryBatch.length > 0) {
        const { error } = await supabase.from("memories").insert(memoryBatch);
        if (!error) stats.memories = memoryBatch.length;
      }
    }

    // ── Import prompt optimizations ──
    if (Array.isArray(body.promptOptimizations)) {
      const optBatch = body.promptOptimizations.slice(0, 100).map(
        (o: {
          original_prompt: string;
          optimized_prompt: string;
          strategy?: string;
        }) => ({
          user_id: user.id,
          original_prompt: String(o.original_prompt).slice(0, 50_000),
          optimized_prompt: String(o.optimized_prompt).slice(0, 50_000),
          strategy: o.strategy ?? "best-practice",
        })
      );

      if (optBatch.length > 0) {
        const { error } = await supabase
          .from("prompt_optimizations")
          .insert(optBatch);
        if (!error) stats.optimizations = optBatch.length;
      }
    }

    // Log the import event
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "setup_import",
      metadata: {
        stats,
        source_exported_at: body._meta?.exportedAt,
      },
    });

    return NextResponse.json({
      data: {
        message: "Import completed successfully.",
        stats,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
