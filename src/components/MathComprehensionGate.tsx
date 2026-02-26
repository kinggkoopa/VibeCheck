"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type {
  ComprehensionReport,
  ComprehensionMessage,
} from "@/core/agents/comprehension-gate";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "formula-explainer": { label: "Formula Explainer", color: "text-blue-400" },
  "assumption-auditor": { label: "Assumption Auditor", color: "text-orange-400" },
  "edge-case-tester": { label: "Edge Case Tester", color: "text-red-400" },
  "enhancement-recommender": { label: "Enhancement Rec.", color: "text-green-400" },
  "comprehension-supervisor": { label: "Gate Keeper", color: "text-primary-light" },
  "post-edit-validator": { label: "Post-Edit Validator", color: "text-purple-400" },
};

function gateColor(decision: string): { bg: string; text: string; border: string } {
  switch (decision) {
    case "green":
      return { bg: "bg-success/20", text: "text-success", border: "border-success/30" };
    case "yellow":
      return { bg: "bg-warning/20", text: "text-warning", border: "border-warning/30" };
    case "orange":
      return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" };
    default:
      return { bg: "bg-danger/20", text: "text-danger", border: "border-danger/30" };
  }
}

function masteryLabel(level: number): string {
  if (level >= 80) return "Deep Mastery";
  if (level >= 60) return "Good Understanding";
  if (level >= 40) return "Partial Comprehension";
  return "Insufficient";
}

function riskBadge(risk: string): string {
  if (risk === "catastrophic" || risk === "high") return "text-danger";
  if (risk === "medium") return "text-warning";
  return "text-blue-400";
}

export function MathComprehensionGate() {
  const [code, setCode] = useState("");
  const [filePaths, setFilePaths] = useState("");
  const [report, setReport] = useState<ComprehensionReport | null>(null);
  const [messages, setMessages] = useState<ComprehensionMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "formulas" | "assumptions" | "edge-cases" | "enhancements"
  >("overview");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const triggerGate = useCallback(() => {
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
        const res = await fetch("/api/agents/comprehension-gate", {
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
        setError(err instanceof Error ? err.message : "Failed to run comprehension gate");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <form ref={formRef} onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Code to Comprehend
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={12}
            placeholder={'Paste code here. The Comprehension Gate will explain every formula, audit assumptions, test edge cases, and block edits until mastery is achieved.\n\nTry: "tackle this with respect"'}
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
            placeholder="e.g., src/lib/arb-algo.ts, src/utils/ev.ts"
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
          {pending ? "Running comprehension gate..." : "Tackle With Respect"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            5 agents: explaining formulas, auditing assumptions, testing edge cases, recommending enhancements, computing mastery level...
          </p>
        )}
      </form>

      {/* Agent Activity */}
      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Comprehension Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">Comprehension Gate analyzing math system...</span>
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

      {/* Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Comprehension Gate</h2>
                {/* Gate Decision */}
                {(() => {
                  const colors = gateColor(report.gateDecision);
                  return (
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${colors.bg} ${colors.text} ${colors.border}`}>
                      {report.gateDecision} light
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

            {/* Mastery Level Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Math Mastery Level</span>
                <span className={`font-bold ${
                  report.masteryLevel >= 80 ? "text-success" :
                  report.masteryLevel >= 60 ? "text-warning" :
                  report.masteryLevel >= 40 ? "text-orange-400" : "text-danger"
                }`}>
                  {report.masteryLevel}% — {masteryLabel(report.masteryLevel)}
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    report.masteryLevel >= 80 ? "bg-success" :
                    report.masteryLevel >= 60 ? "bg-warning" :
                    report.masteryLevel >= 40 ? "bg-orange-500" : "bg-danger"
                  }`}
                  style={{ width: `${report.masteryLevel}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                Confidence: {Math.round(report.confidence * 100)}%
              </p>
            </div>

            {/* Summary */}
            <p className="mt-4 text-sm">{report.summary}</p>

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border">
              {(["overview", "formulas", "assumptions", "edge-cases", "enhancements"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab.replace("-", " ")}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Prerequisites */}
                  <div className="grid grid-cols-2 gap-3">
                    {report.prerequisitesMet.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-success">Prerequisites Met</h3>
                        <ul className="space-y-1">
                          {report.prerequisitesMet.map((p, i) => (
                            <li key={i} className="text-xs text-success/80">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.prerequisitesMissing.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-danger">Prerequisites Missing</h3>
                        <ul className="space-y-1">
                          {report.prerequisitesMissing.map((p, i) => (
                            <li key={i} className="text-xs text-danger/80">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Approved / Blocked */}
                  <div className="grid grid-cols-2 gap-3">
                    {report.approvedEditScope.length > 0 && (
                      <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                        <h3 className="text-xs font-semibold text-success">Approved Edit Scope</h3>
                        <ul className="mt-1 space-y-1">
                          {report.approvedEditScope.map((s, i) => (
                            <li key={i} className="text-xs">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.blockedAreas.length > 0 && (
                      <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                        <h3 className="text-xs font-semibold text-danger">Blocked Areas</h3>
                        <ul className="mt-1 space-y-1">
                          {report.blockedAreas.map((b, i) => (
                            <li key={i} className="text-xs">{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Tutorial Topics */}
                  {report.tutorialTopics.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Study These Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {report.tutorialTopics.map((topic, i) => (
                          <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary-light">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comprehension Gaps */}
                  {report.comprehensionGaps.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-warning">Comprehension Gaps</h3>
                      <ul className="space-y-1">
                        {report.comprehensionGaps.map((gap, i) => (
                          <li key={i} className="text-xs text-warning/80">{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "formulas" && (
                <div className="space-y-3">
                  {report.formulaExplanations.length === 0 ? (
                    <p className="text-sm text-muted">No formula explanations generated.</p>
                  ) : (
                    report.formulaExplanations.map((exp, i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{exp.formulaId}</span>
                        </div>
                        <p className="mt-2 text-sm">{exp.plainEnglish}</p>
                        {exp.intuition && (
                          <p className="mt-1 text-xs text-blue-400">
                            Intuition: {exp.intuition}
                          </p>
                        )}
                        {exp.latex && (
                          <code className="mt-2 block rounded bg-surface-elevated px-2 py-1 text-xs font-mono">
                            {exp.latex}
                          </code>
                        )}
                        {exp.numericalExample && (
                          <div className="mt-2 rounded bg-blue-500/5 px-2 py-1">
                            <span className="text-xs font-medium text-blue-400">Example: </span>
                            <span className="text-xs">{exp.numericalExample}</span>
                          </div>
                        )}
                        {exp.keyInsight && (
                          <p className="mt-1 text-xs text-success">
                            Key insight: {exp.keyInsight}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "assumptions" && (
                <div className="space-y-2">
                  {report.assumptions.length === 0 ? (
                    <p className="text-sm text-muted">No assumptions identified.</p>
                  ) : (
                    report.assumptions.map((a, i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase ${riskBadge(a.riskIfViolated)}`}>
                            {a.riskIfViolated}
                          </span>
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                            {a.type}
                          </span>
                          <span className={`text-xs ${a.explicit ? "text-success" : "text-warning"}`}>
                            {a.explicit ? "Explicit" : "Implicit"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{a.description}</p>
                        {a.violationScenario && (
                          <p className="mt-1 text-xs text-muted">
                            Violates when: {a.violationScenario}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "edge-cases" && (
                <div className="space-y-2">
                  {report.edgeCases.length === 0 ? (
                    <p className="text-sm text-muted">No edge cases identified.</p>
                  ) : (
                    report.edgeCases.map((ec, i) => {
                      const sevColor =
                        ec.severityIfFails === "critical" ? "text-danger" :
                        ec.severityIfFails === "high" ? "text-orange-400" :
                        ec.severityIfFails === "medium" ? "text-warning" : "text-blue-400";
                      return (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase ${sevColor}`}>
                              {ec.severityIfFails}
                            </span>
                            <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                              {ec.category}
                            </span>
                            {ec.formulaAffected && (
                              <span className="text-xs text-muted font-mono">
                                {ec.formulaAffected}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{ec.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "enhancements" && (
                <div className="space-y-2">
                  {report.enhancements.length === 0 ? (
                    <p className="text-sm text-muted">No enhancements recommended.</p>
                  ) : (
                    report.enhancements.map((enh, i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary-light">
                            {enh.type}
                          </span>
                          <span className={`text-xs ${enh.preservesAlpha ? "text-success" : "text-danger"}`}>
                            {enh.preservesAlpha ? "Alpha-Safe" : "Alpha Risk"}
                          </span>
                          <span className={`text-xs ${
                            enh.riskLevel === "none" || enh.riskLevel === "minimal" ? "text-success" :
                            enh.riskLevel === "low" ? "text-blue-400" : "text-warning"
                          }`}>
                            {enh.riskLevel} risk
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{enh.description}</p>
                        <p className="mt-1 text-xs text-muted">Target: {enh.target}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  const text = `Comprehension Gate Report\n\nMastery: ${report.masteryLevel}% (${masteryLabel(report.masteryLevel)})\nGate: ${report.gateDecision.toUpperCase()}\n\n${report.summary}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Report
              </button>
              {["green", "yellow"].includes(report.gateDecision) && (
                <button className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/30">
                  Approve & Open for Editing
                </button>
              )}
              {report.gateDecision === "orange" && (
                <button className="rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/30">
                  Override Gate (Caution)
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
