"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  checkClaudeCode,
  runClaudeCodeTask,
  pollClaudeCodeResult,
} from "@/features/claude-code/actions";

interface ClaudeCodeButtonProps {
  /** The task idea/description to send to Claude Code */
  idea: string;
  /** Additional context (code, critique results, etc.) */
  context?: string;
  /** Which agents to include */
  agents?: string[];
  /** Whether to include security scanning */
  useSecurityScan?: boolean;
  /** Button label override */
  label?: string;
  /** Compact mode (smaller button) */
  compact?: boolean;
}

export function ClaudeCodeButton({
  idea,
  context = "",
  agents = ["Architect", "Security", "UX", "Perf"],
  useSecurityScan = true,
  label,
  compact = false,
}: ClaudeCodeButtonProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();

  // Check if Claude Code is available on mount
  useEffect(() => {
    checkClaudeCode().then(setAvailable);
  }, []);

  // Poll for results
  const pollResults = useCallback(() => {
    if (!resultId) return;

    const interval = setInterval(async () => {
      const result = await pollClaudeCodeResult(resultId);
      if (!result) return;

      setStatus(result.status);

      if (result.status === "completed") {
        setOutput(result.output ?? result.report ?? "Task completed.");
        clearInterval(interval);
      } else if (result.status === "failed") {
        setError(result.error ?? "Task failed.");
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [resultId]);

  useEffect(() => {
    return pollResults();
  }, [pollResults]);

  function handleRun() {
    setError(null);
    setOutput(null);
    setStatus(null);
    setResultId(null);

    startTransition(async () => {
      const result = await runClaudeCodeTask({
        idea,
        context,
        agents,
        useSecurityScan,
      });

      if (result.success && result.resultId) {
        setResultId(result.resultId);
        setStatus("running");
        setShowModal(true);
      } else {
        setError(result.error ?? "Failed to start task.");
        setShowModal(true);
      }
    });
  }

  // Don't render if Claude Code is not available
  if (available === false) {
    return null;
  }

  // Loading state while checking availability
  if (available === null) {
    return null;
  }

  const buttonClass = compact
    ? "rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
    : "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50";

  return (
    <>
      <button
        onClick={handleRun}
        disabled={pending || !idea.trim()}
        className={buttonClass}
      >
        {pending
          ? "Starting..."
          : label ?? "Run in Claude Code"}
      </button>

      {/* ── Result Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Claude Code Task</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Status */}
            <div className="mt-3 flex items-center gap-2">
              {status === "running" && (
                <>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="text-sm text-muted">
                    Running in Claude Code...
                  </span>
                </>
              )}
              {status === "completed" && (
                <>
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm text-success">Completed</span>
                </>
              )}
              {status === "failed" && (
                <>
                  <div className="h-2 w-2 rounded-full bg-danger" />
                  <span className="text-sm text-danger">Failed</span>
                </>
              )}
            </div>

            {/* Task info */}
            <div className="mt-3 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium text-muted">Task</p>
              <p className="mt-1 text-sm">{idea}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {agents.map((a) => (
                  <span
                    key={a}
                    className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary-light"
                  >
                    {a}
                  </span>
                ))}
                {useSecurityScan && (
                  <span className="rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">
                    Security Scan
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
                <p className="text-sm text-danger">{error}</p>
                {!available && (
                  <p className="mt-1 text-xs text-muted">
                    Claude Code CLI not detected. The task was sent via the
                    direct API fallback instead.
                  </p>
                )}
              </div>
            )}

            {/* Output */}
            {output && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Output</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="text-xs text-primary-light hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-3">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {output}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              {status === "completed" && output && (
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
                >
                  Copy Output
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
