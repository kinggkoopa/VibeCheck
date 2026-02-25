"use client";

import { useState } from "react";
import type { LLMProvider, SwarmMessage } from "@/types";

export default function AgentsPage() {
  const [task, setTask] = useState("");
  const [provider, setProvider] = useState<LLMProvider>("anthropic");
  const [maxIterations, setMaxIterations] = useState(3);
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;

    setRunning(true);
    setError(null);
    setMessages([]);
    setFinalOutput(null);

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, provider, max_iterations: maxIterations }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Swarm execution failed");
        return;
      }

      setMessages(data.data.messages);
      setFinalOutput(data.data.final_output);
    } catch {
      setError("Network error. Check your API key configuration.");
    } finally {
      setRunning(false);
    }
  }

  const roleColors: Record<string, string> = {
    planner: "text-blue-400",
    coder: "text-green-400",
    reviewer: "text-yellow-400",
    tester: "text-red-400",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Swarm</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent critique loop: Planner &rarr; Coder &rarr; Reviewer &rarr;
          Tester with auto-iteration until quality threshold is met.
        </p>
      </div>

      <form onSubmit={handleRun} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Task</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            required
            rows={3}
            placeholder="Describe what you want the agent swarm to build..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Max Iterations
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={running || !task.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {running ? "Running swarm..." : "Run Agent Swarm"}
        </button>
      </form>

      {/* Swarm output */}
      {messages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Swarm Trace</h2>
          {messages.map((msg, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase ${
                    roleColors[msg.role] ?? "text-muted"
                  }`}
                >
                  {msg.agent_name}
                </span>
                <span className="text-xs text-muted">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {msg.content}
              </pre>
            </div>
          ))}
        </div>
      )}

      {finalOutput && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Final Output</h2>
          <div className="rounded-lg border border-success/30 bg-surface p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {finalOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
