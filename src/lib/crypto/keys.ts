import { createClient } from "@/lib/supabase/server";
import type { LLMProvider, UserLLMKey } from "@/types";

/**
 * BYOK Key Management — Server-Only Module
 *
 * All encryption/decryption happens inside PostgreSQL via pgcrypto
 * (pgp_sym_encrypt/pgp_sym_decrypt). The encryption passphrase lives
 * in Supabase Vault and never leaves the database.
 *
 * This module provides a clean TypeScript API over the Supabase RPC functions.
 *
 * SECURITY INVARIANTS:
 *  - This file must NEVER be imported from client components
 *  - Decrypted keys are held in memory only for the duration of an LLM call
 *  - No key material is ever logged, serialized, or stored outside pgcrypto
 */

/** Store (or update) a user's API key for a provider. */
export async function storeUserKey(
  provider: LLMProvider,
  apiKey: string,
  displayLabel?: string,
  modelDefault?: string
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("store_user_key", {
    p_provider: provider,
    p_api_key: apiKey,
    p_display_label: displayLabel ?? "",
    p_model_default: modelDefault ?? null,
  });

  if (error) throw new Error(`Failed to store key: ${error.message}`);
  return data as string;
}

/** Retrieve a decrypted API key for the current user + provider. Server-only. */
export async function getDecryptedKey(
  provider: LLMProvider
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_decrypted_key", {
    p_provider: provider,
  });

  if (error) throw new Error(`Failed to decrypt key: ${error.message}`);
  return data as string | null;
}

/** List all key metadata for the current user (never returns raw keys). */
export async function listUserKeys(): Promise<UserLLMKey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_user_keys");

  if (error) throw new Error(`Failed to list keys: ${error.message}`);
  return (data ?? []) as UserLLMKey[];
}

/** Delete a specific key by ID. */
export async function deleteUserKey(keyId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_llm_keys")
    .delete()
    .eq("id", keyId);

  if (error) throw new Error(`Failed to delete key: ${error.message}`);
}

/** Toggle a key's active status. */
export async function toggleUserKey(
  keyId: string,
  isActive: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_llm_keys")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", keyId);

  if (error) throw new Error(`Failed to toggle key: ${error.message}`);
}
