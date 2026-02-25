import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLlmRateLimit } from "@/lib/security";
import { runLifeSwarm } from "@/core/agents/life-graph";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * POST /api/life-plan — Personal daily planning via Life Swarm agent.
 *
 * Body: { input: string }
 * Returns: { data: { plan, priorities, schedule, provider }, error: null }
 */

const PROVIDERS: LLMProvider[] = ["anthropic", "openrouter", "openai", "groq", "ollama"];

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

    const { input } = await request.json();

    if (!input || typeof input !== "string" || input.trim().length < 5) {
      return NextResponse.json(
        { error: "Please describe your goals/tasks for the day (min 5 characters)." },
        { status: 400 }
      );
    }

    // Enrich input with memory context
    const enrichedInput = await injectMemoryContext(
      "You are helping with personal daily planning.",
      input,
      2
    );

    // Try providers in order
    let lastError: string = "No LLM provider available";
    for (const provider of PROVIDERS) {
      try {
        const state = await runLifeSwarm(provider, enrichedInput + "\n\nUser's goals: " + input);

        // Log analytics
        try {
          await supabase.from("analytics").insert({
            user_id: user.id,
            event_type: "life_plan",
            metadata: { provider, input_length: input.length },
          });
        } catch {
          // non-fatal
        }

        return NextResponse.json({
          data: {
            plan: state.finalPlan,
            priorities: state.priorities,
            schedule: state.schedule,
            provider,
          },
          error: null,
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Provider failed";
        continue;
      }
    }

    return NextResponse.json(
      { error: `Life planning failed: ${lastError}` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
