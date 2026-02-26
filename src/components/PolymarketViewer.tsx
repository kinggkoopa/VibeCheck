"use client";

import { useState, useTransition, useRef } from "react";
import type { PolyMaxReport, PolyMaxMessage } from "@/core/agents/polymarket-max-graph";

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "data-fetcher": { label: "Data Fetcher", color: "text-blue-400" },
  "probability-fusion": { label: "Prob. Fusion", color: "text-green-400" },
  "arb-detector": { label: "Arb Detector", color: "text-cyan-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  "machine-builder": { label: "Machine Builder", color: "text-yellow-400" },
  "maximizer-scorer": { label: "Maximizer", color: "text-purple-400" },
  assembler: { label: "Assembler", color: "text-muted" },
};

function scoreColor(s: number): string {
  if (s >= 7) return "text-success";
  if (s >= 4) return "text-warning";
  return "text-danger";
}

export function PolymarketViewer() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<PolyMaxReport | null>(null);
  const [messages, setMessages] = useState<PolyMaxMessage[]>([]);
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
        const res = await fetch("/api/agents/polymarket", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setReport(data.data.report); setMessages(data.data.messages ?? []); setShowReport(true); }
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to run Polymarket analysis"); }
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Market Query</label>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} required rows={3}
            placeholder='e.g., "Find mispricings in crypto markets" or "Cross-arb election predictions with Kalshi" or "Vibe a meme coin predictor SaaS"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <p className="text-xs text-muted">Disclaimer: Prediction market analysis is for informational purposes only. Not financial advice. Comply with all applicable regulations.</p>
        {error && <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2"><p className="text-sm text-danger">{error}</p></div>}
        <button type="submit" disabled={pending || !query.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50">
          {pending ? "Scanning Polymarket..." : "Maximize Polymarket Alpha"}
        </button>
        {pending && <p className="text-xs text-muted">6 agents: fetching data, fusing probabilities, detecting arbitrage, building machines, scoring alpha...</p>}
      </form>

      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Agent Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" /><span className="text-sm text-muted">Polymarket Maximizer analyzing...</span>
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
                <h2 className="text-xl font-bold">Polymarket Alpha Report</h2>
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

            {report.probabilityEstimates.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Probability Fusion Results</h3>
                <div className="space-y-2">
                  {report.probabilityEstimates.map((e, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3">
                      <span className="text-sm font-medium">{e.market}</span>
                      <div className="mt-1 flex gap-4 text-xs">
                        <span>Market: {(e.marketPrice * 100).toFixed(0)}%</span>
                        <span>Fused: {(e.fusedProbability * 100).toFixed(0)}%</span>
                        <span className={e.divergence > 0.05 ? "text-success" : "text-muted"}>
                          Divergence: {(e.divergence * 100).toFixed(1)}%
                        </span>
                        <span className={`font-bold ${e.edgeDirection === "buy" ? "text-success" : e.edgeDirection === "sell" ? "text-danger" : "text-muted"}`}>
                          {e.edgeDirection.toUpperCase()}
                        </span>
                        <span className={e.confidence === "high" ? "text-success" : "text-warning"}>{e.confidence}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.arbOpportunities.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Cross-Platform Arbitrage</h3>
                <div className="space-y-2">
                  {report.arbOpportunities.map((a, i) => (
                    <div key={i} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                      <span className="text-sm font-medium">{a.polyMarket}</span>
                      <div className="mt-1 flex gap-4 text-xs">
                        <span>Poly: {(a.polyPrice * 100).toFixed(0)}%</span>
                        <span>{a.crossPlatform}: {(a.crossPrice * 100).toFixed(0)}%</span>
                        <span className="text-success">Spread: {(a.spreadPct).toFixed(1)}%</span>
                        <span className="font-bold">{a.direction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.machineIdeas.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Profit Machine Ideas</h3>
                <div className="space-y-2">
                  {report.machineIdeas.map((m, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">{m.type}</span>
                        <span className={`text-xs ${m.profitPotential === "high" ? "text-success" : "text-warning"}`}>{m.profitPotential}</span>
                      </div>
                      <p className="mt-1 text-xs">{m.concept}</p>
                      <p className="mt-1 text-xs text-muted">Revenue: {m.monetization} | MRR Est: {m.estimatedMrr}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button onClick={() => { navigator.clipboard.writeText(`Polymarket Alpha (${report.scores.overall}/10)\n\n${report.strategy}\n\nTop: ${report.topAction}`); }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface">Copy Report</button>
              <button onClick={() => setShowReport(false)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
