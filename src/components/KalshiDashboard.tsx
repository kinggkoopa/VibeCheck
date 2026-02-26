"use client";

import { useState, useTransition, useRef } from "react";
import type { KalshiAlphaReport, KalshiAlphaMessage } from "@/core/agents/kalshi-alpha-graph";

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  fetcher: { label: "Fetcher", color: "text-blue-400" },
  "mispricing-analyzer": { label: "Mispricing Analyzer", color: "text-green-400" },
  "arb-enhancer": { label: "Arb Enhancer", color: "text-cyan-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  "profit-creator": { label: "Profit Creator", color: "text-yellow-400" },
  "edge-scorer": { label: "Edge Scorer", color: "text-purple-400" },
  assembler: { label: "Assembler", color: "text-muted" },
};

function scoreColor(s: number): string {
  if (s >= 7) return "text-success";
  if (s >= 4) return "text-warning";
  return "text-danger";
}

export function KalshiDashboard() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<KalshiAlphaReport | null>(null);
  const [messages, setMessages] = useState<KalshiAlphaMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null); setReport(null); setMessages([]); setShowReport(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/kalshi", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setReport(data.data.report); setMessages(data.data.messages ?? []); setShowReport(true); }
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to run Kalshi analysis"); }
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Market Query</label>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} required rows={3}
            placeholder='e.g., "Find Kalshi weather market edges" or "Arb check 2026 election markets" or "Vibe a crypto prediction dashboard"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <p className="text-xs text-muted">Disclaimer: Prediction market trading involves risk. This tool provides analysis, not financial advice. Ensure compliance with applicable laws.</p>
        {error && <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2"><p className="text-sm text-danger">{error}</p></div>}
        <button type="submit" disabled={pending || !query.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50">
          {pending ? "Scanning Kalshi markets..." : "Find Kalshi Alpha"}
        </button>
        {pending && <p className="text-xs text-muted">6 agents: fetching markets, analyzing mispricings, finding arbitrage, creating tools, scoring edges...</p>}
      </form>

      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Agent Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">Kalshi Alpha scanning markets...</span>
              </div>
            )}
            {messages.map((msg, i) => {
              const config = AGENT_CONFIG[msg.agent] ?? { label: msg.agent, color: "text-muted" };
              return (
                <div key={i} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${config.color}`}>{config.label}</span>
                    <span className="text-xs text-muted">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted line-clamp-2">{msg.content.slice(0, 200)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Kalshi Edge Report</h2>
                <div className="rounded-full bg-primary/20 px-4 py-2">
                  <span className={`text-2xl font-black ${scoreColor(report.scores.overall)}`}>{report.scores.overall}</span>
                  <span className="text-sm text-muted">/10</span>
                </div>
              </div>
              <button onClick={() => setShowReport(false)} className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated">Close</button>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {(Object.entries(report.scores) as Array<[string, number]>).map(([key, val]) => (
                <div key={key} className="rounded-lg border border-border bg-surface p-2 text-center">
                  <div className="text-xs text-muted capitalize">{key.replace("_", " ")}</div>
                  <div className={`text-lg font-bold ${scoreColor(val)}`}>{val}</div>
                </div>
              ))}
            </div>

            {report.strategy && <div className="mt-4 rounded-lg border border-border bg-surface p-4"><p className="text-sm font-medium">{report.strategy}</p></div>}
            {report.topAction && <p className="mt-2 text-xs text-primary-light">Top Action: {report.topAction}</p>}

            {report.mispricings.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Mispricings Detected</h3>
                <div className="space-y-2">
                  {report.mispricings.map((m, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.market}</span>
                        <span className={`text-xs font-bold ${m.confidence === "high" ? "text-success" : m.confidence === "medium" ? "text-warning" : "text-muted"}`}>{m.confidence}</span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-muted">
                        <span>Price: {m.currentPrice}¢</span>
                        <span>Est. Prob: {Math.round(m.estimatedProb * 100)}%</span>
                        <span className={m.evYes > 0 ? "text-success" : "text-muted"}>EV(Y): {(m.evYes * 100).toFixed(1)}¢</span>
                        <span className={m.evNo > 0 ? "text-success" : "text-muted"}>EV(N): {(m.evNo * 100).toFixed(1)}¢</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{m.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.arbOpportunities.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Arbitrage Opportunities</h3>
                <div className="space-y-2">
                  {report.arbOpportunities.map((a, i) => (
                    <div key={i} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                      <span className="text-sm font-medium">{a.kalshiMarket}</span>
                      <div className="mt-1 flex gap-4 text-xs">
                        <span>Kalshi: {a.kalshiPrice}¢</span>
                        <span>{a.crossPlatform}: {a.crossPrice}¢</span>
                        <span className="text-success">Spread: {a.spread}¢ ({a.estimatedProfitPct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.toolIdeas.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Profit Tool Ideas</h3>
                <div className="space-y-2">
                  {report.toolIdeas.map((t, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className={`text-xs ${t.profitPotential === "high" ? "text-success" : "text-warning"}`}>{t.profitPotential}</span>
                      </div>
                      <p className="mt-1 text-xs">{t.concept}</p>
                      <p className="mt-1 text-xs text-muted">Revenue: {t.monetization}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button onClick={() => { navigator.clipboard.writeText(`Kalshi Edge Report (${report.scores.overall}/10)\n\n${report.strategy}\n\nTop Action: ${report.topAction}`); }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface">Copy Report</button>
              <button onClick={() => setShowReport(false)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
