"use client";

import { useState } from "react";

/**
 * RemixMode — Creative Remix UI for MetaVibeCoder.
 *
 * "Remix UI" button → input blend query → fetches from reference folder →
 * remixes with taste profile → shows 3 variant options → generates code.
 */

interface Variant {
  name: string;
  description: string;
  hasInspiration: boolean;
}

interface Inspiration {
  filename: string;
  category: string;
  summary: string;
}

export function RemixMode() {
  const [description, setDescription] = useState("");
  const [blendWith, setBlendWith] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [inspiration, setInspiration] = useState<Inspiration | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGetVariants(surpriseMe = false) {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setVariants([]);
    setGeneratedCode(null);
    setActiveVariant(null);

    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          blendWith: blendWith.trim() || undefined,
          surpriseMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);

      setVariants(data.data.variants ?? []);
      setInspiration(data.data.inspiration ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get variants");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(variantIndex: number) {
    setGenerating(true);
    setError(null);
    setGeneratedCode(null);

    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          blendWith: blendWith.trim() || undefined,
          variantIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);

      setGeneratedCode(data.data.code);
      setActiveVariant(data.data.variant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Input ── */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-base font-semibold">Remix This UI</h3>
        <p className="mt-1 text-sm text-muted">
          Describe a UI element, blend with creative CSS inspiration, and get 3
          remix variants.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">What to remix</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder='e.g., "Card component with hover effect" or "Navigation sidebar"'
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">
              Blend with (optional)
            </label>
            <input
              value={blendWith}
              onChange={(e) => setBlendWith(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder='e.g., "Jhey 3D hover", "scroll animation", "glow effect"'
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleGetVariants(false)}
              disabled={loading || !description.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Finding inspiration..." : "Get Remix Variants"}
            </button>
            <button
              onClick={() => handleGetVariants(true)}
              disabled={loading || !description.trim()}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-elevated disabled:opacity-50"
            >
              Surprise Me
            </button>
          </div>
        </div>
      </div>

      {/* ── Inspiration ── */}
      {inspiration && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-light">
              Inspiration
            </span>
            <span className="text-sm font-medium">{inspiration.summary}</span>
          </div>
          <div className="mt-1 flex gap-2 text-xs text-muted">
            <span>File: {inspiration.filename}</span>
            <span>Category: {inspiration.category}</span>
          </div>
        </div>
      )}

      {/* ── Variants ── */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Choose a Remix Variant</h3>
          <div className="grid gap-3">
            {variants.map((variant, idx) => (
              <div
                key={variant.name}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{variant.name}</h4>
                    <p className="mt-0.5 text-xs text-muted">{variant.description}</p>
                  </div>
                  <button
                    onClick={() => handleGenerate(idx)}
                    disabled={generating}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                  >
                    {generating && activeVariant === variant.name
                      ? "Generating..."
                      : "Generate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Generated Code ── */}
      {generatedCode && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Generated Remix</h3>
              {activeVariant && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-light">
                  {activeVariant}
                </span>
              )}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(generatedCode)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-elevated"
            >
              Copy
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">{generatedCode}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
