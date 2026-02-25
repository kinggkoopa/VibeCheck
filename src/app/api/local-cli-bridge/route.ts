import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";

/**
 * POST /api/local-cli-bridge — Bridge endpoint for local CLI / VS Code extension.
 *
 * Accepts tasks from local tools and routes them to the appropriate handler.
 * Supports: critique, optimize, iterate, swarm
 *
 * Body: {
 *   action: "critique" | "optimize" | "iterate" | "swarm",
 *   code?: string,
 *   prompt?: string,
 *   task?: string,
 *   strategy?: string,
 *   max_iterations?: number,
 *   context?: { filename?: string, cwd?: string }
 * }
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

    const rateLimited = await checkApiRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { action } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "action is required (critique|optimize|iterate|swarm)" },
        { status: 400 }
      );
    }

    // Route to the appropriate internal endpoint
    const origin = new URL(request.url).origin;
    let targetUrl: string;
    let targetBody: Record<string, unknown>;

    switch (action) {
      case "critique":
        targetUrl = `${origin}/api/critique`;
        targetBody = { code: body.code };
        break;
      case "optimize":
        targetUrl = `${origin}/api/optimize`;
        targetBody = {
          prompt: body.prompt ?? body.code,
          strategy: body.strategy ?? "best-practice",
        };
        break;
      case "iterate":
        targetUrl = `${origin}/api/iterate`;
        targetBody = {
          code: body.code,
          max_iterations: body.max_iterations ?? 3,
        };
        break;
      case "swarm":
        targetUrl = `${origin}/api/agents/run`;
        targetBody = {
          task: body.task ?? body.prompt ?? body.code,
          provider: "anthropic",
          max_iterations: body.max_iterations ?? 3,
        };
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Forward the request internally (preserves auth cookies)
    const internalRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
        "x-csrf-token": request.headers.get("x-csrf-token") ?? "",
      },
      body: JSON.stringify(targetBody),
    });

    const result = await internalRes.json();

    // Log bridge usage
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "swarm_run",
        metadata: {
          source: "cli_bridge",
          action,
          filename: body.context?.filename,
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json(result, { status: internalRes.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/**
 * GET /api/local-cli-bridge — Health check for CLI/extension detection.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    app: "MetaVibeCoder",
    capabilities: ["critique", "optimize", "iterate", "swarm"],
  });
}
