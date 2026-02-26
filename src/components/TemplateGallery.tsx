"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type {
  TemplateVibeReport,
  TemplateVibeMessage,
} from "@/core/agents/template-vibe-graph";
import {
  WEB_TEMPLATES,
  getTemplateCategories,
  type AppType,
  type VibeMatchScore,
} from "@/lib/template-library";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "template-scout": { label: "Template Scout", color: "text-cyan-400" },
  "vibe-blender": { label: "Vibe Blender", color: "text-purple-400" },
  "monetization-styler": { label: "Monetization Styler", color: "text-green-400" },
  "output-assembler": { label: "Output Assembler", color: "text-blue-400" },
  "vibe-scorer": { label: "Vibe Scorer", color: "text-yellow-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  assembler: { label: "Report Assembler", color: "text-orange-400" },
};

const SCORE_LABELS: Record<keyof VibeMatchScore, string> = {
  designFit: "Design Fit",
  tasteAlignment: "Taste",
  monetizationReady: "Monetization",
  responsiveness: "Responsive",
  animationQuality: "Animation",
  overall: "Overall",
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-success/20";
  if (score >= 40) return "bg-warning/20";
  return "bg-danger/20";
}

const CATEGORY_LABELS: Record<string, string> = {
  landing: "Landing Pages",
  dashboard: "Dashboards",
  "e-commerce": "E-Commerce",
  blog: "Blogs",
  portfolio: "Portfolios",
  admin: "Admin",
  saas: "SaaS",
  docs: "Documentation",
  pricing: "Pricing",
};

export function TemplateGallery() {
  const [task, setTask] = useState("");
  const [activeCategory, setActiveCategory] = useState<AppType | "all">("all");
  const [report, setReport] = useState<TemplateVibeReport | null>(null);
  const [messages, setMessages] = useState<TemplateVibeMessage[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const categories = getTemplateCategories();

  const filteredTemplates = Object.values(WEB_TEMPLATES).filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

  const triggerSwarm = useCallback(() => {
    if (task.trim() && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [task, pending]);

  async function handleRunSwarm(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowCode(false);
    setShowMessages(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/template-vibe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: task.trim() }),
        });

        const json = await res.json();

        if (!res.ok || json.error) {
          setError(json.error ?? "Unknown error");
          return;
        }

        setReport(json.data.report);
        setMessages(json.data.messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Template Gallery */}
      <div>
        <h2 className="text-lg font-semibold">Template Gallery</h2>
        <p className="mt-1 text-sm text-muted">
          Browse available templates. Describe your app below to auto-select and inject the best match.
        </p>

        {/* Category tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary/15 text-primary-light"
                : "text-muted hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            All ({Object.keys(WEB_TEMPLATES).length})
          </button>
          {categories.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === category
                  ? "bg-primary/15 text-primary-light"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {CATEGORY_LABELS[category] ?? category} ({count})
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group rounded-xl border border-border bg-surface p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                e.currentTarget.style.transform = `perspective(600px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg)";
              }}
            >
              {/* Preview bar */}
              <div className="flex h-24 items-center justify-center rounded-lg bg-surface-elevated text-xs text-muted">
                {template.category.toUpperCase()}
              </div>

              <h3 className="mt-3 font-medium group-hover:text-primary-light transition-colors">
                {template.name}
              </h3>

              <div className="mt-2 flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {template.source} · {template.sections.length} sections
                </span>
                {template.monetizationSlots.length > 0 && (
                  <span className="text-success">$ monetizable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swarm Input */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label htmlFor="task" className="text-sm font-medium">
            Describe your app
          </label>
          <textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) triggerSwarm();
            }}
            placeholder="e.g., Build a SaaS dashboard for tracking user analytics with a pricing page..."
            className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={pending || !task.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Vibing templates..." : "Inject Template Vibe"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Results */}
      {report && (
        <div className="space-y-6">
          {/* Vibe Match Score */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vibe Match Score</h3>
              <span
                className={`text-3xl font-bold ${scoreColor(report.vibeScore.overall)}`}
              >
                {report.vibeScore.overall}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {(Object.entries(report.vibeScore) as [keyof VibeMatchScore, number][])
                .filter(([key]) => key !== "overall")
                .map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${scoreBg(value)}`}
                    >
                      <span className={`text-sm font-bold ${scoreColor(value)}`}>
                        {value}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {SCORE_LABELS[key]}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Template Info */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold">Template Used</h3>
            <p className="mt-1 text-sm text-muted">
              <span className="text-primary-light">{report.selectedTemplateName}</span>
              {" · "}App type: {report.detectedAppType}
              {report.monetizationSections.length > 0 &&
                ` · ${report.monetizationSections.length} monetization sections`}
            </p>

            {report.changesMade.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium">Vibe Transformations</h4>
                <div className="mt-2 space-y-1">
                  {report.changesMade.map((change, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-muted">
                        {change.category}
                      </span>
                      <span className="text-muted">{change.description}</span>
                      {change.jhey_ref && (
                        <span className="text-purple-400">
                          (Jhey: {change.jhey_ref})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generated Code */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Generated Code — {report.componentName}
              </h3>
              <button
                onClick={() => setShowCode(!showCode)}
                className="text-xs text-primary-light hover:underline"
              >
                {showCode ? "Hide" : "Show"} Code
              </button>
            </div>

            {showCode && (
              <div className="mt-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(report.finalCode);
                    }}
                    className="mb-2 text-xs text-muted hover:text-foreground"
                  >
                    Copy to clipboard
                  </button>
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg bg-background p-4 text-xs">
                  <code>{report.finalCode}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Agent Messages */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Agent Activity</h3>
              <button
                onClick={() => setShowMessages(!showMessages)}
                className="text-xs text-primary-light hover:underline"
              >
                {showMessages ? "Hide" : "Show"} ({messages.length} messages)
              </button>
            </div>

            {showMessages && (
              <div className="mt-4 space-y-3">
                {messages.map((msg, i) => {
                  const config = AGENT_CONFIG[msg.agent] ?? {
                    label: msg.agent,
                    color: "text-muted",
                  };
                  return (
                    <div key={i} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="mt-1 max-h-32 overflow-auto text-xs text-muted whitespace-pre-wrap">
                        {msg.content.slice(0, 500)}
                        {msg.content.length > 500 ? "..." : ""}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
