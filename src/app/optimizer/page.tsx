"use client";

import { useState } from "react";
import type { OptimizationStrategy, PromptOptimization, ApiResponse } from "@/types";

const STRATEGIES: { value: OptimizationStrategy; label: string; description: string }[] = [
  { value: "clarity", label: "Clarity", description: "Make the prompt clearer and less ambiguous" },
  { value: "specificity", label: "Specificity", description: "Add concrete details and constraints" },
  { value: "chain-of-thought", label: "Chain of Thought", description: "Encourage step-by-step reasoning" },
  { value: "few-shot", label: "Few-Shot", description: "Add input/output examples" },
  { value: "role-based", label: "Role-Based", description: "Add an expert persona prefix" },
];

export default function OptimizerPage() {
  const [prompt, setPrompt] = useState("");
  const [strategy, setStrategy] = useState<OptimizationStrategy>("clarity");
  const [result, setResult] = useState<PromptOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOptimize(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/prompt-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, strategy }),
      });

      const json: ApiResponse<PromptOptimization> = await res.json();

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
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-3xl font-bold">Prompt Optimizer</h1>
      <p className="mb-8 text-muted">
        Paste a rough prompt and choose a strategy. The optimizer will produce a
        production-ready version.
      </p>

      <form onSubmit={handleOptimize} className="space-y-6">
        {/* Strategy selector */}
        <div>
          <label className="mb-2 block text-sm font-medium">Strategy</label>
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStrategy(s.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  strategy === s.value
                    ? "border-primary bg-primary/10 text-primary-light"
                    : "border-border text-muted hover:border-primary/30 hover:text-foreground"
                }`}
                title={s.description}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div>
          <label htmlFor="prompt" className="mb-2 block text-sm font-medium">
            Your Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
            placeholder="e.g. make a todo app with react"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Optimizing..." : "Optimize Prompt"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">Optimized Prompt</h2>
          <div className="rounded-lg border border-border bg-surface p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
              {result.optimized_prompt}
            </pre>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(result.optimized_prompt)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              Copy to clipboard
            </button>
            <span className="flex items-center rounded-md bg-surface-elevated px-3 py-1.5 text-xs text-muted">
              Strategy: {result.strategy}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
