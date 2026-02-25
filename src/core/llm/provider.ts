import OpenAI from "openai";
import { getDecryptedKey } from "@/lib/crypto/keys";
import { PROVIDER_BASE_URLS, getDefaultModel } from "./models";
import type { LLMProvider, ProviderConfig } from "@/types";

/**
 * BYOK LLM Provider Factory — Server-Only
 *
 * Creates an OpenAI-compatible client for any supported provider.
 * All providers (Anthropic, Groq, OpenRouter) expose OpenAI-compatible APIs,
 * so we use the openai SDK as a universal client.
 *
 * SECURITY: This module decrypts user keys from Supabase and holds them
 * in memory ONLY for the duration of the request. Keys are never logged.
 */

/** Create a provider client from explicit config (used by agents). */
export function createProviderClient(config: ProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ?? PROVIDER_BASE_URLS[config.provider],
    defaultHeaders: config.provider === "openrouter"
      ? { "HTTP-Referer": "https://metavibecoder.app", "X-Title": "MetaVibeCoder" }
      : undefined,
  });
}

/**
 * Create a provider client by decrypting the current user's stored key.
 * This is the primary entry point for LLM calls in route handlers.
 */
export async function createProviderFromStoredKey(
  provider: LLMProvider,
  model?: string
): Promise<{ client: OpenAI; model: string }> {
  const apiKey = await getDecryptedKey(provider);

  if (!apiKey) {
    throw new Error(
      `No API key found for provider "${provider}". Add one in Settings.`
    );
  }

  const resolvedModel = model ?? getDefaultModel(provider)?.id;
  if (!resolvedModel) {
    throw new Error(`No model specified and no default for "${provider}".`);
  }

  const client = createProviderClient({ provider, apiKey, model: resolvedModel });
  return { client, model: resolvedModel };
}

/** Simple completion helper — takes a system prompt and user message. */
export async function complete(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string,
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const { client, model } = await createProviderFromStoredKey(
    provider,
    options?.model
  );

  const response = await client.chat.completions.create({
    model,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
