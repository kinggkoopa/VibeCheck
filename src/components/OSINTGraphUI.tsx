"use client";

import { useState, useTransition, useRef } from "react";
import type {
  OSINTReport,
  OSINTMessage,
  IntelligenceScore,
  EntityNode,
  EntityEdge,
  DataSource,
  PrivacyAssessment,
  IntelReport,
  OSINTTool,
} from "@/core/agents/osint-graph";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "data-aggregator": { label: "Data Aggregator", color: "text-indigo-400" },
  "pattern-finder": { label: "Pattern Finder", color: "text-violet-400" },
  "privacy-protector": { label: "Privacy Protector", color: "text-emerald-400" },
  "report-generator": { label: "Report Generator", color: "text-amber-400" },
  "tool-generator": { label: "Tool Generator", color: "text-teal-400" },
  "intelligence-scorer": { label: "Intelligence Scorer", color: "text-pink-400" },
  supervisor: { label: "Supervisor", color: "text-slate-400" },
  assembler: { label: "Assembler", color: "text-gray-400" },
};

const SCORE_LABELS: Record<keyof IntelligenceScore, string> = {
  source_reliability: "Source Reliability",
  data_completeness: "Data Completeness",
  analytical_depth: "Analytical Depth",
  privacy_compliance: "Privacy Compliance",
  actionability: "Actionability",
  overall: "Overall",
};

const FOCUS_OPTIONS = [
  { value: "recon", label: "Recon" },
  { value: "profile", label: "Profile Builder" },
  { value: "network-analysis", label: "Network Analysis" },
  { value: "tool-building", label: "Tool Building" },
  { value: "full-investigation", label: "Full Investigation" },
] as const;

type FocusType = (typeof FOCUS_OPTIONS)[number]["value"];

function qualityBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: "Outstanding", color: "text-emerald-400", bg: "bg-emerald-500/20" };
  if (score >= 75) return { label: "Excellent", color: "text-green-400", bg: "bg-green-500/20" };
  if (score >= 60) return { label: "Good", color: "text-blue-400", bg: "bg-blue-500/20" };
  if (score >= 40) return { label: "Fair", color: "text-warning", bg: "bg-warning/20" };
  return { label: "Poor", color: "text-danger", bg: "bg-danger/20" };
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-success/20";
  if (score >= 50) return "bg-warning/20";
  return "bg-danger/20";
}

function nodeTypeColor(type: string): string {
  switch (type) {
    case "person": return "bg-blue-500";
    case "organization": return "bg-green-500";
    case "domain": return "bg-purple-500";
    case "ip": return "bg-orange-500";
    case "social-account": return "bg-cyan-500";
    case "email": return "bg-pink-500";
    case "phone": return "bg-yellow-500";
    case "location": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

function complianceColor(status: string): { text: string; bg: string; icon: string } {
  switch (status) {
    case "compliant": return { text: "text-success", bg: "bg-success/20", icon: "+" };
    case "partial": return { text: "text-warning", bg: "bg-warning/20", icon: "~" };
    case "non-compliant": return { text: "text-danger", bg: "bg-danger/20", icon: "x" };
    default: return { text: "text-muted", bg: "bg-surface-elevated", icon: "?" };
  }
}

function significanceBadge(significance: string): { color: string; bg: string } {
  switch (significance) {
    case "high": return { color: "text-danger", bg: "bg-danger/20" };
    case "medium": return { color: "text-warning", bg: "bg-warning/20" };
    case "low": return { color: "text-muted", bg: "bg-surface-elevated" };
    default: return { color: "text-muted", bg: "bg-surface-elevated" };
  }
}

function patternTypeBadge(type: string): { color: string; bg: string } {
  switch (type) {
    case "temporal": return { color: "text-amber-400", bg: "bg-amber-500/20" };
    case "network": return { color: "text-violet-400", bg: "bg-violet-500/20" };
    case "behavioral": return { color: "text-cyan-400", bg: "bg-cyan-500/20" };
    case "geographic": return { color: "text-green-400", bg: "bg-green-500/20" };
    default: return { color: "text-muted", bg: "bg-surface-elevated" };
  }
}

// ── Main Component ──

export function OSINTGraphUI() {
  const [idea, setIdea] = useState("");
  const [focus, setFocus] = useState<FocusType>("full-investigation");
  const [ethicalMode, setEthicalMode] = useState(true);
  const [showEthicalWarning, setShowEthicalWarning] = useState(false);
  const [report, setReport] = useState<OSINTReport | null>(null);
  const [messages, setMessages] = useState<OSINTMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "score" | "graph" | "sources" | "patterns" | "privacy" | "report" | "tools"
  >("score");
  const [expandedTool, setExpandedTool] = useState<number | null>(null);
  const [expandedPattern, setExpandedPattern] = useState<number | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<number | null>(null);
  const [expandedTimeline, setExpandedTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleRunSwarm(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);
    setActiveTab("score");
    setExpandedTool(null);
    setExpandedPattern(null);
    setExpandedProfile(null);
    setExpandedTimeline(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/osint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: idea.trim(),
            focus,
            ethicalMode,
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
        setError(err instanceof Error ? err.message : "Failed to run OSINT swarm");
      }
    });
  }

  function handleCopyTools() {
    if (!report) return;
    const allTools = report.tools
      .map(
        (t) =>
          `// === ${t.name} ===\n// Purpose: ${t.purpose}\n// Language: ${t.language}\n// ETHICAL NOTICE: ${t.ethical_notice}\n\n${t.code}`
      )
      .join("\n\n\n");
    navigator.clipboard.writeText(allTools);
  }

  function handleExportReport() {
    if (!report) return;
    const exportData = JSON.stringify(report, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "osint-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopyEntityGraph() {
    if (!report) return;
    const graphData = JSON.stringify(report.entityGraph, null, 2);
    navigator.clipboard.writeText(graphData);
  }

  function handleToggleEthical() {
    if (ethicalMode) {
      setShowEthicalWarning(true);
    } else {
      setEthicalMode(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ethical Disclaimer */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="text-xs font-medium text-amber-400">
          OSINT tools must be used ethically and legally. Always obtain proper authorization,
          respect privacy laws, and never use for harassment, stalking, or unauthorized
          surveillance. All generated tools include legal disclaimers.
        </p>
      </div>

      {/* Input Form */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            OSINT Tool / Investigation Idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            rows={4}
            placeholder={'e.g., "Build a domain intelligence tool that maps an organization\'s attack surface from public DNS records, certificate transparency logs, and WHOIS data" or "Create a social media monitoring dashboard for brand reputation analysis using public APIs"'}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Focus</label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value as FocusType)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {FOCUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Ethical Mode</label>
            <button
              type="button"
              onClick={handleToggleEthical}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                ethicalMode
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-danger/50 bg-danger/10 text-danger"
              }`}
            >
              <span>{ethicalMode ? "ON - Extra Guardrails" : "OFF - Standard Mode"}</span>
              <span className={`h-3 w-3 rounded-full ${ethicalMode ? "bg-emerald-500" : "bg-danger"}`} />
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={pending || !idea.trim()}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {pending ? "Building OSINT tool..." : "Build OSINT Tool"}
            </button>
          </div>
        </div>

        {/* Ethical mode warning modal */}
        {showEthicalWarning && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
            <p className="text-sm font-medium text-danger">
              Warning: Disabling ethical mode removes extra privacy and legal guardrails.
              You are solely responsible for ensuring your use complies with all applicable laws.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEthicalMode(false);
                  setShowEthicalWarning(false);
                }}
                className="rounded-lg bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
              >
                I understand, disable ethical mode
              </button>
              <button
                type="button"
                onClick={() => setShowEthicalWarning(false)}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Keep ethical mode ON
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {pending && (
          <p className="text-xs text-muted">
            8 agents working: data aggregation, pattern analysis, privacy review,
            report generation, tool building, intelligence scoring...
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
                <span className="text-sm text-muted">Dispatching OSINT intelligence agents...</span>
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

      {/* OSINT Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header with Intelligence Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">OSINT Intelligence Report</h2>
                <div className={`rounded-full px-4 py-2 text-2xl font-black ${scoreBg(report.intelligenceScore.overall)}`}>
                  <span className={scoreColor(report.intelligenceScore.overall)}>
                    {report.intelligenceScore.overall}
                  </span>
                  <span className="text-sm text-muted">/100</span>
                </div>
                {(() => {
                  const badge = qualityBadge(report.intelligenceScore.overall);
                  return (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.bg} ${badge.color}`}>
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

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 border-b border-border">
              {(["score", "graph", "sources", "patterns", "privacy", "report", "tools"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-primary-light"
                  }`}
                >
                  {tab === "score"
                    ? "Intelligence Score"
                    : tab === "graph"
                      ? "Entity Graph"
                      : tab === "sources"
                        ? "Data Sources"
                        : tab === "patterns"
                          ? "Patterns"
                          : tab === "privacy"
                            ? "Privacy"
                            : tab === "report"
                              ? "Intel Report"
                              : "Generated Tools"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {/* Intelligence Score Tab */}
              {activeTab === "score" && (
                <div>
                  <h3 className="mb-3 font-semibold">Intelligence Quality Score</h3>

                  {/* Score Bars */}
                  <div className="space-y-3">
                    {(Object.entries(report.intelligenceScore) as Array<[keyof IntelligenceScore, number]>).map(
                      ([key, value]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{SCORE_LABELS[key]}</span>
                            <span className={`text-sm font-bold ${scoreColor(value)}`}>{value}%</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-surface-elevated">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                value >= 75 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-danger"
                              }`}
                              style={{ width: `${Math.min(100, value)}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Summary */}
                  {report.summary && (
                    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
                      <h4 className="text-sm font-semibold">Summary</h4>
                      <p className="mt-1 text-sm text-muted">{report.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Entity Graph Tab */}
              {activeTab === "graph" && (
                <div>
                  <h3 className="mb-3 font-semibold">Entity Graph</h3>

                  {/* Graph Stats */}
                  <div className="mb-4 grid grid-cols-4 gap-2">
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <div className="text-xs text-muted">Nodes</div>
                      <div className="mt-1 text-xl font-bold text-primary-light">
                        {report.entityGraph.nodes.length}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <div className="text-xs text-muted">Edges</div>
                      <div className="mt-1 text-xl font-bold text-primary-light">
                        {report.entityGraph.edges.length}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <div className="text-xs text-muted">Node Types</div>
                      <div className="mt-1 text-xl font-bold text-primary-light">
                        {new Set(report.entityGraph.nodes.map((n) => n.type)).size}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <div className="text-xs text-muted">Avg Centrality</div>
                      <div className="mt-1 text-xl font-bold text-primary-light">
                        {report.entityGraph.nodes.length > 0
                          ? (
                              report.entityGraph.nodes.reduce((a, n) => a + n.centrality_score, 0) /
                              report.entityGraph.nodes.length
                            ).toFixed(2)
                          : "0"}
                      </div>
                    </div>
                  </div>

                  {/* Entity Nodes */}
                  {report.entityGraph.nodes.length > 0 ? (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Entities</h4>
                      <div className="space-y-2">
                        {report.entityGraph.nodes.map((node, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                            <div className={`h-8 w-8 flex-shrink-0 rounded-full ${nodeTypeColor(node.type)} flex items-center justify-center`}>
                              <span className="text-xs font-bold text-white">
                                {node.type.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{node.id}</span>
                                <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-muted">
                                  {node.type}
                                </span>
                              </div>
                              <div className="mt-0.5 text-xs text-muted">
                                Centrality: {node.centrality_score.toFixed(3)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Relationships */}
                      {report.entityGraph.edges.length > 0 && (
                        <div className="mt-4">
                          <h4 className="mb-2 text-sm font-semibold">Relationships</h4>
                          <div className="space-y-1">
                            {report.entityGraph.edges.map((edge, i) => (
                              <div key={i} className="flex items-center gap-2 rounded border border-border/50 bg-surface px-3 py-2">
                                <span className="text-xs font-medium text-primary-light">{edge.source}</span>
                                <span className="text-xs text-muted">--[{edge.relationship}]--&gt;</span>
                                <span className="text-xs font-medium text-primary-light">{edge.target}</span>
                                <span className={`ml-auto rounded px-1.5 py-0.5 text-xs ${
                                  edge.confidence >= 0.7
                                    ? "bg-success/20 text-success"
                                    : edge.confidence >= 0.4
                                      ? "bg-warning/20 text-warning"
                                      : "bg-danger/20 text-danger"
                                }`}>
                                  {(edge.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No entities discovered.</p>
                  )}
                </div>
              )}

              {/* Data Sources Tab */}
              {activeTab === "sources" && (
                <div>
                  <h3 className="mb-3 font-semibold">Data Sources</h3>
                  {report.dataSources.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left font-semibold">Source</th>
                            <th className="px-3 py-2 text-left font-semibold">Type</th>
                            <th className="px-3 py-2 text-left font-semibold">Data Fields</th>
                            <th className="px-3 py-2 text-left font-semibold">Legal</th>
                            <th className="px-3 py-2 text-left font-semibold">Rate Limit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.dataSources.map((source, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="px-3 py-2">
                                <div className="font-medium">{source.name}</div>
                                {source.url_pattern && (
                                  <div className="mt-0.5 font-mono text-muted">{source.url_pattern.slice(0, 40)}</div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs">
                                  {source.type}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {source.data_fields.slice(0, 4).map((field, j) => (
                                    <span key={j} className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                                      {field}
                                    </span>
                                  ))}
                                  {source.data_fields.length > 4 && (
                                    <span className="text-xs text-muted">+{source.data_fields.length - 4}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {source.legal_notes ? (
                                  source.legal_notes.toLowerCase().includes("no restriction") ||
                                  source.legal_notes.toLowerCase().includes("public") ? (
                                    <span className="text-success">+</span>
                                  ) : source.legal_notes.toLowerCase().includes("restricted") ||
                                    source.legal_notes.toLowerCase().includes("prohibited") ? (
                                    <span className="text-danger">x</span>
                                  ) : (
                                    <span className="text-warning">~</span>
                                  )
                                ) : (
                                  <span className="text-muted">?</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted">{source.rate_limit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No data sources documented.</p>
                  )}
                </div>
              )}

              {/* Patterns Tab */}
              {activeTab === "patterns" && (
                <div>
                  <h3 className="mb-3 font-semibold">Patterns Found</h3>
                  {report.patterns.length > 0 ? (
                    <div className="space-y-2">
                      {report.patterns.map((pattern, i) => {
                        const typeBadge = patternTypeBadge(pattern.type);
                        const sigBadge = significanceBadge(pattern.significance);
                        return (
                          <div key={i} className="rounded-lg border border-border bg-surface">
                            <button
                              onClick={() => setExpandedPattern(expandedPattern === i ? null : i)}
                              className="flex w-full items-center gap-2 p-3 text-left hover:bg-surface-elevated"
                            >
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge.bg} ${typeBadge.color}`}>
                                {pattern.type}
                              </span>
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${sigBadge.bg} ${sigBadge.color}`}>
                                {pattern.significance}
                              </span>
                              <span className="flex-1 text-sm">{pattern.description}</span>
                              <span className="text-xs text-muted">
                                {expandedPattern === i ? "Collapse" : "Expand"}
                              </span>
                            </button>
                            {expandedPattern === i && pattern.supporting_data.length > 0 && (
                              <div className="border-t border-border p-3">
                                <h5 className="mb-1 text-xs font-semibold text-muted">Supporting Evidence</h5>
                                <ul className="space-y-0.5">
                                  {pattern.supporting_data.map((evidence, j) => (
                                    <li key={j} className="text-xs text-muted">- {evidence}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No patterns identified.</p>
                  )}
                </div>
              )}

              {/* Privacy Assessment Tab */}
              {activeTab === "privacy" && (
                <div>
                  <h3 className="mb-3 font-semibold">Privacy Assessment</h3>

                  {/* Jurisdictional Compliance */}
                  {report.privacyAssessment.legal_assessment.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold">Compliance by Jurisdiction</h4>
                      <div className="space-y-2">
                        {report.privacyAssessment.legal_assessment.map((la, i) => {
                          const statusColors = complianceColor(la.compliance_status);
                          return (
                            <div key={i} className="rounded-lg border border-border bg-surface p-3">
                              <div className="flex items-center gap-2">
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${statusColors.bg} ${statusColors.text}`}>
                                  {statusColors.icon}
                                </span>
                                <span className="text-sm font-medium">{la.jurisdiction}</span>
                                <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-muted">
                                  {la.regulation}
                                </span>
                                <span className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                                  {la.compliance_status}
                                </span>
                              </div>
                              {la.applicable_articles.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {la.applicable_articles.map((article, j) => (
                                    <span key={j} className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                      {article}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {la.required_actions.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                  {la.required_actions.map((action, j) => (
                                    <li key={j} className="text-xs text-muted">- {action}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ethical Review */}
                  <div className="mb-4 rounded-lg border border-border bg-surface p-4">
                    <h4 className="text-sm font-semibold">Ethical Review</h4>
                    <div className="mt-2 space-y-2">
                      {report.privacyAssessment.ethical_review.purpose_legitimacy && (
                        <div>
                          <span className="text-xs font-medium">Purpose Legitimacy:</span>
                          <p className="text-xs text-muted">{report.privacyAssessment.ethical_review.purpose_legitimacy}</p>
                        </div>
                      )}
                      {report.privacyAssessment.ethical_review.data_minimization && (
                        <div>
                          <span className="text-xs font-medium">Data Minimization:</span>
                          <p className="text-xs text-muted">{report.privacyAssessment.ethical_review.data_minimization}</p>
                        </div>
                      )}
                      {report.privacyAssessment.ethical_review.consent_requirements && (
                        <div>
                          <span className="text-xs font-medium">Consent Requirements:</span>
                          <p className="text-xs text-muted">{report.privacyAssessment.ethical_review.consent_requirements}</p>
                        </div>
                      )}
                      {report.privacyAssessment.ethical_review.retention_policy && (
                        <div>
                          <span className="text-xs font-medium">Retention Policy:</span>
                          <p className="text-xs text-muted">{report.privacyAssessment.ethical_review.retention_policy}</p>
                        </div>
                      )}
                    </div>

                    {/* Red Flags */}
                    {report.privacyAssessment.ethical_review.red_flags.length > 0 && (
                      <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
                        <h5 className="text-xs font-bold uppercase text-danger">Red Flags</h5>
                        <ul className="mt-1 space-y-0.5">
                          {report.privacyAssessment.ethical_review.red_flags.map((flag, i) => (
                            <li key={i} className="text-xs text-danger">{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Privacy Controls Checklist */}
                  {report.privacyAssessment.privacy_controls.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Required Privacy Controls</h4>
                      <div className="space-y-1">
                        {report.privacyAssessment.privacy_controls.map((control, i) => (
                          <div key={i} className="flex items-start gap-2 rounded border border-border/50 bg-surface px-3 py-2">
                            <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                              control.priority === "required"
                                ? "bg-danger/20 text-danger"
                                : control.priority === "recommended"
                                  ? "bg-warning/20 text-warning"
                                  : "bg-surface-elevated text-muted"
                            }`}>
                              {control.priority}
                            </span>
                            <div className="flex-1">
                              <span className="text-xs font-medium">{control.control}</span>
                              {control.implementation && (
                                <p className="mt-0.5 text-xs text-muted">{control.implementation}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {report.privacyAssessment.disclaimer_text && (
                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-xs text-amber-400">{report.privacyAssessment.disclaimer_text}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Intelligence Report Tab */}
              {activeTab === "report" && (
                <div>
                  <h3 className="mb-3 font-semibold">{report.intelReport.title || "Intelligence Report"}</h3>

                  {/* Executive Summary */}
                  {report.intelReport.executive_summary && (
                    <div className="mb-4 rounded-lg border border-border bg-surface p-4">
                      <h4 className="text-sm font-semibold">Executive Summary</h4>
                      <p className="mt-1 text-sm text-muted">{report.intelReport.executive_summary}</p>
                    </div>
                  )}

                  {/* Entity Profiles */}
                  {report.intelReport.entity_profiles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold">Entity Profiles</h4>
                      <div className="space-y-2">
                        {report.intelReport.entity_profiles.map((profile, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface">
                            <button
                              onClick={() => setExpandedProfile(expandedProfile === i ? null : i)}
                              className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{profile.name}</span>
                                <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-muted">
                                  {profile.type}
                                </span>
                              </div>
                              <span className="text-xs text-muted">
                                {profile.data_points.length} data points
                              </span>
                            </button>
                            {expandedProfile === i && (
                              <div className="border-t border-border p-3">
                                {profile.data_points.length > 0 && (
                                  <div className="space-y-1">
                                    {profile.data_points.map((dp, j) => (
                                      <div key={j} className="flex items-center gap-2 text-xs">
                                        <span className="w-20 font-medium text-muted">{dp.field}:</span>
                                        <span>{dp.value}</span>
                                        <span className="ml-auto text-muted">[{dp.source}]</span>
                                        <span className={`rounded px-1.5 py-0.5 ${
                                          dp.confidence === "high"
                                            ? "bg-success/20 text-success"
                                            : dp.confidence === "medium"
                                              ? "bg-warning/20 text-warning"
                                              : "bg-danger/20 text-danger"
                                        }`}>
                                          {dp.confidence}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {profile.risk_assessment && (
                                  <div className="mt-2 rounded border border-border/50 bg-background p-2">
                                    <span className="text-xs font-medium text-muted">Risk Assessment:</span>
                                    <p className="text-xs">{profile.risk_assessment}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {report.intelReport.timeline.length > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => setExpandedTimeline(!expandedTimeline)}
                        className="mb-2 flex items-center gap-2 text-sm font-semibold hover:text-primary-light"
                      >
                        <span>Timeline ({report.intelReport.timeline.length} events)</span>
                        <span className="text-xs text-muted">{expandedTimeline ? "Collapse" : "Expand"}</span>
                      </button>
                      {expandedTimeline && (
                        <div className="space-y-2 border-l-2 border-border pl-4">
                          {report.intelReport.timeline.map((event, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-border bg-primary" />
                              <div className="rounded-lg border border-border/50 bg-surface p-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-primary-light">{event.date}</span>
                                  {event.entities_involved.length > 0 && (
                                    <div className="flex gap-1">
                                      {event.entities_involved.map((entity, j) => (
                                        <span key={j} className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                          {entity}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs">{event.event}</p>
                                {event.significance && (
                                  <p className="mt-0.5 text-xs text-muted">Significance: {event.significance}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {report.intelReport.recommendations.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Recommendations</h4>
                      <ul className="space-y-1">
                        {report.intelReport.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className="mt-0.5 text-primary-light">-</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Tools Tab */}
              {activeTab === "tools" && (
                <div>
                  <h3 className="mb-3 font-semibold">Generated Tools</h3>
                  {report.tools.length > 0 ? (
                    <div className="space-y-2">
                      {report.tools.map((tool, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface">
                          <button
                            onClick={() => setExpandedTool(expandedTool === i ? null : i)}
                            className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                                tool.language === "typescript"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}>
                                {tool.language}
                              </span>
                              <span className="text-sm font-medium">{tool.name}</span>
                            </div>
                            <span className="text-xs text-muted">
                              {expandedTool === i ? "Collapse" : "Expand"}
                            </span>
                          </button>
                          <div className="px-3 pb-2">
                            <p className="text-xs text-muted">{tool.purpose}</p>
                            {tool.dependencies.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {tool.dependencies.map((dep, j) => (
                                  <span key={j} className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {expandedTool === i && (
                            <div className="border-t border-border">
                              <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
                                <span className="text-xs text-muted">{tool.ethical_notice}</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(tool.code)}
                                  className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-medium transition-colors hover:bg-surface"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className="max-h-96 overflow-auto p-3 text-xs">
                                <code className="font-mono">{tool.code}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No tools generated.</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={handleCopyTools}
                className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/30"
              >
                Copy Tools
              </button>
              <button
                onClick={handleExportReport}
                className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/30"
              >
                Export Report
              </button>
              <button
                onClick={handleCopyEntityGraph}
                className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/30"
              >
                Copy Entity Graph Data
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
