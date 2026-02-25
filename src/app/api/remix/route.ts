import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLlmRateLimit } from "@/lib/security";
import { getRandomReference, findReferences, generateRemixPrompts } from "@/lib/remix-utils";
import { complete } from "@/core/llm/provider";
import { getTasteInjection } from "@/lib/taste";
import type { LLMProvider } from "@/types";

/**
 * POST /api/remix — Generate creative remix variants.
 *
 * Body: {
 *   description: string,       // What to remix
 *   blendWith?: string,        // Search query for reference snippets
 *   surpriseMe?: boolean,      // Use random reference
 *   variantIndex?: number,     // 0-2, which variant to generate. If omitted, returns all prompts.
 * }
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

    const { description, blendWith, surpriseMe, variantIndex } = await request.json();

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return NextResponse.json(
        { error: "Description required (min 5 chars)" },
        { status: 400 }
      );
    }

    // Find inspiration
    let inspiration = null;
    if (surpriseMe) {
      inspiration = await getRandomReference();
    } else if (blendWith) {
      const refs = await findReferences(blendWith, 1);
      inspiration = refs[0] ?? null;
    }

    // Get taste
    let tasteNotes = "";
    try {
      tasteNotes = await getTasteInjection();
    } catch {
      // skip
    }

    // Generate variants
    const variants = generateRemixPrompts(description.trim(), inspiration, tasteNotes);

    // If a specific variant is requested, generate the code
    if (typeof variantIndex === "number" && variantIndex >= 0 && variantIndex < 3) {
      const variant = variants[variantIndex];

      let result: string | null = null;
      let usedProvider: string | null = null;

      for (const provider of PROVIDERS) {
        try {
          result = await complete(
            provider,
            "You are a creative front-end developer specializing in CSS art and animation. Generate production-ready code with detailed CSS.",
            variant.prompt
          );
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
          { error: "No LLM provider available for remix generation." },
          { status: 400 }
        );
      }

      // Log analytics
      try {
        await supabase.from("analytics").insert({
          user_id: user.id,
          event_type: "creative_remix",
          metadata: {
            variant: variant.name,
            provider: usedProvider,
            has_inspiration: !!inspiration,
          },
        });
      } catch {
        // non-fatal
      }

      return NextResponse.json({
        data: {
          variant: variant.name,
          code: result,
          inspiration: inspiration ? {
            filename: inspiration.filename,
            category: inspiration.category,
            summary: inspiration.summary,
          } : null,
          provider: usedProvider,
        },
        error: null,
      });
    }

    // Return all variant prompts (for preview before generating)
    return NextResponse.json({
      data: {
        variants: variants.map((v) => ({
          name: v.name,
          description: v.description,
          hasInspiration: !!v.inspiration,
        })),
        inspiration: inspiration ? {
          filename: inspiration.filename,
          category: inspiration.category,
          summary: inspiration.summary,
        } : null,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
