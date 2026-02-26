import "server-only";

/**
 * Codebase Chunker — Intelligent multi-file analysis for large repos.
 *
 * Handles repos that exceed LLM context windows by:
 * - Chunking files into semantic groups (imports, functions, classes)
 * - Prioritizing files by relevance to the task
 * - Building dependency graphs for related file analysis
 * - Merging agent outputs across chunks
 *
 * Used by the VS Code extension and CLI for multi-file operations.
 */

export interface FileChunk {
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  type: "full" | "partial";
  relevanceScore: number;
}

export interface CodebaseContext {
  files: FileChunk[];
  totalFiles: number;
  totalLines: number;
  truncated: boolean;
  dependencies: Record<string, string[]>;
}

/**
 * Maximum tokens per chunk (rough estimate: 1 token ~= 4 chars).
 * Default to ~6K tokens per chunk for safety with 8K context models.
 */
const MAX_CHUNK_CHARS = 24_000;

/**
 * Chunk a set of files into groups that fit within the context window.
 * Files are grouped by dependency relationships and relevance.
 */
export function chunkFiles(
  files: Array<{ path: string; content: string }>,
  task: string,
  maxChunkChars: number = MAX_CHUNK_CHARS
): FileChunk[][] {
  // Score files by relevance to the task
  const scored = files.map((file) => ({
    ...file,
    score: scoreRelevance(file.path, file.content, task),
    lines: file.content.split("\n").length,
  }));

  // Sort by relevance (highest first)
  scored.sort((a, b) => b.score - a.score);

  const chunks: FileChunk[][] = [];
  let currentChunk: FileChunk[] = [];
  let currentSize = 0;

  for (const file of scored) {
    const fileSize = file.content.length;

    // If single file exceeds max, split it
    if (fileSize > maxChunkChars) {
      // Flush current chunk first
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }

      const splitChunks = splitLargeFile(file.path, file.content, file.score, maxChunkChars);
      for (const split of splitChunks) {
        chunks.push([split]);
      }
      continue;
    }

    // If adding this file would exceed max, start new chunk
    if (currentSize + fileSize > maxChunkChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push({
      path: file.path,
      content: file.content,
      startLine: 1,
      endLine: file.lines,
      type: "full",
      relevanceScore: file.score,
    });
    currentSize += fileSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split a large file into semantic chunks.
 * Tries to break on function/class boundaries.
 */
function splitLargeFile(
  path: string,
  content: string,
  score: number,
  maxChunkChars: number
): FileChunk[] {
  const lines = content.split("\n");
  const chunks: FileChunk[] = [];
  let currentLines: string[] = [];
  let startLine = 1;

  for (let i = 0; i < lines.length; i++) {
    currentLines.push(lines[i]);
    const currentSize = currentLines.join("\n").length;

    // Check if we're at a natural break point and over size
    const isBreakPoint =
      lines[i].trim() === "" ||
      lines[i].trim() === "}" ||
      /^(?:export\s+)?(?:function|class|const|interface|type)\s/.test(lines[i]);

    if (currentSize >= maxChunkChars && isBreakPoint) {
      chunks.push({
        path,
        content: currentLines.join("\n"),
        startLine,
        endLine: startLine + currentLines.length - 1,
        type: "partial",
        relevanceScore: score,
      });
      startLine += currentLines.length;
      currentLines = [];
    }
  }

  if (currentLines.length > 0) {
    chunks.push({
      path,
      content: currentLines.join("\n"),
      startLine,
      endLine: startLine + currentLines.length - 1,
      type: "partial",
      relevanceScore: score,
    });
  }

  return chunks;
}

/**
 * Score a file's relevance to a task description.
 * Higher scores = more relevant.
 */
function scoreRelevance(path: string, content: string, task: string): number {
  const taskLower = task.toLowerCase();
  const taskWords = taskLower.split(/\s+/).filter((w) => w.length > 3);
  let score = 0;

  // File name matches
  const pathLower = path.toLowerCase();
  for (const word of taskWords) {
    if (pathLower.includes(word)) score += 10;
  }

  // Content matches (sample first 2000 chars)
  const contentSample = content.slice(0, 2000).toLowerCase();
  for (const word of taskWords) {
    if (contentSample.includes(word)) score += 3;
  }

  // Boost for key file types
  if (path.endsWith(".tsx") || path.endsWith(".ts")) score += 2;
  if (path.includes("/components/")) score += 1;
  if (path.includes("/api/")) score += 1;
  if (path.includes("/lib/")) score += 1;

  // Penalize test/config files
  if (path.includes("__test__") || path.includes(".test.")) score -= 5;
  if (path.includes("node_modules")) score -= 100;
  if (path.endsWith(".json") && !path.endsWith("package.json")) score -= 3;

  return score;
}

/**
 * Extract import dependencies from TypeScript/JavaScript files.
 */
export function extractDependencies(
  files: Array<{ path: string; content: string }>
): Record<string, string[]> {
  const deps: Record<string, string[]> = {};

  for (const file of files) {
    const imports: string[] = [];
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];
      // Only track local imports (starting with . or @/)
      if (importPath.startsWith(".") || importPath.startsWith("@/")) {
        imports.push(importPath);
      }
    }

    deps[file.path] = imports;
  }

  return deps;
}

/**
 * Build a context summary for the codebase.
 */
export function buildCodebaseContext(
  files: Array<{ path: string; content: string }>,
  task: string
): CodebaseContext {
  const chunks = chunkFiles(files, task);
  const allChunks = chunks.flat();
  const totalLines = files.reduce((sum, f) => sum + f.content.split("\n").length, 0);
  const dependencies = extractDependencies(files);

  return {
    files: allChunks,
    totalFiles: files.length,
    totalLines,
    truncated: allChunks.some((c) => c.type === "partial"),
    dependencies,
  };
}

/**
 * Format a file chunk for inclusion in an LLM prompt.
 */
export function formatChunkForPrompt(chunk: FileChunk): string {
  const range = chunk.type === "partial"
    ? ` (lines ${chunk.startLine}-${chunk.endLine})`
    : "";
  return `## ${chunk.path}${range}\n\`\`\`\n${chunk.content}\n\`\`\``;
}

/**
 * Merge multi-file agent outputs.
 * Combines file-by-file analysis results into a unified report.
 */
export function mergeAnalysisResults(
  results: Array<{
    files: string[];
    analysis: string;
    score?: number;
  }>
): { combined: string; avgScore: number } {
  const scores = results.filter((r) => r.score != null).map((r) => r.score!);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const combined = results
    .map((r) => `### Files: ${r.files.join(", ")}\n${r.analysis}`)
    .join("\n\n---\n\n");

  return { combined, avgScore };
}
