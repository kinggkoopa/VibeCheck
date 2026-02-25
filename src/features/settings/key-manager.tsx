"use client";

import { useState } from "react";
import type { LLMProvider, UserLLMKey } from "@/types";

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (Local)" },
];

interface KeyManagerProps {
  initialKeys: UserLLMKey[];
}

export function KeyManager({ initialKeys }: KeyManagerProps) {
  const [keys, setKeys] = useState<UserLLMKey[]>(initialKeys);
  const [provider, setProvider] = useState<LLMProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          display_label: label || provider,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Failed to save key");
        return;
      }

      setSuccess(`Key for ${provider} saved and encrypted.`);
      setApiKey("");
      setLabel("");

      // Refresh key list
      const listRes = await fetch("/api/keys");
      const listData = await listRes.json();
      if (listData.data) setKeys(listData.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key_id: keyId }),
    });

    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    }
  }

  return (
    <div className="space-y-8">
      {/* Existing keys */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Your API Keys</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-muted">
            No keys configured yet. Add one below to start using MetaVibeCoder.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
              >
                <div>
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">
                    {k.provider}
                  </span>
                  <span className="ml-2 text-sm">
                    {k.display_label || k.provider}
                  </span>
                  {k.model_default && (
                    <span className="ml-2 text-xs text-muted">
                      ({k.model_default})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      k.is_active ? "bg-success" : "bg-muted"
                    }`}
                  />
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new key form */}
      <form onSubmit={handleSaveKey} className="space-y-4">
        <h2 className="text-lg font-semibold">Add New Key</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as LLMProvider)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Work key"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder="sk-... or your provider key"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Encrypted with pgcrypto before storage. Never logged or sent to our servers.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <button
          type="submit"
          disabled={saving || !apiKey.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Encrypting & saving..." : "Save Key"}
        </button>
      </form>
    </div>
  );
}
