"use client";

import { useState } from "react";

// ── Skeleton Templates ──

interface SkeletonTemplate {
  id: string;
  name: string;
  description: string;
  repo: string;
  recommended?: boolean;
  tags: string[];
  setupCommands: string[];
  notes: string[];
}

const TEMPLATES: SkeletonTemplate[] = [
  {
    id: "vercel-supabase",
    name: "Vercel Supabase Starter",
    description:
      "Official Vercel + Supabase starter with App Router, auth, Tailwind CSS, and TypeScript. The most battle-tested option.",
    repo: "vercel/next.js/examples/with-supabase",
    recommended: true,
    tags: ["Next.js 15", "Supabase", "Tailwind", "TypeScript", "App Router"],
    setupCommands: [
      "npx create-next-app -e with-supabase my-project",
      "cd my-project",
      "cp .env.example .env.local",
      "# Edit .env.local with your Supabase URL and anon key",
      "npm run dev",
    ],
    notes: [
      "Pre-configured Supabase Auth with SSR cookie handling",
      "Middleware-based route protection out of the box",
      "Works with both client and server components",
      "Compatible with shadcn/ui — run: npx shadcn@latest init",
    ],
  },
  {
    id: "makerkit",
    name: "Makerkit Lite",
    description:
      "Open-source SaaS starter kit with Supabase, payments scaffolding, and multi-tenancy. Good for production SaaS apps.",
    repo: "makerkit/next-supabase-saas-kit-lite",
    tags: ["Next.js", "Supabase", "SaaS", "Stripe", "shadcn/ui"],
    setupCommands: [
      "git clone https://github.com/makerkit/next-supabase-saas-kit-lite.git my-project",
      "cd my-project",
      "npm install",
      "cp .env.example .env.local",
      "# Edit .env.local with Supabase + Stripe keys",
      "npm run dev",
    ],
    notes: [
      "Includes Stripe billing scaffolding (free/paid tiers)",
      "Multi-tenancy with organizations built in",
      "Uses shadcn/ui components natively",
      "MIT licensed — fully free and open-source",
    ],
  },
  {
    id: "leerob-saas",
    name: "leerob/next-saas-starter",
    description:
      "Lee Robinson's SaaS starter with Postgres, Stripe, and shadcn/ui. Lightweight and well-documented.",
    repo: "leerob/next-saas-starter",
    tags: ["Next.js 15", "Postgres", "Stripe", "shadcn/ui", "Drizzle ORM"],
    setupCommands: [
      "git clone https://github.com/leerob/next-saas-starter.git my-project",
      "cd my-project",
      "pnpm install",
      "cp .env.example .env",
      "# Adapt to Supabase: replace DATABASE_URL with your Supabase Postgres URL",
      "pnpm dev",
    ],
    notes: [
      "Uses Drizzle ORM — adaptable to Supabase Postgres connection string",
      "Clean, minimal code with shadcn/ui pre-configured",
      "Stripe integration with webhook handling",
      "Replace Drizzle with Supabase client if you prefer the JS SDK",
    ],
  },
  {
    id: "none",
    name: "Start from Scratch",
    description:
      "No template — start with a clean Next.js + Supabase project. Full control from the ground up.",
    repo: "",
    tags: ["Custom", "Full control"],
    setupCommands: [
      "npx create-next-app@latest my-project --typescript --tailwind --app --src-dir",
      "cd my-project",
      "npm install @supabase/supabase-js @supabase/ssr",
      "npx supabase init",
      "npx shadcn@latest init",
      "npm run dev",
    ],
    notes: [
      "Maximum flexibility — no opinionated structure",
      "You'll need to set up auth, middleware, and RLS manually",
      "Follow the Supabase Next.js quickstart for auth setup",
      "Good for learning or highly custom projects",
    ],
  },
];

export function SkeletonSelector() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const template = TEMPLATES.find((t) => t.id === selected);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* ── Template Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              selected === t.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-surface hover:bg-surface-elevated"
            }`}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{t.name}</h3>
              {t.recommended && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                  Recommended
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{t.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* ── Setup Instructions ── */}
      {template && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{template.name}</h3>
            {template.repo && (
              <a
                href={`https://github.com/${template.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-light hover:underline"
              >
                View on GitHub
              </a>
            )}
          </div>

          {/* Setup commands */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium">Setup Commands</h4>
              <button
                onClick={() =>
                  handleCopy(
                    template.setupCommands
                      .filter((c) => !c.startsWith("#"))
                      .join("\n")
                  )
                }
                className="text-xs text-primary-light hover:underline"
              >
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
            <div className="rounded-lg bg-background p-3">
              {template.setupCommands.map((cmd, i) => (
                <div key={i} className="flex items-start gap-2">
                  {cmd.startsWith("#") ? (
                    <code className="font-mono text-xs text-muted">{cmd}</code>
                  ) : (
                    <>
                      <span className="select-none font-mono text-xs text-muted">
                        $
                      </span>
                      <code className="font-mono text-xs text-foreground">
                        {cmd}
                      </code>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Adaptation notes */}
          <div>
            <h4 className="mb-2 text-sm font-medium">
              Supabase + shadcn/ui Compatibility Notes
            </h4>
            <ul className="space-y-1">
              {template.notes.map((note, i) => (
                <li key={i} className="text-sm text-muted">
                  &bull; {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
