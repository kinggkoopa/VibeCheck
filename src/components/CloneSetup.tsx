"use client";

import { useState, useRef } from "react";

/**
 * CloneSetup — Export/import entire MetaVibeCoder setup.
 *
 * Export: Downloads a JSON file with taste profile, memories, prompts, configs.
 * Import: Upload a previously exported JSON to restore on a new machine.
 */
export function CloneSetup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    stats?: Record<string, unknown>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ──
  async function handleExport() {
    setExporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/export-setup");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Export failed (${res.status})`);
      }

      // Trigger download
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename="(.+)"/)?.[1] ??
        `metavibecoder-setup-${new Date().toISOString().split("T")[0]}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResult({
        type: "success",
        message: `Setup exported as ${filename}`,
      });
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  // ── Import ──
  async function handleImport(file: File) {
    setImporting(true);
    setResult(null);

    try {
      // Validate file size
      if (file.size > 5_000_000) {
        throw new Error("File too large (max 5MB)");
      }

      if (!file.name.endsWith(".json")) {
        throw new Error("Only .json files are supported");
      }

      const text = await file.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file");
      }

      // Validate format
      const meta = parsed._meta as Record<string, unknown> | undefined;
      if (meta?.format !== "metavibecoder-setup-v1") {
        throw new Error(
          "Invalid format. This doesn't look like a MetaVibeCoder export."
        );
      }

      const res = await fetch("/api/import-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Import failed (${res.status})`);
      }

      const data = await res.json();
      setResult({
        type: "success",
        message: data.data?.message ?? "Import completed",
        stats: data.data?.stats,
      });
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Import failed",
      });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Export Section ── */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-base font-semibold">Export Setup</h3>
        <p className="mt-1 text-sm text-muted">
          Download your entire MetaVibeCoder configuration: taste profile,
          memory vault, prompt history, and config templates. API keys are{" "}
          <strong>never</strong> included.
        </p>

        <div className="mt-4 flex items-start gap-4">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Download Setup JSON"}
          </button>
          <div className="text-xs text-muted">
            <p>Includes:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Taste profile &amp; preferences</li>
              <li>Memory vault entries (up to 500)</li>
              <li>Prompt optimization history</li>
              <li>Analytics summary</li>
              <li>.env template + CLI config</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Import Section ── */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-base font-semibold">Import Setup</h3>
        <p className="mt-1 text-sm text-muted">
          Upload a previously exported setup file to restore your configuration
          on a new machine. Memories will be re-indexed automatically.
        </p>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-elevated ${
              importing ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {importing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Setup JSON
              </>
            )}
          </label>
        </div>
      </div>

      {/* ── Result ── */}
      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.type === "success"
              ? "border-success/30 bg-success/5"
              : "border-danger/30 bg-danger/5"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              result.type === "success" ? "text-success" : "text-danger"
            }`}
          >
            {result.message}
          </p>
          {result.stats && (
            <div className="mt-2 flex gap-4 text-xs text-muted">
              {Boolean(result.stats.tasteProfile) && (
                <span>Taste profile restored</span>
              )}
              {Number(result.stats.memories) > 0 && (
                <span>{String(result.stats.memories)} memories imported</span>
              )}
              {Number(result.stats.optimizations) > 0 && (
                <span>
                  {String(result.stats.optimizations)} prompt optimizations imported
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
