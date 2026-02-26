"use client";

import { useState, useTransition } from "react";
import { InlineDiff } from "@/components/InlineDiff";
import type { Change, FusedResult } from "@/lib/opus-bridge";

// ── Model options ──

const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "claude-opus-4-20250514", label: "Claude Opus (default)" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet" },
  { value: "custom", label: "Custom" },
];

// ── Change type badge config ──

const CHANGE_TYPE_STYLE: Record<
  Change["type"],
  { bg: string; text: string; label: string }
> = {
  improvement: {
    bg: "bg-success/10 border-success/30",
    text: "text-success",
    label: "Improvement",
  },
  fix: {
    bg: "bg-danger/10 border-danger/30",
    text: "text-danger",
    label: "Fix",
  },
  refactor: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-400",
    label: "Refactor",
  },
};

// ── Handoff steps ──

type HandoffStep = "building" | "sending" | "fusing";

const STEP_CONFIG: Record<
  HandoffStep,
  { label: string; description: string }
> = {
  building: {
    label: "Building context",
    description: "Packaging swarm output and context for Opus...",
  },
  sending: {
    label: "Sending to Opus",
    description: "Opus is reviewing the swarm output with deeper reasoning...",
  },
  fusing: {
    label: "Fusing results",
    description: "Merging swarm and Opus outputs into final result...",
  },
};

const STEP_ORDER: HandoffStep[] = ["building", "sending", "fusing"];

// ── API response type ──

interface HandoffApiResponse {
  success: boolean;
  result?: FusedResult;
  swarmCode?: string;
  error?: string;
}

// ── Component ──

interface OpusHandoffProps {
  /** Pre-filled swarm output (e.g. coming from another agent page) */
  initialSwarmOutput?: string;
}

export function OpusHandoff({ initialSwarmOutput = "" }: OpusHandoffProps) {
  // ── Input state ──
  const [swarmOutput, setSwarmOutput] = useState(initialSwarmOutput);
  const [additionalContext, setAdditionalContext] = useState("");
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [customModel, setCustomModel] = useState("");

  // ── Processing state ──
  const [currentStep, setCurrentStep] = useState<HandoffStep | null>(null);
  const [pending, startTransition] = useTransition();

  // ── Results state ──
  const [result, setResult] = useState<FusedResult | null>(null);
  const [swarmCode, setSwarmCode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // ── Resolve the actual model identifier ──
  const resolvedModel = model === "custom" ? customModel : model;

  // ── Handlers ──

  function handleHandoff(e: React.FormEvent) {
    e.preventDefault();
    if (!swarmOutput.trim()) return;

    setError(null);
    setResult(null);
    setSwarmCode(null);
    setShowModal(false);
    setCopied(null);

    startTransition(async () => {
      try {
        // Step 1: Building context
        setCurrentStep("building");

        // Step 2: Sending to Opus
        setCurrentStep("sending");

        const res = await fetch("/api/agents/opus-handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swarmOutput: swarmOutput.trim(),
            additionalContext: additionalContext.trim() || undefined,
            model: resolvedModel,
          }),
        });

        // Step 3: Fusing results
        setCurrentStep("fusing");

        const data: HandoffApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error ?? `Handoff failed (${res.status}).`);
          setCurrentStep(null);
          return;
        }

        if (data.result) {
          setResult(data.result);
          setSwarmCode(data.swarmCode ?? swarmOutput);
          setShowModal(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Network error during handoff."
        );
      } finally {
        setCurrentStep(null);
      }
    });
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleApplyFused() {
    if (!result) return;
    handleCopy(result.fusedCode, "fused");
  }

  function handleCopyReport() {
    if (!result) return;
    const report = [
      `Opus Handoff Report`,
      `Confidence: ${Math.round(result.confidence * 100)}%`,
      ``,
      `## Summary`,
      result.summary,
      ``,
      `## Changes (${result.changes.length})`,
      ...result.changes.map(
        (c, i) =>
          `${i + 1}. [${c.type.toUpperCase()}] ${c.location}: ${c.description} (source: ${c.source})`
      ),
      ``,
      `## Fused Code`,
      "```",
      result.fusedCode,
      "```",
    ].join("\n");
    handleCopy(report, "report");
  }

  function confidenceColor(confidence: number): string {
    const pct = confidence * 100;
    if (pct >= 80) return "bg-success/20 text-success";
    if (pct >= 50) return "bg-warning/20 text-warning";
    return "bg-danger/20 text-danger";
  }

  return (
    <div className="space-y-6">
      {/* ── Input Section ── */}
      <form onSubmit={handleHandoff} className="space-y-4">
        {/* Swarm Output */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Swarm Output
          </label>
          <textarea
            value={swarmOutput}
            onChange={(e) => setSwarmOutput(e.target.value)}
            required
            rows={10}
            placeholder="Paste the MetaVibeCoder swarm output here. This includes the combined analysis and code from all specialist agents (Architect, Security, UX, Performance)..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Additional Context */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Additional Context{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={4}
            placeholder="Add any extra requirements, constraints, or preferences for Opus to consider during its review..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Model Selector */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {model === "custom" && (
            <div>
              <label className="mb-1 block text-xs font-medium">
                Custom Model ID
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. claude-opus-4-20250514"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={
              pending ||
              !swarmOutput.trim() ||
              (model === "custom" && !customModel.trim())
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Handing off..." : "Handoff to Opus"}
          </button>
          {pending && currentStep && (
            <p className="text-xs text-muted">
              {STEP_CONFIG[currentStep].description}
            </p>
          )}
        </div>
      </form>

      {/* ── Processing Progress ── */}
      {pending && currentStep && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Handoff in Progress</h2>
          <div className="space-y-2">
            {STEP_ORDER.map((step) => {
              const config = STEP_CONFIG[step];
              const stepIdx = STEP_ORDER.indexOf(step);
              const currentIdx = STEP_ORDER.indexOf(currentStep);
              const isComplete = stepIdx < currentIdx;
              const isActive = step === currentStep;

              return (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  {isComplete ? (
                    <div className="h-2 w-2 rounded-full bg-success" />
                  ) : isActive ? (
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-surface-elevated" />
                  )}
                  <span
                    className={`text-sm ${
                      isActive
                        ? "font-medium text-foreground"
                        : isComplete
                          ? "text-success"
                          : "text-muted"
                    }`}
                  >
                    {config.label}
                  </span>
                  {isActive && (
                    <span className="text-xs text-muted">
                      {config.description}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full animate-pulse rounded-full bg-primary/50 transition-all"
              style={{
                width: `${((STEP_ORDER.indexOf(currentStep) + 1) / STEP_ORDER.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Results Modal ── */}
      {showModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Opus Handoff Results</h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${confidenceColor(result.confidence)}`}
                >
                  {Math.round(result.confidence * 100)}% confidence
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Summary */}
            <p className="mt-4 text-sm">{result.summary}</p>

            {/* Side-by-side diff */}
            <div className="mt-6">
              <h3 className="mb-3 font-semibold">
                Swarm Output vs Opus Enhanced
              </h3>
              <InlineDiff
                original={swarmCode ?? swarmOutput}
                modified={result.fusedCode}
              />
            </div>

            {/* Changes list */}
            {result.changes.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold">
                  Changes ({result.changes.length})
                </h3>
                {result.changes.map((change, i) => {
                  const style = CHANGE_TYPE_STYLE[change.type];
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${style.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${style.text}`}
                        >
                          {style.label}
                        </span>
                        <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                          {change.source}
                        </span>
                        {change.location !== "general" && (
                          <span className="font-mono text-xs text-primary-light">
                            {change.location}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{change.description}</p>
                      {change.reason !== change.description && (
                        <p className="mt-1 text-xs text-muted">
                          Reason: {change.reason.slice(0, 300)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3 border-t border-border pt-4">
              <button
                onClick={handleApplyFused}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                {copied === "fused" ? "Copied!" : "Apply Fused Result"}
              </button>
              <button
                onClick={handleCopyReport}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                {copied === "report" ? "Copied!" : "Copy Full Report"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
