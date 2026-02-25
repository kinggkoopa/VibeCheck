"use server";

import { createClient } from "@/lib/supabase/server";
import {
  exportToTool,
  autoExportAll,
  TOOLS,
  type IntegrationTool,
  type ExportResult,
  type ToolInfo,
} from "@/lib/integrations";

export type { IntegrationTool, ExportResult, ToolInfo };

export interface ExportActionResult {
  success: boolean;
  error: string | null;
  result: ExportResult | null;
}

export interface AutoExportActionResult {
  success: boolean;
  error: string | null;
  results: Record<IntegrationTool, ExportResult> | null;
}

/**
 * Server Action: List available integration tools.
 */
export async function listTools(): Promise<ToolInfo[]> {
  return TOOLS;
}

/**
 * Server Action: Export code to a specific tool.
 */
export async function exportCode(
  tool: IntegrationTool,
  params: {
    code: string;
    filename: string;
    language?: string;
    title?: string;
    description?: string;
    githubToken?: string;
  }
): Promise<ExportActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated.", result: null };
  }

  if (!params.code || params.code.trim().length < 5) {
    return { success: false, error: "Code is required (min 5 characters).", result: null };
  }

  try {
    const result = await exportToTool(
      tool,
      {
        code: params.code.trim(),
        filename: params.filename || "index.tsx",
        language: params.language ?? "",
        title: params.title,
        description: params.description,
      },
      { githubToken: params.githubToken }
    );

    // Log analytics (non-fatal)
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "swarm_run",
        metadata: {
          source: "tool_export",
          tool,
          method: result.method,
          filename: params.filename,
        },
      });
    } catch {
      // Non-fatal
    }

    return { success: result.success, error: result.error, result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Export failed.",
      result: null,
    };
  }
}

/**
 * Server Action: Auto-export code to all tools at once.
 * Returns pre-computed URLs/payloads for every integration.
 */
export async function autoExport(params: {
  code: string;
  filename: string;
  language?: string;
  title?: string;
  description?: string;
  githubToken?: string;
}): Promise<AutoExportActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated.", results: null };
  }

  if (!params.code || params.code.trim().length < 5) {
    return { success: false, error: "Code is required (min 5 characters).", results: null };
  }

  try {
    const results = await autoExportAll(
      {
        code: params.code.trim(),
        filename: params.filename || "index.tsx",
        language: params.language ?? "",
        title: params.title,
        description: params.description,
      },
      { githubToken: params.githubToken }
    );

    // Log analytics (non-fatal)
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "swarm_run",
        metadata: {
          source: "auto_export",
          tools: Object.keys(results),
          filename: params.filename,
        },
      });
    } catch {
      // Non-fatal
    }

    return { success: true, error: null, results };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Auto-export failed.",
      results: null,
    };
  }
}
