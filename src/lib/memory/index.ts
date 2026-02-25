import { createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/llm";
import type { MemoryEntry } from "@/types";

/**
 * Persistent memory layer backed by Supabase + pgvector.
 * Stores context snippets as embeddings for semantic retrieval.
 */

/** Store a new memory and its embedding */
export async function storeMemory(
  userId: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<MemoryEntry | null> {
  const supabase = createAdminClient();

  let embedding: number[] | undefined;
  try {
    embedding = await generateEmbedding(content);
  } catch (err) {
    console.error("Embedding generation failed — storing without vector:", err);
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      content,
      embedding,
      metadata,
    })
    .select("id, user_id, content, metadata, created_at")
    .single();

  if (error) {
    console.error("Failed to store memory:", error.message);
    return null;
  }

  return data;
}

/** Semantic search: find the most relevant memories for a query */
export async function searchMemories(
  userId: string,
  query: string,
  limit = 5
): Promise<MemoryEntry[]> {
  const supabase = createAdminClient();

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_user_id: userId,
    });

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Memory search failed:", err);
    return [];
  }
}

/** List recent memories (non-semantic, chronological) */
export async function listMemories(
  userId: string,
  limit = 20
): Promise<MemoryEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("memories")
    .select("id, user_id, content, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to list memories:", error.message);
    return [];
  }

  return data ?? [];
}

/** Delete a memory by ID (owner-checked via RLS) */
export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete memory:", error.message);
    return false;
  }

  return true;
}
