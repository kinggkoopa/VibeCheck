"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type SessionStatus =
  | "pending"
  | "running"
  | "awaiting_review"
  | "approved"
  | "cancelled"
  | "completed"
  | "error";

interface RemoteSession {
  session_id: string;
  session_url: string;
  task_type: string;
  status: SessionStatus;
  expires_at: string;
  result?: Record<string, unknown> | null;
}

const TASK_TYPES = [
  { value: "swarm", label: "Agent Swarm", desc: "Multi-agent critique loop" },
  { value: "iterate", label: "Auto-Iterate", desc: "Code improvement loop" },
  { value: "optimize", label: "Optimize Prompt", desc: "Prompt engineering" },
  { value: "critique", label: "Code Critique", desc: "Detailed code review" },
] as const;

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted/20 text-muted" },
  running: { label: "Running", color: "bg-warning/20 text-warning" },
  awaiting_review: { label: "Awaiting Review", color: "bg-primary/20 text-primary-light" },
  approved: { label: "Approved", color: "bg-success/20 text-success" },
  cancelled: { label: "Cancelled", color: "bg-danger/20 text-danger" },
  completed: { label: "Completed", color: "bg-success/20 text-success" },
  error: { label: "Error", color: "bg-danger/20 text-danger" },
};

export function RemoteControl() {
  const [taskType, setTaskType] = useState<string>("swarm");
  const [taskInput, setTaskInput] = useState("");
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load active sessions ──
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/remote-session");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          setSessions(
            data.data.map((s: Record<string, unknown>) => ({
              session_id: s.id,
              session_url: `${window.location.origin}/dashboard/remote/${s.id}`,
              task_type: s.task_type,
              status: s.status,
              expires_at: s.expires_at,
              result: s.result,
            }))
          );
        }
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Subscribe to realtime updates ──
  useEffect(() => {
    if (!session) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`remote-session-${session.session_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "remote_sessions",
          filter: `id=eq.${session.session_id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: updated.status as SessionStatus,
                  result: updated.result as Record<string, unknown> | null,
                }
              : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.session_id, session]);

  // ── Create session ──
  async function handleCreateSession() {
    if (!taskInput.trim() || taskInput.trim().length < 5) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/remote-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: taskType,
          task_input: taskInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSession(data.data);
        loadSessions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  // ── Start execution ──
  async function handleStart() {
    if (!session) return;
    setLoading(true);

    try {
      await fetch("/api/remote-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          status: "running",
        }),
      });
      setSession((prev) => (prev ? { ...prev, status: "running" } : null));
    } catch {
      setError("Failed to start session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Create Session ── */}
      {!session && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Task Type</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TASK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTaskType(t.value)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    taskType === t.value
                      ? "border-primary bg-primary/10 text-primary-light"
                      : "border-border hover:bg-surface-elevated"
                  }`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="mt-0.5 text-xs text-muted">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {taskType === "optimize" ? "Prompt" : "Code / Task"}
            </label>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              rows={6}
              placeholder={
                taskType === "optimize"
                  ? "Enter the prompt to optimize..."
                  : "Paste code or describe the task..."
              }
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleCreateSession}
            disabled={loading || taskInput.trim().length < 5}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Creating..." : "Start Remote Session"}
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Active Session ── */}
      {session && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-6">
            {/* QR Code + URL */}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="shrink-0">
                <QRCode value={session.session_url} size={160} />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold">Remote Session</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CONFIG[session.status].color}`}
                  >
                    {STATUS_CONFIG[session.status].label}
                  </span>
                  <span className="text-xs text-muted">
                    {TASK_TYPES.find((t) => t.value === session.task_type)?.label}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Scan with your phone or share this URL:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={session.session_url}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(session.session_url);
                    }}
                    className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Expires: {new Date(session.expires_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-4 flex gap-3 border-t border-border pt-4">
              {session.status === "pending" && (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {loading ? "Starting..." : "Run Task"}
                </button>
              )}
              {session.status === "running" && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-warning" />
                  <span className="text-sm text-muted">
                    Task is running... You can monitor from your phone.
                  </span>
                </div>
              )}
              {session.status === "awaiting_review" && (
                <div className="text-sm text-primary-light">
                  Task complete — review results on your phone or below.
                </div>
              )}
              <div className="flex-1" />
              <button
                onClick={() => {
                  setSession(null);
                  setTaskInput("");
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-elevated"
              >
                New Session
              </button>
            </div>

            {/* Result preview */}
            {session.result && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="mb-2 font-medium">Result</h4>
                <div className="max-h-64 overflow-auto rounded-lg bg-background p-3">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(session.result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Session History ── */}
      {sessions.length > 0 && !session && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Recent Sessions</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CONFIG[s.status]?.color ?? "text-muted"}`}
                  >
                    {STATUS_CONFIG[s.status]?.label ?? s.status}
                  </span>
                  <span className="text-sm">
                    {TASK_TYPES.find((t) => t.value === s.task_type)?.label ?? s.task_type}
                  </span>
                </div>
                <button
                  onClick={() => setSession(s)}
                  className="text-xs text-primary-light hover:underline"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── QR Code Generator (SVG-based, no external dependency) ──

function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  // Simple QR code using a deterministic pattern from the value
  // For production, install `qrcode` package for real QR encoding.
  // This renders a visual placeholder with the URL encoded.
  const modules = generateQRModules(value);
  const moduleCount = modules.length;
  const cellSize = size / moduleCount;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg bg-white p-2"
      role="img"
      aria-label={`QR code for ${value}`}
    >
      {modules.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
}

/**
 * Generate a deterministic QR-like matrix from a string.
 *
 * NOTE: This is a simplified visual pattern generator, not ISO 18004.
 * For scannable QR codes, install `qrcode` package:
 *   npm install qrcode @types/qrcode
 *   Then use: QRCode.toDataURL(value)
 *
 * The pattern uses a hash of the input to create a visually interesting
 * but deterministic grid with the standard QR finder patterns.
 */
function generateQRModules(value: string): boolean[][] {
  const size = 25; // 25x25 module QR code (Version 2)
  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );

  // Add finder patterns (top-left, top-right, bottom-left)
  const addFinderPattern = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        modules[startY + y][startX + x] = isOuter || isInner;
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(size - 7, 0);
  addFinderPattern(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
  }

  // Data area — fill with hash-derived pattern
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  for (let y = 9; y < size - 1; y++) {
    for (let x = 9; x < size - 1; x++) {
      // Skip finder pattern areas
      if (x < 8 && y < 8) continue;
      if (x >= size - 8 && y < 8) continue;
      if (x < 8 && y >= size - 8) continue;

      // Deterministic fill based on position and hash
      const seed = (x * 31 + y * 17 + hash) | 0;
      modules[y][x] = (seed & 1) === 1 || (seed % 7 === 0);
    }
  }

  return modules;
}
