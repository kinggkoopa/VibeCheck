"use client";

import { useState, useTransition } from "react";
import {
  exportCode,
  autoExport,
  type IntegrationTool,
  type ExportResult,
  type ToolInfo,
} from "@/features/tools/actions";

// ── Tool display config ──

const TOOL_CONFIG: Record<
  IntegrationTool,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  v0: {
    label: "v0",
    color: "text-foreground",
    bgColor: "bg-foreground/10 border-foreground/30",
    icon: "V",
  },
  replit: {
    label: "Replit",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/30",
    icon: "R",
  },
  codesandbox: {
    label: "CodeSandbox",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: "CS",
  },
  stackblitz: {
    label: "StackBlitz",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10 border-sky-500/30",
    icon: "SB",
  },
  gist: {
    label: "GitHub Gist",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    icon: "GH",
  },
};

const LANGUAGE_OPTIONS = [
  { value: "", label: "Auto-detect" },
  { value: "typescript", label: "TypeScript" },
  { value: "typescriptreact", label: "TypeScript (React)" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "sql", label: "SQL" },
] as const;

interface ToolOrchestratorProps {
  tools: ToolInfo[];
}

export function ToolOrchestrator({ tools }: ToolOrchestratorProps) {
  // ── Input state ──
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("index.tsx");
  const [language, setLanguage] = useState("");
  const [title, setTitle] = useState("");

  // ── Tool selection ──
  const [selectedTool, setSelectedTool] = useState<IntegrationTool | null>(null);
  const [githubToken, setGithubToken] = useState("");

  // ── Results ──
  const [exportResults, setExportResults] = useState<
    Record<string, ExportResult> | null
  >(null);
  const [singleResult, setSingleResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // ── Transitions ──
  const [pendingSingle, startSingleTransition] = useTransition();
  const [pendingAuto, startAutoTransition] = useTransition();

  const pending = pendingSingle || pendingAuto;

  // ── Handlers ──

  function handleExportSingle(tool: IntegrationTool) {
    if (!code.trim()) return;

    setError(null);
    setSingleResult(null);
    setExportResults(null);
    setSelectedTool(tool);

    startSingleTransition(async () => {
      const res = await exportCode(tool, {
        code,
        filename,
        language,
        title,
        githubToken: tool === "gist" ? githubToken : undefined,
      });

      if (res.success && res.result) {
        setSingleResult(res.result);

        // Auto-copy code to clipboard for URL-based tools
        if (res.result.method === "redirect" || res.result.method === "clipboard") {
          await navigator.clipboard.writeText(code);
          setCopied(tool);
          setTimeout(() => setCopied(null), 3000);
        }

        // Auto-open URL
        if (res.result.url && res.result.method === "redirect") {
          window.open(res.result.url, "_blank", "noopener,noreferrer");
        }
      } else {
        setError(res.error ?? "Export failed.");
      }
    });
  }

  function handleAutoExport() {
    if (!code.trim()) return;

    setError(null);
    setSingleResult(null);
    setExportResults(null);
    setSelectedTool(null);

    startAutoTransition(async () => {
      const res = await autoExport({
        code,
        filename,
        language,
        title,
        githubToken: githubToken || undefined,
      });

      if (res.success && res.results) {
        setExportResults(res.results);

        // Copy code to clipboard
        await navigator.clipboard.writeText(code);
        setCopied("all");
        setTimeout(() => setCopied(null), 3000);
      } else {
        setError(res.error ?? "Auto-export failed.");
      }
    });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(code);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* ── Code Input ── */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Code to Export
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={10}
            placeholder="Paste or write code here. Export to any tool with one click..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Metadata row */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="index.tsx"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My component"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* GitHub token (collapsible) */}
        <details className="rounded-lg border border-border bg-surface p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted">
            GitHub Gist Token (optional — for API-based Gist creation)
          </summary>
          <div className="mt-2">
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted">
              Without a token, Gist export opens gist.github.com with code on
              your clipboard. With a token, it creates the Gist via API and
              returns the URL.
            </p>
          </div>
        </details>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Tool Belt ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tool Belt</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              disabled={!code.trim()}
              className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface disabled:opacity-50"
            >
              {copied === "code" ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={handleAutoExport}
              disabled={pending || !code.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {pendingAuto ? "Exporting..." : "Auto-Export All"}
            </button>
          </div>
        </div>

        {/* Clipboard toast */}
        {copied && copied !== "code" && (
          <div className="mb-3 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
            <p className="text-xs text-success">
              Code copied to clipboard.{" "}
              {copied === "all"
                ? "Export links ready below."
                : `Opening ${TOOL_CONFIG[copied as IntegrationTool]?.label ?? copied}...`}
            </p>
          </div>
        )}

        {/* Loading */}
        {pending && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-sm text-muted">
              {pendingAuto
                ? "Generating export links for all tools..."
                : `Exporting to ${selectedTool ? TOOL_CONFIG[selectedTool].label : "tool"}...`}
            </span>
          </div>
        )}

        {/* Tool cards grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const config = TOOL_CONFIG[tool.id];
            const result = exportResults?.[tool.id] ?? (singleResult?.tool === tool.id ? singleResult : null);
            const isExporting = pending && selectedTool === tool.id;

            return (
              <ToolCard
                key={tool.id}
                tool={tool}
                config={config}
                result={result}
                isExporting={isExporting}
                disabled={pending || !code.trim()}
                onExport={() => handleExportSingle(tool.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Auto-Export Results ── */}
      {exportResults && (
        <div className="space-y-3">
          <h3 className="font-semibold">Export Results</h3>
          <div className="space-y-2">
            {Object.entries(exportResults).map(([toolId, result]) => {
              const config = TOOL_CONFIG[toolId as IntegrationTool];
              return (
                <div
                  key={toolId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    result.success
                      ? "border-success/30 bg-success/5"
                      : "border-danger/30 bg-danger/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${config.color} ${config.bgColor}`}
                    >
                      {config.icon}
                    </span>
                    <span className="text-sm font-medium">{config.label}</span>
                    {result.success ? (
                      <span className="text-xs text-success">Ready</span>
                    ) : (
                      <span className="text-xs text-danger">
                        {result.error}
                      </span>
                    )}
                  </div>
                  {result.success && result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-surface-elevated px-3 py-1 text-xs font-medium transition-colors hover:bg-surface"
                    >
                      Open
                    </a>
                  )}
                  {result.success && result.method === "clipboard" && (
                    <span className="text-xs text-muted">
                      Code on clipboard
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tool Card ──

function ToolCard({
  tool,
  config,
  result,
  isExporting,
  disabled,
  onExport,
}: {
  tool: ToolInfo;
  config: { label: string; color: string; bgColor: string; icon: string };
  result: ExportResult | null;
  isExporting: boolean;
  disabled: boolean;
  onExport: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        result?.success
          ? "border-success/30 bg-success/5"
          : "border-border bg-surface hover:bg-surface-elevated"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold ${config.color} ${config.bgColor}`}
        >
          {config.icon}
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{config.label}</h3>
          <p className="text-xs text-muted line-clamp-1">{tool.description}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1">
        {tool.urlBased && (
          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted">
            URL-based
          </span>
        )}
        {tool.supportsAutoExport && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary-light">
            Auto-export
          </span>
        )}
      </div>

      {/* Result indicator */}
      {result?.success && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-xs text-success">
            {result.method === "redirect"
              ? "Opened in new tab"
              : result.method === "api"
                ? "Created"
                : "Clipboard ready"}
          </span>
          {result.url && result.method !== "redirect" && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-light hover:underline"
            >
              Open
            </a>
          )}
        </div>
      )}

      {result && !result.success && (
        <div className="mt-2">
          <p className="text-xs text-danger">{result.error}</p>
        </div>
      )}

      {/* Export button */}
      <button
        onClick={onExport}
        disabled={disabled}
        className="mt-3 w-full rounded-lg bg-surface-elevated px-3 py-2 text-xs font-medium transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
      >
        {isExporting
          ? "Exporting..."
          : result?.success
            ? "Re-export"
            : `Export to ${config.label}`}
      </button>
    </div>
  );
}
