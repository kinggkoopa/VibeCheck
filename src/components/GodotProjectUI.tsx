"use client";

import { useState, useTransition, useRef } from "react";
import type {
  GodotVibeReport,
  GodotVibeMessage,
  GameAlphaScore,
  GodotScene,
  SceneNode,
} from "@/core/agents/godot-vibe-graph";
import { GODOT_TEMPLATES, generateProjectStructure, generateZipManifest, getTemplate } from "@/lib/godot-templates";
import type { ProjectFile } from "@/lib/godot-templates";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "scene-builder": { label: "Scene Builder", color: "text-green-400" },
  "script-generator": { label: "Script Generator", color: "text-cyan-400" },
  "asset-integrator": { label: "Asset Integrator", color: "text-blue-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  "math-guardian": { label: "Math Guardian", color: "text-yellow-400" },
  "monetization-advisor": { label: "Monetization Advisor", color: "text-orange-400" },
  assembler: { label: "Report Assembler", color: "text-purple-400" },
};

const SCORE_LABELS: Record<keyof GameAlphaScore, string> = {
  playability: "Playability",
  polish: "Polish",
  fun_factor: "Fun Factor",
  technical: "Technical",
  monetization: "Monetization",
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

function correctnessColor(correctness: string): string {
  if (correctness === "valid") return "text-success";
  if (correctness === "warning") return "text-warning";
  return "text-danger";
}

// ── Scene Tree Renderer ──

function SceneTreeNode({ node, depth = 0 }: { node: SceneNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className="flex cursor-pointer items-center gap-1 py-0.5 hover:bg-surface-elevated"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <span className="text-xs text-muted">{expanded ? "v" : ">"}</span>
        ) : (
          <span className="text-xs text-muted">-</span>
        )}
        <span className="text-xs font-medium text-primary-light">{node.name}</span>
        <span className="text-xs text-muted">({node.type})</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <SceneTreeNode key={`${child.name}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Template selector options ──

const templateOptions = Object.entries(GODOT_TEMPLATES).map(([key, tmpl]) => ({
  key,
  label: tmpl.label,
  gameType: tmpl.gameType,
}));

// ── Main Component ──

export function GodotProjectUI() {
  const [idea, setIdea] = useState("");
  const [gameType, setGameType] = useState<"2d" | "3d">("2d");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [report, setReport] = useState<GodotVibeReport | null>(null);
  const [messages, setMessages] = useState<GodotVibeMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<"scenes" | "scripts" | "structure" | "math" | "monetization">("scenes");
  const [expandedScript, setExpandedScript] = useState<number | null>(null);
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
    setActiveTab("scenes");
    setExpandedScript(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/godot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: idea.trim(),
            game_type: gameType,
            template: selectedTemplate || undefined,
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
        setError(err instanceof Error ? err.message : "Failed to run Godot vibe swarm");
      }
    });
  }

  function handleDownloadZip() {
    if (!report) return;

    // Build project files from report + template
    const files: ProjectFile[] = [];

    // project.godot
    if (report.projectConfig) {
      files.push({ path: "project.godot", content: report.projectConfig });
    }

    // Scripts
    for (const script of report.scripts) {
      files.push({
        path: `scripts/${script.filename}`,
        content: script.gdscript_code,
      });
    }

    // Shaders
    for (const shader of report.assets.shader_code) {
      files.push({
        path: `${shader.path}${shader.filename}`,
        content: shader.code,
      });
    }

    // Folder placeholders
    for (const folder of report.assets.folder_structure) {
      files.push({
        path: `${folder.path}.gdkeep`,
        content: `# ${folder.purpose}`,
      });
    }

    const manifest = generateZipManifest(files);

    // Copy manifest to clipboard as JSON (user can use a ZIP tool to assemble)
    const manifestJson = JSON.stringify(manifest, null, 2);
    navigator.clipboard.writeText(manifestJson).catch(() => {
      // Fallback: trigger a download of the manifest
      const blob = new Blob([manifestJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "godot-project-manifest.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleCopyScripts() {
    if (!report) return;
    const allScripts = report.scripts
      .map((s) => `# === ${s.filename} ===\n# Attached to: ${s.attached_to}\n\n${s.gdscript_code}`)
      .join("\n\n\n");
    navigator.clipboard.writeText(allScripts);
  }

  // Filter templates by selected game type
  const filteredTemplates = templateOptions.filter(
    (t) => t.gameType === gameType
  );

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Game Idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            rows={4}
            placeholder='e.g., "A 2D roguelike where you play as a cat exploring procedurally generated dungeons" or "A 3D first-person horror game set in an abandoned space station"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Game Type
            </label>
            <select
              value={gameType}
              onChange={(e) => {
                setGameType(e.target.value as "2d" | "3d");
                setSelectedTemplate("");
              }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="2d">2D</option>
              <option value="3d">3D</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Template <span className="text-muted">(optional)</span>
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">None (generate from scratch)</option>
              {filteredTemplates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
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
          {pending ? "Generating Godot project..." : "Generate Godot Project"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            7 agents building: scene trees, GDScript code, project config, math validation, monetization strategy...
          </p>
        )}

        <p className="text-xs text-muted">
          Disclaimer: Generated Godot projects are starting points. Review and test thoroughly.
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
                <span className="text-sm text-muted">Dispatching Godot development agents...</span>
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

      {/* Godot Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header with Game Alpha Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Godot Project Report</h2>
                <div className={`rounded-full px-4 py-2 text-2xl font-black ${scoreBg(report.gameAlphaScore.overall)}`}>
                  <span className={scoreColor(report.gameAlphaScore.overall)}>
                    {report.gameAlphaScore.overall}
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

            {/* Score Grid */}
            <div className="mt-4 grid grid-cols-6 gap-2">
              {(Object.entries(report.gameAlphaScore) as Array<[keyof GameAlphaScore, number]>).map(
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
            </div>

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 border-b border-border">
              {(["scenes", "scripts", "structure", "math", "monetization"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-primary-light"
                  }`}
                >
                  {tab === "math" ? "Math Analysis" : tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {/* Scenes Tab */}
              {activeTab === "scenes" && (
                <div>
                  <h3 className="mb-3 font-semibold">Scene Tree</h3>
                  {report.scenes.length > 0 ? (
                    <div className="space-y-3">
                      {report.scenes.map((scene, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                              {scene.root_node_type}
                            </span>
                            <span className="text-sm font-medium">{scene.name}</span>
                          </div>
                          {scene.description && (
                            <p className="mt-1 text-xs text-muted">{scene.description}</p>
                          )}
                          <div className="mt-2 rounded border border-border/50 bg-background p-2">
                            {scene.children.map((child, j) => (
                              <SceneTreeNode key={`${child.name}-${j}`} node={child} depth={0} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No scenes generated.</p>
                  )}
                </div>
              )}

              {/* Scripts Tab */}
              {activeTab === "scripts" && (
                <div>
                  <h3 className="mb-3 font-semibold">GDScript Files</h3>
                  {report.scripts.length > 0 ? (
                    <div className="space-y-2">
                      {report.scripts.map((script, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface">
                          <button
                            onClick={() => setExpandedScript(expandedScript === i ? null : i)}
                            className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                          >
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-400">
                                .gd
                              </span>
                              <span className="text-sm font-medium">{script.filename}</span>
                              <span className="text-xs text-muted">- {script.attached_to}</span>
                            </div>
                            <span className="text-xs text-muted">
                              {expandedScript === i ? "Collapse" : "Expand"}
                            </span>
                          </button>
                          {script.description && (
                            <p className="px-3 pb-1 text-xs text-muted">{script.description}</p>
                          )}
                          {expandedScript === i && (
                            <div className="border-t border-border">
                              <pre className="max-h-96 overflow-auto p-3 text-xs">
                                <code className="font-mono">{script.gdscript_code}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No scripts generated.</p>
                  )}
                </div>
              )}

              {/* Project Structure Tab */}
              {activeTab === "structure" && (
                <div>
                  <h3 className="mb-3 font-semibold">Project Structure</h3>
                  {report.assets.folder_structure.length > 0 ? (
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="space-y-1">
                        {report.assets.folder_structure.map((folder, i) => (
                          <div key={i} className="flex items-center gap-2 py-0.5">
                            <span className="font-mono text-xs text-primary-light">{folder.path}</span>
                            <span className="text-xs text-muted">- {folder.purpose}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No folder structure generated.</p>
                  )}

                  {/* Asset Manifest */}
                  {report.assets.asset_manifest.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Asset Manifest</h4>
                      <div className="space-y-1">
                        {report.assets.asset_manifest.map((asset, i) => (
                          <div key={i} className="flex items-center gap-2 rounded border border-border/50 bg-surface px-2 py-1">
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                              {asset.type}
                            </span>
                            <span className="font-mono text-xs">{asset.path}</span>
                            {asset.placeholder && (
                              <span className="text-xs text-muted">(placeholder)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shaders */}
                  {report.assets.shader_code.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Shaders</h4>
                      <div className="space-y-2">
                        {report.assets.shader_code.map((shader, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                                .gdshader
                              </span>
                              <span className="text-sm font-medium">{shader.filename}</span>
                            </div>
                            {shader.description && (
                              <p className="mt-1 text-xs text-muted">{shader.description}</p>
                            )}
                            <pre className="mt-2 max-h-40 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                              <code className="font-mono">{shader.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Math Analysis Tab */}
              {activeTab === "math" && (
                <div>
                  <h3 className="mb-3 font-semibold">Math Analysis</h3>
                  {report.mathAnalysis.algorithms.length > 0 ? (
                    <div className="space-y-2">
                      {report.mathAnalysis.algorithms.map((algo, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase ${correctnessColor(algo.correctness)}`}>
                              {algo.correctness}
                            </span>
                            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                              {algo.category}
                            </span>
                            <span className="text-sm font-medium">{algo.name}</span>
                          </div>
                          {algo.formula && (
                            <pre className="mt-2 rounded border border-border/50 bg-background p-2 text-xs font-mono">
                              {algo.formula}
                            </pre>
                          )}
                          <p className="mt-1 text-xs">{algo.explanation}</p>
                          {algo.edge_cases.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-muted">Edge Cases:</span>
                              <ul className="mt-1 space-y-0.5">
                                {algo.edge_cases.map((ec, j) => (
                                  <li key={j} className="text-xs text-muted">- {ec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {algo.optimization_notes && (
                            <p className="mt-1 text-xs text-muted">
                              Optimization: {algo.optimization_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No algorithms analyzed.</p>
                  )}

                  {/* Balance Warnings */}
                  {report.mathAnalysis.balance_warnings.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Balance Warnings</h4>
                      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                        <ul className="space-y-1">
                          {report.mathAnalysis.balance_warnings.map((warning, i) => (
                            <li key={i} className="text-xs text-warning">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Recommended Constants */}
                  {report.mathAnalysis.recommended_constants.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Recommended Constants</h4>
                      <div className="space-y-1">
                        {report.mathAnalysis.recommended_constants.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 rounded border border-border/50 bg-surface px-3 py-1.5">
                            <code className="text-xs font-bold text-primary-light">{c.name}</code>
                            <span className="text-xs font-mono text-success">{c.value}</span>
                            <span className="text-xs text-muted">{c.reasoning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Monetization Tab */}
              {activeTab === "monetization" && (
                <div>
                  <h3 className="mb-3 font-semibold">Monetization Strategy</h3>

                  {/* Pricing */}
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-muted">Base Price</div>
                        <div className="text-2xl font-bold text-success">
                          ${report.monetization.pricing.base_price_usd}
                        </div>
                      </div>
                      {report.monetization.pricing.launch_discount_pct > 0 && (
                        <div>
                          <div className="text-xs text-muted">Launch Discount</div>
                          <div className="text-xl font-bold text-warning">
                            {report.monetization.pricing.launch_discount_pct}%
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-xs text-muted">Model</div>
                        <div className="text-sm font-medium capitalize">
                          {report.monetization.monetization_model}
                        </div>
                      </div>
                    </div>
                    {report.monetization.pricing.reasoning && (
                      <p className="mt-2 text-xs text-muted">{report.monetization.pricing.reasoning}</p>
                    )}
                  </div>

                  {/* Platform Strategy */}
                  {report.monetization.platform_strategy.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Platforms</h4>
                      <div className="space-y-2">
                        {report.monetization.platform_strategy.map((plat, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{plat.platform}</span>
                              <span className={`rounded px-2 py-0.5 text-xs ${
                                plat.priority === "primary"
                                  ? "bg-success/20 text-success"
                                  : plat.priority === "secondary"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-surface-elevated text-muted"
                              }`}>
                                {plat.priority}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted">{plat.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DLC Ideas */}
                  {report.monetization.dlc_ideas.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">DLC / Expansion Ideas</h4>
                      <div className="space-y-2">
                        {report.monetization.dlc_ideas.map((dlc, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{dlc.name}</span>
                              <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
                                {dlc.type}
                              </span>
                              <span className="text-xs text-success">${dlc.price_usd}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted">{dlc.description}</p>
                            {dlc.timeline && (
                              <p className="mt-0.5 text-xs text-muted">Timeline: {dlc.timeline}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Revenue Estimates */}
                  {Object.keys(report.monetization.estimated_revenue).length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Revenue Estimates</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(report.monetization.estimated_revenue).map(([period, value]) => (
                          <div key={period} className="rounded-lg border border-border bg-surface p-3 text-center">
                            <div className="text-xs text-muted">{period.replace(/_/g, " ")}</div>
                            <div className="mt-1 text-lg font-bold text-success">
                              {typeof value === "number" ? (value > 100 ? `$${value.toLocaleString()}` : value) : value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marketing Plan */}
                  {report.monetization.marketing_plan.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Marketing Plan</h4>
                      <ul className="space-y-1">
                        {report.monetization.marketing_plan.map((item, i) => (
                          <li key={i} className="text-xs text-muted">- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Community Strategy */}
                  {report.monetization.community_strategy && (
                    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                      <h4 className="text-sm font-semibold">Community Strategy</h4>
                      <p className="mt-1 text-xs text-muted">{report.monetization.community_strategy}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Consistency Check */}
            {(report.consistencyCheck.orphaned_scripts.length > 0 ||
              report.consistencyCheck.missing_scripts.length > 0 ||
              report.consistencyCheck.signal_issues.length > 0 ||
              report.consistencyCheck.type_mismatches.length > 0) && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <h4 className="text-xs font-bold uppercase text-warning">Consistency Issues</h4>
                <ul className="mt-1 space-y-0.5">
                  {report.consistencyCheck.orphaned_scripts.map((s, i) => (
                    <li key={`os-${i}`} className="text-xs">Orphaned script: {s}</li>
                  ))}
                  {report.consistencyCheck.missing_scripts.map((s, i) => (
                    <li key={`ms-${i}`} className="text-xs">Missing script: {s}</li>
                  ))}
                  {report.consistencyCheck.signal_issues.map((s, i) => (
                    <li key={`si-${i}`} className="text-xs">Signal issue: {s}</li>
                  ))}
                  {report.consistencyCheck.type_mismatches.map((s, i) => (
                    <li key={`tm-${i}`} className="text-xs">Type mismatch: {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quality Notes */}
            {report.consistencyCheck.quality_notes.length > 0 && (
              <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <h4 className="text-xs font-bold uppercase text-blue-400">Suggestions</h4>
                <ul className="mt-1 space-y-0.5">
                  {report.consistencyCheck.quality_notes.map((note, i) => (
                    <li key={i} className="text-xs">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={handleDownloadZip}
                className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/30"
              >
                Download Project ZIP
              </button>
              <button
                onClick={handleCopyScripts}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Copy Scripts
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
