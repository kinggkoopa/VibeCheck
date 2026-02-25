import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runSwarm } from "@/lib/agents/orchestrator";
import type { ApiResponse, SwarmRun } from "@/types";

const RequestSchema = z.object({
  task: z.string().min(1).max(5000),
  useMemory: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await runSwarm({
      userId: user.id,
      task: parsed.data.task,
      useMemory: parsed.data.useMemory ?? true,
    });

    // Persist the run
    const { error: dbError } = await supabase
      .from("swarm_runs")
      .insert({
        id: result.id,
        user_id: user.id,
        task: result.task,
        messages: result.messages,
        final_output: result.final_output,
        status: result.status,
      });

    if (dbError) {
      console.error("Failed to persist swarm run:", dbError.message);
    }

    return NextResponse.json<ApiResponse<SwarmRun>>({
      data: result,
      error: null,
    });
  } catch (err) {
    console.error("Swarm orchestration error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
