"use client";

import { useState, useTransition, useRef } from "react";
import type {
  CyberSecReport,
  CyberSecMessage,
  SecurityScore,
  Vulnerability,
  SecurityModule,
  CryptoAudit,
} from "@/core/agents/cyber-sec-graph";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "vuln-scanner": { label: "Vuln Scanner", color: "text-rose-400" },
  "threat-modeler": { label: "Threat Modeler", color: "text-amber-400" },
  "secure-code-generator": { label: "Secure Code Generator", color: "text-emerald-400" },
  "crypto-validator": { label: "Crypto Validator", color: "text-indigo-400" },
  "pentest-planner": { label: "Pentest Planner", color: "text-violet-400" },
  "security-scorer": { label: "Security Scorer", color: "text-teal-400" },
  supervisor: { label: "Supervisor", color: "text-slate-400" },
  assembler: { label: "Report Assembler", color: "text-gray-400" },
};

const SCORE_LABELS: Record<keyof SecurityScore, string> = {
  vulnerability_density: "Vuln Density",
  threat_coverage: "Threat Coverage",
  code_hardening: "Code Hardening",
  crypto_strength: "Crypto Strength",
  compliance_readiness: "Compliance",
  overall: "Overall",
};

const FOCUS_OPTIONS = [
  { value: "full-audit", label: "Full Audit" },
  { value: "vuln-scan", label: "Vuln Scan" },
  { value: "threat-model", label: "Threat Model" },
  { value: "hardened-code", label: "Hardened Code" },
  { value: "pentest", label: "Pentest" },
];

const COMPLIANCE_STANDARDS = ["SOC2", "HIPAA", "PCI-DSS", "GDPR", "ISO27001"];

const STRIDE_CATEGORIES = [
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information-Disclosure",
  "Denial-of-Service",
  "Elevation-of-Privilege",
];

// ── Helpers ──

function securityLevelColor(level: string): string {
  switch (level) {
    case "Excellent": return "text-emerald-400";
    case "Good": return "text-green-400";
    case "Fair": return "text-yellow-400";
    case "Poor": return "text-orange-400";
    case "Critical": return "text-red-400";
    default: return "text-muted";
  }
}

function securityLevelBg(level: string): string {
  switch (level) {
    case "Excellent": return "bg-emerald-500/20";
    case "Good": return "bg-green-500/20";
    case "Fair": return "bg-yellow-500/20";
    case "Poor": return "bg-orange-500/20";
    case "Critical": return "bg-red-500/20";
    default: return "bg-surface-elevated";
  }
}

function scoreBarColor(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 30) return "bg-orange-500";
  return "bg-red-500";
}

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical": return "bg-red-500/20 text-red-400";
    case "high": return "bg-orange-500/20 text-orange-400";
    case "medium": return "bg-yellow-500/20 text-yellow-400";
    case "low": return "bg-blue-500/20 text-blue-400";
    case "info": return "bg-gray-500/20 text-gray-400";
    default: return "bg-surface-elevated text-muted";
  }
}

function threatHeatmapColor(count: number): string {
  if (count === 0) return "bg-green-500/20 text-green-400";
  if (count <= 2) return "bg-yellow-500/20 text-yellow-400";
  if (count <= 4) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

function cryptoStatusIcon(isSecure: boolean, strengthBits: number): { icon: string; color: string } {
  if (!isSecure) return { icon: "X", color: "text-red-400" };
  if (strengthBits >= 256) return { icon: "OK", color: "text-emerald-400" };
  if (strengthBits >= 128) return { icon: "~", color: "text-yellow-400" };
  return { icon: "!", color: "text-orange-400" };
}

// ── Main Component ──

export function CyberThreatUI() {
  const [idea, setIdea] = useState("");
  const [focus, setFocus] = useState("full-audit");
  const [complianceTargets, setComplianceTargets] = useState<string[]>([]);
  const [report, setReport] = useState<CyberSecReport | null>(null);
  const [messages, setMessages] = useState<CyberSecMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "score" | "threats" | "vulns" | "mitre" | "code" | "crypto" | "pentest" | "compliance"
  >("score");
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [expandedScript, setExpandedScript] = useState<number | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [codeTab, setCodeTab] = useState(0);
  const [vulnSort, setVulnSort] = useState<"severity" | "category">("severity");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function toggleCompliance(standard: string) {
    setComplianceTargets((prev) =>
      prev.includes(standard)
        ? prev.filter((s) => s !== standard)
        : [...prev, standard]
    );
  }

  async function handleRunSwarm(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);
    setActiveTab("score");
    setExpandedVuln(null);
    setExpandedScript(null);
    setExpandedPhase(null);
    setCodeTab(0);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/cyber-sec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: idea.trim(),
            focus,
            compliance_targets: complianceTargets.length > 0 ? complianceTargets : undefined,
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
        setError(err instanceof Error ? err.message : "Failed to run cyber security swarm");
      }
    });
  }

  function handleCopySemgrepRules() {
    if (!report) return;
    const allRules = report.semgrepRules.join("\n---\n");
    navigator.clipboard.writeText(allRules);
  }

  function handleCopySecurityCode() {
    if (!report) return;
    const allCode = report.securityModules
      .map((m) => `// === ${m.name} ===\n// ${m.description}\n// Dependencies: ${m.dependencies.join(", ")}\n\n${m.code}`)
      .join("\n\n\n");
    navigator.clipboard.writeText(allCode);
  }

  function handleExportReport() {
    if (!report) return;
    const reportJson = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cyber-sec-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Sort vulnerabilities
  function sortedVulns(): Vulnerability[] {
    if (!report) return [];
    const vulns = [...report.vulnerabilities];
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    if (vulnSort === "severity") {
      vulns.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));
    } else {
      vulns.sort((a, b) => a.category.localeCompare(b.category));
    }
    return vulns;
  }

  // Count threats per STRIDE category
  function strideHeatmapData(): Array<{ category: string; count: number; maxImpact: string }> {
    if (!report) return [];
    return STRIDE_CATEGORIES.map((cat) => {
      const analysis = report.threatModel.stride_analysis.find(
        (s) => s.category === cat
      );
      const threats = analysis?.threats ?? [];
      const maxImpact = threats.reduce((max, t) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[t.impact] ?? 4) < (order[max] ?? 4) ? t.impact : max;
      }, "low");
      return { category: cat, count: threats.length, maxImpact };
    });
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Security Tool / Application Idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            rows={4}
            placeholder='e.g., "A fintech API for peer-to-peer payments with JWT auth, PostgreSQL, and Redis caching" or "An IoT smart home hub with device pairing, firmware updates, and cloud sync"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Focus Area
            </label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
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
            <label className="mb-1 block text-sm font-medium">
              Compliance Targets
            </label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              {COMPLIANCE_STANDARDS.map((std) => (
                <label key={std} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={complianceTargets.includes(std)}
                    onChange={() => toggleCompliance(std)}
                    className="rounded border-border"
                  />
                  <span className="text-muted">{std}</span>
                </label>
              ))}
            </div>
          </div>
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
          {pending ? "Analyzing Security..." : "Analyze Security"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            8 agents analyzing: vulnerabilities, threats, secure code, crypto, pentest plans, compliance...
          </p>
        )}

        <p className="text-xs text-muted">
          Disclaimer: Security analysis is advisory only. Always conduct professional penetration testing and security audits. Generated tools are for authorized testing only.
        </p>
      </form>

      {/* Agent Activity Feed */}
      {(pending || messages.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Agent Activity</h2>
          <div className="space-y-2">
            {pending && messages.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-muted">Dispatching cyber security agents...</span>
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

      {/* Cyber Sec Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header with Security Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Cyber Security Report</h2>
                <div className={`rounded-full px-4 py-2 text-2xl font-black ${securityLevelBg(report.securityLevel)}`}>
                  <span className={securityLevelColor(report.securityLevel)}>
                    {report.securityScore.overall}
                  </span>
                  <span className="text-sm text-muted">/100</span>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${securityLevelBg(report.securityLevel)} ${securityLevelColor(report.securityLevel)}`}>
                  {report.securityLevel}
                </span>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated"
              >
                Close
              </button>
            </div>

            {/* Verdict */}
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium">{report.verdict}</p>
            </div>

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border">
              {(["score", "threats", "vulns", "mitre", "code", "crypto", "pentest", "compliance"] as const).map((tab) => {
                const tabLabels: Record<string, string> = {
                  score: "Security Score",
                  threats: "Threat Heatmap",
                  vulns: "Vulnerabilities",
                  mitre: "MITRE ATT&CK",
                  code: "Secure Code",
                  crypto: "Crypto Audit",
                  pentest: "Pentest Plan",
                  compliance: "Compliance",
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap px-4 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-primary text-primary-light"
                        : "text-muted hover:text-primary-light"
                    }`}
                  >
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {/* Security Score Tab */}
              {activeTab === "score" && (
                <div>
                  <h3 className="mb-3 font-semibold">Security Posture Score</h3>
                  <div className="space-y-3">
                    {(Object.entries(report.securityScore) as Array<[keyof SecurityScore, number]>)
                      .filter(([key]) => key !== "overall")
                      .map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{SCORE_LABELS[key]}</span>
                            <span className={`text-sm font-bold ${value >= 70 ? "text-success" : value >= 50 ? "text-warning" : "text-danger"}`}>
                              {value}/100
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-surface-elevated">
                            <div
                              className={`h-full rounded-full transition-all ${scoreBarColor(value)}`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Threat Heatmap Tab */}
              {activeTab === "threats" && (
                <div>
                  <h3 className="mb-3 font-semibold">STRIDE Threat Heatmap</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {strideHeatmapData().map((item) => (
                      <div
                        key={item.category}
                        className={`rounded-lg border border-border p-4 text-center ${threatHeatmapColor(item.count)}`}
                      >
                        <div className="text-xs font-bold uppercase">{item.category}</div>
                        <div className="mt-2 text-2xl font-black">{item.count}</div>
                        <div className="mt-1 text-xs">
                          {item.count === 0 ? "No threats" : `Max: ${item.maxImpact}`}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Attack Scenarios */}
                  {report.threatModel.attack_scenarios.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Attack Scenarios</h4>
                      <div className="space-y-2">
                        {report.threatModel.attack_scenarios.map((scenario, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="text-sm font-medium">{scenario.name}</div>
                            <div className="mt-2">
                              <span className="text-xs font-medium text-muted">Steps:</span>
                              <ol className="mt-1 space-y-0.5">
                                {scenario.steps.map((step, j) => (
                                  <li key={j} className="text-xs text-muted">{j + 1}. {step}</li>
                                ))}
                              </ol>
                            </div>
                            {scenario.detection && (
                              <p className="mt-2 text-xs text-muted">
                                <span className="font-medium">Detection:</span> {scenario.detection}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust Boundaries */}
                  {report.threatModel.trust_boundaries.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Trust Boundaries</h4>
                      <div className="space-y-2">
                        {report.threatModel.trust_boundaries.map((tb, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                            <span className="text-sm font-medium">{tb.boundary}</span>
                            <span className="text-xs text-muted">{tb.data_crossing}</span>
                            <span className="ml-auto text-xs text-warning">{tb.risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vulnerabilities Tab */}
              {activeTab === "vulns" && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Vulnerabilities ({report.vulnerabilities.length})</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVulnSort("severity")}
                        className={`rounded px-2 py-1 text-xs ${vulnSort === "severity" ? "bg-primary text-white" : "bg-surface-elevated text-muted"}`}
                      >
                        By Severity
                      </button>
                      <button
                        onClick={() => setVulnSort("category")}
                        className={`rounded px-2 py-1 text-xs ${vulnSort === "category" ? "bg-primary text-white" : "bg-surface-elevated text-muted"}`}
                      >
                        By Category
                      </button>
                    </div>
                  </div>
                  {sortedVulns().length > 0 ? (
                    <div className="space-y-2">
                      {sortedVulns().map((vuln, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface">
                          <button
                            onClick={() => setExpandedVuln(expandedVuln === i ? null : i)}
                            className="flex w-full items-center gap-2 p-3 text-left hover:bg-surface-elevated"
                          >
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityColor(vuln.severity)}`}>
                              {vuln.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium">{vuln.title}</span>
                            <span className="ml-auto text-xs text-muted">{vuln.id}</span>
                          </button>
                          {expandedVuln === i && (
                            <div className="border-t border-border p-3">
                              <p className="text-xs">{vuln.description}</p>
                              <div className="mt-2 rounded bg-surface-elevated p-2">
                                <span className="text-xs font-medium text-muted">Attack Vector:</span>
                                <p className="text-xs">{vuln.attack_vector}</p>
                              </div>
                              <div className="mt-2 rounded bg-surface-elevated p-2">
                                <span className="text-xs font-medium text-success">Remediation:</span>
                                <p className="text-xs">{vuln.remediation}</p>
                              </div>
                              {vuln.semgrep_rule && (
                                <div className="mt-2">
                                  <span className="text-xs font-medium text-muted">Semgrep Rule:</span>
                                  <pre className="mt-1 max-h-40 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                                    <code className="font-mono">{vuln.semgrep_rule}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No vulnerabilities identified.</p>
                  )}
                </div>
              )}

              {/* MITRE ATT&CK Coverage Tab */}
              {activeTab === "mitre" && (
                <div>
                  <h3 className="mb-3 font-semibold">MITRE ATT&CK Coverage</h3>
                  {report.threatModel.stride_analysis.length > 0 ? (
                    <div className="space-y-3">
                      {report.threatModel.stride_analysis.map((stride, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <h4 className="text-sm font-bold">{stride.category}</h4>
                          {stride.threats.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {stride.threats.map((threat, j) => (
                                <div key={j} className="rounded border border-border/50 bg-background p-2">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
                                      {threat.mitre_technique}
                                    </span>
                                    <span className="text-xs font-medium">{threat.id}</span>
                                    <span className={`ml-auto rounded px-2 py-0.5 text-xs ${severityColor(threat.impact)}`}>
                                      {threat.impact}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted">{threat.description}</p>
                                  <p className="mt-1 text-xs">
                                    <span className="font-medium text-muted">Countermeasure:</span>{" "}
                                    {threat.countermeasure}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-muted">No threats mapped to this category.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No MITRE ATT&CK mappings generated.</p>
                  )}
                </div>
              )}

              {/* Secure Code Tab */}
              {activeTab === "code" && (
                <div>
                  <h3 className="mb-3 font-semibold">Security Modules</h3>
                  {report.securityModules.length > 0 ? (
                    <div>
                      {/* Module tabs */}
                      <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
                        {report.securityModules.map((mod, i) => (
                          <button
                            key={i}
                            onClick={() => setCodeTab(i)}
                            className={`whitespace-nowrap rounded-t px-3 py-1.5 text-xs font-medium ${
                              codeTab === i
                                ? "bg-surface border border-b-0 border-border text-primary-light"
                                : "text-muted hover:text-primary-light"
                            }`}
                          >
                            {mod.name}
                          </button>
                        ))}
                      </div>
                      {/* Active module content */}
                      {report.securityModules[codeTab] && (
                        <div className="rounded-b-lg border border-t-0 border-border bg-surface p-4">
                          <p className="text-xs text-muted">{report.securityModules[codeTab].description}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {report.securityModules[codeTab].security_features.map((feat, j) => (
                              <span key={j} className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                                {feat}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs font-medium text-muted">Dependencies:</span>
                            {report.securityModules[codeTab].dependencies.map((dep, j) => (
                              <span key={j} className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                                {dep}
                              </span>
                            ))}
                          </div>
                          <pre className="mt-3 max-h-96 overflow-auto rounded border border-border/50 bg-background p-3 text-xs">
                            <code className="font-mono">{report.securityModules[codeTab].code}</code>
                          </pre>
                          <button
                            onClick={() => navigator.clipboard.writeText(report.securityModules[codeTab].code)}
                            className="mt-2 rounded bg-surface-elevated px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface"
                          >
                            Copy Code
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No security modules generated.</p>
                  )}

                  {/* Security Headers */}
                  {report.securityHeaders.headers.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Security Headers</h4>
                      <div className="space-y-1">
                        {report.securityHeaders.headers.map((header, i) => (
                          <div key={i} className="flex items-start gap-2 rounded border border-border/50 bg-surface px-3 py-2">
                            <code className="whitespace-nowrap text-xs font-bold text-primary-light">{header.name}</code>
                            <code className="text-xs text-success">{header.value}</code>
                            <span className="ml-auto whitespace-nowrap text-xs text-muted">{header.purpose}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Crypto Audit Tab */}
              {activeTab === "crypto" && (
                <div>
                  <h3 className="mb-3 font-semibold">Cryptographic Audit</h3>
                  {report.cryptoAudit.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left font-medium text-muted">Algorithm</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Usage</th>
                            <th className="px-3 py-2 text-center font-medium text-muted">Status</th>
                            <th className="px-3 py-2 text-center font-medium text-muted">Strength</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.cryptoAudit.map((audit, i) => {
                            const status = cryptoStatusIcon(audit.is_secure, audit.strength_bits);
                            return (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2 font-medium">{audit.algorithm}</td>
                                <td className="px-3 py-2 text-muted">{audit.usage}</td>
                                <td className={`px-3 py-2 text-center font-bold ${status.color}`}>
                                  {status.icon}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {audit.strength_bits > 0 ? `${audit.strength_bits}-bit` : "N/A"}
                                </td>
                                <td className="px-3 py-2 text-muted">{audit.recommendation}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No crypto audit performed.</p>
                  )}
                </div>
              )}

              {/* Pentest Plan Tab */}
              {activeTab === "pentest" && (
                <div>
                  <h3 className="mb-3 font-semibold">Penetration Testing Plan</h3>
                  {report.pentestPlan.scope && (
                    <div className="mb-3 rounded-lg border border-border bg-surface p-3">
                      <span className="text-xs font-medium text-muted">Scope:</span>
                      <p className="text-xs">{report.pentestPlan.scope}</p>
                      <span className="mt-1 text-xs font-medium text-muted">Methodology:</span>
                      <p className="text-xs">{report.pentestPlan.methodology}</p>
                    </div>
                  )}

                  {/* Phase Cards */}
                  {report.pentestPlan.phases.length > 0 ? (
                    <div className="space-y-2">
                      {report.pentestPlan.phases.map((phase, i) => {
                        const phaseColors: Record<string, string> = {
                          recon: "bg-blue-500/20 text-blue-400",
                          scanning: "bg-cyan-500/20 text-cyan-400",
                          exploitation: "bg-red-500/20 text-red-400",
                          "post-exploit": "bg-orange-500/20 text-orange-400",
                          reporting: "bg-green-500/20 text-green-400",
                        };
                        return (
                          <div key={i} className="rounded-lg border border-border bg-surface">
                            <button
                              onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                              className="flex w-full items-center gap-2 p-3 text-left hover:bg-surface-elevated"
                            >
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${phaseColors[phase.phase] ?? "bg-surface-elevated text-muted"}`}>
                                {phase.phase.toUpperCase()}
                              </span>
                              <span className="text-sm font-medium">
                                {phase.tasks.length} task{phase.tasks.length !== 1 ? "s" : ""}
                              </span>
                              <span className="ml-auto text-xs text-muted">
                                {expandedPhase === i ? "Collapse" : "Expand"}
                              </span>
                            </button>
                            {expandedPhase === i && (
                              <div className="border-t border-border p-3">
                                <div className="space-y-2">
                                  {phase.tasks.map((task, j) => (
                                    <div key={j} className="rounded border border-border/50 bg-background p-2">
                                      <div className="text-xs font-medium">{task.task}</div>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {task.tools.map((tool, k) => (
                                          <span key={k} className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
                                            {tool}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="mt-1 text-xs text-muted">{task.expected_output}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No pentest phases defined.</p>
                  )}

                  {/* Testing Scripts */}
                  {report.pentestPlan.testing_scripts.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Testing Scripts</h4>
                      <div className="space-y-2">
                        {report.pentestPlan.testing_scripts.map((script, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface">
                            <button
                              onClick={() => setExpandedScript(expandedScript === i ? null : i)}
                              className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                            >
                              <div>
                                <span className="text-sm font-medium">{script.name}</span>
                                <p className="text-xs text-muted">{script.purpose}</p>
                              </div>
                              <span className="text-xs text-muted">
                                {expandedScript === i ? "Collapse" : "Expand"}
                              </span>
                            </button>
                            {expandedScript === i && (
                              <div className="border-t border-border p-3">
                                <pre className="max-h-60 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                                  <code className="font-mono">{script.code}</code>
                                </pre>
                                <p className="mt-2 text-xs text-warning">{script.ethical_notice}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance Tab */}
              {activeTab === "compliance" && (
                <div>
                  <h3 className="mb-3 font-semibold">Compliance Checks</h3>
                  {report.pentestPlan.compliance_checks.length > 0 ? (
                    <div className="space-y-3">
                      {report.pentestPlan.compliance_checks.map((check, i) => {
                        const standardColors: Record<string, string> = {
                          SOC2: "bg-blue-500/20 text-blue-400",
                          HIPAA: "bg-emerald-500/20 text-emerald-400",
                          "PCI-DSS": "bg-orange-500/20 text-orange-400",
                          GDPR: "bg-violet-500/20 text-violet-400",
                          ISO27001: "bg-cyan-500/20 text-cyan-400",
                        };
                        return (
                          <div key={i} className="rounded-lg border border-border bg-surface p-4">
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-bold ${standardColors[check.standard] ?? "bg-surface-elevated text-muted"}`}>
                                {check.standard}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              {check.requirements.map((req, j) => (
                                <div key={j} className="flex items-center gap-2 py-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                  <span className="text-xs">{req}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 rounded bg-surface-elevated p-2">
                              <span className="text-xs font-medium text-muted">Test Method:</span>
                              <p className="text-xs">{check.test_method}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No compliance checks performed. Select compliance targets before running the analysis.</p>
                  )}
                </div>
              )}
            </div>

            {/* Cross-Reference Issues */}
            {(report.crossReference.vulns_without_mitigations.length > 0 ||
              report.crossReference.threats_without_detection.length > 0 ||
              report.crossReference.crypto_inconsistencies.length > 0 ||
              report.crossReference.untested_surfaces.length > 0) && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <h4 className="text-xs font-bold uppercase text-warning">Cross-Reference Issues</h4>
                <ul className="mt-1 space-y-0.5">
                  {report.crossReference.vulns_without_mitigations.map((s, i) => (
                    <li key={`vwm-${i}`} className="text-xs">Unmitigated vulnerability: {s}</li>
                  ))}
                  {report.crossReference.threats_without_detection.map((s, i) => (
                    <li key={`twd-${i}`} className="text-xs">Threat without detection: {s}</li>
                  ))}
                  {report.crossReference.crypto_inconsistencies.map((s, i) => (
                    <li key={`ci-${i}`} className="text-xs">Crypto inconsistency: {s}</li>
                  ))}
                  {report.crossReference.untested_surfaces.map((s, i) => (
                    <li key={`us-${i}`} className="text-xs">Untested surface: {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quality Notes */}
            {report.crossReference.quality_notes.length > 0 && (
              <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <h4 className="text-xs font-bold uppercase text-blue-400">Suggestions</h4>
                <ul className="mt-1 space-y-0.5">
                  {report.crossReference.quality_notes.map((note, i) => (
                    <li key={i} className="text-xs">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={handleCopySemgrepRules}
                className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/30"
              >
                Copy Semgrep Rules
              </button>
              <button
                onClick={handleCopySecurityCode}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
              >
                Copy Security Code
              </button>
              <button
                onClick={handleExportReport}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Export Full Report
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
