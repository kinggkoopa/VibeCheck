import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeMemory, searchMemories, listRecentMemories } from "@/core/memory/vector";
import { checkApiRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** GET /api/memory — list recent memories */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memories = await listRecentMemories(50);
    return NextResponse.json({ data: memories, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/** POST /api/memory — store or search memories */
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
    const { action } = body;

    if (action === "store") {
      const { content, embedding, metadata } = body;

      if (!content || typeof content !== "string") {
        return NextResponse.json({ error: "content is required" }, { status: 400 });
      }

      const sizeErr = validateInputSize(content, MAX_SIZES.memory, "Memory content");
      if (sizeErr) {
        return NextResponse.json({ error: sizeErr }, { status: 400 });
      }

      if (!embedding || !Array.isArray(embedding)) {
        return NextResponse.json({ error: "embedding array is required" }, { status: 400 });
      }

      if (embedding.length > MAX_SIZES.embedding) {
        return NextResponse.json(
          { error: `Embedding exceeds max dimensions (${MAX_SIZES.embedding})` },
          { status: 400 }
        );
      }

      const id = await storeMemory(content, embedding, metadata ?? {});

      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "memory_store",
        metadata: { memory_id: id },
      });

      return NextResponse.json({ data: { id }, error: null });
    }

    if (action === "search") {
      const { embedding, match_count } = body;

      if (!embedding || !Array.isArray(embedding)) {
        return NextResponse.json({ error: "embedding array is required for search" }, { status: 400 });
      }

      const results = await searchMemories(embedding, match_count ?? 5);

      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "memory_search",
        metadata: { result_count: results.length },
      });

      return NextResponse.json({ data: results, error: null });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "store" or "search".' },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
