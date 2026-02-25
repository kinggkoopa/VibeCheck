"use client";

import { useState, useTransition } from "react";
import {
  autoIterate,
  type AutoIterateResult,
  type IterationStep,
  type IterationPhase,
} from "@/features/iterate/actions";
import { ShipButton } from "@/components/ShipButton";

// ── Phase display config ──

const PHASE_CONFIG: Record<
  IterationPhase,
  { label: string; color: string; icon: string }
> = {
  critique: { label: "Critique", color: "text-red-400", icon: "1" },
  "test-gen": { label: "Test Generation", color: "text-blue-400", icon: "2" },
  preview: { label: "Preview", color: "text-green-400", icon: "3" },
  "vibe-check": { label: "Vibe Check", color: "text-purple-400", icon: "4" },
  refine: { label: "Refine", color: "text-yellow-400", icon: "5" },
  complete: { label: "Complete", color: "text-success", icon: "\u2713" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "bg-success/20 text-success";
  if (score >= 50) return "bg-warning/20 text-warning";
  return "bg-danger/20 text-danger";
}

export function AutoIterate() {
  const [code, setCode] = useState("");
  const [maxIter, setMaxIter] = useState(3);
  const [result, setResult] = useState<AutoIterateResult | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [showFinalCode, setShowFinalCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setResult(null);
    setExpandedPhase(null);
    setShowFinalCode(false);

    startTransition(async () => {
      const res = await autoIterate(code, maxIter);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error);
      }
    });
  }

  function togglePhase(key: string) {
    setExpandedPhase((prev) => (prev === key ? null : key));
  }

  return (
    <div className="space-y-6">
      {/* ── Code Input ── */}
      <form onSubmit={handleRun} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Code to Iterate On
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={10}
            placeholder="Paste your code here. The system will critique it, generate tests, preview improvements, run a vibe check, and refine automatically..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Max Iterations
            </label>
            <select
              value={maxIter}
              onChange={(e) => setMaxIter(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
            >
              <option value={1}>1 pass</option>
              <option value={2}>2 passes</option>
              <option value={3}>3 passes (max)</option>
            </select>
          </div>

          <div className="flex-1" />

          <button
            type="submit"
            disabled={pending || !code.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Iterating..." : "Start Auto-Iteration"}
          </button>
        </div>
      </form>

      {/* ── Loading Progress ── */}
      {pending && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Running iteration loop...</h2>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-sm text-muted">
              critique → test-gen → preview → vibe-check → refine (up to{" "}
              {maxIter} loops)
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div className="h-full animate-pulse rounded-full bg-primary/50 transition-all" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-4">
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(result.finalVibeScore)}`}
              >
                Vibe: {result.finalVibeScore}/100
              </span>
              <span className="text-sm text-muted">
                {result.totalIterations} iteration
                {result.totalIterations !== 1 ? "s" : ""}
              </span>
              {result.provider && (
                <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">
                  via {result.provider}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowFinalCode((v) => !v)}
              className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
            >
              {showFinalCode ? "Hide Final Code" : "Show Final Code"}
            </button>
          </div>

          {/* Final code */}
          {showFinalCode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Final Code</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(result.finalCode)
                    }
                    className="text-xs text-primary-light hover:underline"
                  >
                    Copy
                  </button>
                  <ShipButton
                    code={result.finalCode}
                    title={`Auto-iterated code (vibe: ${result.finalVibeScore}/100)`}
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-surface p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {result.finalCode}
                </pre>
              </div>
            </div>
          )}

          {/* Iteration steps */}
          {result.steps.map((step) => (
            <IterationStepCard
              key={step.iteration}
              step={step}
              expandedPhase={expandedPhase}
              onToggle={togglePhase}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Iteration Step Card ──

function IterationStepCard({
  step,
  expandedPhase,
  onToggle,
}: {
  step: IterationStep;
  expandedPhase: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold">Iteration {step.iteration}</h3>
        {step.vibeScore !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(step.vibeScore)}`}
          >
            {step.vibeScore}/100
          </span>
        )}
      </div>

      <div className="space-y-1">
        {step.phases.map((phase) => {
          const config = PHASE_CONFIG[phase.phase];
          const key = `${step.iteration}-${phase.phase}`;
          const isExpanded = expandedPhase === key;

          return (
            <div key={key}>
              <button
                onClick={() => onToggle(key)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-elevated"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    phase.phase === "complete"
                      ? "bg-success/20 text-success"
                      : "bg-surface-elevated"
                  }`}
                >
                  {config.icon}
                </span>
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
                {phase.score !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(phase.score)}`}
                  >
                    {phase.score}
                  </span>
                )}
                <span className="flex-1" />
                <span className="text-xs text-muted">
                  {new Date(phase.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-muted">
                  {isExpanded ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-9 mt-1 rounded-lg border border-border bg-background p-3">
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                    {phase.output}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
