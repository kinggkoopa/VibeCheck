import OpenAI from "openai";
import type { LLMProvider } from "@/types";

/**
 * Unified LLM client that supports OpenAI and Ollama (OpenAI-compatible API).
 * Falls back to Ollama when OpenAI is unavailable or explicitly configured.
 */

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

function getProvider(): LLMProvider {
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      model: DEFAULT_OPENAI_MODEL,
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  // Fallback to Ollama — local inference, no API key required
  return {
    name: "ollama",
    model: DEFAULT_OLLAMA_MODEL,
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  };
}

/** Get an OpenAI-compatible client (works for both OpenAI and Ollama) */
export function getLLMClient(providerOverride?: Partial<LLMProvider>): OpenAI {
  const provider = { ...getProvider(), ...providerOverride };

  if (provider.name === "ollama") {
    return new OpenAI({
      apiKey: "ollama", // Ollama doesn't need a real key
      baseURL: `${provider.baseUrl || "http://localhost:11434"}/v1`,
    });
  }

  return new OpenAI({
    apiKey: provider.apiKey,
  });
}

/** Get the model name for the current provider */
export function getModelName(providerOverride?: Partial<LLMProvider>): string {
  const provider = { ...getProvider(), ...providerOverride };
  return provider.model;
}

/** Generate a chat completion */
export async function chatCompletion(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: {
    provider?: Partial<LLMProvider>;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getLLMClient(options?.provider);
  const model = getModelName(options?.provider);

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  return response.choices[0]?.message?.content ?? "";
}

/** Generate an embedding vector (OpenAI only — Ollama uses a different API) */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getLLMClient();

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}
