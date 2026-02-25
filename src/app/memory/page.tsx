"use client";

import { useEffect, useState } from "react";
import type { MemoryEntry, ApiResponse } from "@/types";

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    const res = await fetch("/api/memory");
    const json: ApiResponse<MemoryEntry[]> = await res.json();
    if (json.data) setMemories(json.data);
  }

  async function handleStore(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json: ApiResponse<MemoryEntry> = await res.json();

    if (json.data) {
      setMemories((prev) => [json.data!, ...prev]);
      setContent("");
    }
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);

    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: searchQuery }),
    });
    const json: ApiResponse<MemoryEntry[]> = await res.json();
    setSearchResults(json.data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const json: ApiResponse<{ deleted: boolean }> = await res.json();
    if (json.data?.deleted) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-3xl font-bold">Persistent Memory</h1>
      <p className="mb-8 text-muted">
        Store context that persists across sessions. Search semantically to recall relevant information.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Store */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Store a Memory</h2>
          <form onSubmit={handleStore} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
              placeholder="e.g. Project uses Next.js 15 with App Router. Auth via Supabase."
            />
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              Store
            </button>
          </form>
        </div>

        {/* Search */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Semantic Search</h2>
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
              placeholder="Search your memories..."
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
            >
              Search
            </button>
          </form>

          {searchResults && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-muted">
                {searchResults.length} result{searchResults.length !== 1 && "s"}
              </h3>
              {searchResults.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-surface-elevated p-3 text-sm"
                >
                  {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Memory list */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Recent Memories</h2>
        {memories.length === 0 ? (
          <p className="text-sm text-muted">No memories stored yet.</p>
        ) : (
          <div className="space-y-2">
            {memories.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex-1">
                  <p className="text-sm">{m.content}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="shrink-0 text-xs text-muted transition-colors hover:text-danger"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
