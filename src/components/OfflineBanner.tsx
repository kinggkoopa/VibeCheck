"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isOnline,
  onConnectivityChange,
  checkOllamaAvailable,
  getPendingTasks,
  getQueuedTasks,
  processQueue,
  clearCompletedTasks,
  type QueuedTask,
} from "@/lib/offline-sync";

/**
 * OfflineBanner — Persistent connectivity status bar + task queue UI.
 *
 * Shows:
 * - Offline warning banner with Ollama status
 * - Queued task count + mini queue viewer
 * - Auto-sync indicator when reconnecting
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [ollamaOk, setOllamaOk] = useState(false);
  const [queue, setQueue] = useState<QueuedTask[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await processQueue();
      await clearCompletedTasks();
      const remaining = await getPendingTasks();
      setQueue(remaining);
    } catch {
      // sync failed
    } finally {
      setSyncing(false);
    }
  }, []);

  // Track connectivity
  useEffect(() => {
    setOnline(isOnline());
    return onConnectivityChange((status) => {
      setOnline(status);
      if (status) {
        handleSync();
      }
    });
  }, [handleSync]);

  // Check Ollama when offline
  useEffect(() => {
    if (!online) {
      checkOllamaAvailable().then(setOllamaOk);
    }
  }, [online]);

  // Poll queue status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const tasks = await getQueuedTasks();
        setQueue(tasks.filter((t) => t.status !== "completed"));
      } catch {
        // IndexedDB not available
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = queue.filter((t) => t.status === "pending").length;
  const processingCount = queue.filter((t) => t.status === "processing").length;
  const failedCount = queue.filter((t) => t.status === "failed").length;

  // Don't show anything if online and no queued tasks
  if (online && queue.length === 0) return null;

  return (
    <div className="relative">
      {/* ── Offline Banner ── */}
      {!online && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/20">
                <div className="h-2 w-2 rounded-full bg-warning" />
              </div>
              <div>
                <span className="text-sm font-medium text-warning">
                  You&apos;re offline
                </span>
                {ollamaOk ? (
                  <span className="ml-2 text-xs text-success">
                    Ollama active — light tasks running locally
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-muted">
                    Heavy tasks queued for when you reconnect
                  </span>
                )}
              </div>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={() => setShowQueue(!showQueue)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-elevated"
              >
                {pendingCount} queued
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Sync in progress banner ── */}
      {online && syncing && (
        <div className="border-b border-primary/30 bg-primary/10 px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-spin rounded-full border border-primary border-t-transparent" />
            <span className="text-sm text-primary-light">
              Syncing queued tasks...
            </span>
          </div>
        </div>
      )}

      {/* ── Queue indicator (online, tasks remaining) ── */}
      {online && !syncing && queue.length > 0 && (
        <div className="border-b border-border bg-surface px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
              {pendingCount > 0 && (
                <span>{pendingCount} pending</span>
              )}
              {processingCount > 0 && (
                <span className="text-warning">{processingCount} processing</span>
              )}
              {failedCount > 0 && (
                <span className="text-danger">{failedCount} failed</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQueue(!showQueue)}
                className="text-xs text-primary-light hover:underline"
              >
                {showQueue ? "Hide" : "View"} queue
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-xs text-primary-light hover:underline disabled:opacity-50"
              >
                Sync now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Queue detail panel ── */}
      {showQueue && queue.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-border bg-background shadow-lg">
          <div className="max-h-64 overflow-auto p-4">
            <h3 className="mb-3 text-sm font-semibold">Task Queue</h3>
            <div className="space-y-2">
              {queue.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={task.status} />
                    <span className="text-xs font-medium capitalize">
                      {task.type.replace("-", " ")}
                    </span>
                    <span className="text-xs text-muted">
                      {task.priority === "light" ? "Local" : "Cloud"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.error && (
                      <span className="text-xs text-danger" title={task.error}>
                        Error
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {formatAge(task.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: QueuedTask["status"] }) {
  const colors: Record<string, string> = {
    pending: "bg-muted",
    processing: "bg-warning animate-pulse",
    completed: "bg-success",
    failed: "bg-danger",
  };
  return <div className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-muted"}`} />;
}

function formatAge(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
