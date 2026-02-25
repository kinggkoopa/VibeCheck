import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS.
 *
 * SECURITY CONSTRAINTS:
 * - NEVER import this from client components or browser-side code.
 * - Use ONLY for operations that absolutely require elevated access.
 * - The `import "server-only"` directive above enforces this at build time.
 * - Never pass this client to user-facing functions.
 * - Audit all callers when modifying this file.
 *
 * Approved use cases:
 * - Admin-level analytics aggregation
 * - Background job processing
 * - System migrations
 *
 * For user-scoped operations, ALWAYS use the regular `createClient()` from
 * `@/lib/supabase/server` which respects RLS policies.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars"
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
