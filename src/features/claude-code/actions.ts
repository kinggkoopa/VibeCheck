"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isClaudeCodeAvailable,
  generateTaskFile,
  executeClaudeCodeTask,
  getClaudeCodeResult,
  type ClaudeCodeResult,
} from "@/lib/claude-code";

/**
 * Server Action: Check if Claude Code CLI is available.
 */
export async function checkClaudeCode(): Promise<boolean> {
  try {
    return await isClaudeCodeAvailable();
  } catch {
    return false;
  }
}

/**
 * Server Action: Run a task via Claude Code CLI.
 */
export async function runClaudeCodeTask(params: {
  idea: string;
  context: string;
  agents?: string[];
  useSecurityScan?: boolean;
}): Promise<{
  success: boolean;
  error: string | null;
  resultId: string | null;
  taskId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated.", resultId: null, taskId: null };
  }

  if (!params.idea || params.idea.trim().length < 5) {
    return { success: false, error: "Task description too short.", resultId: null, taskId: null };
  }

  try {
    const { taskId, filePath } = await generateTaskFile({
      idea: params.idea.trim(),
      context: params.context,
      agents: params.agents,
      useSecurityScan: params.useSecurityScan,
    });

    const { resultId } = await executeClaudeCodeTask(taskId, filePath);

    // Log analytics
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "swarm_run",
        metadata: {
          source: "claude_code",
          task_id: taskId,
          agents: params.agents,
          security_scan: params.useSecurityScan,
        },
      });
    } catch {
      // Non-fatal
    }

    return { success: true, error: null, resultId, taskId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute Claude Code task.",
      resultId: null,
      taskId: null,
    };
  }
}

/**
 * Server Action: Poll for Claude Code task results.
 */
export async function pollClaudeCodeResult(
  resultId: string
): Promise<ClaudeCodeResult | null> {
  return getClaudeCodeResult(resultId);
}
