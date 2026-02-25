import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";
import { v4 as uuidv4 } from "uuid";

/**
 * Remote Session API — Create, query, and update remote sessions
 * for multi-device handoff (laptop → phone).
 *
 * Sessions are stored in the `remote_sessions` Supabase table.
 * Real-time sync is handled via Supabase Realtime channels
 * on the client side.
 *
 * POST — Create a new remote session
 * GET  — Get active sessions or a specific session
 * PATCH — Update session state (approve/cancel from mobile)
 */

export type RemoteSessionStatus =
  | "pending"
  | "running"
  | "awaiting_review"
  | "approved"
  | "cancelled"
  | "completed"
  | "error";

export interface RemoteSession {
  id: string;
  user_id: string;
  task_type: "swarm" | "iterate" | "optimize" | "critique";
  task_input: string;
  status: RemoteSessionStatus;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// POST — Create a new remote session
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

    const { task_type, task_input } = await request.json();

    if (!task_type || !["swarm", "iterate", "optimize", "critique"].includes(task_type)) {
      return NextResponse.json(
        { error: "task_type must be one of: swarm, iterate, optimize, critique" },
        { status: 400 }
      );
    }

    if (!task_input || typeof task_input !== "string" || task_input.trim().length < 5) {
      return NextResponse.json(
        { error: "task_input is required (min 5 characters)" },
        { status: 400 }
      );
    }

    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    // Store session in Supabase
    const { error: insertError } = await supabase.from("remote_sessions").insert({
      id: sessionId,
      user_id: user.id,
      task_type,
      task_input: task_input.slice(0, 50_000), // Limit size
      status: "pending",
      result: null,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("[remote-session] Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create session. Ensure the remote_sessions table exists." },
        { status: 500 }
      );
    }

    // Generate session URL
    const origin = new URL(request.url).origin;
    const sessionUrl = `${origin}/dashboard/remote/${sessionId}`;

    return NextResponse.json({
      data: {
        session_id: sessionId,
        session_url: sessionUrl,
        task_type,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

// GET — Get session(s) for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get("id");

    if (sessionId) {
      // Get specific session
      const { data, error } = await supabase
        .from("remote_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data, error: null });
    }

    // List active sessions
    const { data, error } = await supabase
      .from("remote_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ data: data ?? [], error: error?.message ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

// PATCH — Update session status (approve/cancel from mobile)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_id, status, result } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    const validStatuses: RemoteSessionStatus[] = [
      "running",
      "awaiting_review",
      "approved",
      "cancelled",
      "completed",
      "error",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate result payload size (1MB limit)
    if (result !== undefined && JSON.stringify(result).length > 1_000_000) {
      return NextResponse.json(
        { error: "Result payload too large (max 1MB)" },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (status) updatePayload.status = status;
    if (result !== undefined) updatePayload.result = result;

    const { error: updateError } = await supabase
      .from("remote_sessions")
      .update(updatePayload)
      .eq("id", session_id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Also trigger the actual task execution if status is "running"
    if (status === "running") {
      // Fire and forget — execute the task
      const origin = new URL(request.url).origin;
      executeRemoteTask(supabase, origin, session_id, user.id, request.headers).catch(
        (err) => console.error("[remote-session] Task execution error:", err)
      );
    }

    return NextResponse.json({ data: { session_id, status }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

/** Execute the task for a remote session (background). */
async function executeRemoteTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  origin: string,
  sessionId: string,
  userId: string,
  headers: Headers
) {
  // Get session details (filter by user_id for authorization)
  const { data: session } = await supabase
    .from("remote_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) return;

  const taskType = session.task_type as string;
  const taskInput = session.task_input as string;

  // Map task type to API endpoint
  const endpointMap: Record<string, { url: string; body: Record<string, unknown> }> = {
    swarm: {
      url: `${origin}/api/agents/run`,
      body: { task: taskInput, provider: "anthropic", max_iterations: 3 },
    },
    iterate: {
      url: `${origin}/api/iterate`,
      body: { code: taskInput, max_iterations: 3 },
    },
    optimize: {
      url: `${origin}/api/optimize`,
      body: { prompt: taskInput, strategy: "best-practice" },
    },
    critique: {
      url: `${origin}/api/critique`,
      body: { code: taskInput },
    },
  };

  const endpoint = endpointMap[taskType];
  if (!endpoint) return;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: headers.get("cookie") ?? "",
        "x-csrf-token": headers.get("x-csrf-token") ?? "",
      },
      body: JSON.stringify(endpoint.body),
    });

    const result = await res.json();

    // Update session with result
    await supabase
      .from("remote_sessions")
      .update({
        status: res.ok ? "awaiting_review" : "error",
        result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userId);
  } catch (err) {
    await supabase
      .from("remote_sessions")
      .update({
        status: "error",
        result: { error: err instanceof Error ? err.message : "Unknown error" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userId);
  }
}
