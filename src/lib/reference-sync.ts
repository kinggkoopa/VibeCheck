import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Reference Sync — Jhey Tompkins CSS/HTML reference integration.
 *
 * Scans a local folder of downloaded Jhey CodePen demos (HTML/CSS/JS files)
 * and indexes them for injection into swarm agents and LLM prompts.
 *
 * Features:
 * - Scan local folder for .html, .css, .js files
 * - Extract snippets and categorize by technique (3D, animation, interaction, etc.)
 * - Build a searchable index for the Inspiration Agent
 * - Inject relevant snippets into prompts when generating UI code
 *
 * Folder structure expected:
 *   /path/to/codepen-examples/
 *     ├── 3d-card-flip.html
 *     ├── glow-hover.css
 *     ├── scroll-animation.css
 *     └── ...
 */

export interface ReferenceSnippet {
  filename: string;
  content: string;
  category: string;
  techniques: string[];
  summary: string;
}

interface ReferenceIndex {
  snippets: ReferenceSnippet[];
  lastScanned: string;
  folderPath: string;
}

// Categories for auto-classification
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  "3d-transform": [/perspective|rotateX|rotateY|rotateZ|transform-style:\s*preserve-3d/i],
  "animation": [/keyframes|animation:|transition:/i],
  "hover-effect": [/:hover|pointer|mouseenter/i],
  "scroll": [/scroll-snap|IntersectionObserver|scroll-driven|animation-timeline/i],
  "grid-layout": [/display:\s*grid|grid-template/i],
  "flex-layout": [/display:\s*flex|flex-direction/i],
  "variable-fonts": [/font-variation|variable.*font|wght|wdth/i],
  "css-variables": [/--[\w-]+:/i],
  "clip-path": [/clip-path|polygon|circle|ellipse/i],
  "gradient": [/linear-gradient|radial-gradient|conic-gradient/i],
  "container-query": [/@container|container-type/i],
  "interaction": [/click|touch|drag|pointer-events/i],
};

/**
 * Classify a snippet into categories and extract technique keywords.
 */
function classifySnippet(content: string, filename: string): { category: string; techniques: string[] } {
  const techniques: string[] = [];
  let category = "general";

  for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        if (category === "general") category = cat;
        techniques.push(cat);
        break;
      }
    }
  }

  // Extract from filename too
  const nameLower = filename.toLowerCase();
  if (nameLower.includes("3d")) techniques.push("3d-transform");
  if (nameLower.includes("hover")) techniques.push("hover-effect");
  if (nameLower.includes("anim")) techniques.push("animation");
  if (nameLower.includes("scroll")) techniques.push("scroll");
  if (nameLower.includes("glow")) techniques.push("gradient");

  return { category, techniques: [...new Set(techniques)] };
}

/**
 * Generate a brief summary of a CSS/HTML snippet.
 */
function summarizeSnippet(content: string, filename: string): string {
  const name = filename.replace(/\.(html|css|js)$/, "").replace(/[-_]/g, " ");

  // Count CSS rules
  const ruleCount = (content.match(/\{/g) ?? []).length;
  const hasKeyframes = /keyframes/.test(content);
  const hasVars = /--[\w-]+:/.test(content);

  const parts = [`"${name}"`];
  if (ruleCount > 0) parts.push(`${ruleCount} CSS rules`);
  if (hasKeyframes) parts.push("keyframe animations");
  if (hasVars) parts.push("CSS custom properties");

  return parts.join(" — ");
}

/**
 * Scan a local folder for reference snippets.
 * Called from the API route — uses Node fs.
 */
export async function scanReferenceFolder(folderPath: string): Promise<ReferenceIndex> {
  // Dynamic import for Node.js fs (only works server-side)
  const fs = await import("fs/promises");
  const path = await import("path");

  const resolvedPath = path.resolve(folderPath);

  // Validate folder exists
  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${resolvedPath}`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Folder not found: ${resolvedPath}`);
    }
    throw err;
  }

  const entries = await fs.readdir(resolvedPath);
  const validExts = [".html", ".css", ".js", ".jsx", ".tsx"];

  const snippets: ReferenceSnippet[] = [];

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!validExts.includes(ext)) continue;

    try {
      const filePath = path.join(resolvedPath, entry);
      const stat = await fs.stat(filePath);

      // Skip files > 100KB
      if (stat.size > 100_000) continue;

      const content = await fs.readFile(filePath, "utf-8");
      const { category, techniques } = classifySnippet(content, entry);
      const summary = summarizeSnippet(content, entry);

      snippets.push({
        filename: entry,
        content: content.slice(0, 5000), // Cap at 5K chars per snippet
        category,
        techniques,
        summary,
      });
    } catch {
      // Skip unreadable files
      continue;
    }
  }

  return {
    snippets,
    lastScanned: new Date().toISOString(),
    folderPath: resolvedPath,
  };
}

/**
 * Search the reference index for snippets matching a query.
 * Uses keyword matching against categories, techniques, filenames, and content.
 */
export function searchReferences(
  index: ReferenceIndex,
  query: string,
  maxResults: number = 3
): ReferenceSnippet[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = index.snippets.map((snippet) => {
    let score = 0;
    const searchable = [
      snippet.filename,
      snippet.category,
      ...snippet.techniques,
      snippet.summary,
    ]
      .join(" ")
      .toLowerCase();

    for (const word of queryWords) {
      if (searchable.includes(word)) score += 2;
      if (snippet.content.toLowerCase().includes(word)) score += 1;
    }

    // Boost exact category matches
    if (snippet.category === queryLower) score += 5;
    if (snippet.techniques.some((t) => queryLower.includes(t))) score += 3;

    return { snippet, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.snippet);
}

/**
 * Format reference snippets into a context block for LLM injection.
 */
export function formatReferenceContext(snippets: ReferenceSnippet[]): string {
  if (snippets.length === 0) return "";

  const entries = snippets
    .map(
      (s, i) =>
        `[${i + 1}] ${s.summary}\nCategory: ${s.category} | Techniques: ${s.techniques.join(", ")}\n\`\`\`css\n${s.content.slice(0, 1500)}\n\`\`\``
    )
    .join("\n\n");

  return `\n\n<reference_inspiration source="Jhey Tompkins CodePen">\nUse these creative CSS/HTML references as inspiration for UI implementation:\n${entries}\n</reference_inspiration>`;
}

/**
 * Load stored reference index from user settings.
 */
export async function loadReferenceIndex(): Promise<ReferenceIndex | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("user_settings")
      .select("reference_index, reference_folder_path")
      .eq("user_id", user.id)
      .single();

    if (!data?.reference_index) return null;

    return data.reference_index as ReferenceIndex;
  } catch {
    return null;
  }
}

/**
 * Save reference index to user settings.
 */
export async function saveReferenceIndex(index: ReferenceIndex): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        reference_index: index,
        reference_folder_path: index.folderPath,
      },
      { onConflict: "user_id" }
    );
}

/**
 * Get reference injection for a prompt — searches stored index.
 * Returns empty string if no references are configured.
 */
export async function getReferenceInjection(query: string): Promise<string> {
  const index = await loadReferenceIndex();
  if (!index || index.snippets.length === 0) return "";

  const matches = searchReferences(index, query, 3);
  return formatReferenceContext(matches);
}
