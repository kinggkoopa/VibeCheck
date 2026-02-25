"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import {
  executeCritiqueSwarm,
  type CritiqueReport,
  type AgentMessage,
} from "@/features/critique/actions";
import { useHotkeys } from "@/hooks/useHotkeys";
import { VoiceInput } from "@/components/VoiceInput";
import { VoiceResponse } from "@/components/VoiceResponse";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  architect: { label: "Architect", color: "text-blue-400" },
  security: { label: "Security", color: "text-red-400" },
  ux: { label: "UX", color: "text-purple-400" },
  perf: { label: "Performance", color: "text-yellow-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
  error: { bg: "bg-danger/10 border-danger/30", text: "text-danger" },
  warning: { bg: "bg-warning/10 border-warning/30", text: "text-warning" },
  info: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "bg-success/20 text-success";
  if (score >= 50) return "bg-warning/20 text-warning";
  return "bg-danger/20 text-danger";
}

export function CritiqueSwarm() {
  const [code, setCode] = useState("");
  const [report, setReport] = useState<CritiqueReport | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [iterations, setIterations] = useState(0);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // ── Keyboard shortcut: Cmd+Enter to run swarm ──
  const triggerSwarm = useCallback(() => {
    if (code.trim() && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [code, pending]);

  useHotkeys([
    { combo: { key: "Enter", meta: true }, handler: triggerSwarm, allowInEditable: true },
  ]);

  function handleRunSwarm(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);

    startTransition(async () => {
      const result = await executeCritiqueSwarm(code);

      if (result.success && result.report) {
        setReport(result.report);
        setMessages(result.messages);
        setProvider(result.provider);
        setIterations(result.iterations);
        setShowReport(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Code Input ── */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium">
              Code to Critique
            </label>
            <VoiceInput
              onTranscript={(text) =>
                setCode((prev) => (prev ? prev + "\n" + text : text))
              }
              onAutoRun={triggerSwarm}
              disabled={pending}
            />
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={12}
            placeholder="Paste your code here (or dictate with the mic). The swarm will analyze it from 4 angles: architecture, security, UX, and performance..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending || !code.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Running swarm..." : "Run Critique Swarm"}
            {!pending && (
              <kbd className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                Cmd+Enter
              </kbd>
            )}
          </button>
          {pending && (
            <p className="text-xs text-muted">
              4 specialists analyzing in parallel... this may take 15-30s.
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
                  Dispatching specialist agents...
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
                    <span className={`text-xs font-bold uppercase ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {msg.parsedReport && (
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(msg.parsedReport.score)}`}
                      >
                        {msg.parsedReport.score}/100
                      </span>
                      <span className="text-xs text-muted">
                        {msg.parsedReport.findings.length} findings
                      </span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted line-clamp-2">
                    {msg.parsedReport?.summary || msg.content.slice(0, 150)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Merged Report Modal ── */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Critique Report</h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(report.overall_score)}`}
                >
                  {report.overall_score}/100
                </span>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Meta */}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              {provider && <span>Provider: {provider}</span>}
              <span>{iterations} iteration{iterations !== 1 ? "s" : ""}</span>
              <span>{report.findings.length} total findings</span>
            </div>

            {/* Summary */}
            <p className="mt-4 text-sm">{report.summary}</p>

            {/* Agent Scores */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {Object.entries(report.agent_scores).map(([agent, score]) => {
                const config = AGENT_CONFIG[agent] ?? {
                  label: agent,
                  color: "text-muted",
                };
                return (
                  <div
                    key={agent}
                    className="rounded-lg border border-border bg-surface p-3 text-center"
                  >
                    <div className={`text-xs font-bold uppercase ${config.color}`}>
                      {config.label}
                    </div>
                    <div
                      className={`mt-1 text-lg font-bold ${
                        score >= 80
                          ? "text-success"
                          : score >= 50
                            ? "text-warning"
                            : "text-danger"
                      }`}
                    >
                      {score}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Findings */}
            {report.findings.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold">Findings</h3>
                {report.findings.map((finding, i) => {
                  const style = SEVERITY_STYLE[finding.severity] ?? SEVERITY_STYLE.info;
                  const agentConf = AGENT_CONFIG[finding.agent] ?? {
                    label: finding.agent,
                    color: "text-muted",
                  };
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${style.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase ${style.text}`}
                        >
                          {finding.severity}
                        </span>
                        <span className={`text-xs ${agentConf.color}`}>
                          {agentConf.label}
                        </span>
                        <span className="text-sm font-medium">
                          {finding.title}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{finding.detail}</p>
                      {finding.suggestion && (
                        <p className="mt-1 text-xs text-muted">
                          Fix: {finding.suggestion}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Voice Response — Speak Report */}
            <div className="mt-4 border-t border-border pt-4">
              <VoiceResponse
                text={`Critique Report. Overall score: ${report.overall_score} out of 100. ${report.summary}. ${report.findings.map((f) => `${f.severity}: ${f.title}. ${f.detail}`).join(". ")}`}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  const text = `Critique Report (${report.overall_score}/100)\n\n${report.summary}\n\n${report.findings.map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.detail}`).join("\n")}`;
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
