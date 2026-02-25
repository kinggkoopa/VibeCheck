import { createClient } from "@/lib/supabase/server";
import type { MemoryEntry } from "@/types";

/**
 * Vector Memory Operations — Server-Only
 *
 * Uses pgvector for similarity search and Supabase for storage.
 * Embeddings are generated via the user's BYOK OpenAI-compatible key.
 */

/** Store a memory with its embedding vector. */
export async function storeMemory(
  content: string,
  embedding: number[],
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      content,
      embedding: JSON.stringify(embedding),
      metadata,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to store memory: ${error.message}`);
  return data.id;
}

/** Search memories by vector similarity. */
export async function searchMemories(
  queryEmbedding: number[],
  matchCount: number = 5
): Promise<MemoryEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    filter_user_id: user.id,
  });

  if (error) throw new Error(`Memory search failed: ${error.message}`);
  return (data ?? []) as MemoryEntry[];
}

/** List recent memories (non-vector, chronological). */
export async function listRecentMemories(limit: number = 20): Promise<MemoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memories")
    .select("id, content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list memories: ${error.message}`);
  return (data ?? []) as MemoryEntry[];
}

/** Delete a specific memory. */
export async function deleteMemory(memoryId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("memories").delete().eq("id", memoryId);
  if (error) throw new Error(`Failed to delete memory: ${error.message}`);
}
