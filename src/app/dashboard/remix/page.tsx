import { RemixMode } from "@/components/RemixMode";

export const dynamic = "force-dynamic";

export default function RemixPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creative Remix</h1>
        <p className="mt-1 text-sm text-muted">
          Remix UI components with creative CSS inspiration from Jhey Tompkins
          and modern techniques. Get 3 variant options: subtle, bold, or playful.
        </p>
      </div>

      <RemixMode />
    </div>
  );
}
