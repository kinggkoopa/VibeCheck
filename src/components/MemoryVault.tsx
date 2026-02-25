"use client";

import { useState, useTransition } from "react";
import {
  addMemory,
  editMemory,
  removeMemory,
  searchMemoriesByText,
} from "@/features/memory/actions";
import type { MemoryEntry } from "@/types";

interface MemoryVaultProps {
  initialMemories: MemoryEntry[];
}

export function MemoryVault({ initialMemories }: MemoryVaultProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>(initialMemories);
  const [searchResults, setSearchResults] = useState<MemoryEntry[] | null>(
    null
  );

  // Form state
  const [newContent, setNewContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clearFeedback() {
    setError(null);
    setSuccess(null);
  }

  // ── Add Memory ──
  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    clearFeedback();

    startTransition(async () => {
      const result = await addMemory(newContent);
      if (result.success) {
        setMemories(result.memories);
        setNewContent("");
        setSuccess("Memory stored and embedded.");
      } else {
        setError(result.error);
      }
    });
  }

  // ── Edit Memory ──
  function startEdit(memory: MemoryEntry) {
    setEditingId(memory.id);
    setEditContent(memory.content);
    clearFeedback();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  function handleSaveEdit(memoryId: string) {
    if (!editContent.trim()) return;
    clearFeedback();

    startTransition(async () => {
      const result = await editMemory(memoryId, editContent);
      if (result.success) {
        setMemories(result.memories);
        setEditingId(null);
        setEditContent("");
        setSuccess("Memory updated and re-embedded.");
      } else {
        setError(result.error);
      }
    });
  }

  // ── Delete Memory ──
  function handleDelete(memoryId: string) {
    clearFeedback();

    startTransition(async () => {
      const result = await removeMemory(memoryId);
      if (result.success) {
        setMemories(result.memories);
        // Also remove from search results if present
        setSearchResults((prev) =>
          prev ? prev.filter((m) => m.id !== memoryId) : null
        );
      } else {
        setError(result.error);
      }
    });
  }

  // ── Search ──
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    clearFeedback();

    startTransition(async () => {
      const result = await searchMemoriesByText(searchQuery);
      if (result.success) {
        setSearchResults(result.results);
      } else {
        setError(result.error);
      }
    });
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  // Which list to display
  const displayList = searchResults ?? memories;
  const isSearchActive = searchResults !== null;

  return (
    <div className="space-y-6">
      {/* Add new memory */}
      <form onSubmit={handleAdd} className="space-y-3">
        <h2 className="text-lg font-semibold">Add Memory</h2>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Store a piece of context, a decision, a code pattern, or anything you want the system to remember..."
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !newContent.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Embedding & saving..." : "Save Memory"}
          </button>
          <p className="text-xs text-muted">
            Embedding generated server-side using your API key. Stored as a
            1536-dim vector for semantic search.
          </p>
        </div>
      </form>

      {/* Semantic search */}
      <form onSubmit={handleSearch} className="space-y-3">
        <h2 className="text-lg font-semibold">Search Memories</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by meaning, not just keywords..."
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending || !searchQuery.trim()}
            className="rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
          >
            {pending ? "Searching..." : "Search"}
          </button>
          {isSearchActive && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Memory list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isSearchActive
              ? `Search Results (${displayList.length})`
              : `Memory Vault (${displayList.length})`}
          </h2>
        </div>

        {displayList.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted">
              {isSearchActive
                ? "No matching memories found. Try a different query."
                : "No memories stored yet. Add one above or they'll be created automatically during agent runs."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayList.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                {editingId === m.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(m.id)}
                        disabled={pending || !editContent.trim()}
                        className="rounded bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {pending ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded px-3 py-1 text-xs text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                        {m.similarity != null && (
                          <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">
                            {(m.similarity * 100).toFixed(0)}% match
                          </span>
                        )}
                        {m.metadata &&
                          Object.keys(m.metadata).length > 0 &&
                          !("_no_embedding" in m.metadata) && (
                            <span className="text-xs text-muted">
                              {JSON.stringify(m.metadata)}
                            </span>
                          )}
                        {m.metadata && "_no_embedding" in m.metadata && (
                          <span className="text-xs text-warning">
                            No embedding
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(m)}
                          className="text-xs text-muted hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-xs text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
