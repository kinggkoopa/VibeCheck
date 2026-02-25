"use client";

import { useState } from "react";
import type { OptimizationStrategy } from "@/types";

const STRATEGIES: { value: OptimizationStrategy; label: string; desc: string }[] = [
  { value: "clarity", label: "Clarity", desc: "Remove ambiguity, sharpen intent" },
  { value: "specificity", label: "Specificity", desc: "Add constraints and context" },
  { value: "chain-of-thought", label: "Chain of Thought", desc: "Add step-by-step reasoning" },
  { value: "few-shot", label: "Few-Shot", desc: "Add input/output examples" },
  { value: "role-based", label: "Role-Based", desc: "Add expert persona framing" },
];

export function OptimizerForm() {
  const [prompt, setPrompt] = useState("");
  const [strategy, setStrategy] = useState<OptimizationStrategy>("clarity");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOptimize(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, strategy }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Optimization failed");
        return;
      }

      setResult(data.data.optimized_prompt);
    } catch {
      setError("Network error. Check your API key configuration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleOptimize} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Your Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={4}
            placeholder="Enter the prompt you want to optimize..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Strategy</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStrategy(s.value)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  strategy === s.value
                    ? "border-primary bg-primary/10 text-primary-light"
                    : "border-border hover:bg-surface-elevated"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="mt-0.5 text-xs text-muted">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Optimizing..." : "Optimize Prompt"}
        </button>
      </form>

      {result && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Optimized Result</h2>
          <div className="rounded-lg border border-border bg-surface p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(result)}
            className="text-xs text-primary-light hover:underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}
