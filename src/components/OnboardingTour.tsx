"use client";

import { useState, useEffect } from "react";

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to MetaVibeCoder",
    description:
      "Your personal AI-powered coding assistant. Let's take a quick tour of the key features.",
  },
  {
    title: "1. Configure API Keys",
    description:
      "Start by adding your API key in Settings. We support Anthropic, OpenRouter, Groq, and OpenAI. Your keys are encrypted with pgcrypto.",
    target: '[href="/dashboard/settings"]',
  },
  {
    title: "2. Optimize Prompts",
    description:
      "Turn rough ideas into production-grade prompts. Choose from 6 strategies including chain-of-thought and few-shot examples.",
    target: '[href="/dashboard/optimizer"]',
  },
  {
    title: "3. Run Agent Swarm",
    description:
      "Get multi-angle code review from 4 specialist agents: Architect, Security, UX, and Performance.",
    target: '[href="/dashboard/agents"]',
  },
  {
    title: "4. Auto-Iterate",
    description:
      "Automatically improve your code through critique-test-preview-refine loops until it passes the vibe check.",
    target: '[href="/dashboard/iterate"]',
  },
  {
    title: "5. Memory Vault",
    description:
      "Save context that automatically enriches your future prompts using vector embeddings.",
    target: '[href="/dashboard/memory"]',
  },
  {
    title: "Keyboard Shortcuts",
    description:
      "Use Cmd+Enter to submit forms quickly. More shortcuts coming soon!",
  },
];

const TOUR_KEY = "metavibe-tour-completed";

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show tour only if not completed before
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      setIsVisible(true);
    }
  }, []);

  function handleNext() {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  }

  function handleDismiss() {
    setIsVisible(false);
    localStorage.setItem(TOUR_KEY, "true");
  }

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        {/* Progress */}
        <div className="mb-4 flex gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= currentStep ? "bg-primary" : "bg-surface-elevated"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold">{step.title}</h2>
        <p className="mt-2 text-sm text-muted">{step.description}</p>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="text-xs text-muted hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-elevated"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
