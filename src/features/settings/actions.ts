"use server";

import { createClient } from "@/lib/supabase/server";
import { storeUserKey, deleteUserKey, listUserKeys } from "@/lib/crypto/keys";
import { validateProviderKey } from "@/lib/security";
import type { LLMProvider, UserLLMKey } from "@/types";

const VALID_PROVIDERS = new Set([
  "anthropic",
  "openrouter",
  "groq",
  "openai",
  "ollama",
]);

export interface SaveKeyResult {
  success: boolean;
  error: string | null;
  keys: UserLLMKey[];
}

/**
 * Server Action: validate and store a BYOK API key.
 *
 * Flow:
 * 1. Auth check
 * 2. Input validation
 * 3. Provider-specific key validation (Anthropic gets a live test call)
 * 4. Encrypt and store via pgcrypto RPC
 * 5. Return updated key list
 */
export async function saveAndValidateKey(
  provider: string,
  apiKey: string,
  displayLabel: string,
  modelDefault?: string
): Promise<SaveKeyResult> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated.", keys: [] };
  }

  // Input validation
  if (!provider || !VALID_PROVIDERS.has(provider)) {
    return {
      success: false,
      error: `Invalid provider. Must be one of: ${[...VALID_PROVIDERS].join(", ")}`,
      keys: [],
    };
  }

  if (!apiKey || apiKey.trim().length < 8) {
    return {
      success: false,
      error: "API key must be at least 8 characters.",
      keys: [],
    };
  }

  // Validate key (format + live test for Anthropic)
  const validationError = await validateProviderKey(provider, apiKey.trim());
  if (validationError) {
    return { success: false, error: validationError, keys: [] };
  }

  // Store encrypted key (mark as validated if Anthropic passed live check)
  const wasValidated = provider === "anthropic";
  try {
    await storeUserKey(
      provider as LLMProvider,
      apiKey.trim(),
      displayLabel || provider,
      modelDefault,
      wasValidated
    );
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to store key.",
      keys: [],
    };
  }

  // Return updated key list
  const keys = await listUserKeys();
  return { success: true, error: null, keys };
}

/**
 * Server Action: remove a stored key by ID.
 */
export async function removeKey(keyId: string): Promise<SaveKeyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated.", keys: [] };
  }

  try {
    await deleteUserKey(keyId);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete key.",
      keys: [],
    };
  }

  const keys = await listUserKeys();
  return { success: true, error: null, keys };
}
