"use client";

import { useState } from "react";
import type { Critique, CritiqueIssue, ApiResponse } from "@/types";

const SEVERITY_STYLES: Record<string, string> = {
  error: "bg-danger/10 text-danger border-danger/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  info: "bg-blue-500/10 text-blue-400 border-blue-400/30",
};

function ScoreBadge({ score }: { score: number }) {
  let color = "text-danger";
  if (score >= 80) color = "text-success";
  else if (score >= 50) color = "text-warning";

  return (
    <div className="flex flex-col items-center">
      <span className={`text-4xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-muted">/100</span>
    </div>
  );
}

export default function CritiquePage() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<Critique | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCritique(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agents/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: language || undefined }),
      });

      const json: ApiResponse<Critique> = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.data);
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-3xl font-bold">Critique Dashboard</h1>
      <p className="mb-8 text-muted">
        Paste code and get a detailed review with severity ratings, category
        breakdowns, and improvement suggestions.
      </p>

      <form onSubmit={handleCritique} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="language" className="mb-1 block text-sm font-medium">
              Language (optional)
            </label>
            <input
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
              placeholder="e.g. TypeScript, Python, Go"
            />
          </div>
        </div>

        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            Code to Review
          </label>
          <textarea
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
            placeholder="Paste your code here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Run Critique"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Score + Summary */}
          <div className="flex items-start gap-6 rounded-xl border border-border bg-surface p-6">
            <ScoreBadge score={result.overall_score} />
            <div>
              <h2 className="text-lg font-semibold">Summary</h2>
              <p className="mt-1 text-sm text-muted">{result.summary}</p>
            </div>
          </div>

          {/* Issues */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">
              Issues ({result.issues.length})
            </h2>
            <div className="space-y-2">
              {result.issues.map((issue: CritiqueIssue, i: number) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${SEVERITY_STYLES[issue.severity] ?? ""}`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase">
                      {issue.severity}
                    </span>
                    <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-muted">
                      {issue.category}
                    </span>
                    {issue.line && (
                      <span className="text-xs text-muted">Line {issue.line}</span>
                    )}
                  </div>
                  <p className="text-sm">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="mt-2 text-sm italic text-foreground/70">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
