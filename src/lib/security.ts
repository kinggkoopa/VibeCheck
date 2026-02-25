import "server-only";

/**
 * Server-only security utilities for BYOK key management.
 *
 * INVARIANT: This module must never be imported from client code.
 * The `server-only` import above enforces this at build time.
 */

/** Mask an API key for safe display: "sk-ab...xYz9" */
export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/** Key format patterns per provider. */
const KEY_PATTERNS: Record<string, RegExp> = {
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
  openai: /^sk-[a-zA-Z0-9_-]{20,}$/,
  openrouter: /^sk-or-[a-zA-Z0-9_-]{20,}$/,
  groq: /^gsk_[a-zA-Z0-9_-]{20,}$/,
};

/**
 * Validate key format for a provider.
 * Returns null if valid, or an error message string.
 * Ollama keys always pass (local, no key required).
 */
export function validateKeyFormat(
  provider: string,
  key: string
): string | null {
  if (provider === "ollama") return null;

  if (!key || key.trim().length < 8) {
    return "API key must be at least 8 characters.";
  }

  const pattern = KEY_PATTERNS[provider];
  if (pattern && !pattern.test(key.trim())) {
    return `Key doesn't match expected ${provider} format. Double-check you copied the full key.`;
  }

  return null;
}

/**
 * Validate an Anthropic key by making a lightweight test call.
 * Uses the messages API with max_tokens=1 to minimize cost.
 * Returns null on success, or an error message string.
 */
export async function validateAnthropicKey(
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (res.ok) return null;

    const body = await res.json().catch(() => ({}));
    const errType = body?.error?.type ?? "";

    if (res.status === 401) {
      return "Invalid API key. Check that you copied it correctly.";
    }
    if (res.status === 403) {
      return "API key is valid but lacks permission. Check your Anthropic plan.";
    }
    if (errType === "overloaded_error" || res.status === 529) {
      // API is overloaded but key is valid
      return null;
    }
    if (res.status === 429) {
      // Rate limited but key is valid
      return null;
    }

    return `Anthropic API returned ${res.status}: ${body?.error?.message ?? "unknown error"}`;
  } catch (err) {
    return `Network error validating key: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

/**
 * Validate a key by making a test call to the provider.
 * Currently supports Anthropic validation; other providers do format check only.
 */
export async function validateProviderKey(
  provider: string,
  apiKey: string
): Promise<string | null> {
  // Format check first
  const formatError = validateKeyFormat(provider, apiKey);
  if (formatError) return formatError;

  // Live validation for Anthropic
  if (provider === "anthropic") {
    return validateAnthropicKey(apiKey);
  }

  // Other providers: format check is sufficient for now
  return null;
}
