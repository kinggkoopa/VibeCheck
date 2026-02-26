"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type { GuardianReport, GuardianMessage } from "@/core/agents/math-guardian-graph";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "code-parser": { label: "Code Parser", color: "text-blue-400" },
  "math-verifier": { label: "Math Verifier", color: "text-green-400" },
  "alpha-preserver": { label: "Alpha Preserver", color: "text-yellow-400" },
  "doc-generator": { label: "Doc Generator", color: "text-purple-400" },
  "guardian-supervisor": { label: "Guardian", color: "text-primary-light" },
};

function respectScoreColor(score: number): string {
  if (score >= 7) return "text-success";
  if (score >= 4) return "text-warning";
  return "text-danger";
}

function respectScoreBg(score: number): string {
  if (score >= 7) return "bg-success/20 border-success/30";
  if (score >= 4) return "bg-warning/20 border-warning/30";
  return "bg-danger/20 border-danger/30";
}

function recommendationBadge(rec: string): { bg: string; text: string; label: string } {
  if (rec === "approve") return { bg: "bg-success/20", text: "text-success", label: "APPROVED" };
  if (rec === "caution") return { bg: "bg-warning/20", text: "text-warning", label: "CAUTION" };
  return { bg: "bg-danger/20", text: "text-danger", label: "BLOCKED" };
}

export function MathAnalyzerReport() {
  const [code, setCode] = useState("");
  const [filePaths, setFilePaths] = useState("");
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [messages, setMessages] = useState<GuardianMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "formulas" | "variables" | "verification" | "alpha">("overview");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const triggerAnalysis = useCallback(() => {
    if (code.trim() && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [code, pending]);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/math-guardian", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.trim(),
            file_paths: filePaths.split(",").map((f) => f.trim()).filter(Boolean),
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
        setError(err instanceof Error ? err.message : "Failed to run math analysis");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Code to Analyze
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={12}
            placeholder="Paste code with math/algorithms here. The Math Guardian will analyze all formulas, verify correctness, and produce a comprehension report before any edits..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            File Paths <span className="text-muted">(optional, comma-separated)</span>
          </label>
          <input
            value={filePaths}
            onChange={(e) => setFilePaths(e.target.value)}
            placeholder="e.g., src/lib/kelly.ts, src/utils/ev-calc.ts"
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
          disabled={pending || !code.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? "Analyzing math system..." : "Analyze Before Edit"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            5 agents analyzing: parsing formulas, verifying math, mapping alpha, generating docs, computing respect score...
          </p>
        )}
      </form>

      {/* Agent Activity */}
      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Guardian Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">Math Guardian scanning code...</span>
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

      {/* Guardian Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Math Guardian Report</h2>
                {/* Respect Score Badge */}
                <div className={`rounded-full border px-4 py-2 ${respectScoreBg(report.respectScore)}`}>
                  <span className={`text-2xl font-black ${respectScoreColor(report.respectScore)}`}>
                    {report.respectScore}
                  </span>
                  <span className="text-sm text-muted">/10</span>
                </div>
                {/* Recommendation Badge */}
                {(() => {
                  const badge = recommendationBadge(report.recommendation);
                  return (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
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

            {/* Summary */}
            <p className="mt-4 text-sm">{report.summary}</p>

            {report.riskAssessment && (
              <p className="mt-2 text-xs text-muted">
                <strong>Risk:</strong> {report.riskAssessment}
              </p>
            )}

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 border-b border-border">
              {(["overview", "formulas", "variables", "verification", "alpha"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Understanding Gaps */}
                  {report.understandingGaps.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-danger">Understanding Gaps</h3>
                      <ul className="space-y-1">
                        {report.understandingGaps.map((gap, i) => (
                          <li key={i} className="text-xs text-danger/80">{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Safe Edit Scope */}
                  {report.safeEditScope.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-success">Safe to Edit</h3>
                      <ul className="space-y-1">
                        {report.safeEditScope.map((scope, i) => (
                          <li key={i} className="text-xs text-success/80">{scope}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Protected Components */}
                  {report.protectedComponents.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-warning">Protected (Do Not Modify)</h3>
                      <ul className="space-y-1">
                        {report.protectedComponents.map((comp, i) => (
                          <li key={i} className="text-xs text-warning/80">{comp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conditions */}
                  {report.conditionsForEditing.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Conditions for Editing</h3>
                      <ul className="space-y-1">
                        {report.conditionsForEditing.map((cond, i) => (
                          <li key={i} className="text-xs">{cond}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Dependency Flow */}
                  {report.dependencyFlow && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Dependency Flow</h3>
                      <pre className="rounded-lg border border-border bg-surface p-3 text-xs whitespace-pre-wrap">
                        {report.dependencyFlow}
                      </pre>
                    </div>
                  )}

                  {/* Modification Guide */}
                  {report.modificationGuide && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Modification Guide</h3>
                      <p className="text-xs text-muted whitespace-pre-wrap">{report.modificationGuide}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "formulas" && (
                <div className="space-y-3">
                  {report.formulaDocs.length === 0 ? (
                    <p className="text-sm text-muted">No formulas documented.</p>
                  ) : (
                    report.formulaDocs.map((doc, i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{doc.name || doc.formulaId}</span>
                        </div>
                        <p className="mt-1 text-xs">{doc.explanation}</p>
                        <p className="mt-1 text-xs text-muted">Purpose: {doc.purpose}</p>
                        {doc.latex && (
                          <code className="mt-2 block rounded bg-surface-elevated px-2 py-1 text-xs font-mono">
                            {doc.latex}
                          </code>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "variables" && (
                <div className="space-y-2">
                  {report.variableGlossary.length === 0 ? (
                    <p className="text-sm text-muted">No variables documented.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-2 py-2 text-left font-semibold">Variable</th>
                            <th className="px-2 py-2 text-left font-semibold">Meaning</th>
                            <th className="px-2 py-2 text-left font-semibold">Valid Range</th>
                            <th className="px-2 py-2 text-left font-semibold">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.variableGlossary.map((v, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="px-2 py-1.5 font-mono font-medium">{v.name}</td>
                              <td className="px-2 py-1.5">{v.meaning}</td>
                              <td className="px-2 py-1.5 text-muted">{v.validRange}</td>
                              <td className="px-2 py-1.5 text-muted">{v.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "verification" && (
                <div className="space-y-2">
                  {report.verificationResults.length === 0 ? (
                    <p className="text-sm text-muted">No verification results.</p>
                  ) : (
                    report.verificationResults.map((ver, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 ${
                          ver.isCorrect
                            ? "border-success/30 bg-success/5"
                            : "border-danger/30 bg-danger/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${ver.isCorrect ? "text-success" : "text-danger"}`}>
                            {ver.isCorrect ? "VALID" : "ISSUE"}
                          </span>
                          <span className="text-xs font-mono">{ver.formulaId}</span>
                          <span className="text-xs text-muted">
                            ({Math.round(ver.confidence * 100)}% confidence)
                          </span>
                        </div>
                        {ver.issues.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {ver.issues.map((issue, j) => (
                              <li key={j} className="text-xs text-danger/80">{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "alpha" && (
                <div className="space-y-2">
                  {report.alphaComponents.length === 0 ? (
                    <p className="text-sm text-muted">No alpha components analyzed.</p>
                  ) : (
                    report.alphaComponents.map((comp, i) => {
                      const contribColor =
                        comp.alphaContribution === "critical"
                          ? "text-danger"
                          : comp.alphaContribution === "high"
                            ? "text-warning"
                            : "text-muted";
                      return (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium">{comp.formulaId}</span>
                            <span className={`text-xs font-bold uppercase ${contribColor}`}>
                              {comp.alphaContribution}
                            </span>
                            <span className="text-xs text-muted">
                              sensitivity: {Math.round(comp.sensitivity * 100)}%
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                comp.safeToModify
                                  ? "bg-success/20 text-success"
                                  : "bg-danger/20 text-danger"
                              }`}
                            >
                              {comp.safeToModify ? "Safe" : "Protected"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  const text = `Math Guardian Report (Respect: ${report.respectScore}/10)\n\n${report.summary}\n\nRecommendation: ${report.recommendation}\n\n${report.riskAssessment}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Report
              </button>
              {report.recommendation !== "block" && (
                <button className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/30">
                  Approve & Proceed to Edit
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
