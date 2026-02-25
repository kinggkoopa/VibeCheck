import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isClaudeCodeAvailable,
  generateTaskFile,
  executeClaudeCodeTask,
  getClaudeCodeResult,
} from "@/lib/claude-code";

/**
 * GET /api/claude-code — Check Claude Code availability and poll results.
 *
 * Query params:
 *   ?check=1       → Check if Claude Code CLI is available
 *   ?result_id=xyz → Poll for task result
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Check availability
    if (searchParams.has("check")) {
      const available = await isClaudeCodeAvailable();
      return NextResponse.json({ data: { available }, error: null });
    }

    // Poll result
    const resultId = searchParams.get("result_id");
    if (resultId) {
      const result = await getClaudeCodeResult(resultId);
      if (!result) {
        return NextResponse.json(
          { data: null, error: "Result not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: result, error: null });
    }

    return NextResponse.json(
      { error: "Provide ?check=1 or ?result_id=<id>" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/**
 * POST /api/claude-code — Execute a Claude Code task.
 *
 * Body: { idea: string, context?: string, agents?: string[], use_security_scan?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { idea, context, agents, use_security_scan } = body;

    if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
      return NextResponse.json(
        { error: "Task description required (min 5 characters)" },
        { status: 400 }
      );
    }

    const available = await isClaudeCodeAvailable();
    if (!available) {
      return NextResponse.json(
        {
          data: null,
          error:
            "Claude Code CLI not detected. Install it to use this feature.",
        },
        { status: 503 }
      );
    }

    const { taskId, filePath } = await generateTaskFile({
      idea: idea.trim(),
      context: context ?? "",
      agents,
      useSecurityScan: use_security_scan,
    });

    const { resultId } = await executeClaudeCodeTask(taskId, filePath);

    return NextResponse.json({
      data: { task_id: taskId, result_id: resultId },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
