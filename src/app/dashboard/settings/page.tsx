import { listUserKeys } from "@/lib/crypto/keys";
import { KeyManager } from "@/features/settings/key-manager";
import { SkeletonSelector } from "@/components/SkeletonSelector";
import { TasteEditor } from "@/components/TasteEditor";
import { ReferenceSettings } from "@/components/ReferenceSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const keys = await listUserKeys();

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Configure API keys, choose project templates, and manage your setup.
        </p>
      </div>

      {/* ── API Keys ── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">API Keys (BYOK)</h2>
        <p className="mb-4 text-sm text-muted">
          Your keys are encrypted at rest with pgcrypto and never leave the
          database unencrypted.
        </p>
        <KeyManager initialKeys={keys} />
      </section>

      {/* ── Taste / Vibe Profile ── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Taste / Vibe Profile</h2>
        <p className="mb-4 text-sm text-muted">
          Your coding DNA — preferences injected into every AI interaction.
          Languages, frameworks, style, tone, and personal instructions.
        </p>
        <TasteEditor />
      </section>

      {/* ── CSS/HTML Reference Library ── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">CSS Reference Library</h2>
        <p className="mb-4 text-sm text-muted">
          Point to a local folder of Jhey Tompkins CodePen demos. Snippets get
          indexed and injected as creative inspiration when generating UI code.
        </p>
        <ReferenceSettings />
      </section>

      {/* ── Project Skeleton / Bootstrap ── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Project Skeleton</h2>
        <p className="mb-4 text-sm text-muted">
          Choose a starter template for new projects. All options are free,
          open-source, and compatible with Supabase + shadcn/ui.
        </p>
        <SkeletonSelector />
      </section>
    </div>
  );
}
