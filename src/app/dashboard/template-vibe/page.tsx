import { TemplateGallery } from "@/components/TemplateGallery";

export const dynamic = "force-dynamic";

export default function TemplateVibePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Vibe</h1>
        <p className="mt-1 text-sm text-muted">
          Professional web template injection with taste-driven vibe synthesis.
          Describe your app and the swarm will detect the type, select the best
          template, blend it with your taste profile and Jhey CSS inspiration,
          add monetization sections, and score the result.
        </p>
      </div>

      <TemplateGallery />
    </div>
  );
}
