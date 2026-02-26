"use client";

import { useState, useTransition, useRef } from "react";
import type {
  GameEngineMasterReport,
  GameEngineMessage,
  PlaytestScore,
  ProjectFile,
  GameMechanic,
  PlatformConfig,
} from "@/core/agents/game-engine-master-graph";
import { GAME_GENRE_TEMPLATES } from "@/lib/engine-adapters";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "engine-detector": { label: "Engine Detector", color: "text-blue-400" },
  "engine-adapter": { label: "Engine Adapter", color: "text-cyan-400" },
  "mechanics-builder": { label: "Mechanics Builder", color: "text-green-400" },
  supervisor: { label: "Supervisor", color: "text-yellow-400" },
  "platform-exporter": { label: "Platform Exporter", color: "text-purple-400" },
  "monetization-advisor": { label: "Monetization Advisor", color: "text-orange-400" },
  assembler: { label: "Assembler", color: "text-primary-light" },
};

const ENGINE_OPTIONS = [
  { key: "auto", label: "Auto-detect", description: "Let the swarm choose the best engine for your game" },
  { key: "unity", label: "Unity", description: "C# — cross-platform, massive asset store" },
  { key: "gamemaker", label: "GameMaker", description: "GML — best-in-class 2D workflow" },
  { key: "bevy", label: "Bevy", description: "Rust ECS — high performance, modern" },
  { key: "defold", label: "Defold", description: "Lua — tiny runtime, great for mobile" },
  { key: "godot", label: "Godot", description: "GDScript — open-source, intuitive" },
  { key: "unreal", label: "Unreal", description: "C++ — AAA graphics, photorealistic" },
];

const GENRE_OPTIONS = Object.entries(GAME_GENRE_TEMPLATES).map(([key, tmpl]) => ({
  key,
  label: tmpl.label,
}));

const SCORE_DIMENSIONS: Array<{ key: keyof Omit<PlaytestScore, "overall">; label: string }> = [
  { key: "fun_factor", label: "Fun Factor" },
  { key: "technical_quality", label: "Technical Quality" },
  { key: "polish", label: "Polish" },
  { key: "replayability", label: "Replayability" },
  { key: "monetization_fit", label: "Monetization Fit" },
];

function scoreColor(score: number): string {
  if (score >= 8) return "text-success";
  if (score >= 5) return "text-warning";
  return "text-danger";
}

function scoreBadgeColor(score: number): string {
  if (score >= 8) return "bg-success/20 text-success";
  if (score >= 5) return "bg-warning/20 text-warning";
  return "bg-danger/20 text-danger";
}

export function GameEngineSelector() {
  const [gameIdea, setGameIdea] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("auto");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [report, setReport] = useState<GameEngineMasterReport | null>(null);
  const [messages, setMessages] = useState<GameEngineMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"score" | "files" | "mechanics" | "platforms" | "monetization" | "crossengine">("score");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    if (!gameIdea.trim()) return;
    setError(null);
    setReport(null);
    setMessages([]);
    setShowReport(false);
    setCopied(false);
    setExpandedFiles(new Set());

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/game-engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: gameIdea.trim(),
            engine: selectedEngine !== "auto" ? selectedEngine : undefined,
            genre: selectedGenre || undefined,
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
        setError(
          err instanceof Error ? err.message : "Failed to run Game Engine Master"
        );
      }
    });
  }

  function handleCopyAllCode() {
    if (!report?.projectFiles.length) return;
    const allCode = report.projectFiles
      .map((f) => `// === ${f.path} ===\n${f.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(allCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadProject() {
    if (!report?.projectFiles.length) return;
    const content = report.projectFiles
      .map((f) => `// === ${f.path} ===\n${f.content}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.selectedEngine}-project.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleFileExpand(path: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  // Group files by directory
  function groupFilesByDir(files: ProjectFile[]): Record<string, ProjectFile[]> {
    const groups: Record<string, ProjectFile[]> = {};
    for (const f of files) {
      const parts = f.path.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(f);
    }
    return groups;
  }

  return (
    <div className="space-y-6">
      {/* ── Input Form ── */}
      <form ref={formRef} onSubmit={handleBuild} className="space-y-4">
        {/* Engine Selector Grid */}
        <div>
          <label className="mb-2 block text-sm font-medium">Select Engine</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ENGINE_OPTIONS.map((eng) => (
              <button
                key={eng.key}
                type="button"
                onClick={() => setSelectedEngine(eng.key)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedEngine === eng.key
                    ? "border-primary bg-primary/10 text-primary-light"
                    : "border-border bg-surface hover:bg-surface-elevated"
                }`}
              >
                <div className="text-sm font-medium">{eng.label}</div>
                <div className="mt-0.5 text-xs text-muted">{eng.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Game Idea */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Game Idea <span className="text-xs text-danger">*</span>
          </label>
          <textarea
            value={gameIdea}
            onChange={(e) => setGameIdea(e.target.value)}
            required
            rows={5}
            placeholder="Describe your game idea. The more detail, the better the project output. Example: 'A roguelike dungeon crawler with procedurally generated levels, turn-based combat, pixel art style, targeting mobile and web...'"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Genre Selector */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Genre <span className="text-xs text-muted">(optional)</span>
          </label>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Auto-detect from description</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Engine Comparison Panel (when auto-detect) */}
        {selectedEngine === "auto" && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-medium">Engine Comparison Reference</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left font-semibold">Dimension</th>
                    {["Unity", "GameMaker", "Bevy", "Defold", "Godot", "Unreal"].map((eng) => (
                      <th key={eng} className="px-2 py-2 text-center font-semibold">
                        {eng}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { dim: "2D", scores: [8, 10, 7, 9, 9, 5] },
                    { dim: "3D", scores: [9, 3, 7, 3, 7, 10] },
                    { dim: "Ease", scores: [7, 9, 4, 7, 9, 4] },
                    { dim: "Perf", scores: [8, 6, 10, 8, 7, 10] },
                    { dim: "Mobile", scores: [9, 7, 5, 10, 7, 6] },
                    { dim: "Web", scores: [7, 7, 6, 10, 8, 3] },
                  ].map((row) => (
                    <tr key={row.dim} className="border-b border-border/50">
                      <td className="px-2 py-1.5 font-medium">{row.dim}</td>
                      {row.scores.map((s, i) => (
                        <td key={i} className={`px-2 py-1.5 text-center font-bold ${scoreColor(s)}`}>
                          {s}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending || !gameIdea.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Building game project..." : "Build Game Project"}
          </button>
          {pending && (
            <p className="text-xs text-muted">
              7 agents: detecting engine, adapting project, building mechanics, supervising,
              exporting platforms, advising monetization, assembling report... this may take 30-60s.
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
                  Dispatching Game Engine Master agents...
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
                    <span
                      className={`text-xs font-bold uppercase ${config.color}`}
                    >
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

      {/* ── Report Modal ── */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Game Engine Master Report</h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${scoreBadgeColor(report.playtestScore.overall)}`}
                >
                  {report.playtestScore.overall}/10
                </span>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary-light">
                  {report.selectedEngine.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-elevated hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Summary + Engine Reasoning */}
            <p className="mt-3 text-sm">{report.summary}</p>
            {report.engineReasoning && (
              <p className="mt-1 text-xs text-muted">
                Engine choice: {report.engineReasoning}
              </p>
            )}

            {/* Meta */}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              <span>{report.projectFiles.length} project files</span>
              <span>{report.mechanics.length} mechanics</span>
              <span>{report.platforms.length} platforms</span>
              {report.crossEngineNotes.length > 0 && (
                <span>{report.crossEngineNotes.length} cross-engine notes</span>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="mt-4 flex gap-1 border-b border-border">
              {(
                [
                  { key: "score", label: "Playtest Score" },
                  { key: "files", label: "Project Files" },
                  { key: "mechanics", label: "Mechanics" },
                  { key: "platforms", label: "Platforms" },
                  { key: "monetization", label: "Monetization" },
                  ...(report.crossEngineNotes.length > 0
                    ? [{ key: "crossengine", label: "Cross-Engine" }]
                    : []),
                ] as Array<{ key: typeof activeTab; label: string }>
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {/* ── Playtest Score ── */}
              {activeTab === "score" && (
                <div className="space-y-4">
                  {/* Overall */}
                  <div className="rounded-lg border border-border bg-surface p-4 text-center">
                    <div className="text-xs font-bold uppercase text-primary-light">
                      Overall Playtest Score
                    </div>
                    <div
                      className={`mt-1 text-4xl font-bold ${scoreColor(report.playtestScore.overall)}`}
                    >
                      {report.playtestScore.overall}/10
                    </div>
                  </div>

                  {/* Dimensions Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {SCORE_DIMENSIONS.map(({ key, label }) => (
                      <div
                        key={key}
                        className="rounded-lg border border-border bg-surface p-3 text-center"
                      >
                        <div className="text-xs text-muted">{label}</div>
                        <div
                          className={`mt-1 text-2xl font-bold ${scoreColor(report.playtestScore[key])}`}
                        >
                          {report.playtestScore[key]}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Alternatives */}
                  {report.alternatives.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Engine Alternatives</h3>
                      <div className="space-y-2">
                        {report.alternatives.map((alt, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="text-sm font-medium">{alt.engine}</div>
                            <div className="mt-1 flex gap-4">
                              <div>
                                <span className="text-xs text-success">Pros: </span>
                                <span className="text-xs">{alt.pros.join(", ")}</span>
                              </div>
                              <div>
                                <span className="text-xs text-danger">Cons: </span>
                                <span className="text-xs">{alt.cons.join(", ")}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Project Files ── */}
              {activeTab === "files" && (
                <div className="space-y-4">
                  {report.projectFiles.length === 0 ? (
                    <p className="text-sm text-muted">No project files generated.</p>
                  ) : (
                    Object.entries(groupFilesByDir(report.projectFiles)).map(
                      ([dir, files]) => (
                        <div key={dir}>
                          <h4 className="mb-2 text-xs font-bold uppercase text-muted">
                            {dir}
                          </h4>
                          <div className="space-y-2">
                            {files.map((file: ProjectFile, i: number) => (
                              <div
                                key={i}
                                className="rounded-lg border border-border bg-surface"
                              >
                                <button
                                  onClick={() => toggleFileExpand(file.path)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-medium">
                                      {file.path.split("/").pop()}
                                    </span>
                                    <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                      {file.language}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted">
                                    {expandedFiles.has(file.path) ? "Collapse" : "Expand"}
                                  </span>
                                </button>
                                {expandedFiles.has(file.path) && (
                                  <pre className="max-h-64 overflow-auto border-t border-border bg-surface-elevated p-3 font-mono text-xs">
                                    {file.content}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              )}

              {/* ── Mechanics ── */}
              {activeTab === "mechanics" && (
                <div className="space-y-3">
                  {report.mechanics.length === 0 ? (
                    <p className="text-sm text-muted">No mechanics generated.</p>
                  ) : (
                    report.mechanics.map((mech: GameMechanic, i: number) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{mech.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted">{mech.description}</p>
                        {mech.engine_specific_notes && (
                          <p className="mt-1 text-xs text-warning">
                            Note: {mech.engine_specific_notes}
                          </p>
                        )}
                        {mech.code && (
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-surface-elevated p-2 font-mono text-xs">
                            {mech.code}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Platforms ── */}
              {activeTab === "platforms" && (
                <div className="space-y-3">
                  {report.platforms.length === 0 ? (
                    <p className="text-sm text-muted">No platform configs generated.</p>
                  ) : (
                    report.platforms.map((plat: PlatformConfig, i: number) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-3">
                        <div className="text-sm font-medium">{plat.name}</div>

                        {plat.build_steps.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-muted">Build Steps</div>
                            <ol className="mt-1 space-y-0.5">
                              {plat.build_steps.map((step, j) => (
                                <li key={j} className="flex gap-2 text-xs">
                                  <span className="font-bold text-muted">{j + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {plat.requirements.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-muted">Requirements</div>
                            <ul className="mt-1 space-y-0.5">
                              {plat.requirements.map((req, j) => (
                                <li key={j} className="text-xs">{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {Object.keys(plat.config).length > 0 && (
                          <pre className="mt-2 rounded border border-border bg-surface-elevated p-2 font-mono text-xs">
                            {JSON.stringify(plat.config, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}

                  {/* Deploy Guides */}
                  {report.deployGuides.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold">Deployment Guides</h3>
                      {report.deployGuides.map((guide, i) => (
                        <div key={i} className="mb-2 rounded-lg border border-border bg-surface p-3">
                          <div className="text-xs font-bold uppercase text-primary-light">
                            {guide.platform}
                          </div>
                          <ol className="mt-1 space-y-0.5">
                            {guide.steps.map((step, j) => (
                              <li key={j} className="flex gap-2 text-xs">
                                <span className="font-bold text-muted">{j + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Monetization ── */}
              {activeTab === "monetization" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Strategy:</span>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary-light uppercase">
                        {report.monetization.strategy}
                      </span>
                    </div>

                    {report.monetization.pricing.base_price && (
                      <div className="mt-2 text-xs text-muted">
                        Base price: {report.monetization.pricing.base_price}
                      </div>
                    )}
                  </div>

                  {/* Integrations */}
                  {report.monetization.integrations.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Integrations</h3>
                      <div className="space-y-2">
                        {report.monetization.integrations.map((integ, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{integ.platform}</span>
                              <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                {integ.type}
                              </span>
                            </div>
                            {integ.sdk_required && (
                              <p className="mt-1 text-xs text-muted">SDK: {integ.sdk_required}</p>
                            )}
                            {integ.setup_steps.length > 0 && (
                              <ol className="mt-1 space-y-0.5">
                                {integ.setup_steps.map((step, j) => (
                                  <li key={j} className="text-xs">{j + 1}. {step}</li>
                                ))}
                              </ol>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* IAP Tiers */}
                  {report.monetization.pricing.iap_tiers.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">In-App Purchases</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-2 py-2 text-left font-semibold">SKU</th>
                              <th className="px-2 py-2 text-left font-semibold">Name</th>
                              <th className="px-2 py-2 text-left font-semibold">Price</th>
                              <th className="px-2 py-2 text-left font-semibold">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.monetization.pricing.iap_tiers.map((tier, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-2 py-1.5 font-mono">{tier.sku}</td>
                                <td className="px-2 py-1.5">{tier.name}</td>
                                <td className="px-2 py-1.5 font-bold">{tier.price}</td>
                                <td className="px-2 py-1.5 text-muted">{tier.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Store Requirements */}
                  {report.monetization.store_requirements.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Store Requirements</h3>
                      <div className="space-y-2">
                        {report.monetization.store_requirements.map((store, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{store.store}</span>
                              {store.fees && (
                                <span className="text-xs text-muted">Fees: {store.fees}</span>
                              )}
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {store.requirements.map((req, j) => (
                                <li key={j} className="text-xs">{req}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Cross-Engine Notes ── */}
              {activeTab === "crossengine" && (
                <div className="space-y-3">
                  {report.crossEngineNotes.length === 0 ? (
                    <p className="text-sm text-muted">No cross-engine notes.</p>
                  ) : (
                    <ul className="space-y-2">
                      {report.crossEngineNotes.map((note, i) => (
                        <li
                          key={i}
                          className="rounded-lg border border-border bg-surface p-3 text-sm"
                        >
                          {note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-3">
              <p className="text-xs text-muted">
                Generated projects are starting points. Review all code, test thoroughly,
                and adapt to your specific requirements before shipping.
              </p>
            </div>

            {/* ── Actions ── */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              <button
                onClick={handleDownloadProject}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Download Project
              </button>
              <button
                onClick={handleCopyAllCode}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                {copied ? "Copied!" : "Copy Code"}
              </button>
              <button
                onClick={() => {
                  const comparison = `Engine Comparison for: ${report.selectedEngine}\n\nAlternatives:\n${report.alternatives.map((a) => `- ${a.engine}: Pros(${a.pros.join(", ")}) Cons(${a.cons.join(", ")})`).join("\n")}`;
                  navigator.clipboard.writeText(comparison);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
              >
                Compare Engines
              </button>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
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
