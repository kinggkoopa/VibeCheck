"use client";

import { useState, useEffect } from "react";

/**
 * TasteEditor — UI to view and edit the user's Taste/Vibe Profile.
 *
 * Loads current profile via API, allows editing, saves back.
 * Integrated into the Settings page.
 */

interface TasteProfile {
  language_preferences: string[];
  framework_preferences: string[];
  code_style: string;
  comment_style: string;
  naming_convention: string;
  tone: string;
  verbosity: string;
  timezone: string;
  locale_city: string;
  vibe_mode: string;
  custom_instructions: string;
  avoided_patterns: string[];
}

const VIBE_MODES = ["flow-state", "learning", "shipping", "exploring", "relaxed"];
const CODE_STYLES = ["functional", "OOP", "mixed"];
const COMMENT_STYLES = ["minimal", "jsdoc", "inline", "detailed"];
const NAMING_CONVENTIONS = ["camelCase", "snake_case", "PascalCase", "kebab-case"];
const TONES = ["direct", "friendly", "technical", "casual"];
const VERBOSITY_LEVELS = ["concise", "balanced", "detailed"];

export function TasteEditor() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Temp state for array editing
  const [langInput, setLangInput] = useState("");
  const [fwInput, setFwInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");

  useEffect(() => {
    fetch("/api/taste")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setProfile(data.data);
      })
      .catch(() => {
        // Use defaults — API will return defaults if no profile
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch("/api/taste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }

      setResult({ type: "success", message: "Taste profile saved! Changes apply to all future LLM calls." });
    } catch (err) {
      setResult({ type: "error", message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function addToArray(field: "language_preferences" | "framework_preferences" | "avoided_patterns", value: string) {
    if (!profile || !value.trim()) return;
    if (profile[field].includes(value.trim())) return;
    setProfile({ ...profile, [field]: [...profile[field], value.trim()] });
  }

  function removeFromArray(field: "language_preferences" | "framework_preferences" | "avoided_patterns", idx: number) {
    if (!profile) return;
    setProfile({ ...profile, [field]: profile[field].filter((_, i) => i !== idx) });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading taste profile...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* ── Languages ── */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Preferred Languages</legend>
        <div className="flex flex-wrap gap-2">
          {profile.language_preferences.map((lang, i) => (
            <span
              key={lang}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-light"
            >
              {lang}
              <button onClick={() => removeFromArray("language_preferences", i)} className="ml-0.5 text-muted hover:text-danger">&times;</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addToArray("language_preferences", langInput); setLangInput(""); } }}
            className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
            placeholder="Add language..."
          />
          <button
            onClick={() => { addToArray("language_preferences", langInput); setLangInput(""); }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-elevated"
          >
            Add
          </button>
        </div>
      </fieldset>

      {/* ── Frameworks ── */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Preferred Frameworks</legend>
        <div className="flex flex-wrap gap-2">
          {profile.framework_preferences.map((fw, i) => (
            <span
              key={fw}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-light"
            >
              {fw}
              <button onClick={() => removeFromArray("framework_preferences", i)} className="ml-0.5 text-muted hover:text-danger">&times;</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={fwInput}
            onChange={(e) => setFwInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addToArray("framework_preferences", fwInput); setFwInput(""); } }}
            className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
            placeholder="Add framework..."
          />
          <button
            onClick={() => { addToArray("framework_preferences", fwInput); setFwInput(""); }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-elevated"
          >
            Add
          </button>
        </div>
      </fieldset>

      {/* ── Dropdowns ── */}
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Code Style" value={profile.code_style} options={CODE_STYLES} onChange={(v) => setProfile({ ...profile, code_style: v })} />
        <SelectField label="Comment Style" value={profile.comment_style} options={COMMENT_STYLES} onChange={(v) => setProfile({ ...profile, comment_style: v })} />
        <SelectField label="Naming Convention" value={profile.naming_convention} options={NAMING_CONVENTIONS} onChange={(v) => setProfile({ ...profile, naming_convention: v })} />
        <SelectField label="Tone" value={profile.tone} options={TONES} onChange={(v) => setProfile({ ...profile, tone: v })} />
        <SelectField label="Verbosity" value={profile.verbosity} options={VERBOSITY_LEVELS} onChange={(v) => setProfile({ ...profile, verbosity: v })} />
        <SelectField label="Vibe Mode" value={profile.vibe_mode} options={VIBE_MODES} onChange={(v) => setProfile({ ...profile, vibe_mode: v })} />
      </div>

      {/* ── Avoided Patterns ── */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Avoided Patterns</legend>
        <p className="mb-2 text-xs text-muted">Patterns the AI should avoid in generated code.</p>
        <div className="flex flex-wrap gap-2">
          {profile.avoided_patterns.map((pat, i) => (
            <span
              key={pat}
              className="flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"
            >
              {pat}
              <button onClick={() => removeFromArray("avoided_patterns", i)} className="ml-0.5 hover:text-foreground">&times;</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={avoidInput}
            onChange={(e) => setAvoidInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addToArray("avoided_patterns", avoidInput); setAvoidInput(""); } }}
            className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
            placeholder='e.g., "classes", "any", "ternary chains"'
          />
          <button
            onClick={() => { addToArray("avoided_patterns", avoidInput); setAvoidInput(""); }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-elevated"
          >
            Add
          </button>
        </div>
      </fieldset>

      {/* ── Custom Instructions ── */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Custom Instructions</legend>
        <textarea
          value={profile.custom_instructions}
          onChange={(e) => setProfile({ ...profile, custom_instructions: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Any other instructions for the AI (e.g., 'Always suggest tests', 'Prefer composition over inheritance')..."
        />
      </fieldset>

      {/* ── Save ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Taste Profile"}
      </button>

      {/* ── Result ── */}
      {result && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            result.type === "success"
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
