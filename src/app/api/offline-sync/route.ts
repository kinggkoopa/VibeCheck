import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";

/**
 * POST /api/offline-sync — Batch sync offline-completed tasks.
 *
 * When the client reconnects, it sends completed offline tasks here
 * to persist analytics and results to Supabase.
 *
 * Body: {
 *   completed: Array<{
 *     type: string,
 *     payload: Record<string, unknown>,
 *     result: Record<string, unknown>,
 *     createdAt: number,
 *     processedAt?: number
 *   }>
 * }
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

    const { completed } = await request.json();

    if (!Array.isArray(completed) || completed.length === 0) {
      return NextResponse.json(
        { error: "completed array is required" },
        { status: 400 }
      );
    }

    // Cap batch size to prevent abuse
    const batch = completed.slice(0, 50);

    const analyticsRows = batch.map(
      (task: {
        type: string;
        payload: Record<string, unknown>;
        result: Record<string, unknown>;
        createdAt: number;
        processedAt?: number;
      }) => ({
        user_id: user.id,
        event_type: `offline_${task.type}`,
        metadata: {
          payload_summary: summarizePayload(task.payload),
          result_summary: summarizePayload(task.result),
          offline_created_at: new Date(task.createdAt).toISOString(),
          offline_processed_at: task.processedAt
            ? new Date(task.processedAt).toISOString()
            : null,
          source: task.result?._source ?? "cloud",
        },
      })
    );

    const { error: insertError } = await supabase
      .from("analytics")
      .insert(analyticsRows);

    if (insertError) {
      console.error("[offline-sync] Analytics insert error:", insertError.message);
      return NextResponse.json(
        { error: "Failed to sync analytics" },
        { status: 500 }
      );
    }

    // Also persist optimization/critique results if present
    for (const task of batch) {
      try {
        if (task.type === "optimize" && task.result?.data?.optimized_prompt) {
          await supabase.from("prompt_optimizations").insert({
            user_id: user.id,
            original_prompt: (task.payload.prompt as string)?.slice(0, 50_000) ?? "",
            optimized_prompt: String(task.result.data.optimized_prompt).slice(0, 50_000),
            strategy: task.payload.strategy ?? "best-practice",
          });
        }

        if (task.type === "critique" && task.result?.data?.overall_score != null) {
          const critiqueData = task.result.data as Record<string, unknown>;
          await supabase.from("critiques").insert({
            user_id: user.id,
            code_snippet: (task.payload.code as string)?.slice(0, 100_000) ?? "",
            issues: critiqueData.issues ?? [],
            overall_score: Math.min(
              100,
              Math.max(0, Number(critiqueData.overall_score) || 50)
            ),
            summary: String(critiqueData.summary ?? "").slice(0, 5000),
          });
        }
      } catch {
        // Individual persistence failures are non-fatal
      }
    }

    return NextResponse.json({
      data: { synced: batch.length },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/** Summarize a payload for analytics storage (keep it small). */
function summarizePayload(obj: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      summary[key] = value.length > 200 ? value.slice(0, 200) + "..." : value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      summary[key] = value;
    }
  }
  return summary;
}
