"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import {
  PROMPT_TEMPLATES,
  buildPrompt,
  suggestTemplates,
  type PromptCustomization,
} from "@/lib/auto-prompt";

// ── Constants ──

const TONE_OPTIONS: { value: PromptCustomization["tone"]; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Professional" },
  { value: "technical", label: "Technical" },
];

const DEFAULT_CUSTOMIZATIONS: PromptCustomization = {
  tone: "professional",
  framework: "",
  features: [],
  monetization: false,
};

const DEFAULT_TEMPLATE_KEY = "micro-saas";

// ── Component ──

export function VibeWizard() {
  // ── State ──
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customizations, setCustomizations] =
    useState<PromptCustomization>(DEFAULT_CUSTOMIZATIONS);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [launching, startTransition] = useTransition();

  // ── Derived ──
  const templateEntries = useMemo(() => Object.entries(PROMPT_TEMPLATES), []);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templateEntries;

    const query = searchQuery.toLowerCase();

    // Use keyword suggestions for relevance ranking
    const suggestions = suggestTemplates(query);
    const suggestedKeys = new Set(suggestions.map((s) => s.key));

    // Also do basic label/description matching
    return templateEntries.filter(([key, template]) => {
      if (suggestedKeys.has(key)) return true;
      return (
        template.label.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, templateEntries]);

  // ── Handlers ──

  function handleSelectTemplate(key: string) {
    setSelectedTemplate(key);
    setStep(2);
  }

  function handleAddFeature() {
    const feature = featureInput.trim();
    if (!feature) return;
    if (customizations.features.includes(feature)) {
      setFeatureInput("");
      return;
    }
    setCustomizations((prev) => ({
      ...prev,
      features: [...prev.features, feature],
    }));
    setFeatureInput("");
  }

  function handleRemoveFeature(feature: string) {
    setCustomizations((prev) => ({
      ...prev,
      features: prev.features.filter((f) => f !== feature),
    }));
  }

  function handleFeatureKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFeature();
    }
  }

  function handleGoToReview() {
    if (!selectedTemplate) return;
    const prompt = buildPrompt(selectedTemplate, customizations);
    setFinalPrompt(prompt);
    setStep(3);
  }

  function handleQuickStart() {
    setSelectedTemplate(DEFAULT_TEMPLATE_KEY);
    setCustomizations(DEFAULT_CUSTOMIZATIONS);
    const prompt = buildPrompt(DEFAULT_TEMPLATE_KEY, DEFAULT_CUSTOMIZATIONS);
    setFinalPrompt(prompt);
    setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  const handleLaunch = useCallback(() => {
    if (!finalPrompt.trim()) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? `Launch failed (${res.status})`);
          return;
        }

        setSuccess("Vibe launched successfully! Your agent is running.");
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  }, [finalPrompt]);

  // ── Difficulty badge color ──
  function difficultyColor(
    difficulty: "beginner" | "intermediate" | "advanced"
  ): string {
    switch (difficulty) {
      case "beginner":
        return "bg-success/15 text-success";
      case "intermediate":
        return "bg-warning/15 text-warning";
      case "advanced":
        return "bg-danger/15 text-danger";
    }
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* ── Progress Indicator ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  s === step
                    ? "bg-primary text-white"
                    : s < step
                      ? "bg-primary/20 text-primary-light"
                      : "bg-surface-elevated text-muted"
                }`}
              >
                {s < step ? "\u2713" : s}
              </div>
              <span
                className={`text-sm font-medium ${
                  s === step ? "text-foreground" : "text-muted"
                }`}
              >
                {s === 1
                  ? "Choose Template"
                  : s === 2
                    ? "Customize"
                    : "Review & Launch"}
              </span>
              {s < 3 && (
                <div
                  className={`mx-1 h-px w-8 ${
                    s < step ? "bg-primary/40" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleQuickStart}
          className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary-light transition-colors hover:bg-primary/10"
        >
          Quick Start
        </button>
      </div>

      {/* ── Step 1: Choose Template ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Choose a Template</h2>
            <p className="mt-1 text-sm text-muted">
              Pick a project archetype to start with. Each template includes a
              detailed starter prompt you can customize.
            </p>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates (e.g. saas, dashboard, mobile)..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />

          {/* Template Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredTemplates.map(([key, template]) => (
              <button
                key={key}
                onClick={() => handleSelectTemplate(key)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selectedTemplate === key
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-surface hover:bg-surface-elevated"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{template.label}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor(template.difficulty)}`}
                  >
                    {template.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {template.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 4 && (
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted">
                        +{template.tags.length - 4}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {template.estimatedTime}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <p className="text-sm text-muted">
              No templates match your search. Try different keywords.
            </p>
          )}
        </div>
      )}

      {/* ── Step 2: Customize ── */}
      {step === 2 && selectedTemplate && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Customize Your Prompt</h2>
            <p className="mt-1 text-sm text-muted">
              Tailor the{" "}
              <span className="font-medium text-foreground">
                {PROMPT_TEMPLATES[selectedTemplate]?.label}
              </span>{" "}
              template to your needs.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            {/* Tone */}
            <div>
              <label className="mb-1 block text-sm font-medium">Tone</label>
              <select
                value={customizations.tone}
                onChange={(e) =>
                  setCustomizations((prev) => ({
                    ...prev,
                    tone: e.target.value as PromptCustomization["tone"],
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Framework */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Framework (optional)
              </label>
              <input
                type="text"
                value={customizations.framework}
                onChange={(e) =>
                  setCustomizations((prev) => ({
                    ...prev,
                    framework: e.target.value,
                  }))
                }
                placeholder="e.g. Next.js 15, SvelteKit, Remix..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Extra Features */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Extra Features
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={handleFeatureKeyDown}
                  placeholder="Type a feature and press Enter..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="rounded-lg bg-surface-elevated px-3 py-2 text-sm font-medium transition-colors hover:bg-surface"
                >
                  Add
                </button>
              </div>
              {customizations.features.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customizations.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary-light"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(feature)}
                        className="ml-0.5 text-primary-light/60 hover:text-primary-light"
                        aria-label={`Remove ${feature}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Monetization Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">
                  Include Monetization
                </label>
                <p className="text-xs text-muted">
                  Add Stripe billing, pricing page, and subscription management
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={customizations.monetization}
                onClick={() =>
                  setCustomizations((prev) => ({
                    ...prev,
                    monetization: !prev.monetization,
                  }))
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  customizations.monetization ? "bg-primary" : "bg-surface-elevated"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    customizations.monetization ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Step 2 Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-elevated"
            >
              Back
            </button>
            <button
              onClick={handleGoToReview}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Review Prompt
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Launch ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Review & Launch</h2>
            <p className="mt-1 text-sm text-muted">
              Review your final prompt below. Edit it if needed, then launch
              your vibe.
            </p>
          </div>

          {/* Prompt Preview / Editor */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Final Prompt</label>
              {selectedTemplate && PROMPT_TEMPLATES[selectedTemplate] && (
                <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">
                  {PROMPT_TEMPLATES[selectedTemplate].label}
                </span>
              )}
            </div>
            <textarea
              value={finalPrompt}
              onChange={(e) => setFinalPrompt(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </div>

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

          {/* Step 3 Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-elevated"
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(finalPrompt);
                  setSuccess("Copied to clipboard.");
                  setTimeout(() => setSuccess(null), 2000);
                }}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
              >
                Copy
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching || !finalPrompt.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {launching ? "Launching..." : "Launch Vibe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
