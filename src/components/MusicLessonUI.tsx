"use client";

import { useState, useTransition, useRef } from "react";
import type {
  MusicEduReport,
  MusicEduMessage,
  MusicEduScore,
  MusicConcept,
  MusicComposition,
  MusicLesson,
  InstrumentConfig,
  HarmonicCalculation,
  QuizQuestion,
} from "@/core/agents/music-edu-graph";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "theory-analyzer": { label: "Theory Analyzer", color: "text-blue-400" },
  "composition-generator": { label: "Composition Generator", color: "text-purple-400" },
  "lesson-builder": { label: "Lesson Builder", color: "text-green-400" },
  "instrument-simulator": { label: "Instrument Simulator", color: "text-amber-400" },
  "math-harmonics": { label: "Math Harmonics", color: "text-cyan-400" },
  "monetization-advisor": { label: "Monetization Advisor", color: "text-rose-400" },
  supervisor: { label: "Supervisor", color: "text-slate-400" },
  assembler: { label: "Report Assembler", color: "text-gray-400" },
};

const SCORE_LABELS: Record<keyof MusicEduScore, string> = {
  theory_depth: "Theory Depth",
  interactivity: "Interactivity",
  audio_quality: "Audio Quality",
  pedagogy: "Pedagogy",
  engagement: "Engagement",
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

function difficultyColor(difficulty: string): string {
  if (difficulty === "beginner") return "bg-green-500/20 text-green-400";
  if (difficulty === "intermediate") return "bg-yellow-500/20 text-yellow-400";
  return "bg-red-500/20 text-red-400";
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    scale: "bg-blue-500/20 text-blue-400",
    chord: "bg-purple-500/20 text-purple-400",
    progression: "bg-indigo-500/20 text-indigo-400",
    rhythm: "bg-orange-500/20 text-orange-400",
    interval: "bg-cyan-500/20 text-cyan-400",
    key: "bg-teal-500/20 text-teal-400",
  };
  return map[category] ?? "bg-surface-elevated text-muted";
}

function sectionTypeBadge(type: string): string {
  const map: Record<string, string> = {
    explanation: "bg-blue-500/20 text-blue-400",
    exercise: "bg-green-500/20 text-green-400",
    quiz: "bg-purple-500/20 text-purple-400",
    practice: "bg-amber-500/20 text-amber-400",
  };
  return map[type] ?? "bg-surface-elevated text-muted";
}

// ── Main Component ──

export function MusicLessonUI() {
  const [idea, setIdea] = useState("");
  const [focusArea, setFocusArea] = useState<"theory" | "composition" | "instrument" | "full-app">("full-app");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [report, setReport] = useState<MusicEduReport | null>(null);
  const [messages, setMessages] = useState<MusicEduMessage[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "theory" | "compositions" | "lessons" | "instruments" | "math" | "monetization"
  >("theory");
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);
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
    setActiveTab("theory");
    setExpandedLesson(null);
    setExpandedQuiz(null);
    setExpandedConcept(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/music-edu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: idea.trim(),
            focus_area: focusArea,
            difficulty,
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
        setError(err instanceof Error ? err.message : "Failed to run Music Education swarm");
      }
    });
  }

  function handleCopyAllCode() {
    if (!report) return;
    const allCode = [
      "// === MIDI Generation Code ===",
      report.midiCode || "// No MIDI code generated",
      "",
      "// === Math Implementations ===",
      ...report.mathAnalysis.calculations.map((c) =>
        `// ${c.name}\n${c.implementation}`
      ),
    ].join("\n\n");
    navigator.clipboard.writeText(allCode);
  }

  function handleCopyLessons() {
    if (!report) return;
    const lessonData = JSON.stringify(report.lessons, null, 2);
    navigator.clipboard.writeText(lessonData);
  }

  function handleExportMidi() {
    if (!report) return;
    const midiData = JSON.stringify({
      compositions: report.compositions,
      midiCode: report.midiCode,
    }, null, 2);
    navigator.clipboard.writeText(midiData);
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Music App Idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            required
            rows={4}
            placeholder='e.g., "An interactive piano learning app that teaches jazz chord progressions with ear training exercises" or "A music theory game where students identify intervals and build scales on a virtual fretboard"'
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Focus Area
            </label>
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value as typeof focusArea)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="full-app">Full App</option>
              <option value="theory">Theory</option>
              <option value="composition">Composition</option>
              <option value="instrument">Instrument</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
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
          {pending ? "Generating Music App..." : "Generate Music App"}
        </button>

        {pending && (
          <p className="text-xs text-muted">
            8 agents building: music theory, compositions, lessons, instruments, harmonics, monetization...
          </p>
        )}

        <p className="text-xs text-muted">
          Disclaimer: Generated music education content should be reviewed by a music educator for accuracy.
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
                <span className="text-sm text-muted">Dispatching music education agents...</span>
              </div>
            )}
            {Object.entries(AGENT_CONFIG).map(([agentKey, config]) => {
              const agentMessages = messages.filter((m) => m.agent === agentKey);
              const isActive = agentMessages.length > 0;
              const isRunning = pending && !isActive;

              return (
                <div key={agentKey} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? "bg-success"
                            : isRunning
                              ? "animate-pulse bg-primary"
                              : "bg-surface-elevated"
                        }`}
                      />
                      <span className={`text-xs font-bold uppercase ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {isActive
                        ? new Date(agentMessages[agentMessages.length - 1].timestamp).toLocaleTimeString()
                        : isRunning
                          ? "Pending..."
                          : "Waiting"}
                    </span>
                  </div>
                  {isActive && (
                    <p className="mt-1 text-xs text-muted line-clamp-2">
                      {agentMessages[agentMessages.length - 1].content.slice(0, 200)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Music Education Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            {/* Header with Music Edu Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Music Education Report</h2>
                <div className={`rounded-full px-4 py-2 text-2xl font-black ${scoreBg(report.musicEduScore.overall)}`}>
                  <span className={scoreColor(report.musicEduScore.overall)}>
                    {report.musicEduScore.overall}
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
              {(Object.entries(report.musicEduScore) as Array<[keyof MusicEduScore, number]>).map(
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
              {(["theory", "compositions", "lessons", "instruments", "math", "monetization"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary-light"
                      : "text-muted hover:text-primary-light"
                  }`}
                >
                  {tab === "math" ? "Math / Harmonics" : tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {/* Theory Concepts Tab */}
              {activeTab === "theory" && (
                <div>
                  <h3 className="mb-3 font-semibold">Theory Concepts</h3>

                  {/* Learning Path */}
                  {report.learningPath.length > 0 && (
                    <div className="mb-4 rounded-lg border border-border bg-surface p-3">
                      <h4 className="text-xs font-bold uppercase text-muted">Learning Path</h4>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {report.learningPath.map((step, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary-light">
                              {i + 1}. {step}
                            </span>
                            {i < report.learningPath.length - 1 && (
                              <span className="text-xs text-muted">-&gt;</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {report.prerequisites.length > 0 && (
                    <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                      <h4 className="text-xs font-bold uppercase text-blue-400">Prerequisites</h4>
                      <ul className="mt-1 space-y-0.5">
                        {report.prerequisites.map((prereq, i) => (
                          <li key={i} className="text-xs text-muted">- {prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concept Cards */}
                  {report.concepts.length > 0 ? (
                    <div className="space-y-2">
                      {report.concepts.map((concept, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface">
                          <button
                            onClick={() => setExpandedConcept(expandedConcept === i ? null : i)}
                            className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${categoryColor(concept.category)}`}>
                                {concept.category}
                              </span>
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${difficultyColor(concept.difficulty)}`}>
                                {concept.difficulty}
                              </span>
                              <span className="text-sm font-medium">{concept.name}</span>
                            </div>
                            <span className="text-xs text-muted">
                              {expandedConcept === i ? "Collapse" : "Expand"}
                            </span>
                          </button>
                          {expandedConcept === i && (
                            <div className="border-t border-border p-3">
                              <p className="text-xs">{concept.description}</p>
                              {concept.notation && (
                                <div className="mt-2">
                                  <span className="text-xs font-medium text-muted">Notation: </span>
                                  <code className="rounded bg-background px-2 py-0.5 font-mono text-xs text-primary-light">
                                    {concept.notation}
                                  </code>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No theory concepts generated.</p>
                  )}
                </div>
              )}

              {/* Compositions Tab */}
              {activeTab === "compositions" && (
                <div>
                  <h3 className="mb-3 font-semibold">Compositions</h3>
                  {report.compositions.length > 0 ? (
                    <div className="space-y-3">
                      {report.compositions.map((comp, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{comp.name}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(report.midiCode || "");
                              }}
                              className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400 hover:bg-purple-500/30"
                            >
                              Copy MIDI Code
                            </button>
                          </div>
                          <div className="mt-2 flex items-center gap-4">
                            <div>
                              <span className="text-xs text-muted">Tempo: </span>
                              <span className="text-xs font-medium">{comp.tempo_bpm} BPM</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted">Time: </span>
                              <span className="text-xs font-medium">{comp.time_signature}</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted">Key: </span>
                              <span className="text-xs font-medium">{comp.key}</span>
                            </div>
                          </div>
                          {comp.tracks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {comp.tracks.map((track, j) => (
                                <div key={j} className="flex items-center gap-2 rounded border border-border/50 bg-background px-2 py-1">
                                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-400">
                                    {track.name}
                                  </span>
                                  <span className="text-xs text-muted">{track.instrument}</span>
                                  <span className="text-xs text-muted">
                                    ({track.notes.length} notes)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No compositions generated.</p>
                  )}
                </div>
              )}

              {/* Interactive Lessons Tab */}
              {activeTab === "lessons" && (
                <div>
                  <h3 className="mb-3 font-semibold">Interactive Lessons</h3>
                  {report.lessons.length > 0 ? (
                    <div className="space-y-2">
                      {report.lessons.map((lesson, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface">
                          <button
                            onClick={() => setExpandedLesson(expandedLesson === i ? null : i)}
                            className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${difficultyColor(lesson.level)}`}>
                                {lesson.level}
                              </span>
                              <span className="text-sm font-medium">{lesson.title}</span>
                              <span className="text-xs text-muted">
                                ~{lesson.estimated_minutes} min
                              </span>
                            </div>
                            <span className="text-xs text-muted">
                              {expandedLesson === i ? "Collapse" : "Expand"}
                            </span>
                          </button>
                          {expandedLesson === i && (
                            <div className="border-t border-border p-3">
                              {/* Objectives */}
                              {lesson.objectives.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-bold uppercase text-muted">Objectives</h5>
                                  <ul className="mt-1 space-y-0.5">
                                    {lesson.objectives.map((obj, j) => (
                                      <li key={j} className="text-xs">- {obj}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Sections */}
                              {lesson.sections.length > 0 && (
                                <div className="space-y-2">
                                  {lesson.sections.map((section, j) => (
                                    <div key={j} className="rounded border border-border/50 bg-background p-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${sectionTypeBadge(section.type)}`}>
                                          {section.type}
                                        </span>
                                        {section.interactive_config && (
                                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                                            {section.interactive_config.type}
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-1 text-xs">{section.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No lessons generated.</p>
                  )}

                  {/* Quiz Bank */}
                  {report.quizBank.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Quiz Bank</h4>
                      <div className="space-y-2">
                        {report.quizBank.map((quiz, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface">
                            <button
                              onClick={() => setExpandedQuiz(expandedQuiz === i ? null : i)}
                              className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-elevated"
                            >
                              <span className="text-xs font-medium">Q{i + 1}: {quiz.question}</span>
                              <span className="text-xs text-muted">
                                {expandedQuiz === i ? "Hide answer" : "Show answer"}
                              </span>
                            </button>
                            {expandedQuiz === i && (
                              <div className="border-t border-border p-3">
                                <div className="space-y-1">
                                  {quiz.options.map((opt, j) => (
                                    <div
                                      key={j}
                                      className={`rounded px-2 py-1 text-xs ${
                                        j === quiz.correct
                                          ? "bg-success/20 font-medium text-success"
                                          : "text-muted"
                                      }`}
                                    >
                                      {String.fromCharCode(65 + j)}. {opt}
                                      {j === quiz.correct && " (correct)"}
                                    </div>
                                  ))}
                                </div>
                                {quiz.explanation && (
                                  <p className="mt-2 text-xs text-muted">
                                    Explanation: {quiz.explanation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instrument Configs Tab */}
              {activeTab === "instruments" && (
                <div>
                  <h3 className="mb-3 font-semibold">Instrument Configurations</h3>
                  {report.instruments.length > 0 ? (
                    <div className="space-y-3">
                      {report.instruments.map((inst, i) => {
                        const typeLabel = inst.type.charAt(0).toUpperCase() + inst.type.slice(1);
                        const typeColors: Record<string, string> = {
                          piano: "bg-blue-500/20 text-blue-400",
                          guitar: "bg-amber-500/20 text-amber-400",
                          drums: "bg-red-500/20 text-red-400",
                          staff: "bg-green-500/20 text-green-400",
                        };
                        return (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeColors[inst.type] ?? "bg-surface-elevated text-muted"}`}>
                                {typeLabel}
                              </span>
                              <span className="text-sm font-medium">
                                {typeLabel} Interface
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted">Range:</span>
                                <span className="text-xs font-medium">{inst.config.range}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted">Input mappings:</span>
                                <span className="text-xs font-medium">{inst.config.input_map.length} keys/positions</span>
                              </div>
                              {inst.config.layout && (
                                <p className="text-xs text-muted">Layout: {inst.config.layout}</p>
                              )}
                              {inst.config.visual_feedback && (
                                <p className="text-xs text-muted">Feedback: {inst.config.visual_feedback}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No instrument configurations generated.</p>
                  )}
                </div>
              )}

              {/* Math / Harmonics Tab */}
              {activeTab === "math" && (
                <div>
                  <h3 className="mb-3 font-semibold">Math / Harmonics</h3>

                  {/* Frequency Table */}
                  {report.mathAnalysis.frequency_table.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold">Frequency Table</h4>
                      <div className="rounded-lg border border-border bg-surface">
                        <div className="grid grid-cols-3 gap-0 border-b border-border bg-surface-elevated p-2">
                          <span className="text-xs font-bold text-muted">Note</span>
                          <span className="text-xs font-bold text-muted">Frequency (Hz)</span>
                          <span className="text-xs font-bold text-muted">MIDI #</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {report.mathAnalysis.frequency_table.map((entry, i) => (
                            <div key={i} className="grid grid-cols-3 gap-0 border-b border-border/50 p-2 last:border-0">
                              <span className="text-xs font-medium text-primary-light">{entry.note}</span>
                              <span className="font-mono text-xs">{entry.frequency_hz.toFixed(2)}</span>
                              <span className="font-mono text-xs">{entry.midi_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formula Cards */}
                  {report.mathAnalysis.calculations.length > 0 ? (
                    <div className="space-y-2">
                      {report.mathAnalysis.calculations.map((calc, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{calc.name}</span>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                              calc.verified
                                ? "bg-success/20 text-success"
                                : "bg-warning/20 text-warning"
                            }`}>
                              {calc.verified ? "Verified" : "Unverified"}
                            </span>
                          </div>
                          {calc.formula && (
                            <pre className="mt-2 rounded border border-border/50 bg-background p-2 font-mono text-xs">
                              {calc.formula}
                            </pre>
                          )}
                          <p className="mt-1 text-xs">{calc.explanation}</p>
                          {calc.implementation && (
                            <pre className="mt-2 max-h-40 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                              <code className="font-mono">{calc.implementation}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No harmonic calculations generated.</p>
                  )}

                  {/* Harmonic Analysis */}
                  {(report.mathAnalysis.harmonic_analysis.overtone_series.length > 0 ||
                    report.mathAnalysis.harmonic_analysis.consonance_ranking.length > 0) && (
                    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                      <h4 className="text-sm font-semibold">Harmonic Analysis</h4>
                      {report.mathAnalysis.harmonic_analysis.overtone_series.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-muted">Overtone Series:</span>
                          <ul className="mt-1 space-y-0.5">
                            {report.mathAnalysis.harmonic_analysis.overtone_series.map((ot, i) => (
                              <li key={i} className="text-xs">{ot}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.mathAnalysis.harmonic_analysis.consonance_ranking.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-muted">Consonance Ranking:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {report.mathAnalysis.harmonic_analysis.consonance_ranking.map((cr, i) => (
                              <span key={i} className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
                                {cr}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Monetization Tab */}
              {activeTab === "monetization" && (
                <div>
                  <h3 className="mb-3 font-semibold">Monetization Strategy</h3>

                  {/* Model */}
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-muted">Model</div>
                        <div className="text-lg font-bold capitalize text-primary-light">
                          {report.monetization.model}
                        </div>
                      </div>
                      {report.monetization.estimated_revenue && (
                        <div className="flex-1">
                          <div className="text-xs text-muted">Revenue Estimate</div>
                          <div className="text-sm font-medium text-success">
                            {report.monetization.estimated_revenue}
                          </div>
                        </div>
                      )}
                    </div>
                    {report.monetization.content_strategy && (
                      <p className="mt-2 text-xs text-muted">{report.monetization.content_strategy}</p>
                    )}
                  </div>

                  {/* Pricing Tiers */}
                  {report.monetization.tiers.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Pricing Tiers</h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {report.monetization.tiers.map((tier, i) => (
                          <div key={i} className="rounded-lg border border-border bg-surface p-3">
                            <div className="text-sm font-bold">{tier.name}</div>
                            <div className="mt-1 text-lg font-bold text-success">{tier.price}</div>
                            <ul className="mt-2 space-y-0.5">
                              {tier.features.map((feat, j) => (
                                <li key={j} className="text-xs text-muted">- {feat}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platform Suggestions */}
                  {report.monetization.platform_suggestions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold">Platform Suggestions</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.monetization.platform_suggestions.map((plat, i) => (
                          <span key={i} className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-400">
                            {plat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Consistency Issues */}
            {report.consistencyCheck.issues.length > 0 && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <h4 className="text-xs font-bold uppercase text-warning">Consistency Issues</h4>
                <ul className="mt-1 space-y-0.5">
                  {report.consistencyCheck.issues.map((issue, i) => (
                    <li key={i} className="text-xs">{issue}</li>
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
                onClick={handleCopyAllCode}
                className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/30"
              >
                Copy All Code
              </button>
              <button
                onClick={handleCopyLessons}
                className="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/30"
              >
                Copy Lessons
              </button>
              <button
                onClick={handleExportMidi}
                className="rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
              >
                Export MIDI Data
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
