"use client";

/**
 * Offline Sync Engine — Client-side queue + merge logic.
 *
 * Architecture:
 * 1. All light tasks (optimize, quick critique) try Ollama first when offline
 * 2. Heavy tasks (swarm, iterate) queue in IndexedDB for cloud processing
 * 3. When connectivity returns, queued tasks auto-sync to Supabase/cloud LLMs
 * 4. Merge logic handles conflicts (latest-write-wins for personal use)
 *
 * Storage: IndexedDB via a simple wrapper (no external deps)
 */

// ── Types ──

export type TaskPriority = "light" | "heavy";
export type QueueStatus = "pending" | "processing" | "completed" | "failed";

export interface QueuedTask {
  id: string;
  type: "optimize" | "critique" | "fast-suggest" | "swarm" | "iterate";
  priority: TaskPriority;
  payload: Record<string, unknown>;
  status: QueueStatus;
  result?: Record<string, unknown> | null;
  error?: string | null;
  createdAt: number;
  processedAt?: number;
  retryCount: number;
}

// ── Online/Offline Detection ──

let _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const _listeners: Array<(online: boolean) => void> = [];

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    _isOnline = true;
    _listeners.forEach((fn) => fn(true));
    // Auto-process queue when back online
    processQueue().catch(console.error);
  });
  window.addEventListener("offline", () => {
    _isOnline = false;
    _listeners.forEach((fn) => fn(false));
  });
}

export function isOnline(): boolean {
  return _isOnline;
}

export function onConnectivityChange(fn: (online: boolean) => void): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

// ── Ollama Detection ──

let _ollamaAvailable: boolean | null = null;

export async function checkOllamaAvailable(): Promise<boolean> {
  if (_ollamaAvailable !== null) return _ollamaAvailable;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    _ollamaAvailable = res.ok;
    // Re-check every 30s
    setTimeout(() => { _ollamaAvailable = null; }, 30000);
    return _ollamaAvailable;
  } catch {
    _ollamaAvailable = false;
    setTimeout(() => { _ollamaAvailable = null; }, 10000);
    return false;
  }
}

// ── Task Classification ──

const LIGHT_TASKS = new Set(["optimize", "critique", "fast-suggest"]);

export function classifyTask(type: QueuedTask["type"]): TaskPriority {
  return LIGHT_TASKS.has(type) ? "light" : "heavy";
}

// ── IndexedDB Queue ──

const DB_NAME = "metavibe-offline";
const STORE_NAME = "task-queue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueTask(
  type: QueuedTask["type"],
  payload: Record<string, unknown>
): Promise<string> {
  const db = await openDB();
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const task: QueuedTask = {
    id,
    type,
    priority: classifyTask(type),
    payload,
    status: "pending",
    result: null,
    error: null,
    createdAt: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(task);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedTasks(): Promise<QueuedTask[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).index("createdAt").getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingTasks(): Promise<QueuedTask[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).index("status").getAll("pending");
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function updateTask(
  id: string,
  updates: Partial<QueuedTask>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        store.put({ ...existing, ...updates });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearCompletedTasks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.index("status").openCursor("completed");
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Local Ollama Execution (for light tasks when offline) ──

export async function executeLocalOllama(
  task: QueuedTask
): Promise<Record<string, unknown> | null> {
  const ollamaOk = await checkOllamaAvailable();
  if (!ollamaOk) return null;

  const model = "llama3.3"; // Default local model

  const systemPrompts: Record<string, string> = {
    optimize:
      "You are a prompt engineering expert. Rewrite the user's prompt to be clear, specific, and production-grade. Return ONLY the optimized prompt.",
    critique:
      'You are an expert code reviewer. Analyze the code and return a JSON object: {"overall_score": <0-100>, "summary": "<brief>", "issues": [{"severity": "<error|warning|info>", "message": "<desc>", "suggestion": "<fix>"}]}. Return ONLY valid JSON.',
    "fast-suggest":
      "You are a helpful coding assistant. Give a brief, actionable suggestion (max 100 words). Be concise.",
  };

  const systemPrompt = systemPrompts[task.type];
  if (!systemPrompt) return null;

  const userMessage =
    (task.payload.prompt as string) ||
    (task.payload.code as string) ||
    (task.payload.input as string) ||
    "";

  try {
    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage.slice(0, 4000) },
        ],
        stream: false,
        options: { temperature: 0.3, num_predict: 2048 },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.message?.content ?? "";

    if (task.type === "critique") {
      try {
        const cleaned = content.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
        return { data: JSON.parse(cleaned), _source: "ollama" };
      } catch {
        return { data: { overall_score: 50, summary: content.slice(0, 200), issues: [] }, _source: "ollama" };
      }
    }

    if (task.type === "optimize") {
      return { data: { optimized_prompt: content, strategy: task.payload.strategy ?? "best-practice" }, _source: "ollama" };
    }

    return { data: { suggestion: content }, _source: "ollama" };
  } catch {
    return null;
  }
}

// ── Queue Processing (runs when connectivity returns) ──

let _processing = false;

export async function processQueue(): Promise<number> {
  if (_processing || !isOnline()) return 0;
  _processing = true;

  let processed = 0;

  try {
    const pending = await getPendingTasks();

    for (const task of pending) {
      if (!isOnline()) break;

      await updateTask(task.id, { status: "processing" });

      try {
        const endpoint = `/api/${task.type === "fast-suggest" ? "fast-suggest" : task.type}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task.payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error ?? `HTTP ${res.status}`);
        }

        const result = await res.json();
        await updateTask(task.id, {
          status: "completed",
          result,
          processedAt: Date.now(),
        });
        processed++;
      } catch (err) {
        const retryCount = task.retryCount + 1;
        await updateTask(task.id, {
          status: retryCount >= 3 ? "failed" : "pending",
          error: err instanceof Error ? err.message : "Unknown error",
          retryCount,
        });
      }
    }
  } finally {
    _processing = false;
  }

  return processed;
}

// ── Sync Analytics to Supabase when back online ──

export async function syncOfflineAnalytics(): Promise<void> {
  if (!isOnline()) return;

  try {
    const tasks = await getQueuedTasks();
    const completed = tasks.filter((t) => t.status === "completed" && t.result);

    if (completed.length === 0) return;

    // POST to a sync endpoint that batches analytics
    await fetch("/api/offline-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: completed.map((t) => ({
          type: t.type,
          payload: t.payload,
          result: t.result,
          createdAt: t.createdAt,
          processedAt: t.processedAt,
        })),
      }),
    });

    await clearCompletedTasks();
  } catch {
    // Non-fatal — will retry next time
  }
}
