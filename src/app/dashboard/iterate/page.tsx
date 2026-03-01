import { AutoIterate } from "@/components/AutoIterate";

export default function IteratePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auto-Iterate</h1>
        <p className="mt-1 text-sm text-muted">
          Paste code and let the system critique, generate tests, preview
          improvements, run a vibe check, and refine automatically — up to 3
          passes.
        </p>
      </div>

      <AutoIterate />
    </div>
  );
}
