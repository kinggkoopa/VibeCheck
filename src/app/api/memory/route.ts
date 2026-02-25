import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { storeMemory, searchMemories, listMemories, deleteMemory } from "@/lib/memory";
import type { ApiResponse, MemoryEntry } from "@/types";

const StoreSchema = z.object({
  content: z.string().min(1).max(10000),
  metadata: z.record(z.unknown()).optional(),
});

const SearchSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(20).optional(),
});

/** GET: List recent memories */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const memories = await listMemories(user.id);
    return NextResponse.json<ApiResponse<MemoryEntry[]>>({
      data: memories,
      error: null,
    });
  } catch (err) {
    console.error("Memory list error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** POST: Store or search memories */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action as string;

    if (action === "search") {
      const parsed = SearchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const results = await searchMemories(user.id, parsed.data.query, parsed.data.limit);
      return NextResponse.json<ApiResponse<MemoryEntry[]>>({
        data: results,
        error: null,
      });
    }

    if (action === "delete") {
      const id = body.id as string;
      if (!id) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: "Missing memory ID" },
          { status: 400 }
        );
      }

      const ok = await deleteMemory(user.id, id);
      return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
        data: { deleted: ok },
        error: ok ? null : "Failed to delete",
      });
    }

    // Default: store a new memory
    const parsed = StoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const entry = await storeMemory(user.id, parsed.data.content, parsed.data.metadata);
    return NextResponse.json<ApiResponse<MemoryEntry | null>>({
      data: entry,
      error: entry ? null : "Failed to store memory",
    });
  } catch (err) {
    console.error("Memory API error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
