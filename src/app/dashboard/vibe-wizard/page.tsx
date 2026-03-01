import { VibeWizard } from "@/components/VibeWizard";

export const dynamic = "force-dynamic";

export default function VibeWizardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vibe Wizard</h1>
        <p className="mt-1 text-sm text-muted">
          Quick-start wizard with curated prompt templates. Choose a template,
          customize your preferences, review and launch — or use Quick Start to
          skip straight to building.
        </p>
      </div>

      <VibeWizard />
    </div>
  );
}
