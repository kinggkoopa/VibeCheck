import "server-only";

/**
 * Server-only security utilities.
 *
 * INVARIANT: This module must never be imported from client code.
 * The `server-only` import above enforces this at build time.
 *
 * Provides:
 * - Key format validation & live provider tests
 * - Rate limiting helpers (wraps Upstash)
 * - Input sanitization & size validation
 * - Safe redirect validation
 */

import { NextResponse } from "next/server";
import { apiRateLimit, llmRateLimit } from "./redis";

// ── Key Management ──

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
    if (errType === "overloaded_error" || res.status === 529) return null;
    if (res.status === 429) return null;

    return `Anthropic API returned ${res.status}: ${body?.error?.message ?? "unknown error"}`;
  } catch (err) {
    return `Network error validating key: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

/**
 * Validate a key by making a test call to the provider.
 */
export async function validateProviderKey(
  provider: string,
  apiKey: string
): Promise<string | null> {
  const formatError = validateKeyFormat(provider, apiKey);
  if (formatError) return formatError;

  if (provider === "anthropic") {
    return validateAnthropicKey(apiKey);
  }

  return null;
}

// ── Rate Limiting ──

/**
 * Apply API rate limit for a user. Returns a 429 response if exceeded.
 * Returns null if within limits (caller should proceed).
 */
export async function checkApiRateLimit(
  userId: string
): Promise<NextResponse | null> {
  try {
    const { success, remaining, reset } = await apiRateLimit.limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  } catch {
    // If Redis is unavailable, allow the request (fail-open for personal use)
  }
  return null;
}

/**
 * Apply LLM-specific rate limit (stricter). Returns 429 if exceeded.
 */
export async function checkLlmRateLimit(
  userId: string
): Promise<NextResponse | null> {
  try {
    const { success, remaining, reset } = await llmRateLimit.limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: "LLM rate limit exceeded. Wait before sending more requests." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  } catch {
    // Fail-open
  }
  return null;
}

// ── Input Validation ──

/** Maximum allowed sizes (bytes) for various inputs. */
export const MAX_SIZES = {
  code: 100_000, // 100 KB
  prompt: 50_000, // 50 KB
  task: 20_000, // 20 KB
  memory: 10_000, // 10 KB
  embedding: 1536, // max dimensions
} as const;

/**
 * Check if a string input exceeds the allowed size.
 * Returns an error message or null if within limits.
 */
export function validateInputSize(
  input: string,
  maxBytes: number,
  fieldName: string = "Input"
): string | null {
  const byteLength = new TextEncoder().encode(input).length;
  if (byteLength > maxBytes) {
    const maxKb = Math.round(maxBytes / 1000);
    return `${fieldName} exceeds maximum size of ${maxKb}KB.`;
  }
  return null;
}

/**
 * Sanitize a string for safe inclusion in responses.
 * Strips potential XSS vectors from user-supplied text.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// ── Redirect Validation ──

/**
 * Validate a redirect URL to prevent open redirect attacks.
 * Only allows same-origin paths starting with /.
 */
export function validateRedirectUrl(url: string, origin: string): string {
  if (!url.startsWith("/")) return "/dashboard";
  if (url.startsWith("//")) return "/dashboard";

  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== origin) return "/dashboard";
    return parsed.pathname + parsed.search;
  } catch {
    return "/dashboard";
  }
}

// ── Provider Validation ──

const VALID_PROVIDERS = new Set([
  "anthropic",
  "openrouter",
  "groq",
  "openai",
  "ollama",
]);

export function isValidProvider(provider: string): boolean {
  return VALID_PROVIDERS.has(provider);
}
