import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLlmRateLimit } from "@/lib/security";
import { chunkFiles, formatChunkForPrompt, mergeAnalysisResults } from "@/lib/codebase-chunker";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * POST /api/multi-file — Multi-file analysis and refactoring.
 *
 * Body: {
 *   files: Array<{ path: string, content: string }>,
 *   task: string,          // What to do (analyze, refactor, review, etc.)
 *   mode: "analyze" | "refactor" | "review",
 * }
 *
 * Returns chunked analysis or proposed diffs for each file.
 */

const PROVIDERS: LLMProvider[] = ["anthropic", "openrouter", "openai", "groq", "ollama"];

const MODE_PROMPTS: Record<string, string> = {
  analyze: `You are analyzing a multi-file codebase. For each file, identify:
- Architecture patterns and concerns
- Cross-file dependencies and coupling
- Potential bugs and improvements
- Security considerations
Provide a unified analysis across all files.`,

  refactor: `You are refactoring a multi-file codebase. For each file:
- Show the proposed changes as unified diffs
- Explain the reasoning for each change
- Ensure changes are consistent across files
- Maintain backward compatibility
Return the refactored code for each file.`,

  review: `You are conducting a thorough code review of a multi-file codebase. Evaluate:
- Code quality and consistency across files
- Security vulnerabilities (XSS, injection, auth issues)
- Performance concerns
- TypeScript type safety
- Missing error handling
Score 0-100 overall and per-file.`,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { files, task, mode } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
    }
    if (!task || typeof task !== "string" || task.trim().length < 5) {
      return NextResponse.json({ error: "Task description required (min 5 chars)" }, { status: 400 });
    }

    const resolvedMode = mode ?? "analyze";
    if (!MODE_PROMPTS[resolvedMode]) {
      return NextResponse.json({ error: "Invalid mode. Use: analyze, refactor, review" }, { status: 400 });
    }

    // Cap file count
    const cappedFiles = files.slice(0, 20).map((f: { path: string; content: string }) => ({
      path: String(f.path),
      content: String(f.content).slice(0, 50_000),
    }));

    // Chunk files for context window
    const chunks = chunkFiles(cappedFiles, task);

    // Enrich system prompt with taste/memory
    const systemPrompt = await injectMemoryContext(MODE_PROMPTS[resolvedMode], task, 2);

    // Process each chunk through the LLM
    const results: Array<{ files: string[]; analysis: string; score?: number }> = [];
    let usedProvider: string | null = null;

    for (const chunk of chunks) {
      const filesInChunk = chunk.map((c) => c.path);
      const formattedChunk = chunk.map(formatChunkForPrompt).join("\n\n");
      const userMessage = `Task: ${task}\n\n${formattedChunk}`;

      let result: string | null = null;

      for (const provider of PROVIDERS) {
        try {
          result = await complete(provider, systemPrompt, userMessage, {
            maxTokens: 8192,
            temperature: 0.3,
          });
          if (result) {
            usedProvider = provider;
            break;
          }
        } catch {
          continue;
        }
      }

      if (result) {
        // Try to extract a score if in review mode
        let score: number | undefined;
        if (resolvedMode === "review") {
          const scoreMatch = result.match(/(?:score|overall)[:\s]*(\d+)/i);
          if (scoreMatch) score = parseInt(scoreMatch[1], 10);
        }

        results.push({ files: filesInChunk, analysis: result, score });
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No LLM provider available for analysis." },
        { status: 400 }
      );
    }

    const merged = mergeAnalysisResults(results);

    // Log analytics
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "multi_file_analysis",
        metadata: {
          mode: resolvedMode,
          file_count: cappedFiles.length,
          chunk_count: chunks.length,
          provider: usedProvider,
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      data: {
        analysis: merged.combined,
        score: merged.avgScore,
        fileCount: cappedFiles.length,
        chunkCount: chunks.length,
        provider: usedProvider,
        perChunk: results,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
