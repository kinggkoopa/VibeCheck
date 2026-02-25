import { listUserKeys } from "@/lib/crypto/keys";
import { KeyManager } from "@/features/settings/key-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const keys = await listUserKeys();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Key Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Bring Your Own Key (BYOK) — your keys are encrypted at rest with
          pgcrypto and never leave the database unencrypted.
        </p>
      </div>

      <KeyManager initialKeys={keys} />
    </div>
  );
}
