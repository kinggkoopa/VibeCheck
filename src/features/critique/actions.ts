"use server";

import { createClient } from "@/lib/supabase/server";
import {
  runCritiqueSwarm,
  type CritiqueSwarmResult,
  type CritiqueReport,
  type AgentMessage,
} from "@/core/agents/graph-swarm";

export type { CritiqueReport, AgentMessage };

export interface CritiqueSwarmActionResult {
  success: boolean;
  error: string | null;
  report: CritiqueReport | null;
  messages: AgentMessage[];
  iterations: number;
  provider: string | null;
}

/**
 * Server Action: run the multi-agent critique swarm.
 *
 * Flow:
 * 1. Auth check
 * 2. Execute LangGraph critique swarm (4 specialists + supervisor + reflection)
 * 3. Persist results to critiques table
 * 4. Log analytics
 * 5. Return merged report
 */
export async function executeCritiqueSwarm(
  code: string,
  maxIterations: number = 2
): Promise<CritiqueSwarmActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Not authenticated.",
      report: null,
      messages: [],
      iterations: 0,
      provider: null,
    };
  }

  if (!code || code.trim().length < 10) {
    return {
      success: false,
      error: "Code must be at least 10 characters.",
      report: null,
      messages: [],
      iterations: 0,
      provider: null,
    };
  }

  let result: CritiqueSwarmResult;
  try {
    result = await runCritiqueSwarm(
      code.trim(),
      Math.min(Math.max(maxIterations, 1), 3)
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Critique swarm failed.",
      report: null,
      messages: [],
      iterations: 0,
      provider: null,
    };
  }

  // Persist to critiques table
  try {
    await supabase.from("critiques").insert({
      user_id: user.id,
      code_snippet: code.trim(),
      issues: result.report.findings,
      overall_score: Math.min(100, Math.max(0, result.report.overall_score)),
      summary: result.report.summary,
    });
  } catch {
    // Non-fatal: the report is still valid even if persistence fails
  }

  // Log analytics
  try {
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "critique",
      metadata: {
        provider: result.provider,
        iterations: result.iterations,
        score: result.report.overall_score,
        agent_scores: result.report.agent_scores,
        swarm: true,
      },
    });
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    error: null,
    report: result.report,
    messages: result.messages,
    iterations: result.iterations,
    provider: result.provider,
  };
}
