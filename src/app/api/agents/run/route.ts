import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSwarm } from "@/core/agents/graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";
import type { LLMProvider } from "@/types";

const VALID_PROVIDERS = new Set(["anthropic", "openrouter", "groq", "openai", "ollama"]);

/** POST /api/agents/run — execute the multi-agent critique swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { task, provider, max_iterations } = await request.json();

    if (!task || typeof task !== "string" || task.trim().length < 10) {
      return NextResponse.json(
        { error: "Task is required (min 10 characters)" },
        { status: 400 }
      );
    }

    if (!provider || !VALID_PROVIDERS.has(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${[...VALID_PROVIDERS].join(", ")}` },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(task, MAX_SIZES.task, "Task");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const iterations = Math.min(Math.max(max_iterations ?? 3, 1), 10);

    // Create the swarm run record
    const { data: run, error: insertErr } = await supabase
      .from("swarm_runs")
      .insert({
        user_id: user.id,
        task: task.trim(),
        status: "running",
      })
      .select("id")
      .single();

    if (insertErr || !run) {
      return NextResponse.json(
        { error: "Failed to create swarm run" },
        { status: 500 }
      );
    }

    // Execute the LangGraph swarm
    const result = await runSwarm(provider as LLMProvider, task.trim(), iterations);

    // Update the run record with results
    await supabase
      .from("swarm_runs")
      .update({
        messages: result.messages,
        final_output: result.code,
        status: "completed",
        iteration: result.iteration,
      })
      .eq("id", run.id);

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: { provider, iterations: result.iteration, run_id: run.id },
    });

    return NextResponse.json({
      data: {
        run_id: run.id,
        messages: result.messages,
        final_output: result.code,
        iterations: result.iteration,
        status: "completed",
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
