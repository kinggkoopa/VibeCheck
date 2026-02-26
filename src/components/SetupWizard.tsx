"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Key,
  Palette,
  Sparkles,
  Rocket,
  Check,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { saveAndValidateKey } from "@/features/settings/actions";
import { saveWizardTasteProfile } from "@/components/setup-wizard-actions";
import type { LLMProvider } from "@/types";

/* ─── Constants ─── */

const WIZARD_COMPLETE_KEY = "metavibe-wizard-completed";

const PROVIDERS: { value: LLMProvider; label: string; hint: string }[] = [
  { value: "anthropic", label: "Anthropic (Recommended)", hint: "sk-ant-..." },
  { value: "openrouter", label: "OpenRouter", hint: "sk-or-..." },
  { value: "groq", label: "Groq", hint: "gsk_..." },
  { value: "openai", label: "OpenAI", hint: "sk-..." },
  { value: "ollama", label: "Ollama (Local)", hint: "No key needed" },
];

const FRAMEWORK_OPTIONS = [
  "React",
  "Next.js",
  "Tailwind",
  "Vue",
  "Svelte",
  "Python",
  "Rust",
  "Go",
] as const;

const CODE_STYLE_OPTIONS = [
  { value: "functional", label: "Functional" },
  { value: "OOP", label: "OOP" },
  { value: "mixed", label: "Mixed" },
] as const;

const VIBE_MODE_OPTIONS = [
  {
    value: "flow-state",
    label: "Flow State",
    desc: "Deep focus, minimal interruptions",
  },
  {
    value: "shipping",
    label: "Shipping",
    desc: "Move fast, pragmatic solutions",
  },
  {
    value: "learning",
    label: "Learning",
    desc: "Detailed explanations, teach me why",
  },
] as const;

const STEPS = [
  { icon: Sparkles, label: "Welcome" },
  { icon: Key, label: "API Key" },
  { icon: Palette, label: "Your Vibe" },
  { icon: Rocket, label: "Ready" },
] as const;

/* ─── Helpers ─── */

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage inaccessible
  }
}

/* ─── Props ─── */

interface SetupWizardProps {
  keyCount: number;
}

/* ─── Component ─── */

export function SetupWizard({ keyCount }: SetupWizardProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);

  // Step 2 — API Key state
  const [provider, setProvider] = useState<LLMProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [keySkipped, setKeySkipped] = useState(false);
  const [validating, startKeyTransition] = useTransition();

  // Step 3 — Taste profile state
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [codeStyle, setCodeStyle] = useState("functional");
  const [vibeMode, setVibeMode] = useState("flow-state");
  const [tasteSaved, setTasteSaved] = useState(false);
  const [tasteSkipped, setTasteSkipped] = useState(false);
  const [tasteError, setTasteError] = useState<string | null>(null);
  const [savingTaste, startTasteTransition] = useTransition();

  // Only show if no keys AND wizard not previously completed
  useEffect(() => {
    if (keyCount === 0 && !safeGetItem(WIZARD_COMPLETE_KEY)) {
      setVisible(true);
    }
  }, [keyCount]);

  const goTo = useCallback(
    (next: number) => {
      if (animating) return;
      setDirection(next > step ? "forward" : "back");
      setAnimating(true);
      // Small timeout allows CSS transition to trigger
      setTimeout(() => {
        setStep(next);
        setAnimating(false);
      }, 200);
    },
    [step, animating]
  );

  /* ── Handlers ── */

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setKeyError(null);

    startKeyTransition(async () => {
      const result = await saveAndValidateKey(
        provider,
        apiKey,
        keyLabel || provider
      );
      if (result.success) {
        setKeySaved(true);
        // Auto-advance after brief success display
        setTimeout(() => goTo(2), 1200);
      } else {
        setKeyError(result.error);
      }
    });
  }

  function handleSkipKey() {
    setKeySkipped(true);
    setTimeout(() => goTo(2), 400);
  }

  function handleSaveTaste() {
    setTasteError(null);
    startTasteTransition(async () => {
      const result = await saveWizardTasteProfile({
        framework_preferences: frameworks,
        code_style: codeStyle,
        vibe_mode: vibeMode,
      });
      if (result.success) {
        setTasteSaved(true);
        setTimeout(() => goTo(3), 800);
      } else {
        setTasteError(result.error);
      }
    });
  }

  function handleSkipTaste() {
    setTasteSkipped(true);
    setTimeout(() => goTo(3), 400);
  }

  function handleFinish() {
    safeSetItem(WIZARD_COMPLETE_KEY, "true");
    setVisible(false);
  }

  function toggleFramework(fw: string) {
    setFrameworks((prev) =>
      prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]
    );
  }

  // Keyboard: Escape to dismiss on final step
  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && step === 3) {
        handleFinish();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, step]);

  if (!visible) return null;

  const selectedHint =
    PROVIDERS.find((p) => p.value === provider)?.hint ?? "";

  /* ─── Render ─── */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Setup wizard"
    >
      {/* Subtle radial glow behind the card */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-2xl shadow-primary/5",
          "transition-all duration-200",
          animating && "scale-[0.98] opacity-0",
          !animating && "scale-100 opacity-100"
        )}
      >
        {/* ── Progress indicator ── */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isCompleted = i < step;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isActive &&
                        "border-primary bg-primary/10 text-primary-light",
                      isCompleted &&
                        "border-success bg-success/10 text-success",
                      !isActive &&
                        !isCompleted &&
                        "border-border text-muted"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-wide",
                      isActive && "text-foreground",
                      isCompleted && "text-success",
                      !isActive && !isCompleted && "text-muted"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mb-5 h-px w-8 transition-colors duration-300",
                      i < step ? "bg-success" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step content ── */}

        {step === 0 && <StepWelcome onNext={() => goTo(1)} />}

        {step === 1 && (
          <StepApiKey
            provider={provider}
            setProvider={setProvider}
            apiKey={apiKey}
            setApiKey={setApiKey}
            keyLabel={keyLabel}
            setKeyLabel={setKeyLabel}
            showKey={showKey}
            setShowKey={setShowKey}
            selectedHint={selectedHint}
            keyError={keyError}
            keySaved={keySaved}
            validating={validating}
            onSubmit={handleSaveKey}
            onSkip={handleSkipKey}
          />
        )}

        {step === 2 && (
          <StepVibe
            frameworks={frameworks}
            toggleFramework={toggleFramework}
            codeStyle={codeStyle}
            setCodeStyle={setCodeStyle}
            vibeMode={vibeMode}
            setVibeMode={setVibeMode}
            tasteSaved={tasteSaved}
            tasteError={tasteError}
            savingTaste={savingTaste}
            onSave={handleSaveTaste}
            onSkip={handleSkipTaste}
          />
        )}

        {step === 3 && (
          <StepReady
            keySaved={keySaved}
            keySkipped={keySkipped}
            tasteSaved={tasteSaved}
            tasteSkipped={tasteSkipped}
            frameworks={frameworks}
            codeStyle={codeStyle}
            vibeMode={vibeMode}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}

/* ━━━ Step sub-components ━━━ */

/* ── Step 0: Welcome ── */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-7 w-7 text-primary-light" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome to MetaVibeCoder
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
        Your AI-powered coding command center. You bring your own API keys
        — we never store unencrypted keys.
      </p>
      <p className="mt-6 text-xs font-medium tracking-wide text-muted uppercase">
        Let&apos;s get you set up in 3 quick steps
      </p>
      <button
        onClick={onNext}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20"
      >
        Get Started
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Step 1: API Key ── */

interface StepApiKeyProps {
  provider: LLMProvider;
  setProvider: (p: LLMProvider) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  keyLabel: string;
  setKeyLabel: (v: string) => void;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
  selectedHint: string;
  keyError: string | null;
  keySaved: boolean;
  validating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}

function StepApiKey({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  keyLabel,
  setKeyLabel,
  showKey,
  setShowKey,
  selectedHint,
  keyError,
  keySaved,
  validating,
  onSubmit,
  onSkip,
}: StepApiKeyProps) {
  if (keySaved) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <Check className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-lg font-bold">Key Saved & Validated</h2>
        <p className="mt-1 text-sm text-muted">
          Your {provider} key has been encrypted and stored securely.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Key className="h-4 w-4 text-primary-light" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Add Your First API Key</h2>
          <p className="text-xs text-muted">
            Encrypted with pgcrypto — never logged or stored in plain text
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Provider */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as LLMProvider)}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={selectedHint}
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 pr-10 font-mono text-sm outline-none transition-colors focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Optional label */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Label{" "}
            <span className="font-normal text-muted/60">(optional)</span>
          </label>
          <input
            type="text"
            value={keyLabel}
            onChange={(e) => setKeyLabel(e.target.value)}
            placeholder="e.g. Work key, Personal"
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        {/* Error */}
        {keyError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{keyError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={validating || !apiKey.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-none"
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating & encrypting...
            </>
          ) : (
            <>
              Validate & Save Key
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
      >
        <AlertTriangle className="h-3 w-3" />
        Skip for now
        <span className="text-muted/60">
          — you&apos;ll need a key to use any features
        </span>
      </button>
    </div>
  );
}

/* ── Step 2: Set Your Vibe ── */

interface StepVibeProps {
  frameworks: string[];
  toggleFramework: (fw: string) => void;
  codeStyle: string;
  setCodeStyle: (v: string) => void;
  vibeMode: string;
  setVibeMode: (v: string) => void;
  tasteSaved: boolean;
  tasteError: string | null;
  savingTaste: boolean;
  onSave: () => void;
  onSkip: () => void;
}

function StepVibe({
  frameworks,
  toggleFramework,
  codeStyle,
  setCodeStyle,
  vibeMode,
  setVibeMode,
  tasteSaved,
  tasteError,
  savingTaste,
  onSave,
  onSkip,
}: StepVibeProps) {
  if (tasteSaved) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <Check className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-lg font-bold">Preferences Saved</h2>
        <p className="mt-1 text-sm text-muted">
          Your vibe profile will personalize every AI interaction.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Palette className="h-4 w-4 text-primary-light" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Set Your Vibe</h2>
          <p className="text-xs text-muted">
            Personalizes all AI output across the platform
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Framework preferences */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">
            Frameworks & Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORK_OPTIONS.map((fw) => {
              const selected = frameworks.includes(fw);
              return (
                <button
                  key={fw}
                  type="button"
                  onClick={() => toggleFramework(fw)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    selected
                      ? "border-primary bg-primary/10 text-primary-light"
                      : "border-border bg-surface-elevated text-muted hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {fw}
                </button>
              );
            })}
          </div>
        </div>

        {/* Code style */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">
            Code Style
          </label>
          <div className="flex gap-2">
            {CODE_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCodeStyle(opt.value)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                  codeStyle === opt.value
                    ? "border-primary bg-primary/10 text-primary-light"
                    : "border-border bg-surface-elevated text-muted hover:border-primary/40 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe mode */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">
            Vibe Mode
          </label>
          <div className="space-y-2">
            {VIBE_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVibeMode(opt.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                  vibeMode === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface-elevated hover:border-primary/40"
                )}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full border-2 transition-colors",
                    vibeMode === opt.value
                      ? "border-primary bg-primary"
                      : "border-muted"
                  )}
                />
                <div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      vibeMode === opt.value
                        ? "text-primary-light"
                        : "text-foreground"
                    )}
                  >
                    {opt.label}
                  </span>
                  <p className="text-[10px] text-muted">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {tasteError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
            <p className="text-sm text-danger">{tasteError}</p>
          </div>
        )}

        {/* Save */}
        <button
          onClick={onSave}
          disabled={savingTaste}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
        >
          {savingTaste ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving preferences...
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-4 flex w-full items-center justify-center text-xs text-muted transition-colors hover:text-foreground"
      >
        Skip for now
      </button>
    </div>
  );
}

/* ── Step 3: Ready ── */

interface StepReadyProps {
  keySaved: boolean;
  keySkipped: boolean;
  tasteSaved: boolean;
  tasteSkipped: boolean;
  frameworks: string[];
  codeStyle: string;
  vibeMode: string;
  onFinish: () => void;
}

const FEATURE_CARDS = [
  {
    title: "Template Vibe",
    desc: "AI-powered web template generation",
    href: "/dashboard/template-vibe",
    icon: Sparkles,
  },
  {
    title: "Agent Swarm",
    desc: "Multi-agent collaborative coding",
    href: "/dashboard/agents",
    icon: Rocket,
  },
  {
    title: "Game Creator",
    desc: "Build games with AI assistance",
    href: "/dashboard/gaming",
    icon: Palette,
  },
] as const;

function StepReady({
  keySaved,
  keySkipped,
  tasteSaved,
  tasteSkipped,
  frameworks,
  codeStyle,
  vibeMode,
  onFinish,
}: StepReadyProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
        <Rocket className="h-7 w-7 text-success" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">You&apos;re Ready!</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
        Your workspace is configured. Here&apos;s a summary of your setup.
      </p>

      {/* Summary */}
      <div className="mt-5 space-y-2 text-left">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2">
          <Key className="h-4 w-4 shrink-0 text-muted" />
          <span className="text-xs text-muted">API Key</span>
          <span className="ml-auto text-xs font-medium">
            {keySaved ? (
              <span className="text-success">Configured</span>
            ) : keySkipped ? (
              <span className="text-warning">Skipped</span>
            ) : (
              <span className="text-muted">Pending</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2">
          <Palette className="h-4 w-4 shrink-0 text-muted" />
          <span className="text-xs text-muted">Vibe Profile</span>
          <span className="ml-auto text-xs font-medium">
            {tasteSaved ? (
              <span className="text-success">
                {frameworks.length > 0
                  ? `${frameworks.join(", ")} / ${codeStyle} / ${vibeMode}`
                  : `${codeStyle} / ${vibeMode}`}
              </span>
            ) : tasteSkipped ? (
              <span className="text-warning">Skipped</span>
            ) : (
              <span className="text-muted">Defaults</span>
            )}
          </span>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {FEATURE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.href}
              href={card.href}
              onClick={() => {
                safeSetItem(WIZARD_COMPLETE_KEY, "true");
              }}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-elevated p-3 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Icon className="h-5 w-5 text-muted transition-colors group-hover:text-primary-light" />
              <span className="text-xs font-medium">{card.title}</span>
              <span className="text-[10px] leading-tight text-muted">
                {card.desc}
              </span>
            </a>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={onFinish}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20"
      >
        Go to Dashboard
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
