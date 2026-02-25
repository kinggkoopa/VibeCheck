"use client";

import { useState } from "react";

/**
 * FullShipButton — End-to-end "Ship This" automation.
 *
 * After successful iteration → create branch, commit, push, open PR,
 * optionally auto-merge and deploy.
 */

interface FullShipButtonProps {
  code: string;
  title: string;
  description?: string;
}

export function FullShipButton({ code, title, description }: FullShipButtonProps) {
  const [shipping, setShipping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoMerge, setAutoMerge] = useState(false);
  const [deploy, setDeploy] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    prUrl?: string;
  } | null>(null);

  async function handleShip() {
    setShipping(true);
    setResult(null);

    try {
      const res = await fetch("/api/github-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, title, description, autoMerge, deploy }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Ship failed (${res.status})`);
      }

      setResult({
        type: "success",
        message: `PR #${data.data.pr_number} created${data.data.auto_merged ? " and merged" : ""}!`,
        prUrl: data.data.pr_url,
      });
      setShowConfirm(false);
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Ship failed",
      });
    } finally {
      setShipping(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowConfirm(!showConfirm)}
        disabled={shipping || !code}
        className="flex items-center gap-1.5 rounded-lg bg-success/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-success disabled:opacity-50"
      >
        {shipping ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Shipping...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
            Full Ship
          </>
        )}
      </button>

      {/* Confirm dropdown */}
      {showConfirm && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-background p-4 shadow-lg">
          <h4 className="text-sm font-semibold">Ship Configuration</h4>
          <p className="mt-1 text-xs text-muted">
            Creates a Git branch, commits code, pushes, and opens a PR.
          </p>

          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoMerge}
                onChange={(e) => setAutoMerge(e.target.checked)}
                className="rounded border-border"
              />
              Auto-merge PR (squash)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={deploy}
                onChange={(e) => setDeploy(e.target.checked)}
                className="rounded border-border"
              />
              Trigger deploy after merge
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleShip}
              disabled={shipping}
              className="flex-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-success/80 disabled:opacity-50"
            >
              {shipping ? "Shipping..." : "Confirm Ship"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-elevated"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border p-3 ${
            result.type === "success"
              ? "border-success/30 bg-success/5"
              : "border-danger/30 bg-danger/5"
          }`}
        >
          <p className={`text-xs font-medium ${result.type === "success" ? "text-success" : "text-danger"}`}>
            {result.message}
          </p>
          {result.prUrl && (
            <a
              href={result.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-xs text-primary-light hover:underline"
            >
              View PR on GitHub
            </a>
          )}
        </div>
      )}
    </div>
  );
}
