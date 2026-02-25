"use client";

import { useState, useEffect } from "react";

/**
 * ReferenceSettings — Configure Jhey Tompkins CSS/HTML reference folder.
 *
 * Settings UI to:
 * - Set local folder path for downloaded CodePen demos
 * - Trigger folder scan/index
 * - View indexed snippet categories and count
 */

interface ReferenceStatus {
  configured: boolean;
  count: number;
  categories?: Record<string, number>;
  lastScanned?: string;
  folderPath?: string;
}

export function ReferenceSettings() {
  const [folderPath, setFolderPath] = useState("");
  const [status, setStatus] = useState<ReferenceStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load current status
  useEffect(() => {
    fetch("/api/reference-scan")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setStatus(data.data);
          if (data.data.folderPath) setFolderPath(data.data.folderPath);
        }
      })
      .catch(() => {});
  }, []);

  async function handleScan() {
    if (!folderPath.trim()) return;
    setScanning(true);
    setResult(null);

    try {
      const res = await fetch("/api/reference-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: folderPath.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Scan failed (${res.status})`);
      }

      setStatus({
        configured: true,
        count: data.data.count,
        categories: data.data.categories,
        lastScanned: data.data.lastScanned,
        folderPath: folderPath.trim(),
      });
      setResult({
        type: "success",
        message: `Indexed ${data.data.count} reference snippets from ${Object.keys(data.data.categories ?? {}).length} categories.`,
      });
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Scan failed",
      });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ref-folder" className="mb-1.5 block text-sm font-medium">
          Local Reference Folder
        </label>
        <p className="mb-2 text-xs text-muted">
          Path to a folder with downloaded Jhey Tompkins CodePen demos (.html, .css, .js).
          These get indexed and injected as inspiration when generating UI code.
        </p>
        <div className="flex gap-2">
          <input
            id="ref-folder"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="/path/to/codepen-examples"
          />
          <button
            onClick={handleScan}
            disabled={scanning || !folderPath.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan & Index"}
          </button>
        </div>
      </div>

      {/* Status */}
      {status?.configured && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {status.count} snippets indexed
            </span>
            {status.lastScanned && (
              <span className="text-xs text-muted">
                Last scan: {new Date(status.lastScanned).toLocaleDateString()}
              </span>
            )}
          </div>
          {status.categories && Object.keys(status.categories).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(status.categories).map(([cat, count]) => (
                <span
                  key={cat}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-light"
                >
                  {cat}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.type === "success"
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
