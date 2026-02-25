"use client";

import { useState, useRef, useCallback } from "react";

/**
 * VisionUpload — Multimodal image analysis UI.
 *
 * Drag-drop or file picker → POST to /api/vision → display analysis.
 * Supports: paste from clipboard, drag & drop, or browse.
 */
export function VisionUpload() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [prompt, setPrompt] = useState("Describe this image in detail. Identify UI components, code patterns, potential bugs, and extract any visible text.");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (file.size > 10_000_000) {
      setError("Image too large (max 10MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported");
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            return;
          }
        }
      }
    },
    [processFile]
  );

  async function handleAnalyze() {
    if (!image) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Analysis failed (${res.status})`);
      }

      setAnalysis(data.data.analysis);
      setProvider(data.data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setImage(null);
    setFileName("");
    setAnalysis(null);
    setProvider(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6" onPaste={handlePaste}>
      {/* ── Upload Zone ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : image
              ? "border-success/40 bg-success/5"
              : "border-border hover:border-muted"
        }`}
      >
        {image ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Uploaded preview"
              className="mx-auto max-h-64 rounded-lg object-contain"
            />
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted">{fileName || "Pasted image"}</span>
              <button
                onClick={handleClear}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-elevated"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto h-10 w-10 text-muted"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <div>
              <p className="text-sm font-medium">
                Drop an image here, paste from clipboard, or{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-light underline"
                >
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-muted">
                PNG, JPG, GIF, WebP — max 10MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>

      {/* ── Prompt ── */}
      <div>
        <label htmlFor="vision-prompt" className="mb-1.5 block text-sm font-medium">
          Analysis Prompt
        </label>
        <textarea
          id="vision-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
          placeholder="What should the AI analyze about this image?"
        />
      </div>

      {/* ── Analyze Button ── */}
      <button
        onClick={handleAnalyze}
        disabled={!image || loading || prompt.trim().length < 2}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          "Analyze Image"
        )}
      </button>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Result ── */}
      {analysis && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Analysis Result</h3>
            {provider && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary-light">
                via {provider}
              </span>
            )}
          </div>
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {analysis}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(analysis)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-elevated"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
