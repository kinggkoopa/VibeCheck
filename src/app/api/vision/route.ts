import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createProviderFromStoredKey } from "@/core/llm/provider";
import { checkLlmRateLimit } from "@/lib/security";
import { getTasteInjection } from "@/lib/taste";
import type { LLMProvider } from "@/types";

/**
 * POST /api/vision — Multimodal image analysis.
 *
 * Accepts an image (base64 or URL) + a text prompt, sends to a vision-capable LLM.
 * Supports: GPT-4o (OpenAI), Claude (Anthropic via OpenAI-compat), Llama Vision (Ollama).
 *
 * Body (JSON): { image: string (base64 data URI or URL), prompt: string }
 * Body (FormData): image file + prompt field
 */

// Vision-capable providers in preference order
const VISION_PROVIDERS: LLMProvider[] = ["anthropic", "openai", "openrouter", "ollama"];

const VISION_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  openrouter: "anthropic/claude-sonnet-4",
  ollama: "llava",
};

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

    let imageData: string;
    let prompt: string;

    // Handle both JSON and FormData
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      prompt = (formData.get("prompt") as string) ?? "Describe this image in detail.";

      if (!file) {
        return NextResponse.json({ error: "image file is required" }, { status: 400 });
      }

      // 10MB limit
      if (file.size > 10_000_000) {
        return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = file.type || "image/png";
      imageData = `data:${mimeType};base64,${base64}`;
    } else {
      const body = await request.json();
      imageData = body.image;
      prompt = body.prompt ?? "Describe this image in detail.";

      if (!imageData) {
        return NextResponse.json({ error: "image is required (base64 data URI or URL)" }, { status: 400 });
      }
    }

    if (!prompt || prompt.trim().length < 2) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Inject taste preferences
    let systemPrompt = "You are an expert visual analyst and coding assistant. Analyze images with precision — describe UI components, identify code patterns, spot bugs in screenshots, and extract text accurately.";
    try {
      const tasteBlock = await getTasteInjection();
      if (tasteBlock) systemPrompt += tasteBlock;
    } catch {
      // skip
    }

    // Try vision-capable providers
    let result: string | null = null;
    let usedProvider: string | null = null;

    for (const provider of VISION_PROVIDERS) {
      try {
        const model = VISION_MODELS[provider];
        const { client } = await createProviderFromStoredKey(provider, model);

        const response = await client.chat.completions.create({
          model,
          max_tokens: 4096,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: imageData,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        });

        result = response.choices[0]?.message?.content ?? null;
        if (result) {
          usedProvider = provider;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: "No vision-capable provider available. Add an OpenAI or Anthropic key in Settings." },
        { status: 400 }
      );
    }

    // Log analytics
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "vision_analysis",
        metadata: { provider: usedProvider, prompt_length: prompt.length },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      data: {
        analysis: result,
        provider: usedProvider,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
