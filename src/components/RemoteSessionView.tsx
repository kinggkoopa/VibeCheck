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

interface SessionData {
  id: string;
  task_type: string;
  task_input: string;
  status: SessionStatus;
  result: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
}

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "text-muted", bg: "bg-muted/20" },
  running: { label: "Running", color: "text-warning", bg: "bg-warning/20" },
  awaiting_review: {
    label: "Review Required",
    color: "text-primary-light",
    bg: "bg-primary/20",
  },
  approved: { label: "Approved", color: "text-success", bg: "bg-success/20" },
  cancelled: { label: "Cancelled", color: "text-danger", bg: "bg-danger/20" },
  completed: { label: "Completed", color: "text-success", bg: "bg-success/20" },
  error: { label: "Error", color: "text-danger", bg: "bg-danger/20" },
};

const TASK_LABELS: Record<string, string> = {
  swarm: "Agent Swarm",
  iterate: "Auto-Iterate",
  optimize: "Prompt Optimizer",
  critique: "Code Critique",
};

/**
 * RemoteSessionView — Mobile-friendly view for controlling a remote session.
 *
 * Features:
 * - Real-time status updates via Supabase Realtime
 * - Large touch-friendly approve/cancel buttons
 * - Simplified result display
 */
export function RemoteSessionView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch session ──
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/remote-session?id=${sessionId}`);
      const data = await res.json();
      if (data.data && !Array.isArray(data.data)) {
        setSession(data.data);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError("Session not found");
      }
    } catch {
      setError("Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // ── Realtime subscription ──
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`remote-mobile-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "remote_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as SessionData;
          setSession((prev) =>
            prev ? { ...prev, ...updated } : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ── Actions ──
  async function updateStatus(status: SessionStatus) {
    setActionLoading(true);
    try {
      await fetch("/api/remote-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, status }),
      });
      setSession((prev) => (prev ? { ...prev, status } : null));
    } catch {
      setError("Failed to update session");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
          <span className="text-sm text-muted">Loading session...</span>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center">
          <h2 className="text-lg font-semibold text-danger">Session Error</h2>
          <p className="mt-2 text-sm text-muted">
            {error ?? "Session not found or expired."}
          </p>
        </div>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[session.status];
  const isExpired = new Date(session.expires_at) < new Date();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="text-center">
        <h1 className="text-xl font-bold">
          {TASK_LABELS[session.task_type] ?? session.task_type}
        </h1>
        <p className="mt-1 text-xs text-muted">Remote Session</p>
      </div>

      {/* ── Status Badge ── */}
      <div className="flex justify-center">
        <div
          className={`rounded-full px-6 py-2 text-sm font-bold ${statusConf.bg} ${statusConf.color}`}
        >
          {session.status === "running" && (
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
          )}
          {statusConf.label}
        </div>
      </div>

      {isExpired && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-center text-sm text-warning">
          This session has expired.
        </div>
      )}

      {/* ── Task Input Preview ── */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-xs font-medium uppercase text-muted">
          Task Input
        </h3>
        <div className="max-h-32 overflow-auto">
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {session.task_input.slice(0, 500)}
            {session.task_input.length > 500 && "..."}
          </pre>
        </div>
      </div>

      {/* ── Mobile Action Buttons ── */}
      {!isExpired && (
        <div className="space-y-3">
          {session.status === "pending" && (
            <button
              onClick={() => updateStatus("running")}
              disabled={actionLoading}
              className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-white transition-colors active:bg-primary-dark disabled:opacity-50"
            >
              {actionLoading ? "Starting..." : "Start Task"}
            </button>
          )}

          {session.status === "awaiting_review" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateStatus("approved")}
                disabled={actionLoading}
                className="rounded-xl bg-success py-4 text-lg font-bold text-white transition-colors active:opacity-80 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={actionLoading}
                className="rounded-xl bg-danger py-4 text-lg font-bold text-white transition-colors active:opacity-80 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}

          {session.status === "running" && (
            <button
              onClick={() => updateStatus("cancelled")}
              disabled={actionLoading}
              className="w-full rounded-xl border-2 border-danger bg-danger/10 py-4 text-lg font-bold text-danger transition-colors active:bg-danger/20 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {session.result && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-xs font-medium uppercase text-muted">
            Result
          </h3>
          <div className="max-h-64 overflow-auto">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {formatResult(session.result)}
            </pre>
          </div>
        </div>
      )}

      {/* ── Session Info ── */}
      <div className="text-center text-xs text-muted">
        <p>Session: {session.id.slice(0, 8)}...</p>
        <p>
          Created: {new Date(session.created_at).toLocaleString()}
        </p>
        <p>
          Expires: {new Date(session.expires_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

/** Format result for display — extract key info from different task types. */
function formatResult(result: Record<string, unknown>): string {
  // Try to extract meaningful data
  const data = result.data as Record<string, unknown> | undefined;
  if (data) {
    // Critique result
    if (typeof data === "object" && "overall_score" in data) {
      const score = data.overall_score;
      const summary = data.summary;
      return `Score: ${score}/100\n\n${summary ?? ""}\n\n${JSON.stringify(data, null, 2)}`;
    }

    // Optimize result
    if (typeof data === "object" && "optimized_prompt" in data) {
      return String(data.optimized_prompt);
    }

    return JSON.stringify(data, null, 2);
  }

  // Error
  if (result.error) {
    return `Error: ${result.error}`;
  }

  return JSON.stringify(result, null, 2);
}
