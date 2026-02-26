"use client";

import { useState, useTransition, useRef } from "react";
import type {
  BoostReport,
  BoostMessage,
  BoostChange,
} from "@/core/agents/results-booster-graph";
import type { OutputScore, Hallucination } from "@/lib/output-scorer";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "quality-scanner": { label: "Quality Scanner", color: "text-blue-400" },
  "hallucination-reducer": { label: "Hallucination Reducer", color: "text-red-400" },
  "enhancement-engine": { label: "Enhancement Engine", color: "text-green-400" },
  "boost-supervisor": { label: "Boost Supervisor", color: "text-primary-light" },
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
  error: { bg: "bg-danger/10 border-danger/30", text: "text-danger" },
  warning: { bg: "bg-warning/10 border-warning/30", text: "text-warning" },
  info: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400" },
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-success";
  if (score >= 5) return "text-warning";
  return "text-danger";
}

function scoreBadgeColor(score: number): string {
  if (score >= 8) return "bg-success/20 text-success";
  if (score >= 5) return "bg-warning/20 text-warning";
  return "bg-danger/20 text-danger";
}

function deltaColor(delta: number): string {
  if (delta > 0) return "text-success";
  if (delta < 0) return "text-danger";
  return "text-muted";
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(1)}`;
  return delta.toFixed(1);
}

const SCORE_DIMENSIONS: Array<keyof Omit<OutputScore, "overall">> = [
  "completeness",
  "correctness",
  "style",
  "security",
  "performance",
];

export function ResultsTuner() {
  const [originalCode, setOriginalCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [qualityWeight, setQualityWeight] = useState(50);
  const [securityWeight, setSecurityWeight] = useState(50);
  const [performanceWeight, setPerformanceWeight] = useState(50);
  const [report, setReport] = useState<BoostReport | null>(null);
  const [messages, setMessages] = useState<BoostMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleBoost(e: React.FormEvent) {
    e.preventDefault();
    if (!generatedCode.trim()) return;
    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);
    setCopied(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/results-booster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalCode: originalCode.trim(),
            generatedCode: generatedCode.trim(),
            weights: {
              quality: qualityWeight,
              security: securityWeight,
              performance: performanceWeight,
            },
          }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setReport(data.data.report);
          setMessages(data.data.messages ?? []);
          setShowReport(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to run Results Booster"
        );
      }
    });
  }

  function handleCopyBoostedCode() {
    if (!report?.boostedCode) return;
    navigator.clipboard.writeText(report.boostedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* ── Input Form ── */}
      <form ref={formRef} onSubmit={handleBoost} className="space-y-4">
        {/* Original Context */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Original Context{" "}
            <span className="text-xs text-muted">(optional)</span>
          </label>
          <textarea
            value={originalCode}
            onChange={(e) => setOriginalCode(e.target.value)}
            rows={4}
            placeholder="Paste the original prompt, requirements, or context that generated the code..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Generated Code */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Generated Code{" "}
            <span className="text-xs text-danger">*</span>
          </label>
          <textarea
            value={generatedCode}
            onChange={(e) => setGeneratedCode(e.target.value)}
            required
            rows={12}
            placeholder="Paste the AI-generated code you want to boost. The swarm will analyze quality, detect hallucinations, and suggest improvements..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Weight Sliders */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium">Tuning Preferences</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs text-muted">Quality Weight</label>
                <span className="text-xs font-bold">{qualityWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={qualityWeight}
                onChange={(e) => setQualityWeight(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs text-muted">Security Weight</label>
                <span className="text-xs font-bold">{securityWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={securityWeight}
                onChange={(e) => setSecurityWeight(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs text-muted">Performance Weight</label>
                <span className="text-xs font-bold">{performanceWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={performanceWeight}
                onChange={(e) => setPerformanceWeight(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending || !generatedCode.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Boosting results..." : "Boost Results"}
          </button>
          {pending && (
            <p className="text-xs text-muted">
              4 agents: scanning quality, reducing hallucinations, enhancing
              code, supervising boost... this may take 20-40s.
            </p>
          )}
        </div>
      </form>

      {/* ── Agent Activity Feed ── */}
      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Agent Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">
                  Dispatching Results Booster agents...
                </span>
              </div>
            )}
            {messages.map((msg, i) => {
              const config = AGENT_CONFIG[msg.agent] ?? {
                label: msg.agent,
                color: "text-muted",
              };
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase ${config.color}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted line-clamp-2">
                    {msg.content.slice(0, 200)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Boost Report Modal ── */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Boost Report</h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${scoreBadgeColor(report.afterScores.overall)}`}
                >
                  {report.afterScores.overall}/10
                </span>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Summary */}
            <p className="mt-3 text-sm">{report.summary}</p>

            {/* Meta */}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              <span>{report.totalImprovements} improvements</span>
              <span>{report.hallucinationsFixed} hallucinations fixed</span>
              <span>{report.changesMade.length} changes made</span>
            </div>

            {/* ── Before/After Score Comparison ── */}
            <div className="mt-5">
              <h3 className="mb-2 font-semibold">Score Comparison</h3>
              <div className="grid grid-cols-6 gap-2">
                {/* Overall first */}
                <div className="rounded-lg border border-border bg-surface p-3 text-center">
                  <div className="text-xs font-bold uppercase text-primary-light">
                    Overall
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span
                      className={`text-sm ${scoreColor(report.beforeScores.overall)}`}
                    >
                      {report.beforeScores.overall}
                    </span>
                    <span className="text-xs text-muted">&rarr;</span>
                    <span
                      className={`text-lg font-bold ${scoreColor(report.afterScores.overall)}`}
                    >
                      {report.afterScores.overall}
                    </span>
                  </div>
                  <div
                    className={`mt-0.5 text-xs font-bold ${deltaColor(report.afterScores.overall - report.beforeScores.overall)}`}
                  >
                    {formatDelta(
                      report.afterScores.overall -
                        report.beforeScores.overall
                    )}
                  </div>
                </div>

                {/* Individual dimensions */}
                {SCORE_DIMENSIONS.map((dim) => (
                  <div
                    key={dim}
                    className="rounded-lg border border-border bg-surface p-3 text-center"
                  >
                    <div className="text-xs text-muted capitalize">{dim}</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span
                        className={`text-sm ${scoreColor(report.beforeScores[dim])}`}
                      >
                        {report.beforeScores[dim]}
                      </span>
                      <span className="text-xs text-muted">&rarr;</span>
                      <span
                        className={`text-lg font-bold ${scoreColor(report.afterScores[dim])}`}
                      >
                        {report.afterScores[dim]}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-xs font-bold ${deltaColor(report.afterScores[dim] - report.beforeScores[dim])}`}
                    >
                      {formatDelta(
                        report.afterScores[dim] -
                          report.beforeScores[dim]
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Improvements Made ── */}
            {report.changesMade.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 font-semibold">
                  Improvements Made ({report.changesMade.length})
                </h3>
                <div className="space-y-2">
                  {report.changesMade.map((change: BoostChange, i: number) => {
                    const style =
                      SEVERITY_STYLE[change.severity] ?? SEVERITY_STYLE.info;
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 ${style.bg}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase ${style.text}`}
                          >
                            {change.severity}
                          </span>
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                            {change.category}
                          </span>
                          <span className="text-sm font-medium">
                            {change.title}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{change.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Hallucinations Found ── */}
            {report.hallucinations.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 font-semibold">
                  Hallucinations Detected ({report.hallucinations.length})
                </h3>
                <div className="space-y-2">
                  {report.hallucinations.map(
                    (h: Hallucination, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase text-danger">
                            {h.type}
                          </span>
                          <span
                            className={`text-xs ${
                              h.confidence === "high"
                                ? "text-danger"
                                : h.confidence === "medium"
                                  ? "text-warning"
                                  : "text-muted"
                            }`}
                          >
                            {h.confidence} confidence
                          </span>
                          <span className="text-xs text-muted">
                            Line {h.line}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-foreground">
                          {h.match}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {h.explanation}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* ── Before/After Diff View ── */}
            <div className="mt-5">
              <h3 className="mb-2 font-semibold">Code Comparison</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-danger">
                    Before
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs">
                    {generatedCode}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-success">
                    After (Boosted)
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-success/20 bg-success/5 p-3 font-mono text-xs">
                    {report.boostedCode}
                  </pre>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="mt-5 flex gap-3 border-t border-border pt-4">
              <button
                onClick={handleCopyBoostedCode}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                {copied ? "Copied!" : "Apply Boosted Code"}
              </button>
              <button
                onClick={() => {
                  const text = `Boost Report (${report.afterScores.overall}/10)\n\n${report.summary}\n\nChanges:\n${report.changesMade.map((c) => `[${c.severity.toUpperCase()}] ${c.title}: ${c.description}`).join("\n")}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Report
              </button>
              <button
                onClick={() => setShowReport(false)}
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
