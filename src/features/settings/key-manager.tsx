"use client";

import { useState, useTransition } from "react";
import { saveAndValidateKey, removeKey } from "./actions";
import type { LLMProvider, UserLLMKey } from "@/types";

const PROVIDERS: { value: LLMProvider; label: string; hint: string }[] = [
  { value: "anthropic", label: "Anthropic (Recommended)", hint: "sk-ant-..." },
  { value: "openrouter", label: "OpenRouter", hint: "sk-or-..." },
  { value: "groq", label: "Groq", hint: "gsk_..." },
  { value: "openai", label: "OpenAI", hint: "sk-..." },
  { value: "ollama", label: "Ollama (Local)", hint: "No key needed" },
];

interface KeyManagerProps {
  initialKeys: UserLLMKey[];
}

export function KeyManager({ initialKeys }: KeyManagerProps) {
  const [keys, setKeys] = useState<UserLLMKey[]>(initialKeys);
  const [provider, setProvider] = useState<LLMProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validating, startTransition] = useTransition();

  const selectedHint =
    PROVIDERS.find((p) => p.value === provider)?.hint ?? "";

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await saveAndValidateKey(
        provider,
        apiKey,
        label || provider
      );

      if (result.success) {
        setSuccess(
          `Key for ${provider} validated and encrypted successfully.`
        );
        setApiKey("");
        setLabel("");
        setKeys(result.keys);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDeleteKey(keyId: string) {
    startTransition(async () => {
      const result = await removeKey(keyId);
      if (result.success) {
        setKeys(result.keys);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Existing keys */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Your API Keys</h2>
        {keys.length === 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm font-medium text-warning">
              No keys configured yet.
            </p>
            <p className="mt-1 text-sm text-muted">
              Add your Anthropic API key below to start using MetaVibeCoder.
              Anthropic is the recommended provider for the best experience.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">
                    {k.provider}
                  </span>
                  <span className="text-sm">
                    {k.display_label || k.provider}
                  </span>
                  {k.key_hint && (
                    <span className="font-mono text-xs text-muted">
                      ...{k.key_hint}
                    </span>
                  )}
                  {k.model_default && (
                    <span className="text-xs text-muted">
                      ({k.model_default})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {k.validated_at ? (
                    <span className="text-xs text-success">Validated</span>
                  ) : (
                    <span className="text-xs text-muted">Unvalidated</span>
                  )}
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
            placeholder={selectedHint}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted">
            {provider === "anthropic"
              ? "Your key will be validated with a test call before saving. Encrypted with pgcrypto at rest."
              : "Encrypted with pgcrypto before storage. Never logged or sent to our servers."}
          </p>
        </div>

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

        <button
          type="submit"
          disabled={validating || !apiKey.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {validating ? "Validating & encrypting..." : "Validate & Save Key"}
        </button>
      </form>
    </div>
  );
}
