"use client";

import { useState } from "react";

interface ShipButtonProps {
  /** The code to ship. */
  code: string;
  /** Suggested filename (e.g. "src/utils/helper.ts"). */
  filename?: string;
  /** Title for the PR (e.g. "Add helper utility"). */
  title?: string;
  /** Optional critique notes to include in the PR body. */
  critiqueNotes?: string;
}

/**
 * ShipButton — One-click GitHub shipping.
 *
 * After iteration/critique, click "Ship This" to:
 * 1. Create a new branch on the user's GitHub repo
 * 2. Commit the generated code
 * 3. Open a PR with auto-description + critique notes
 *
 * Requires GitHub PAT configured in Settings → Integrations.
 */
export function ShipButton({
  code,
  filename: defaultFilename,
  title: defaultTitle,
  critiqueNotes,
}: ShipButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [repo, setRepo] = useState("");
  const [filename, setFilename] = useState(defaultFilename ?? "");
  const [title, setTitle] = useState(defaultTitle ?? "Generated code from MetaVibeCoder");
  const [baseBranch, setBaseBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pr_url: string; branch: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleShip() {
    if (!repo.trim() || !filename.trim() || !title.trim()) return;

    // Client-side validation
    const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    if (!REPO_REGEX.test(repo.trim())) {
      setError("Repository must be in format 'owner/repo'");
      return;
    }
    if (filename.includes("..")) {
      setError("Filename must not contain '..'");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/github-ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: repo.trim(),
          code,
          filename: filename.trim(),
          title: title.trim(),
          base_branch: baseBranch.trim() || "main",
          critique_notes: critiqueNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.data) {
        setResult(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ship failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──
  if (result) {
    return (
      <div className="inline-flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
        <span className="text-sm text-success font-medium">Shipped!</span>
        <a
          href={result.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-light hover:underline"
        >
          View PR
        </a>
        <span className="text-xs text-muted">on {result.branch}</span>
        <button
          onClick={() => {
            setResult(null);
            setShowForm(false);
          }}
          className="text-xs text-muted hover:text-foreground"
        >
          Done
        </button>
      </div>
    );
  }

  // ── Collapsed button ──
  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20"
      >
        Ship This
      </button>
    );
  }

  // ── Ship form ──
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ship to GitHub</h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Repository</label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Filename</label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="src/utils/helper.ts"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">PR Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Base Branch</label>
        <input
          type="text"
          value={baseBranch}
          onChange={(e) => setBaseBranch(e.target.value)}
          placeholder="main"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      <button
        onClick={handleShip}
        disabled={loading || !repo.trim() || !filename.trim()}
        className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/80 disabled:opacity-50"
      >
        {loading ? "Shipping..." : "Create Branch + PR"}
      </button>
    </div>
  );
}
