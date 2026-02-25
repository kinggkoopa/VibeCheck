"use client";

import { useState, useTransition } from "react";
import {
  optimizePrompt,
  saveToLibrary,
  loadLibrary,
  bumpLibraryUsage,
  deleteLibraryEntry,
} from "@/features/optimizer/actions";
import type { OptimizationStrategy, PromptLibraryEntry } from "@/types";

// ── Strategy config ──

const STRATEGIES: {
  value: OptimizationStrategy;
  label: string;
  desc: string;
}[] = [
  {
    value: "best-practice",
    label: "Best Practice",
    desc: "All techniques combined — role, CoT, few-shot, constraints",
  },
  {
    value: "chain-of-thought",
    label: "Chain of Thought",
    desc: "Add step-by-step reasoning structure",
  },
  {
    value: "few-shot",
    label: "Few-Shot",
    desc: "Add concrete input/output examples",
  },
  {
    value: "clarity",
    label: "Clarity",
    desc: "Remove ambiguity, sharpen intent",
  },
  {
    value: "specificity",
    label: "Specificity",
    desc: "Add constraints and context",
  },
  {
    value: "role-based",
    label: "Role-Based",
    desc: "Add expert persona framing",
  },
];

interface PromptOptimizerProps {
  initialLibrary: PromptLibraryEntry[];
}

export function PromptOptimizer({ initialLibrary }: PromptOptimizerProps) {
  // ── Optimizer state ──
  const [rawPrompt, setRawPrompt] = useState("");
  const [strategy, setStrategy] = useState<OptimizationStrategy>("best-practice");
  const [result, setResult] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ── Library state ──
  const [library, setLibrary] = useState<PromptLibraryEntry[]>(initialLibrary);
  const [showLibrary, setShowLibrary] = useState(initialLibrary.length > 0);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  function clearFeedback() {
    setError(null);
    setSuccess(null);
  }

  // ── Optimize ──
  function handleOptimize(e: React.FormEvent) {
    e.preventDefault();
    if (!rawPrompt.trim()) return;
    clearFeedback();
    setResult(null);
    setShowSaveForm(false);

    startTransition(async () => {
      const res = await optimizePrompt(rawPrompt.trim(), strategy);
      if (res.success && res.optimizedPrompt) {
        setResult(res.optimizedPrompt);
        setUsedProvider(res.provider);
      } else {
        setError(res.error);
      }
    });
  }

  // ── Save to library ──
  function handleSaveToLibrary() {
    if (!saveTitle.trim() || !result) return;
    clearFeedback();

    const tags = saveTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await saveToLibrary(saveTitle.trim(), result, tags);
      if (res.success) {
        setLibrary(res.entries);
        setShowSaveForm(false);
        setSaveTitle("");
        setSaveTags("");
        setShowLibrary(true);
        setSuccess("Saved to library.");
      } else {
        setError(res.error);
      }
    });
  }

  // ── Use a library prompt ──
  function handleUseLibraryEntry(entry: PromptLibraryEntry) {
    setRawPrompt(entry.content);
    clearFeedback();
    setResult(null);

    startTransition(async () => {
      await bumpLibraryUsage(entry.id);
      // Refresh library to update usage count
      const res = await loadLibrary();
      if (res.success) setLibrary(res.entries);
    });
  }

  // ── Delete from library ──
  function handleDeleteEntry(entryId: string) {
    clearFeedback();

    startTransition(async () => {
      const res = await deleteLibraryEntry(entryId);
      if (res.success) {
        setLibrary(res.entries);
      } else {
        setError(res.error);
      }
    });
  }

  // ── Copy ──
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard.");
    setTimeout(() => setSuccess(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* ── Optimizer Form ── */}
      <form onSubmit={handleOptimize} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Your Raw Idea / Prompt
          </label>
          <textarea
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            required
            rows={5}
            placeholder="Describe what you want the AI to do. Can be rough, vague, or just a seed idea — the optimizer will refine it into a production-grade prompt..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Optimization Strategy
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStrategy(s.value)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  strategy === s.value
                    ? "border-primary bg-primary/10 text-primary-light"
                    : "border-border hover:bg-surface-elevated"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="mt-0.5 text-xs text-muted">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || !rawPrompt.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? "Optimizing with your key..." : "Optimize Prompt"}
        </button>
      </form>

      {/* ── Feedback ── */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Optimized Prompt</h2>
            {usedProvider && (
              <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">
                via {usedProvider}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {result}
            </pre>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleCopy(result)}
              className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
            >
              Copy
            </button>
            <button
              onClick={() => setShowSaveForm(true)}
              disabled={showSaveForm}
              className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface disabled:opacity-50"
            >
              Save to Library
            </button>
            <button
              onClick={() => {
                setRawPrompt(result);
                setResult(null);
              }}
              className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
            >
              Re-optimize
            </button>
          </div>

          {/* ── Save form ── */}
          {showSaveForm && (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Title</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g. Code Review System Prompt"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="e.g. code-review, system-prompt"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveToLibrary}
                  disabled={pending || !saveTitle.trim()}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="rounded px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Prompt Library ── */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Prompt Library</h2>
          <button
            onClick={() => setShowLibrary((v) => !v)}
            className="text-xs text-muted hover:text-foreground"
          >
            {showLibrary ? "Hide" : `Show (${library.length})`}
          </button>
        </div>

        {showLibrary && (
          <div className="mt-3 space-y-2">
            {library.length === 0 ? (
              <p className="text-sm text-muted">
                No saved prompts yet. Optimize a prompt and save it to build
                your library.
              </p>
            ) : (
              library.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {entry.title}
                        </span>
                        <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                          {entry.usage_count} uses
                        </span>
                      </div>
                      {entry.tags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary-light"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 line-clamp-3 text-xs text-muted font-mono">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleUseLibraryEntry(entry)}
                      className="rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-light hover:bg-primary/20"
                    >
                      Use as Input
                    </button>
                    <button
                      onClick={() => handleCopy(entry.content)}
                      className="rounded px-2.5 py-1 text-xs text-muted hover:text-foreground"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="rounded px-2.5 py-1 text-xs text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
