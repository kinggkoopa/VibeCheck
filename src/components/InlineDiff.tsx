"use client";

import { useMemo, useState } from "react";

interface InlineDiffProps {
  original: string;
  modified: string;
  language?: string;
}

type DiffLine = {
  type: "add" | "remove" | "context";
  content: string;
  lineNum: { old?: number; new?: number };
};

/**
 * InlineDiff — Side-by-side or unified diff viewer.
 *
 * Computes a simple line-level diff and renders with color coding:
 * - Green: added lines
 * - Red: removed lines
 * - Gray: context (unchanged) lines
 */
export function InlineDiff({ original, modified }: InlineDiffProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const diffLines = useMemo(
    () => computeDiff(original, modified),
    [original, modified]
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === "add") added++;
      else if (line.type === "remove") removed++;
    }
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-success">+{stats.added}</span>
          <span className="text-danger">-{stats.removed}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("unified")}
            className={`rounded px-2 py-1 text-xs ${
              viewMode === "unified"
                ? "bg-primary/15 text-primary-light"
                : "text-muted hover:text-foreground"
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`rounded px-2 py-1 text-xs ${
              viewMode === "split"
                ? "bg-primary/15 text-primary-light"
                : "text-muted hover:text-foreground"
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff content */}
      {viewMode === "unified" ? (
        <UnifiedView lines={diffLines} />
      ) : (
        <SplitView lines={diffLines} />
      )}
    </div>
  );
}

function UnifiedView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-border bg-surface font-mono text-xs">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex ${
            line.type === "add"
              ? "bg-success/10"
              : line.type === "remove"
                ? "bg-danger/10"
                : ""
          }`}
        >
          <span className="w-10 shrink-0 select-none border-r border-border px-2 py-0.5 text-right text-muted">
            {line.lineNum.old ?? ""}
          </span>
          <span className="w-10 shrink-0 select-none border-r border-border px-2 py-0.5 text-right text-muted">
            {line.lineNum.new ?? ""}
          </span>
          <span className="w-5 shrink-0 select-none px-1 py-0.5 text-center">
            {line.type === "add" ? (
              <span className="text-success">+</span>
            ) : line.type === "remove" ? (
              <span className="text-danger">-</span>
            ) : (
              " "
            )}
          </span>
          <span className="flex-1 whitespace-pre-wrap px-2 py-0.5">
            {line.content}
          </span>
        </div>
      ))}
    </div>
  );
}

function SplitView({ lines }: { lines: DiffLine[] }) {
  const left = lines.filter((l) => l.type !== "add");
  const right = lines.filter((l) => l.type !== "remove");

  return (
    <div className="flex max-h-96 overflow-auto rounded-lg border border-border">
      {/* Old */}
      <div className="flex-1 border-r border-border bg-surface font-mono text-xs">
        {left.map((line, i) => (
          <div
            key={i}
            className={`flex ${line.type === "remove" ? "bg-danger/10" : ""}`}
          >
            <span className="w-10 shrink-0 select-none border-r border-border px-2 py-0.5 text-right text-muted">
              {line.lineNum.old ?? ""}
            </span>
            <span className="flex-1 whitespace-pre-wrap px-2 py-0.5">
              {line.content}
            </span>
          </div>
        ))}
      </div>
      {/* New */}
      <div className="flex-1 bg-surface font-mono text-xs">
        {right.map((line, i) => (
          <div
            key={i}
            className={`flex ${line.type === "add" ? "bg-success/10" : ""}`}
          >
            <span className="w-10 shrink-0 select-none border-r border-border px-2 py-0.5 text-right text-muted">
              {line.lineNum.new ?? ""}
            </span>
            <span className="flex-1 whitespace-pre-wrap px-2 py-0.5">
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple line-based diff using longest common subsequence (LCS).
 * Good enough for code diffs in a UI context.
 */
function computeDiff(original: string, modified: string): DiffLine[] {
  const oldLines = original.split("\n");
  const newLines = modified.split("\n");

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: "context",
        content: oldLines[i - 1],
        lineNum: { old: i, new: j },
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "add",
        content: newLines[j - 1],
        lineNum: { new: j },
      });
      j--;
    } else {
      result.unshift({
        type: "remove",
        content: oldLines[i - 1],
        lineNum: { old: i },
      });
      i--;
    }
  }

  return result;
}
