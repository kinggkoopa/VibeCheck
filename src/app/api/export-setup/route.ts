import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";

/**
 * GET /api/export-setup — Export entire MetaVibeCoder setup as JSON.
 *
 * Downloads a JSON file containing:
 * - Taste profile (user_settings minus sensitive keys)
 * - Memory vault entries (content + metadata, no embeddings)
 * - Saved prompt optimizations
 * - Analytics summary (event counts, not raw events)
 * - .env template (variable names only, no values)
 * - CLI/extension config template
 *
 * SECURITY: API keys are NOT included. Embeddings are stripped (too large + regenerable).
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

    const rateLimited = await checkApiRateLimit(user.id);
    if (rateLimited) return rateLimited;

    // ── Gather data in parallel ──
    const [
      settingsResult,
      memoriesResult,
      optimizationsResult,
      critiquesResult,
      analyticsCountResult,
    ] = await Promise.all([
      // User settings (strip sensitive fields)
      supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      // Memories (content + metadata only — skip embeddings)
      supabase
        .from("memories")
        .select("content, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
      // Recent prompt optimizations
      supabase
        .from("prompt_optimizations")
        .select("original_prompt, optimized_prompt, strategy, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      // Recent critiques (summaries only)
      supabase
        .from("critiques")
        .select("overall_score, summary, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      // Analytics event counts
      supabase
        .from("analytics")
        .select("event_type")
        .eq("user_id", user.id),
    ]);

    // Build taste profile from settings (strip API keys)
    const settings = settingsResult.data ?? {};
    const tasteProfile: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      // Skip sensitive fields
      if (
        key.includes("key") ||
        key.includes("token") ||
        key.includes("secret") ||
        key === "id" ||
        key === "user_id"
      ) {
        continue;
      }
      tasteProfile[key] = value;
    }

    // Build analytics summary
    const analyticsEvents = analyticsCountResult.data ?? [];
    const eventCounts: Record<string, number> = {};
    for (const event of analyticsEvents) {
      const type = event.event_type as string;
      eventCounts[type] = (eventCounts[type] ?? 0) + 1;
    }

    // ── Build export payload ──
    const exportData = {
      _meta: {
        format: "metavibecoder-setup-v1",
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
      },
      tasteProfile,
      memories: (memoriesResult.data ?? []).map(
        (m: { content: string; metadata: Record<string, unknown>; created_at: string }) => ({
          content: m.content,
          metadata: m.metadata,
          created_at: m.created_at,
        })
      ),
      promptOptimizations: optimizationsResult.data ?? [],
      critiqueSummaries: critiquesResult.data ?? [],
      analyticsSummary: eventCounts,
      envTemplate: {
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        ENCRYPTION_KEY: "",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        CRON_SECRET: "",
        _note: "Fill in your own values. API keys are managed per-user in Settings.",
      },
      cliConfig: {
        defaultProvider: tasteProfile.default_provider ?? "anthropic",
        preferredStrategies: tasteProfile.preferred_strategies ?? ["best-practice"],
        autoIterate: tasteProfile.auto_iterate ?? true,
        _note: "Place in ~/.metavibe/config.json or use 'metavibe init' to restore.",
      },
    };

    // Return as downloadable JSON
    const json = JSON.stringify(exportData, null, 2);
    const filename = `metavibecoder-setup-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
