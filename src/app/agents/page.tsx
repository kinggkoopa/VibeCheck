"use client";

import { useState } from "react";
import type { SwarmRun, SwarmMessage, ApiResponse } from "@/types";

const ROLE_COLORS: Record<string, string> = {
  planner: "text-blue-400 border-blue-400/30",
  coder: "text-green-400 border-green-400/30",
  reviewer: "text-yellow-400 border-yellow-400/30",
  tester: "text-purple-400 border-purple-400/30",
  documenter: "text-cyan-400 border-cyan-400/30",
};

export default function AgentsPage() {
  const [task, setTask] = useState("");
  const [run, setRun] = useState<SwarmRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;

    setLoading(true);
    setError(null);
    setRun(null);

    try {
      const res = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, useMemory: true }),
      });

      const json: ApiResponse<SwarmRun> = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setRun(json.data);
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-3xl font-bold">Agent Swarm</h1>
      <p className="mb-8 text-muted">
        Describe a coding task. The swarm will plan, implement, review, and test it.
      </p>

      <form onSubmit={handleRun} className="space-y-4">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
          placeholder="e.g. Build a REST API endpoint for user preferences with validation and error handling"
        />
        <button
          type="submit"
          disabled={loading || !task.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Running swarm..." : "Run Swarm"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {run && (
        <div className="mt-8 space-y-4">
          {/* Status bar */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                run.status === "completed"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {run.status}
            </span>
            <span className="text-xs text-muted">
              {run.messages.length} agent{run.messages.length !== 1 && "s"} executed
            </span>
          </div>

          {/* Agent messages */}
          <div className="space-y-3">
            {run.messages.map((msg: SwarmMessage, i: number) => (
              <div
                key={i}
                className={`rounded-lg border bg-surface p-4 ${
                  ROLE_COLORS[msg.role] ?? "border-border"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold">{msg.agent_name}</span>
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                    {msg.role}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm text-foreground/90">
                  {msg.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
