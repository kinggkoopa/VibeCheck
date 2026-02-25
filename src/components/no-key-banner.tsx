import Link from "next/link";
import { listUserKeys } from "@/lib/crypto/keys";

/**
 * Server Component — shows a banner if the user has no active API keys.
 * Renders nothing if keys are configured (zero layout shift).
 */
export async function NoKeyBanner() {
  let hasKeys = false;

  try {
    const keys = await listUserKeys();
    hasKeys = keys.some((k) => k.is_active);
  } catch {
    // Supabase unavailable or user not authed — don't show banner
    return null;
  }

  if (hasKeys) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/5 px-6 py-3">
      <p className="text-sm">
        <span className="font-medium text-warning">No API key configured.</span>{" "}
        <span className="text-muted">
          Add your Anthropic key in{" "}
          <Link href="/settings" className="underline hover:text-foreground">
            Settings
          </Link>{" "}
          to start using MetaVibeCoder.
        </span>
      </p>
    </div>
  );
}
