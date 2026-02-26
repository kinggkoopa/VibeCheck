"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type {
  ProfitReport,
  ProfitAgentMessage,
  ProfitScore,
} from "@/core/agents/profit-graph";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "revenue-modeler": { label: "Revenue Modeler", color: "text-green-400" },
  "asymmetry-scout": { label: "Asymmetry Scout", color: "text-cyan-400" },
  "legal-checker": { label: "Legal Checker", color: "text-orange-400" },
  "boilerplate-generator": { label: "Boilerplate Gen", color: "text-blue-400" },
  "profit-scorer": { label: "Profit Scorer", color: "text-yellow-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  assembler: { label: "Report Assembler", color: "text-purple-400" },
};

const SCORE_LABELS: Record<keyof ProfitScore, string> = {
  market_size: "Market Size",
  revenue_potential: "Revenue",
  competitive_moat: "Moat",
  execution_ease: "Execution",
  legal_safety: "Legal",
  overall: "Overall",
};

function scoreColor(score: number, max: number = 10): string {
  const pct = score / max;
  if (pct >= 0.7) return "text-success";
  if (pct >= 0.4) return "text-warning";
  return "text-danger";
}

function scoreBg(score: number, max: number = 10): string {
  const pct = score / max;
  if (pct >= 0.7) return "bg-success/20";
  if (pct >= 0.4) return "bg-warning/20";
  return "bg-danger/20";
}

function severityColor(severity: string): string {
  if (severity === "critical" || severity === "high") return "text-danger";
  if (severity === "medium") return "text-warning";
  return "text-blue-400";
}

export function ProfitAgentUI() {
  const [idea, setIdea] = useState("");
  const [tasteProfile, setTasteProfile] = useState("");
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [messages, setMessages] = useState<ProfitAgentMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const triggerSwarm = useCallback(() => {
    if (idea.trim() && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [idea, pending]);

  async function handleRunSwarm(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);
    setShowCode(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/profit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: idea.trim(),
            taste_profile: tasteProfile.trim() || undefined,
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
        setError(err instanceof Error ? err.message : "Failed to run profit swarm");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            App / Tool Idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            rows={4}
            placeholder='e.g., "Vibe a tool for finding arbitrage opportunities between freelance platforms" or "Build a micro-SaaS that auto-repurposes blog posts into social threads"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Taste / MVP Style <span className="text-muted">(optional)</span>
          </label>
          <input
            value={tasteProfile}
            onChange={(e) => setTasteProfile(e.target.value)}
            placeholder="e.g., lean MVP, dark mode, minimal UI, quick to ship"
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
          disabled={pending || !idea.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? "Analyzing profitability..." : "Analyze Profit Potential"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            6 agents analyzing: revenue models, market gaps, legal risks, monetization strategy, boilerplate code, profit scoring...
          </p>
        )}
      </form>

      {/* Agent Activity Feed */}
      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Agent Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">Dispatching profit analysis agents...</span>
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

      {/* Profit Report */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header with Profit Potential Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Profit Analysis</h2>
                <div className={`rounded-full px-4 py-2 text-2xl font-black ${scoreBg(report.scores.overall)}`}>
                  <span className={scoreColor(report.scores.overall)}>
                    {report.scores.overall}
                  </span>
                  <span className="text-sm text-muted">/10</span>
                </div>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated"
              >
                Close
              </button>
            </div>

            {/* Score Breakdown */}
            <div className="mt-4 grid grid-cols-6 gap-2">
              {(Object.entries(report.scores) as Array<[keyof ProfitScore, number]>).map(
                ([key, value]) => (
                  <div key={key} className="rounded-lg border border-border bg-surface p-3 text-center">
                    <div className="text-xs font-medium text-muted">
                      {SCORE_LABELS[key]}
                    </div>
                    <div className={`mt-1 text-xl font-bold ${scoreColor(value)}`}>
                      {value}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Verdict */}
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium">{report.verdict}</p>
              {report.monetization_strategy && (
                <p className="mt-2 text-xs text-muted">
                  <strong>Strategy:</strong> {report.monetization_strategy}
                </p>
              )}
            </div>

            {/* MRR Projections */}
            {Object.keys(report.mrr_projections).length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">MRR Projections</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(report.mrr_projections).map(([period, value]) => (
                    <div key={period} className="rounded-lg border border-border bg-surface p-3 text-center">
                      <div className="text-xs text-muted">{period.toUpperCase()}</div>
                      <div className="mt-1 text-lg font-bold text-success">
                        ${typeof value === "number" ? value.toLocaleString() : value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SWOT Breakdown */}
            {report.breakdown && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(["strengths", "weaknesses", "opportunities", "threats"] as const).map(
                  (category) => {
                    const colors: Record<string, string> = {
                      strengths: "border-success/30 bg-success/5",
                      weaknesses: "border-danger/30 bg-danger/5",
                      opportunities: "border-blue-500/30 bg-blue-500/5",
                      threats: "border-warning/30 bg-warning/5",
                    };
                    const items = report.breakdown[category];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={category} className={`rounded-lg border p-3 ${colors[category]}`}>
                        <h4 className="text-xs font-bold uppercase">{category}</h4>
                        <ul className="mt-1 space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-xs">{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* Revenue Models */}
            {report.revenue_models.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Revenue Models</h3>
                <div className="space-y-2">
                  {report.revenue_models.map((model, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-light">
                          {model.type}
                        </span>
                        <span className="text-xs text-muted">
                          {model.margin_pct}% margin | {model.confidence} confidence
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{model.description}</p>
                      <p className="mt-1 text-xs text-success">
                        Est. MRR @ 6mo: ${model.estimated_mrr_m6?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asymmetry Hooks */}
            {report.asymmetry_hooks.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Asymmetry Hooks</h3>
                <div className="space-y-2">
                  {report.asymmetry_hooks.map((hook, i) => (
                    <div key={i} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-400">
                          {hook.type}
                        </span>
                        <span className={`text-xs ${hook.edge_strength === "strong" ? "text-success" : "text-warning"}`}>
                          {hook.edge_strength} edge
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{hook.description}</p>
                      <p className="mt-1 text-xs text-muted">
                        Strategy: {hook.exploit_strategy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal Risks */}
            {report.legal_risks.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Legal Risks</h3>
                <div className="space-y-2">
                  {report.legal_risks.map((risk, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase ${severityColor(risk.severity)}`}>
                          {risk.severity}
                        </span>
                        <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
                          {risk.category}
                        </span>
                        <span className="text-sm font-medium">{risk.title}</span>
                      </div>
                      <p className="mt-1 text-xs">{risk.detail}</p>
                      {risk.mitigation && (
                        <p className="mt-1 text-xs text-muted">Mitigation: {risk.mitigation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Pivots */}
            {report.suggested_pivots.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Suggested Pivots</h3>
                <ul className="space-y-1">
                  {report.suggested_pivots.map((pivot, i) => (
                    <li key={i} className="text-sm text-muted">
                      {pivot}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Boilerplate Code Toggle */}
            {report.boilerplate_code && (
              <div className="mt-4">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="text-sm font-medium text-primary-light hover:underline"
                >
                  {showCode ? "Hide" : "Show"} Generated Boilerplate
                </button>
                {showCode && (
                  <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-border bg-surface p-3 text-xs">
                    <code>{report.boilerplate_code}</code>
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  const text = `Profit Analysis (${report.scores.overall}/10)\n\n${report.verdict}\n\nStrategy: ${report.monetization_strategy}\n\nStrengths: ${report.breakdown.strengths.join(", ")}\nWeaknesses: ${report.breakdown.weaknesses.join(", ")}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Report
              </button>
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
