"use server";

import { createClient } from "@/lib/supabase/server";
import {
  storeMemoryWithEmbedding,
  updateMemory,
  retrieveRelevantMemories,
} from "@/db/memory";
import { deleteMemory, listRecentMemories } from "@/core/memory/vector";
import type { MemoryEntry } from "@/types";

export interface MemoryActionResult {
  success: boolean;
  error: string | null;
  memories: MemoryEntry[];
}

export interface SearchResult {
  success: boolean;
  error: string | null;
  results: MemoryEntry[];
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

/** Add a new memory with server-side embedding generation. */
export async function addMemory(
  content: string,
  metadata?: Record<string, unknown>
): Promise<MemoryActionResult> {
  try {
    await requireAuth();

    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: "Memory content must be at least 3 characters.",
        memories: [],
      };
    }

    await storeMemoryWithEmbedding(content.trim(), metadata ?? {});
    const memories = await listRecentMemories(50);
    return { success: true, error: null, memories };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add memory.",
      memories: [],
    };
  }
}

/** Update an existing memory's content and regenerate embedding. */
export async function editMemory(
  memoryId: string,
  content: string
): Promise<MemoryActionResult> {
  try {
    await requireAuth();

    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: "Memory content must be at least 3 characters.",
        memories: [],
      };
    }

    await updateMemory(memoryId, content.trim());
    const memories = await listRecentMemories(50);
    return { success: true, error: null, memories };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update memory.",
      memories: [],
    };
  }
}

/** Delete a memory by ID. */
export async function removeMemory(
  memoryId: string
): Promise<MemoryActionResult> {
  try {
    await requireAuth();

    await deleteMemory(memoryId);
    const memories = await listRecentMemories(50);
    return { success: true, error: null, memories };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete memory.",
      memories: [],
    };
  }
}

/** Search memories by semantic similarity using a text query. */
export async function searchMemoriesByText(
  query: string
): Promise<SearchResult> {
  try {
    await requireAuth();

    if (!query || query.trim().length < 2) {
      return {
        success: false,
        error: "Search query must be at least 2 characters.",
        results: [],
      };
    }

    const results = await retrieveRelevantMemories(query.trim(), 10);
    return { success: true, error: null, results };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Search failed.",
      results: [],
    };
  }
}
