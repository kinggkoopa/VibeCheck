"use client";

import { useState, useTransition, useRef } from "react";
import type {
  UnrealVibeReport,
  UnrealVibeMessage,
  UnrealFidelityScore,
} from "@/core/agents/unreal-vibe-graph";
import { UNREAL_TEMPLATES } from "@/lib/unreal-blueprint-utils";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "blueprint-creator": { label: "Blueprint Creator", color: "text-blue-400" },
  "level-designer": { label: "Level Designer", color: "text-green-400" },
  "asset-handler": { label: "Asset Handler", color: "text-cyan-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  "cpp-engineer": { label: "C++ Engineer", color: "text-orange-400" },
  "monetization-advisor": { label: "Monetization Advisor", color: "text-yellow-400" },
  assembler: { label: "Report Assembler", color: "text-purple-400" },
};

const SCORE_LABELS: Record<keyof UnrealFidelityScore, string> = {
  graphics: "Graphics",
  gameplay: "Gameplay",
  performance: "Performance",
  audio: "Audio",
  monetization: "Monetization",
  overall: "Overall",
};

const TEMPLATE_OPTIONS = Object.entries(UNREAL_TEMPLATES).map(([key, t]) => ({
  key,
  label: t.label,
  description: t.description,
  complexity: t.complexity,
}));

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

export function UnrealLevelUI() {
  const [idea, setIdea] = useState("");
  const [template, setTemplate] = useState("");
  const [report, setReport] = useState<UnrealVibeReport | null>(null);
  const [messages, setMessages] = useState<UnrealVibeMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [expandedBp, setExpandedBp] = useState<number | null>(null);
  const [showCppCode, setShowCppCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);
    setExpandedBp(null);
    setShowCppCode(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/unreal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: idea.trim(),
            template: template || undefined,
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
        setError(err instanceof Error ? err.message : "Failed to run Unreal Vibe swarm");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Game Idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            rows={4}
            placeholder='e.g., "A souls-like action RPG set in a cyberpunk city with grapple hook traversal" or "Multiplayer arena shooter with destructible environments and class-based abilities"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Template <span className="text-muted">(optional)</span>
          </label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Custom (no template)</option>
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} ({t.complexity}) - {t.description}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted">
          Disclaimer: Generated UE5 projects are starting points. Review all Blueprints, C++ code, and level layouts before use in production. Always validate physics and math operations.
        </p>

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
          {pending ? "Generating UE Project..." : "Generate UE Project"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            7 agents designing: Blueprints, levels, assets, C++ systems, monetization, validation, assembly...
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
                <span className="text-sm text-muted">Dispatching Unreal Engine design agents...</span>
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

      {/* Unreal Vibe Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header with Fidelity Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Unreal Vibe Report</h2>
                <div className={`rounded-full px-4 py-2 text-2xl font-black ${scoreBg(report.fidelityScore.overall)}`}>
                  <span className={scoreColor(report.fidelityScore.overall)}>
                    {report.fidelityScore.overall}
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

            {/* Fidelity Score Breakdown */}
            <div className="mt-4 grid grid-cols-6 gap-2">
              {(Object.entries(report.fidelityScore) as Array<[keyof UnrealFidelityScore, number]>).map(
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

            {/* Project Summary */}
            {report.summary && (
              <div className="mt-4 rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-medium">{report.summary}</p>
              </div>
            )}

            {/* Supervisor Notes */}
            {report.supervisorNotes.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Supervisor Notes</h3>
                <ul className="space-y-1">
                  {report.supervisorNotes.map((note, i) => (
                    <li key={i} className="text-sm text-muted">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Blueprints Viewer */}
            {report.blueprints.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Blueprints ({report.blueprints.length})</h3>
                <div className="space-y-2">
                  {report.blueprints.map((bp, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface">
                      <button
                        onClick={() => setExpandedBp(expandedBp === i ? null : i)}
                        className="flex w-full items-center justify-between p-3 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                            {bp.type}
                          </span>
                          <span className="text-sm font-medium">{bp.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span>{bp.variables.length} vars</span>
                          <span>{bp.nodes.length} nodes</span>
                          <span>{expandedBp === i ? "Collapse" : "Expand"}</span>
                        </div>
                      </button>
                      {expandedBp === i && (
                        <div className="border-t border-border p-3">
                          <p className="text-xs text-muted">{bp.description}</p>
                          {bp.variables.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-bold uppercase text-muted">Variables</span>
                              <div className="mt-1 space-y-1">
                                {bp.variables.map((v, vi) => (
                                  <div key={vi} className="flex gap-2 text-xs">
                                    <span className="text-primary-light">{v.name}</span>
                                    <span className="text-muted">({v.type})</span>
                                    <span className="text-muted">= {v.default}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {bp.nodes.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-bold uppercase text-muted">Nodes</span>
                              <div className="mt-1 space-y-1">
                                {bp.nodes.map((node, ni) => (
                                  <div key={ni} className="text-xs">
                                    <span className="rounded bg-surface-elevated px-1 py-0.5 font-mono text-primary-light">
                                      {node.type}
                                    </span>
                                    {" "}
                                    <span>{node.properties.name || ""}</span>
                                    {node.connections.length > 0 && (
                                      <span className="text-muted"> -&gt; {node.connections.join(", ")}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Level Layouts */}
            {report.levels.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Level Layouts ({report.levels.length})</h3>
                <div className="space-y-2">
                  {report.levels.map((level, i) => (
                    <div key={i} className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <span className="text-sm font-medium">{level.name}</span>
                      <p className="mt-1 text-xs text-muted">{level.layout_description}</p>
                      {level.key_areas.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-bold uppercase text-muted">Key Areas</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {level.key_areas.map((area, ai) => (
                              <span key={ai} className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {level.actors.length > 0 && (
                        <p className="mt-1 text-xs text-muted">{level.actors.length} actors placed</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C++ Code Viewer */}
            {report.cppFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">C++ Files ({report.cppFiles.length})</h3>
                  <button
                    onClick={() => setShowCppCode(!showCppCode)}
                    className="text-sm font-medium text-primary-light hover:underline"
                  >
                    {showCppCode ? "Hide Code" : "Show Code"}
                  </button>
                </div>
                {showCppCode && (
                  <div className="mt-2 space-y-3">
                    {report.cppFiles.map((file, i) => (
                      <div key={i} className="rounded-lg border border-orange-500/20 bg-orange-500/5">
                        <div className="border-b border-orange-500/20 p-2">
                          <span className="text-sm font-medium">{file.class_name}</span>
                          <span className="ml-2 text-xs text-muted">: {file.parent_class}</span>
                        </div>
                        <div className="p-2">
                          <span className="text-xs font-bold uppercase text-muted">Header (.h)</span>
                          <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-surface p-2 text-xs">
                            <code>{file.header}</code>
                          </pre>
                        </div>
                        <div className="p-2">
                          <span className="text-xs font-bold uppercase text-muted">Source (.cpp)</span>
                          <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-surface p-2 text-xs">
                            <code>{file.source}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Asset Structure */}
            {report.assets.folder_structure.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Asset Structure</h3>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="space-y-1">
                    {report.assets.folder_structure.map((folder, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="font-mono text-cyan-400">{folder.path}</span>
                        <span className="text-muted">- {folder.purpose}</span>
                      </div>
                    ))}
                  </div>
                  {report.assets.material_setup.length > 0 && (
                    <div className="mt-2 border-t border-border pt-2">
                      <span className="text-xs font-bold uppercase text-muted">Materials ({report.assets.material_setup.length})</span>
                      <div className="mt-1 space-y-1">
                        {report.assets.material_setup.map((mat, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-primary-light">{(mat as Record<string, unknown>).name as string}</span>
                            {Boolean((mat as Record<string, unknown>).nanite_compatible) && (
                              <span className="rounded bg-green-500/20 px-1 py-0.5 text-green-400">Nanite</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Monetization Strategy */}
            {report.monetization && Object.keys(report.monetization.monetization_model).length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold">Monetization Strategy</h3>
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                  {Boolean((report.monetization.monetization_model as Record<string, unknown>).type) && (
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                        {(report.monetization.monetization_model as Record<string, unknown>).type as string}
                      </span>
                      {Boolean((report.monetization.monetization_model as Record<string, unknown>).base_price) && (
                        <span className="text-xs text-muted">
                          Base: {(report.monetization.monetization_model as Record<string, unknown>).base_price as string}
                        </span>
                      )}
                    </div>
                  )}
                  {Boolean((report.monetization.monetization_model as Record<string, unknown>).reasoning) && (
                    <p className="mt-1 text-xs text-muted">
                      {(report.monetization.monetization_model as Record<string, unknown>).reasoning as string}
                    </p>
                  )}
                  {report.monetization.dlc_plan.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-bold uppercase text-muted">DLC Plan</span>
                      <div className="mt-1 space-y-1">
                        {report.monetization.dlc_plan.map((dlc, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-primary-light">{(dlc as Record<string, unknown>).name as string}</span>
                            <span className="text-muted">({(dlc as Record<string, unknown>).type as string})</span>
                            {(dlc as Record<string, unknown>).target_price != null && (
                              <span className="text-success">${(dlc as Record<string, unknown>).target_price as number}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.monetization.estimated_revenue && Object.keys(report.monetization.estimated_revenue).length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2 border-t border-yellow-500/20 pt-2">
                      {Object.entries(report.monetization.estimated_revenue).map(([key, val]) => (
                        <div key={key} className="text-center">
                          <div className="text-xs text-muted capitalize">{key.replace(/_/g, " ")}</div>
                          <div className="text-sm font-bold text-success">
                            {typeof val === "number" && key.includes("pct")
                              ? `${val}%`
                              : typeof val === "number" && val >= 1000
                                ? `$${val.toLocaleString()}`
                                : val}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.monetization.age_rating_notes.length > 0 && (
                    <div className="mt-2 border-t border-yellow-500/20 pt-2">
                      <span className="text-xs font-bold uppercase text-muted">Age Rating Notes</span>
                      <ul className="mt-1 space-y-1">
                        {report.monetization.age_rating_notes.map((note, i) => (
                          <li key={i} className="text-xs text-muted">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  const allCpp = report.cppFiles
                    .map((f) => `// === ${f.class_name}.h ===\n${f.header}\n\n// === ${f.class_name}.cpp ===\n${f.source}`)
                    .join("\n\n");
                  navigator.clipboard.writeText(allCpp);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy C++ Code
              </button>
              <button
                onClick={() => {
                  const bpText = report.blueprints
                    .map((bp) => `${bp.name} (${bp.type}): ${bp.description}\nVars: ${bp.variables.map((v) => `${v.name}:${v.type}`).join(", ")}\nNodes: ${bp.nodes.map((n) => n.properties.name || n.type).join(" -> ")}`)
                    .join("\n\n");
                  navigator.clipboard.writeText(bpText);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Blueprints
              </button>
              <button
                onClick={() => {
                  const projectText = `Unreal Vibe Report (${report.fidelityScore.overall}/10)\n\n${report.summary}\n\nBlueprints: ${report.blueprints.length}\nLevels: ${report.levels.length}\nC++ Files: ${report.cppFiles.length}`;
                  const blob = new Blob([projectText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "unreal-vibe-project.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Download Project
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
