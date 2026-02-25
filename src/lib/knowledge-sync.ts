import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Knowledge Sync — Pull personal notes/decisions into LLM context.
 *
 * Supports:
 * 1. Obsidian vault (local filesystem path) — reads .md files
 * 2. Notion API (user's integration token) — searches pages
 *
 * Notes are synced into the Memory Vault (vector embeddings) for
 * automatic context injection via injectMemoryContext().
 *
 * Settings stored in `user_settings` table:
 *   - obsidian_vault_path: string (local path to vault)
 *   - notion_api_key: string (integration token)
 *   - notion_database_id: string (optional, specific database)
 *   - knowledge_sync_enabled: boolean
 */

export interface KnowledgeNote {
  source: "obsidian" | "notion";
  title: string;
  content: string;
  path?: string;
  lastModified?: string;
}

/** Get user's knowledge sync settings. */
export async function getKnowledgeSyncSettings(): Promise<{
  obsidian_vault_path: string | null;
  notion_api_key: string | null;
  notion_database_id: string | null;
  knowledge_sync_enabled: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      obsidian_vault_path: null,
      notion_api_key: null,
      notion_database_id: null,
      knowledge_sync_enabled: false,
    };
  }

  const { data } = await supabase
    .from("user_settings")
    .select(
      "obsidian_vault_path, notion_api_key, notion_database_id, knowledge_sync_enabled"
    )
    .eq("user_id", user.id)
    .single();

  return {
    obsidian_vault_path: data?.obsidian_vault_path ?? null,
    notion_api_key: data?.notion_api_key ?? null,
    notion_database_id: data?.notion_database_id ?? null,
    knowledge_sync_enabled: data?.knowledge_sync_enabled ?? false,
  };
}

/** Search Notion for relevant pages. */
export async function searchNotion(
  apiKey: string,
  query: string,
  databaseId?: string | null
): Promise<KnowledgeNote[]> {
  const notes: KnowledgeNote[] = [];

  try {
    const searchBody: Record<string, unknown> = {
      query,
      page_size: 5,
      sort: { direction: "descending", timestamp: "last_edited_time" },
    };

    if (databaseId) {
      searchBody.filter = {
        property: "object",
        value: "page",
      };
    }

    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!res.ok) return notes;

    const data = (await res.json()) as {
      results: Array<{
        id: string;
        properties?: Record<
          string,
          { title?: Array<{ plain_text: string }>; rich_text?: Array<{ plain_text: string }> }
        >;
        last_edited_time?: string;
      }>;
    };

    for (const page of data.results ?? []) {
      // Extract title from properties
      let title = "Untitled";
      if (page.properties) {
        for (const prop of Object.values(page.properties)) {
          if (prop.title?.[0]?.plain_text) {
            title = prop.title[0].plain_text;
            break;
          }
        }
      }

      // Fetch page content (blocks)
      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${page.id}/children?page_size=50`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Notion-Version": "2022-06-28",
          },
        }
      );

      let content = "";
      if (blocksRes.ok) {
        const blocksData = (await blocksRes.json()) as {
          results: Array<{
            type: string;
            paragraph?: { rich_text: Array<{ plain_text: string }> };
            heading_1?: { rich_text: Array<{ plain_text: string }> };
            heading_2?: { rich_text: Array<{ plain_text: string }> };
            heading_3?: { rich_text: Array<{ plain_text: string }> };
            bulleted_list_item?: { rich_text: Array<{ plain_text: string }> };
            numbered_list_item?: { rich_text: Array<{ plain_text: string }> };
            to_do?: { rich_text: Array<{ plain_text: string }> };
          }>;
        };

        for (const block of blocksData.results) {
          const textBlock =
            block.paragraph ??
            block.heading_1 ??
            block.heading_2 ??
            block.heading_3 ??
            block.bulleted_list_item ??
            block.numbered_list_item ??
            block.to_do;

          if (textBlock?.rich_text) {
            content += textBlock.rich_text.map((t) => t.plain_text).join("") + "\n";
          }
        }
      }

      if (content.trim()) {
        notes.push({
          source: "notion",
          title,
          content: content.trim().slice(0, 5000), // Cap at 5KB
          lastModified: page.last_edited_time,
        });
      }
    }
  } catch (err) {
    console.warn("[knowledge-sync] Notion search error:", err);
  }

  return notes;
}

/**
 * Search Obsidian vault for relevant notes.
 *
 * NOTE: Obsidian vault access requires the app to run locally
 * (not on Vercel). This reads markdown files from the filesystem.
 */
export async function searchObsidian(
  vaultPath: string,
  query: string
): Promise<KnowledgeNote[]> {
  const notes: KnowledgeNote[] = [];

  try {
    // Dynamic import fs — only works in Node.js (local dev)
    const { readdir, readFile, stat } = await import("fs/promises");
    const { join, basename } = await import("path");

    const queryLower = query.toLowerCase();
    const files = (await readdir(vaultPath, { recursive: true })) as string[];

    for (const file of files) {
      const filePath = String(file);
      if (!filePath.endsWith(".md")) continue;

      const fullPath = join(vaultPath, filePath);
      const content = await readFile(fullPath, "utf-8");

      // Simple relevance check — title or content matches query keywords
      const titleMatch = basename(filePath, ".md")
        .toLowerCase()
        .includes(queryLower);
      const contentMatch = content.toLowerCase().includes(queryLower);

      if (titleMatch || contentMatch) {
        const fileStat = await stat(fullPath);
        notes.push({
          source: "obsidian",
          title: basename(filePath, ".md"),
          content: content.slice(0, 5000),
          path: filePath,
          lastModified: fileStat.mtime.toISOString(),
        });

        if (notes.length >= 5) break; // Limit to 5 most relevant
      }
    }
  } catch (err) {
    console.warn("[knowledge-sync] Obsidian search error:", err);
  }

  return notes;
}

/**
 * Search all configured knowledge sources for notes related to a task.
 * Returns formatted context string for LLM injection.
 */
export async function searchKnowledge(query: string): Promise<string> {
  const settings = await getKnowledgeSyncSettings();
  if (!settings.knowledge_sync_enabled) return "";

  const allNotes: KnowledgeNote[] = [];

  // Search Notion
  if (settings.notion_api_key) {
    const notionNotes = await searchNotion(
      settings.notion_api_key,
      query,
      settings.notion_database_id
    );
    allNotes.push(...notionNotes);
  }

  // Search Obsidian (local only)
  if (settings.obsidian_vault_path) {
    const obsidianNotes = await searchObsidian(
      settings.obsidian_vault_path,
      query
    );
    allNotes.push(...obsidianNotes);
  }

  if (allNotes.length === 0) return "";

  // Format as context block
  const formatted = allNotes
    .map(
      (n) =>
        `[From my ${n.source} notes — "${n.title}"]:\n${n.content.slice(0, 1000)}`
    )
    .join("\n\n");

  return `\n\n--- Personal Knowledge Context ---\n${formatted}\n--- End Knowledge Context ---`;
}
