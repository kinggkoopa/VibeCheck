import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildHandoffContext, fuseResults, createHandoffMessage, estimateTokens } from "@/lib/opus-bridge";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";
import { complete } from "@/core/llm/provider";
import { createProviderFromStoredKey } from "@/core/llm/provider";

/** POST /api/agents/opus-handoff — hand off swarm results to Opus for enhancement */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { swarm_output, additional_context, model } = await request.json();

    if (!swarm_output || typeof swarm_output !== "string" || swarm_output.trim().length < 10) {
      return NextResponse.json(
        { error: "Swarm output is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(swarm_output, MAX_SIZES.task, "Swarm output");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const context = buildHandoffContext({
      task: "Enhance and refine swarm output",
      code: swarm_output.trim(),
      swarmResults: swarm_output.trim(),
      memoryContext: typeof additional_context === "string" ? additional_context : undefined,
    });

    const messages = createHandoffMessage(context);

    // Try to get provider — prefer Anthropic for Opus
    let provider;
    try {
      provider = await createProviderFromStoredKey(user.id, "anthropic");
    } catch {
      try {
        provider = await createProviderFromStoredKey(user.id, "openrouter");
      } catch {
        return NextResponse.json(
          { error: "No API key found. Add an Anthropic or OpenRouter key in Settings." },
          { status: 400 }
        );
      }
    }

    const selectedModel = typeof model === "string" && model.length > 0
      ? model
      : "claude-opus-4-20250514";

    const opusResponse = await complete(provider, messages as Array<{ role: string; content: string }>, {
      model: selectedModel,
      max_tokens: 4096,
      temperature: 0.3,
    });

    const fused = fuseResults(swarm_output.trim(), opusResponse);

    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "opus_handoff",
        model: selectedModel,
        input_tokens: estimateTokens(swarm_output),
        output_tokens: estimateTokens(opusResponse),
        confidence: fused.confidence,
      },
    });

    return NextResponse.json({
      data: {
        fused,
        opusOutput: opusResponse,
        context: {
          tokenEstimate: context.metadata.tokenEstimate,
          complexity: context.metadata.complexity,
        },
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
