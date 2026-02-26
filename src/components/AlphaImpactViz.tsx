"use client";

import { useState, useTransition, useRef } from "react";
import type { AlphaSimReport, AlphaSimMessage } from "@/core/agents/alpha-sim-graph";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "system-mapper": { label: "System Mapper", color: "text-blue-400" },
  "impact-forecaster": { label: "Impact Forecaster", color: "text-yellow-400" },
  "safe-editor": { label: "Safe Editor", color: "text-green-400" },
  "restore-creator": { label: "Restore Creator", color: "text-purple-400" },
  "alpha-supervisor": { label: "Alpha Supervisor", color: "text-primary-light" },
};

function guaranteeBadge(guarantee: string): { bg: string; text: string; label: string } {
  switch (guarantee) {
    case "guaranteed":
      return { bg: "bg-success/20 border-success/30", text: "text-success", label: "GUARANTEED" };
    case "conditional":
      return { bg: "bg-warning/20 border-warning/30", text: "text-warning", label: "CONDITIONAL" };
    case "at_risk":
      return { bg: "bg-orange-500/20 border-orange-500/30", text: "text-orange-400", label: "AT RISK" };
    default:
      return { bg: "bg-danger/20 border-danger/30", text: "text-danger", label: "VIOLATED" };
  }
}

function goNogoBadge(decision: string): { bg: string; text: string } {
  if (decision === "go") return { bg: "bg-success/20", text: "text-success" };
  if (decision === "conditional-go") return { bg: "bg-warning/20", text: "text-warning" };
  return { bg: "bg-danger/20", text: "text-danger" };
}

function riskColor(risk: string): string {
  if (risk === "minimal" || risk === "low") return "text-success";
  if (risk === "medium") return "text-warning";
  return "text-danger";
}

export function AlphaImpactViz() {
  const [originalCode, setOriginalCode] = useState("");
  const [proposedChanges, setProposedChanges] = useState("");
  const [report, setReport] = useState<AlphaSimReport | null>(null);
  const [messages, setMessages] = useState<AlphaSimMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "system" | "changes" | "restore">("overview");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!originalCode.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/alpha-sim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_code: originalCode.trim(),
            proposed_changes: proposedChanges.trim() || undefined,
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
        setError(err instanceof Error ? err.message : "Failed to run alpha simulation");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleSimulate} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Original Algorithm Code
          </label>
          <textarea
            value={originalCode}
            onChange={(e) => setOriginalCode(e.target.value)}
            required
            rows={10}
            placeholder="Paste the original algorithm/math code here. The Alpha Simulator will map dependencies, forecast impact, and ensure alpha preservation..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Proposed Changes <span className="text-muted">(optional)</span>
          </label>
          <textarea
            value={proposedChanges}
            onChange={(e) => setProposedChanges(e.target.value)}
            rows={4}
            placeholder='Describe changes you want to make, e.g., "Refactor the Kelly criterion calculation to use half-Kelly" or "Optimize the EV calculation for better precision"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !originalCode.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? "Simulating alpha impact..." : "Simulate & Preserve Alpha"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            5 agents working: mapping system, forecasting impact, proposing safe edits, creating restore points, validating preservation...
          </p>
        )}
      </form>

      {/* Agent Activity */}
      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Simulation Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">Alpha Simulator mapping algorithm...</span>
              </div>
            )}
            {messages.map((msg, i) => {
              const config = AGENT_CONFIG[msg.agent] ?? { label: msg.agent, color: "text-muted" };
              return (
                <div key={i} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${config.color}`}>
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

      {/* Simulation Report */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Alpha Impact Report</h2>
                {/* Preservation Guarantee Badge */}
                {(() => {
                  const badge = guaranteeBadge(report.preservationGuarantee);
                  return (
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  );
                })()}
                {/* Go/No-Go */}
                {(() => {
                  const badge = goNogoBadge(report.goNogo);
                  return (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${badge.bg} ${badge.text}`}>
                      {report.goNogo}
                    </span>
                  );
                })()}
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated"
              >
                Close
              </button>
            </div>

            {/* Alpha Change Indicator */}
            <div className="mt-4 flex items-center gap-4">
              <div className={`rounded-lg border p-3 ${
                report.alphaChangePct >= 0
                  ? "border-success/30 bg-success/5"
                  : "border-danger/30 bg-danger/5"
              }`}>
                <span className="text-xs text-muted">Alpha Change</span>
                <div className={`text-2xl font-bold ${
                  report.alphaChangePct >= 0 ? "text-success" : "text-danger"
                }`}>
                  {report.alphaChangePct >= 0 ? "+" : ""}{report.alphaChangePct}%
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <span className="text-xs text-muted">Expected Degradation</span>
                <div className={`text-2xl font-bold ${
                  report.impactForecast.expectedDegradationPct <= 2
                    ? "text-success"
                    : report.impactForecast.expectedDegradationPct <= 10
                      ? "text-warning"
                      : "text-danger"
                }`}>
                  {report.impactForecast.expectedDegradationPct}%
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <span className="text-xs text-muted">Statistically Significant</span>
                <div className={`text-lg font-bold ${
                  report.impactForecast.isSignificant ? "text-danger" : "text-success"
                }`}>
                  {report.impactForecast.isSignificant ? "Yes" : "No"}
                </div>
              </div>
            </div>

            {/* Verdict */}
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm">{report.verdict}</p>
            </div>

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 border-b border-border">
              {(["overview", "system", "changes", "restore"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab === "system" ? "System Map" : tab === "changes" ? "Safe Changes" : tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Key Findings */}
                  {report.keyFindings.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Key Findings</h3>
                      <ul className="space-y-1">
                        {report.keyFindings.map((finding, i) => (
                          <li key={i} className="text-xs">{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conditions */}
                  {report.conditions.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-warning">Conditions for Proceeding</h3>
                      <ul className="space-y-1">
                        {report.conditions.map((cond, i) => (
                          <li key={i} className="text-xs text-warning/80">{cond}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Monitoring Plan */}
                  {report.monitoringPlan.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Post-Edit Monitoring</h3>
                      <ul className="space-y-1">
                        {report.monitoringPlan.map((item, i) => (
                          <li key={i} className="text-xs text-muted">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Worst Case */}
                  {report.impactForecast.worstCase && (
                    <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
                      <h3 className="text-xs font-semibold text-danger">Worst-Case Scenario</h3>
                      <p className="mt-1 text-xs">{report.impactForecast.worstCase}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "system" && (
                <div className="space-y-4">
                  {/* Data Flow */}
                  {report.systemMap.dataFlow && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Data Flow</h3>
                      <pre className="rounded-lg border border-border bg-surface p-3 text-xs whitespace-pre-wrap">
                        {report.systemMap.dataFlow}
                      </pre>
                    </div>
                  )}

                  {/* Components */}
                  {report.systemMap.components.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Algorithm Components</h3>
                      <div className="space-y-2">
                        {report.systemMap.components.map((comp, i) => {
                          const isCritical = report.systemMap.criticalNodes.includes(comp.id);
                          return (
                            <div
                              key={i}
                              className={`rounded-lg border p-2 ${
                                isCritical
                                  ? "border-danger/30 bg-danger/5"
                                  : "border-border bg-surface"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium">{comp.label}</span>
                                <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                  {comp.type}
                                </span>
                                {isCritical && (
                                  <span className="rounded bg-danger/20 px-1.5 py-0.5 text-xs text-danger">
                                    CRITICAL
                                  </span>
                                )}
                              </div>
                              {comp.dependencies.length > 0 && (
                                <p className="mt-1 text-xs text-muted">
                                  Depends on: {comp.dependencies.join(", ")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "changes" && (
                <div className="space-y-3">
                  {report.proposedChanges.length === 0 ? (
                    <p className="text-sm text-muted">No specific changes proposed.</p>
                  ) : (
                    report.proposedChanges.map((change, i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary-light">
                            {change.changeType}
                          </span>
                          <span className={`text-xs font-bold ${riskColor(change.riskLevel)}`}>
                            {change.riskLevel} risk
                          </span>
                          <span className="text-xs text-muted">{change.target}</span>
                        </div>
                        <p className="mt-1 text-sm">{change.description}</p>
                        <p className="mt-1 text-xs text-muted">
                          Alpha impact: {change.alphaImpact}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "restore" && (
                <div className="space-y-4">
                  {/* Metrics Baseline */}
                  {report.restoreStrategy.metricsBaseline.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Metrics Baseline</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-2 py-2 text-left font-semibold">Metric</th>
                              <th className="px-2 py-2 text-left font-semibold">Current Value</th>
                              <th className="px-2 py-2 text-left font-semibold">Acceptable Threshold</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.restoreStrategy.metricsBaseline.map((m, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-2 py-1.5 font-medium">{m.metric}</td>
                                <td className="px-2 py-1.5">{m.value}</td>
                                <td className="px-2 py-1.5 text-muted">{m.threshold}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Rollback Procedure */}
                  {report.restoreStrategy.rollbackProcedure.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Rollback Procedure</h3>
                      <ol className="space-y-1">
                        {report.restoreStrategy.rollbackProcedure.map((step, i) => (
                          <li key={i} className="flex gap-2 text-xs">
                            <span className="font-bold text-muted">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  const text = `Alpha Impact Report\n\nPreservation: ${report.preservationGuarantee}\nAlpha Change: ${report.alphaChangePct}%\nDecision: ${report.goNogo}\n\n${report.verdict}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Report
              </button>
              {report.goNogo !== "no-go" && (
                <button className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/30">
                  Accept & Apply Changes
                </button>
              )}
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
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
