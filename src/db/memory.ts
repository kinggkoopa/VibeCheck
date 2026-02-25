import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createProviderFromStoredKey } from "@/core/llm/provider";
import { searchMemories, storeMemory } from "@/core/memory/vector";
import type { LLMProvider, MemoryEntry } from "@/types";

/**
 * Server-side Memory Module
 *
 * Generates embeddings using the user's BYOK key, stores memories with vectors,
 * and provides retrieval functions that auto-inject relevant context into prompts.
 *
 * Embedding dimension: 1536 (matches text-embedding-3-small / text-embedding-ada-002)
 *
 * Provider priority for embeddings:
 *   openai > openrouter > groq > (fallback: skip embedding)
 *
 * Anthropic does not offer an embedding API, so users with only an Anthropic key
 * can still store memories (without vector search) and retrieve by recency.
 */

const EMBEDDING_PROVIDERS: LLMProvider[] = ["openai", "openrouter", "groq"];
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for a piece of text.
 * Tries available providers in priority order.
 * Returns null if no embedding-capable key is available.
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  for (const provider of EMBEDDING_PROVIDERS) {
    try {
      const { client } = await createProviderFromStoredKey(provider);

      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // limit input to avoid token overflow
        dimensions: EMBEDDING_DIMENSIONS,
      });

      return response.data[0].embedding;
    } catch {
      // Provider not available or embedding failed, try next
      continue;
    }
  }

  return null;
}

/**
 * Store a memory with server-side embedding generation.
 * If no embedding-capable provider is available, stores without embedding
 * (memory is still retrievable by recency, just not by semantic search).
 */
export async function storeMemoryWithEmbedding(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const embedding = await generateEmbedding(content);

  if (embedding) {
    return storeMemory(content, embedding, metadata);
  }

  // No embedding available — store without vector (recency-only retrieval)
  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      content,
      metadata: { ...metadata, _no_embedding: true },
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to store memory: ${error.message}`);
  return data.id;
}

/**
 * Update a memory's content and regenerate its embedding.
 */
export async function updateMemory(
  memoryId: string,
  content: string
): Promise<void> {
  const supabase = await createClient();

  const embedding = await generateEmbedding(content);

  const update: Record<string, unknown> = { content };
  if (embedding) {
    update.embedding = JSON.stringify(embedding);
  }

  const { error } = await supabase
    .from("memories")
    .update(update)
    .eq("id", memoryId);

  if (error) throw new Error(`Failed to update memory: ${error.message}`);
}

/**
 * Retrieve relevant memories for a given query using semantic search.
 * Falls back to recent memories if no embedding provider is available.
 */
export async function retrieveRelevantMemories(
  query: string,
  maxResults: number = 5
): Promise<MemoryEntry[]> {
  const embedding = await generateEmbedding(query);

  if (embedding) {
    return searchMemories(embedding, maxResults);
  }

  // Fallback: return most recent memories
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(maxResults);

  if (error) throw new Error(`Failed to retrieve memories: ${error.message}`);
  return (data ?? []) as MemoryEntry[];
}

/**
 * Format retrieved memories into a context block for injection into prompts.
 */
function formatMemoryContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) return "";

  const entries = memories
    .map((m, i) => {
      const sim = m.similarity ? ` (relevance: ${(m.similarity * 100).toFixed(0)}%)` : "";
      return `[${i + 1}]${sim} ${m.content}`;
    })
    .join("\n");

  return `\n\n<relevant_context>\nThe following are relevant memories from the user's past interactions:\n${entries}\n</relevant_context>`;
}

/**
 * Auto-inject relevant memory context into a system prompt.
 *
 * This is the primary integration point for other features (optimize, critique, agents).
 * It takes the user's input, finds semantically similar memories, and appends them
 * to the system prompt so the LLM has relevant historical context.
 *
 * Usage:
 *   const enrichedPrompt = await injectMemoryContext(systemPrompt, userMessage);
 *   const result = await complete(provider, enrichedPrompt, userMessage);
 */
export async function injectMemoryContext(
  systemPrompt: string,
  userMessage: string,
  maxMemories: number = 3
): Promise<string> {
  try {
    const memories = await retrieveRelevantMemories(userMessage, maxMemories);

    if (memories.length === 0) return systemPrompt;

    const contextBlock = formatMemoryContext(memories);
    return systemPrompt + contextBlock;
  } catch {
    // If memory retrieval fails, return the original prompt without context.
    // Memory is an enhancement, not a requirement.
    return systemPrompt;
  }
}
