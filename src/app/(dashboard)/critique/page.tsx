"use client";

import { useState } from "react";

export default function CritiquePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    summary: string;
    overall_score: number;
    issues: { severity: string; category: string; message: string; suggestion?: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCritique(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Critique failed");
        return;
      }

      setResult(data.data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const severityColor: Record<string, string> = {
    error: "text-danger",
    warning: "text-warning",
    info: "text-blue-400",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Code Critique</h1>
        <p className="mt-1 text-sm text-muted">
          Get a detailed quality and security review of any code snippet.
        </p>
      </div>

      <form onSubmit={handleCritique} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={10}
            placeholder="Paste your code here..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Run Critique"}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Results</h2>
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                result.overall_score >= 80
                  ? "bg-success/20 text-success"
                  : result.overall_score >= 50
                    ? "bg-warning/20 text-warning"
                    : "bg-danger/20 text-danger"
              }`}
            >
              {result.overall_score}/100
            </span>
          </div>

          <p className="text-sm">{result.summary}</p>

          {result.issues.length > 0 && (
            <div className="space-y-2">
              {result.issues.map((issue, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase ${
                        severityColor[issue.severity] ?? "text-muted"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-xs text-muted">{issue.category}</span>
                  </div>
                  <p className="mt-1 text-sm">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="mt-1 text-xs text-muted">
                      Fix: {issue.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
