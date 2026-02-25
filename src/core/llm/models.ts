import type { ModelInfo, LLMProvider } from "@/types";

/**
 * Registry of supported models per BYOK provider.
 * Users select from these when configuring their keys.
 */
export const MODEL_REGISTRY: ModelInfo[] = [
  // ── Anthropic ──
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", contextWindow: 200000, isDefault: true },
  { id: "claude-haiku-4-20250414", name: "Claude Haiku 4", provider: "anthropic", contextWindow: 200000 },

  // ── OpenAI ──
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", contextWindow: 128000, isDefault: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", contextWindow: 128000 },
  { id: "o3-mini", name: "o3-mini", provider: "openai", contextWindow: 200000 },

  // ── OpenRouter (multi-provider gateway) ──
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (OR)", provider: "openrouter", contextWindow: 200000, isDefault: true },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro (OR)", provider: "openrouter", contextWindow: 1000000 },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick (OR)", provider: "openrouter", contextWindow: 1000000 },

  // ── Groq (fast inference) ──
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", contextWindow: 128000, isDefault: true },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", provider: "groq", contextWindow: 8192 },

  // ── Ollama (local) ──
  { id: "llama3.3", name: "Llama 3.3 (Local)", provider: "ollama", contextWindow: 128000, isDefault: true },
  { id: "codellama", name: "Code Llama (Local)", provider: "ollama", contextWindow: 16384 },
];

/** Get all models for a specific provider */
export function getModelsForProvider(provider: LLMProvider): ModelInfo[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

/** Get the default model for a provider */
export function getDefaultModel(provider: LLMProvider): ModelInfo | undefined {
  return MODEL_REGISTRY.find((m) => m.provider === provider && m.isDefault);
}

/** Base URLs per provider */
export const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
  anthropic: "https://api.anthropic.com/v1",
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  ollama: "http://localhost:11434/v1",
};
