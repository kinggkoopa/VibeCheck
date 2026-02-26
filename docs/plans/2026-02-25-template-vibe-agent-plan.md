# Template Vibe Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a LangGraph swarm that injects professional web templates into generated code, with taste-driven vibe synthesis, Jhey CSS inspiration, monetization styling, and multi-dimensional scoring.

**Architecture:** 5 sub-agents (Template Scout, Vibe Blender, Monetization Styler, Output Assembler, Vibe Scorer) orchestrated by a supervisor in a LangGraph StateGraph. A pre-curated template registry in `lib/template-library.ts` provides the data backbone. Integration with Swarm Coordinator, TasteProfile, and profit-agent.

**Tech Stack:** LangGraph.js (StateGraph, Annotation), Next.js 15 App Router, Tailwind CSS v4, TypeScript, Supabase

---

### Task 1: Add `"template-vibe"` to AgentRole type

**Files:**
- Modify: `src/types/index.ts:40-62`

**Step 1: Add the new role to AgentRole union**

In `src/types/index.ts`, add `"template-vibe"` to the `AgentRole` type union, after `"swarm-coordinator"`:

```typescript
export type AgentRole =
  | "planner"
  | "coder"
  | "reviewer"
  | "tester"
  | "inspiration"
  | "animation-critic"
  | "profit-agent"
  | "math-guardian"
  | "alpha-simulator"
  | "comprehension-gate"
  | "kalshi-alpha"
  | "polymarket-max"
  | "results-booster"
  | "opus-handoff"
  | "godot-viber"
  | "unreal-pro"
  | "game-engine-master"
  | "gaming-master"
  | "music-edu"
  | "cyber-shield"
  | "osint-hunter"
  | "swarm-coordinator"
  | "template-vibe";
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors related to AgentRole

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add template-vibe to AgentRole union"
```

---

### Task 2: Add template-vibe prompt to AGENT_PROMPTS

**Files:**
- Modify: `src/core/agents/types.ts:54-91`

**Step 1: Add the template-vibe prompt**

In `src/core/agents/types.ts`, add a new entry to `AGENT_PROMPTS` after the `"animation-critic"` entry:

```typescript
  "template-vibe": `You are a Template Vibe Agent specializing in professional web UI template injection.
Given a task, detect the app type (landing, dashboard, SaaS, e-commerce, blog, portfolio, admin, docs, pricing)
and recommend the best-matching professional template. Consider:
- App type detection from user prompt keywords and intent
- Template-to-taste alignment (user's preferred frameworks, styles, vibe mode)
- Monetization readiness (pricing pages, CTAs, conversion sections)
- Responsive and dark mode defaults
- Jhey Tompkins-inspired animations and modern CSS techniques
Suggest specific template sections and how to blend them with the user's taste profile.`,
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/core/agents/types.ts
git commit -m "feat(agents): add template-vibe prompt to AGENT_PROMPTS"
```

---

### Task 3: Create template registry (`lib/template-library.ts`)

**Files:**
- Create: `src/lib/template-library.ts`

**Step 1: Create the template library with types, registry, and utility functions**

Create `src/lib/template-library.ts` with the full template registry. This file contains:
- Type definitions (AppType, TemplateSource, TemplateSection, ColorScheme, WebTemplate, VibeMatchScore)
- Pre-curated template registry (~15 templates across 5 categories)
- Utility functions: searchTemplates, matchTemplateToTaste, getTemplateSections, detectAppType, computeVibeScore

```typescript
/**
 * Template Library — Pre-curated web template registry for the Template Vibe Agent.
 *
 * Provides professional HTML/TSX templates organized by app type (landing, dashboard,
 * SaaS, e-commerce, portfolio). Each template includes full-page HTML and decomposable
 * sections with dark mode and responsive defaults baked in.
 *
 * Used by the Template Vibe Swarm to bootstrap web apps from proven starting points,
 * similar to how godot-templates.ts bootstraps Godot projects.
 */

// ── Types ──

export type AppType =
  | "landing"
  | "dashboard"
  | "e-commerce"
  | "blog"
  | "portfolio"
  | "admin"
  | "saas"
  | "docs"
  | "pricing";

export type TemplateSource = "shadcn" | "hyperui" | "custom";

export interface TemplateSection {
  id: string;
  label: string;
  html: string;
  variants: string[];
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

export interface WebTemplate {
  id: string;
  name: string;
  category: AppType;
  tags: string[];
  source: TemplateSource;
  fullPage: string;
  sections: TemplateSection[];
  colorScheme: ColorScheme;
  responsive: boolean;
  darkMode: boolean;
  monetizationSlots: string[];
  vibeKeywords: string[];
}

export interface VibeMatchScore {
  designFit: number;
  tasteAlignment: number;
  monetizationReady: number;
  responsiveness: number;
  animationQuality: number;
  overall: number;
}

// ── Color Palettes ──

const PALETTES: Record<string, ColorScheme> = {
  modern: {
    primary: "oklch(0.7 0.15 250)",
    secondary: "oklch(0.65 0.12 300)",
    accent: "oklch(0.75 0.18 160)",
    background: "oklch(0.13 0.01 260)",
    foreground: "oklch(0.95 0.01 260)",
    muted: "oklch(0.55 0.02 260)",
  },
  warm: {
    primary: "oklch(0.7 0.16 30)",
    secondary: "oklch(0.65 0.12 60)",
    accent: "oklch(0.8 0.14 80)",
    background: "oklch(0.14 0.01 40)",
    foreground: "oklch(0.95 0.01 40)",
    muted: "oklch(0.55 0.02 40)",
  },
  cool: {
    primary: "oklch(0.7 0.14 220)",
    secondary: "oklch(0.6 0.1 200)",
    accent: "oklch(0.75 0.16 180)",
    background: "oklch(0.12 0.02 230)",
    foreground: "oklch(0.95 0.01 230)",
    muted: "oklch(0.5 0.02 230)",
  },
};

// ── Template Registry ──

export const WEB_TEMPLATES: Record<string, WebTemplate> = {
  // ── Landing Pages ──
  "landing-saas-hero": {
    id: "landing-saas-hero",
    name: "SaaS Hero Landing",
    category: "landing",
    tags: ["hero", "cta", "gradient", "saas", "startup"],
    source: "shadcn",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <!-- Hero -->
  <header class="relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" />
    <nav class="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <span class="text-xl font-bold">Brand</span>
      <div class="flex items-center gap-6">
        <a href="#features" class="text-sm text-muted hover:text-foreground transition-colors">Features</a>
        <a href="#pricing" class="text-sm text-muted hover:text-foreground transition-colors">Pricing</a>
        <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Get Started</button>
      </div>
    </nav>
    <div class="relative mx-auto max-w-4xl px-6 py-24 text-center">
      <h1 class="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">Build faster with <span class="text-primary">AI-powered</span> tools</h1>
      <p class="mx-auto mt-6 max-w-2xl text-lg text-muted">Ship products 10x faster. Our platform handles the complexity so you can focus on what matters.</p>
      <div class="mt-10 flex items-center justify-center gap-4">
        <button class="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Start Free Trial</button>
        <button class="rounded-lg border border-border px-6 py-3 font-medium hover:bg-surface-elevated transition-colors">Watch Demo</button>
      </div>
    </div>
  </header>

  <!-- Features -->
  <section id="features" class="mx-auto max-w-6xl px-6 py-24">
    <h2 class="text-center text-3xl font-bold">Everything you need</h2>
    <p class="mx-auto mt-4 max-w-2xl text-center text-muted">Powerful features to supercharge your workflow</p>
    <div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">⚡</div>
        <h3 class="mt-4 font-semibold">Lightning Fast</h3>
        <p class="mt-2 text-sm text-muted">Optimized for speed. Every millisecond counts.</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">🔒</div>
        <h3 class="mt-4 font-semibold">Secure by Default</h3>
        <p class="mt-2 text-sm text-muted">Enterprise-grade security built into every layer.</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">📊</div>
        <h3 class="mt-4 font-semibold">Analytics</h3>
        <p class="mt-2 text-sm text-muted">Real-time insights to drive your decisions.</p>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="border-t border-border bg-surface">
    <div class="mx-auto max-w-4xl px-6 py-24 text-center">
      <h2 class="text-3xl font-bold">Ready to get started?</h2>
      <p class="mt-4 text-muted">Join thousands of teams already shipping faster.</p>
      <button class="mt-8 rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Start Free Trial</button>
    </div>
  </section>
</div>`,
    sections: [
      {
        id: "hero",
        label: "Hero Section",
        html: `<header class="relative overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" /><nav class="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><span class="text-xl font-bold">Brand</span><div class="flex items-center gap-6"><a href="#features" class="text-sm text-muted hover:text-foreground transition-colors">Features</a><a href="#pricing" class="text-sm text-muted hover:text-foreground transition-colors">Pricing</a><button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Get Started</button></div></nav><div class="relative mx-auto max-w-4xl px-6 py-24 text-center"><h1 class="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">Build faster with <span class="text-primary">AI-powered</span> tools</h1><p class="mx-auto mt-6 max-w-2xl text-lg text-muted">Ship products 10x faster.</p><div class="mt-10 flex items-center justify-center gap-4"><button class="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground">Start Free Trial</button><button class="rounded-lg border border-border px-6 py-3 font-medium">Watch Demo</button></div></div></header>`,
        variants: ["gradient-hero", "video-hero", "illustration-hero"],
      },
      {
        id: "features",
        label: "Feature Grid",
        html: `<section class="mx-auto max-w-6xl px-6 py-24"><h2 class="text-center text-3xl font-bold">Everything you need</h2><div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"><div class="rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-lg"><div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">⚡</div><h3 class="mt-4 font-semibold">Lightning Fast</h3><p class="mt-2 text-sm text-muted">Optimized for speed.</p></div></div></section>`,
        variants: ["icon-grid", "card-grid", "list-features"],
      },
      {
        id: "cta",
        label: "Call to Action",
        html: `<section class="border-t border-border bg-surface"><div class="mx-auto max-w-4xl px-6 py-24 text-center"><h2 class="text-3xl font-bold">Ready to get started?</h2><p class="mt-4 text-muted">Join thousands of teams already shipping faster.</p><button class="mt-8 rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground">Start Free Trial</button></div></section>`,
        variants: ["simple-cta", "split-cta", "newsletter-cta"],
      },
    ],
    colorScheme: PALETTES.modern,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["pricing-section", "cta-banner"],
    vibeKeywords: ["modern", "clean", "gradient", "bold"],
  },

  "landing-minimal": {
    id: "landing-minimal",
    name: "Minimal Landing",
    category: "landing",
    tags: ["minimal", "clean", "typography", "whitespace"],
    source: "custom",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <nav class="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
    <span class="text-lg font-medium">Brand</span>
    <button class="text-sm text-muted hover:text-foreground transition-colors">Sign in</button>
  </nav>
  <main class="mx-auto max-w-3xl px-6 py-32">
    <h1 class="text-4xl font-light leading-tight tracking-tight sm:text-5xl">Simple tools for<br/><span class="font-semibold">complex problems</span></h1>
    <p class="mt-8 max-w-xl text-lg text-muted leading-relaxed">We believe the best tools get out of your way. No bloat, no complexity — just what you need.</p>
    <div class="mt-12 flex gap-4">
      <button class="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors">Get started</button>
      <button class="text-sm font-medium text-muted hover:text-foreground transition-colors">Learn more →</button>
    </div>
  </main>
</div>`,
    sections: [
      {
        id: "hero",
        label: "Minimal Hero",
        html: `<main class="mx-auto max-w-3xl px-6 py-32"><h1 class="text-4xl font-light leading-tight tracking-tight sm:text-5xl">Simple tools for<br/><span class="font-semibold">complex problems</span></h1><p class="mt-8 max-w-xl text-lg text-muted leading-relaxed">We believe the best tools get out of your way.</p></main>`,
        variants: ["centered", "left-aligned", "split"],
      },
    ],
    colorScheme: PALETTES.cool,
    responsive: true,
    darkMode: true,
    monetizationSlots: [],
    vibeKeywords: ["minimal", "clean", "elegant", "simple", "typography"],
  },

  "landing-hyperui-gradient": {
    id: "landing-hyperui-gradient",
    name: "HyperUI Gradient Landing",
    category: "landing",
    tags: ["gradient", "animated", "hyperui", "colorful", "bold"],
    source: "hyperui",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <div class="relative isolate">
    <div class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
      <div class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style="clip-path:polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" /></div>
    </div>
    <div class="mx-auto max-w-4xl px-6 py-32 text-center sm:py-48">
      <h1 class="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Supercharge your creative workflow</h1>
      <p class="mt-6 text-lg leading-8 text-muted">Unleash your potential with tools designed for creators, builders, and dreamers.</p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <button class="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/80 transition-colors">Get started</button>
        <button class="text-sm font-semibold leading-6 text-foreground">Learn more <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</div>`,
    sections: [
      {
        id: "hero",
        label: "Gradient Hero",
        html: `<div class="relative isolate"><div class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true"><div class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" /></div><div class="mx-auto max-w-4xl px-6 py-32 text-center"><h1 class="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Supercharge your creative workflow</h1></div></div>`,
        variants: ["blob-gradient", "mesh-gradient", "radial-gradient"],
      },
    ],
    colorScheme: PALETTES.modern,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["cta-banner"],
    vibeKeywords: ["bold", "gradient", "colorful", "animated", "playful"],
  },

  // ── Dashboards ──
  "dashboard-sidebar": {
    id: "dashboard-sidebar",
    name: "Sidebar Dashboard",
    category: "dashboard",
    tags: ["sidebar", "stats", "cards", "charts", "admin"],
    source: "shadcn",
    fullPage: `<div class="flex h-screen bg-background text-foreground">
  <!-- Sidebar -->
  <aside class="flex w-64 flex-col border-r border-border bg-surface">
    <div class="flex h-16 items-center px-6"><span class="text-lg font-bold">Dashboard</span></div>
    <nav class="flex-1 space-y-1 px-3 py-4">
      <a href="#" class="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">Overview</a>
      <a href="#" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Analytics</a>
      <a href="#" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Customers</a>
      <a href="#" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Settings</a>
    </nav>
  </aside>
  <!-- Main -->
  <main class="flex-1 overflow-auto">
    <header class="flex h-16 items-center justify-between border-b border-border px-8">
      <h1 class="text-lg font-semibold">Overview</h1>
      <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">New Report</button>
    </header>
    <div class="p-8">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-border bg-surface p-6"><p class="text-sm text-muted">Total Revenue</p><p class="mt-2 text-3xl font-bold">$45,231</p><p class="mt-1 text-xs text-success">+20.1% from last month</p></div>
        <div class="rounded-xl border border-border bg-surface p-6"><p class="text-sm text-muted">Subscriptions</p><p class="mt-2 text-3xl font-bold">+2,350</p><p class="mt-1 text-xs text-success">+180 this week</p></div>
        <div class="rounded-xl border border-border bg-surface p-6"><p class="text-sm text-muted">Active Users</p><p class="mt-2 text-3xl font-bold">12,234</p><p class="mt-1 text-xs text-success">+573 today</p></div>
        <div class="rounded-xl border border-border bg-surface p-6"><p class="text-sm text-muted">Conversion</p><p class="mt-2 text-3xl font-bold">3.2%</p><p class="mt-1 text-xs text-danger">-0.4% from last month</p></div>
      </div>
      <div class="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 class="font-semibold">Recent Activity</h2>
        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between border-b border-border pb-4"><div><p class="text-sm font-medium">New subscriber</p><p class="text-xs text-muted">john@example.com</p></div><span class="text-xs text-muted">2 min ago</span></div>
          <div class="flex items-center justify-between border-b border-border pb-4"><div><p class="text-sm font-medium">Payment received</p><p class="text-xs text-muted">$49.00 — Pro Plan</p></div><span class="text-xs text-muted">15 min ago</span></div>
        </div>
      </div>
    </div>
  </main>
</div>`,
    sections: [
      {
        id: "sidebar",
        label: "Sidebar Navigation",
        html: `<aside class="flex w-64 flex-col border-r border-border bg-surface"><div class="flex h-16 items-center px-6"><span class="text-lg font-bold">Dashboard</span></div><nav class="flex-1 space-y-1 px-3 py-4"><a href="#" class="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">Overview</a><a href="#" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Analytics</a></nav></aside>`,
        variants: ["icon-sidebar", "collapsible-sidebar", "minimal-sidebar"],
      },
      {
        id: "stat-cards",
        label: "Stat Cards Grid",
        html: `<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"><div class="rounded-xl border border-border bg-surface p-6"><p class="text-sm text-muted">Total Revenue</p><p class="mt-2 text-3xl font-bold">$45,231</p><p class="mt-1 text-xs text-success">+20.1%</p></div></div>`,
        variants: ["compact-stats", "icon-stats", "chart-stats"],
      },
      {
        id: "activity-feed",
        label: "Activity Feed",
        html: `<div class="rounded-xl border border-border bg-surface p-6"><h2 class="font-semibold">Recent Activity</h2><div class="mt-4 space-y-4"><div class="flex items-center justify-between border-b border-border pb-4"><div><p class="text-sm font-medium">New subscriber</p><p class="text-xs text-muted">john@example.com</p></div><span class="text-xs text-muted">2 min ago</span></div></div></div>`,
        variants: ["timeline", "card-feed", "compact-list"],
      },
    ],
    colorScheme: PALETTES.modern,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["upgrade-banner", "usage-meter"],
    vibeKeywords: ["professional", "clean", "data-driven", "corporate"],
  },

  // ── SaaS ──
  "saas-pricing": {
    id: "saas-pricing",
    name: "SaaS Pricing Page",
    category: "pricing",
    tags: ["pricing", "tiers", "comparison", "saas", "monetization"],
    source: "shadcn",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <div class="mx-auto max-w-6xl px-6 py-24">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
      <p class="mt-4 text-lg text-muted">Choose the plan that fits your needs. Cancel anytime.</p>
    </div>
    <div class="mt-16 grid gap-8 lg:grid-cols-3">
      <!-- Free -->
      <div class="rounded-2xl border border-border bg-surface p-8">
        <h3 class="text-lg font-semibold">Free</h3>
        <p class="mt-2 text-sm text-muted">For individuals getting started</p>
        <p class="mt-6"><span class="text-4xl font-bold">$0</span><span class="text-muted">/month</span></p>
        <ul class="mt-8 space-y-3 text-sm">
          <li class="flex items-center gap-2"><span class="text-success">✓</span> 5 projects</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Basic analytics</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Community support</li>
        </ul>
        <button class="mt-8 w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-surface-elevated transition-colors">Get started</button>
      </div>
      <!-- Pro (highlighted) -->
      <div class="relative rounded-2xl border-2 border-primary bg-surface p-8 shadow-lg shadow-primary/10">
        <div class="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">Most Popular</div>
        <h3 class="text-lg font-semibold">Pro</h3>
        <p class="mt-2 text-sm text-muted">For growing teams</p>
        <p class="mt-6"><span class="text-4xl font-bold">$29</span><span class="text-muted">/month</span></p>
        <ul class="mt-8 space-y-3 text-sm">
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Unlimited projects</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Advanced analytics</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Priority support</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Custom integrations</li>
        </ul>
        <button class="mt-8 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Start free trial</button>
      </div>
      <!-- Enterprise -->
      <div class="rounded-2xl border border-border bg-surface p-8">
        <h3 class="text-lg font-semibold">Enterprise</h3>
        <p class="mt-2 text-sm text-muted">For large organizations</p>
        <p class="mt-6"><span class="text-4xl font-bold">Custom</span></p>
        <ul class="mt-8 space-y-3 text-sm">
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Everything in Pro</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> SSO & SAML</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> Dedicated support</li>
          <li class="flex items-center gap-2"><span class="text-success">✓</span> SLA guarantees</li>
        </ul>
        <button class="mt-8 w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-surface-elevated transition-colors">Contact sales</button>
      </div>
    </div>
  </div>
</div>`,
    sections: [
      {
        id: "pricing-header",
        label: "Pricing Header",
        html: `<div class="text-center"><h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2><p class="mt-4 text-lg text-muted">Choose the plan that fits your needs.</p></div>`,
        variants: ["with-toggle", "with-badge"],
      },
      {
        id: "pricing-cards",
        label: "Pricing Cards",
        html: `<div class="mt-16 grid gap-8 lg:grid-cols-3"><!-- pricing cards --></div>`,
        variants: ["3-tier", "2-tier", "comparison-table"],
      },
    ],
    colorScheme: PALETTES.modern,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["pricing-table", "annual-toggle", "faq-section"],
    vibeKeywords: ["professional", "trustworthy", "conversion", "clear"],
  },

  // ── E-commerce ──
  "ecommerce-product-grid": {
    id: "ecommerce-product-grid",
    name: "Product Grid Store",
    category: "e-commerce",
    tags: ["products", "grid", "cart", "shop", "store"],
    source: "hyperui",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <header class="border-b border-border">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <span class="text-xl font-bold">Store</span>
      <div class="flex items-center gap-6">
        <input type="search" placeholder="Search products..." class="rounded-lg border border-border bg-surface px-4 py-2 text-sm focus:border-primary focus:outline-none" />
        <button class="relative"><span>Cart</span><span class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span></button>
      </div>
    </div>
  </header>
  <main class="mx-auto max-w-6xl px-6 py-12">
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div class="group rounded-xl border border-border bg-surface overflow-hidden transition-all hover:shadow-lg">
        <div class="aspect-square bg-surface-elevated" />
        <div class="p-4">
          <h3 class="font-medium group-hover:text-primary transition-colors">Product Name</h3>
          <p class="mt-1 text-sm text-muted">Short description</p>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-lg font-bold">$29.99</span>
            <button class="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`,
    sections: [
      {
        id: "store-header",
        label: "Store Header",
        html: `<header class="border-b border-border"><div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><span class="text-xl font-bold">Store</span></div></header>`,
        variants: ["with-search", "with-categories", "minimal"],
      },
      {
        id: "product-grid",
        label: "Product Grid",
        html: `<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><div class="group rounded-xl border border-border bg-surface overflow-hidden"><div class="aspect-square bg-surface-elevated" /><div class="p-4"><h3 class="font-medium">Product</h3><span class="text-lg font-bold">$29.99</span></div></div></div>`,
        variants: ["card-grid", "list-view", "masonry"],
      },
    ],
    colorScheme: PALETTES.warm,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["product-cards", "cart-upsell", "checkout-flow"],
    vibeKeywords: ["commercial", "shop", "clean", "browsable"],
  },

  // ── Portfolio ──
  "portfolio-creative": {
    id: "portfolio-creative",
    name: "Creative Portfolio",
    category: "portfolio",
    tags: ["portfolio", "creative", "showcase", "personal", "projects"],
    source: "custom",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <nav class="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
    <span class="text-lg font-medium">Jane Doe</span>
    <div class="flex gap-6 text-sm text-muted">
      <a href="#work" class="hover:text-foreground transition-colors">Work</a>
      <a href="#about" class="hover:text-foreground transition-colors">About</a>
      <a href="#contact" class="hover:text-foreground transition-colors">Contact</a>
    </div>
  </nav>
  <main class="mx-auto max-w-5xl px-6">
    <section class="py-24">
      <h1 class="text-5xl font-bold leading-tight sm:text-6xl">Designer &<br/>Developer</h1>
      <p class="mt-6 max-w-xl text-lg text-muted">I create digital experiences that are beautiful, functional, and accessible.</p>
    </section>
    <section id="work" class="py-16">
      <h2 class="text-2xl font-bold">Selected Work</h2>
      <div class="mt-12 grid gap-8 sm:grid-cols-2">
        <div class="group cursor-pointer">
          <div class="aspect-video rounded-xl bg-surface-elevated overflow-hidden transition-transform group-hover:scale-[1.02]" />
          <h3 class="mt-4 font-semibold group-hover:text-primary transition-colors">Project Alpha</h3>
          <p class="mt-1 text-sm text-muted">Web Design, Development</p>
        </div>
        <div class="group cursor-pointer">
          <div class="aspect-video rounded-xl bg-surface-elevated overflow-hidden transition-transform group-hover:scale-[1.02]" />
          <h3 class="mt-4 font-semibold group-hover:text-primary transition-colors">Project Beta</h3>
          <p class="mt-1 text-sm text-muted">Branding, UI/UX</p>
        </div>
      </div>
    </section>
  </main>
</div>`,
    sections: [
      {
        id: "portfolio-hero",
        label: "Portfolio Hero",
        html: `<section class="py-24"><h1 class="text-5xl font-bold leading-tight sm:text-6xl">Designer &<br/>Developer</h1><p class="mt-6 max-w-xl text-lg text-muted">I create digital experiences.</p></section>`,
        variants: ["large-type", "image-bg", "split-layout"],
      },
      {
        id: "project-grid",
        label: "Project Showcase",
        html: `<div class="mt-12 grid gap-8 sm:grid-cols-2"><div class="group cursor-pointer"><div class="aspect-video rounded-xl bg-surface-elevated overflow-hidden transition-transform group-hover:scale-[1.02]" /><h3 class="mt-4 font-semibold">Project Alpha</h3></div></div>`,
        variants: ["2-column", "masonry", "carousel"],
      },
    ],
    colorScheme: PALETTES.cool,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["contact-form", "hire-me-cta"],
    vibeKeywords: ["creative", "elegant", "personal", "showcase", "artistic"],
  },

  // ── Blog ──
  "blog-modern": {
    id: "blog-modern",
    name: "Modern Blog",
    category: "blog",
    tags: ["blog", "articles", "content", "reading", "posts"],
    source: "custom",
    fullPage: `<div class="min-h-screen bg-background text-foreground">
  <header class="border-b border-border">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
      <span class="text-lg font-bold">Blog</span>
      <div class="flex gap-4 text-sm text-muted">
        <a href="#" class="hover:text-foreground transition-colors">Latest</a>
        <a href="#" class="hover:text-foreground transition-colors">Popular</a>
        <a href="#" class="hover:text-foreground transition-colors">About</a>
      </div>
    </div>
  </header>
  <main class="mx-auto max-w-4xl px-6 py-16">
    <article class="group cursor-pointer border-b border-border pb-12">
      <time class="text-xs text-muted">Feb 25, 2026</time>
      <h2 class="mt-2 text-2xl font-bold group-hover:text-primary transition-colors">Building for the future</h2>
      <p class="mt-3 text-muted line-clamp-3">An exploration of modern web development patterns and how they shape the tools we build...</p>
      <span class="mt-4 inline-block text-sm font-medium text-primary">Read more →</span>
    </article>
  </main>
</div>`,
    sections: [
      {
        id: "blog-header",
        label: "Blog Header",
        html: `<header class="border-b border-border"><div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-4"><span class="text-lg font-bold">Blog</span></div></header>`,
        variants: ["minimal", "with-search", "magazine"],
      },
      {
        id: "article-list",
        label: "Article List",
        html: `<article class="group cursor-pointer border-b border-border pb-12"><time class="text-xs text-muted">Feb 25, 2026</time><h2 class="mt-2 text-2xl font-bold group-hover:text-primary transition-colors">Building for the future</h2><p class="mt-3 text-muted line-clamp-3">An exploration...</p></article>`,
        variants: ["card-list", "compact-list", "featured-hero"],
      },
    ],
    colorScheme: PALETTES.cool,
    responsive: true,
    darkMode: true,
    monetizationSlots: ["newsletter-signup", "sponsored-post"],
    vibeKeywords: ["readable", "clean", "content-first", "typography"],
  },

  // ── Admin ──
  "admin-data-table": {
    id: "admin-data-table",
    name: "Admin Data Table",
    category: "admin",
    tags: ["admin", "table", "data", "crud", "management"],
    source: "shadcn",
    fullPage: `<div class="flex h-screen bg-background text-foreground">
  <aside class="w-56 border-r border-border bg-surface p-4">
    <span class="text-lg font-bold">Admin</span>
    <nav class="mt-6 space-y-1">
      <a href="#" class="block rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">Users</a>
      <a href="#" class="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Orders</a>
      <a href="#" class="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Products</a>
      <a href="#" class="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-elevated">Settings</a>
    </nav>
  </aside>
  <main class="flex-1 p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Users</h1>
      <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add User</button>
    </div>
    <div class="mt-6 overflow-hidden rounded-xl border border-border">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-border bg-surface"><tr><th class="px-4 py-3 font-medium text-muted">Name</th><th class="px-4 py-3 font-medium text-muted">Email</th><th class="px-4 py-3 font-medium text-muted">Role</th><th class="px-4 py-3 font-medium text-muted">Status</th></tr></thead>
        <tbody><tr class="border-b border-border hover:bg-surface-elevated transition-colors"><td class="px-4 py-3">John Doe</td><td class="px-4 py-3 text-muted">john@example.com</td><td class="px-4 py-3">Admin</td><td class="px-4 py-3"><span class="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">Active</span></td></tr></tbody>
      </table>
    </div>
  </main>
</div>`,
    sections: [
      {
        id: "admin-sidebar",
        label: "Admin Sidebar",
        html: `<aside class="w-56 border-r border-border bg-surface p-4"><span class="text-lg font-bold">Admin</span><nav class="mt-6 space-y-1"><a href="#" class="block rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">Users</a></nav></aside>`,
        variants: ["icon-nav", "collapsible", "top-nav"],
      },
      {
        id: "data-table",
        label: "Data Table",
        html: `<div class="overflow-hidden rounded-xl border border-border"><table class="w-full text-left text-sm"><thead class="border-b border-border bg-surface"><tr><th class="px-4 py-3 font-medium text-muted">Name</th></tr></thead><tbody><tr class="border-b border-border hover:bg-surface-elevated"><td class="px-4 py-3">John Doe</td></tr></tbody></table></div>`,
        variants: ["sortable", "paginated", "selectable"],
      },
    ],
    colorScheme: PALETTES.modern,
    responsive: true,
    darkMode: true,
    monetizationSlots: [],
    vibeKeywords: ["professional", "structured", "data-driven", "enterprise"],
  },

  // ── Docs ──
  "docs-sidebar": {
    id: "docs-sidebar",
    name: "Documentation Site",
    category: "docs",
    tags: ["docs", "documentation", "api", "reference", "guide"],
    source: "custom",
    fullPage: `<div class="flex h-screen bg-background text-foreground">
  <aside class="w-64 overflow-auto border-r border-border bg-surface p-6">
    <span class="text-lg font-bold">Docs</span>
    <nav class="mt-8 space-y-6">
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted">Getting Started</h4>
        <div class="mt-2 space-y-1">
          <a href="#" class="block rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">Introduction</a>
          <a href="#" class="block rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">Installation</a>
          <a href="#" class="block rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">Quick Start</a>
        </div>
      </div>
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted">API Reference</h4>
        <div class="mt-2 space-y-1">
          <a href="#" class="block rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">Authentication</a>
          <a href="#" class="block rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground">Endpoints</a>
        </div>
      </div>
    </nav>
  </aside>
  <main class="flex-1 overflow-auto px-12 py-8">
    <article class="prose prose-invert max-w-3xl">
      <h1>Introduction</h1>
      <p class="text-lg text-muted">Welcome to the documentation. This guide will help you get started.</p>
      <h2>Overview</h2>
      <p>Our platform provides a powerful API for building integrations...</p>
      <pre class="rounded-lg bg-surface-elevated p-4"><code>npm install @brand/sdk</code></pre>
    </article>
  </main>
</div>`,
    sections: [
      {
        id: "docs-sidebar",
        label: "Docs Sidebar",
        html: `<aside class="w-64 overflow-auto border-r border-border bg-surface p-6"><span class="text-lg font-bold">Docs</span><nav class="mt-8 space-y-6"><div><h4 class="text-xs font-semibold uppercase tracking-wider text-muted">Getting Started</h4></div></nav></aside>`,
        variants: ["nested", "searchable", "collapsible"],
      },
      {
        id: "docs-content",
        label: "Docs Content",
        html: `<article class="prose prose-invert max-w-3xl"><h1>Introduction</h1><p class="text-lg text-muted">Welcome to the documentation.</p></article>`,
        variants: ["prose", "api-reference", "tutorial"],
      },
    ],
    colorScheme: PALETTES.cool,
    responsive: true,
    darkMode: true,
    monetizationSlots: [],
    vibeKeywords: ["technical", "structured", "readable", "reference"],
  },
};

// ── Utility Functions ──

/**
 * Detect the app type from a user prompt.
 * Returns the best-matching AppType based on keyword analysis.
 */
export function detectAppType(prompt: string): AppType {
  const lower = prompt.toLowerCase();

  const patterns: [AppType, string[]][] = [
    ["dashboard", ["dashboard", "admin panel", "analytics", "metrics", "stats", "overview"]],
    ["e-commerce", ["e-commerce", "ecommerce", "shop", "store", "product", "cart", "checkout", "marketplace"]],
    ["pricing", ["pricing", "plans", "subscription", "tier", "billing"]],
    ["blog", ["blog", "article", "post", "content", "writing", "cms"]],
    ["portfolio", ["portfolio", "showcase", "personal site", "projects", "resume", "cv"]],
    ["admin", ["admin", "backoffice", "management", "crud", "users table", "data table"]],
    ["docs", ["docs", "documentation", "api reference", "guide", "tutorial", "reference"]],
    ["saas", ["saas", "software as a service", "platform", "app", "tool", "service"]],
    ["landing", ["landing", "homepage", "hero", "launch", "coming soon", "waitlist"]],
  ];

  let bestMatch: AppType = "landing";
  let bestScore = 0;

  for (const [appType, keywords] of patterns) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = appType;
    }
  }

  return bestMatch;
}

/**
 * Search templates by query and optional category filter.
 */
export function searchTemplates(
  query: string,
  category?: AppType
): WebTemplate[] {
  const lower = query.toLowerCase();
  const all = Object.values(WEB_TEMPLATES);

  return all
    .filter((t) => {
      if (category && t.category !== category) return false;
      const searchable = [t.name, t.category, ...t.tags, ...t.vibeKeywords]
        .join(" ")
        .toLowerCase();
      return lower.split(/\s+/).some((word) => searchable.includes(word));
    })
    .sort((a, b) => {
      // Prefer exact category matches
      const aMatch = a.category === category ? 1 : 0;
      const bMatch = b.category === category ? 1 : 0;
      return bMatch - aMatch;
    });
}

/**
 * Score a template against a taste profile for alignment.
 * Returns 0-100 representing how well the template matches user preferences.
 */
export function matchTemplateToTaste(
  template: WebTemplate,
  tastePrefs: {
    framework_preferences?: string[];
    code_style?: string;
    vibe_mode?: string;
    custom_instructions?: string;
  }
): number {
  let score = 50; // Base score

  const frameworks = (tastePrefs.framework_preferences ?? []).map((f) =>
    f.toLowerCase()
  );

  // Framework alignment
  if (frameworks.includes("tailwind") || frameworks.includes("tailwind css")) {
    score += 15; // All templates use Tailwind
  }
  if (frameworks.includes("shadcn") && template.source === "shadcn") {
    score += 10;
  }

  // Vibe mode alignment
  const vibeMode = tastePrefs.vibe_mode ?? "flow-state";
  if (
    vibeMode === "shipping" &&
    template.vibeKeywords.some((k) => ["clean", "minimal", "simple"].includes(k))
  ) {
    score += 10;
  }
  if (
    vibeMode === "flow-state" &&
    template.vibeKeywords.some((k) =>
      ["modern", "bold", "creative"].includes(k)
    )
  ) {
    score += 10;
  }

  // Code style alignment
  if (tastePrefs.code_style === "functional") {
    score += 5; // Templates are functional-style TSX
  }

  // Custom instructions bonus
  const custom = (tastePrefs.custom_instructions ?? "").toLowerCase();
  if (custom.includes("dark mode") && template.darkMode) score += 5;
  if (custom.includes("responsive") && template.responsive) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Get all sections for a template by ID.
 */
export function getTemplateSections(
  templateId: string
): TemplateSection[] | null {
  const template = WEB_TEMPLATES[templateId];
  return template?.sections ?? null;
}

/**
 * Get all templates in a category.
 */
export function getTemplatesByCategory(category: AppType): WebTemplate[] {
  return Object.values(WEB_TEMPLATES).filter((t) => t.category === category);
}

/**
 * Get all available categories with template counts.
 */
export function getTemplateCategories(): { category: AppType; count: number }[] {
  const counts = new Map<AppType, number>();
  for (const t of Object.values(WEB_TEMPLATES)) {
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Compute the overall vibe match score with weighted dimensions.
 */
export function computeVibeScore(dimensions: Omit<VibeMatchScore, "overall">): VibeMatchScore {
  const overall = Math.round(
    dimensions.designFit * 0.3 +
    dimensions.tasteAlignment * 0.25 +
    dimensions.monetizationReady * 0.15 +
    dimensions.responsiveness * 0.15 +
    dimensions.animationQuality * 0.15
  );

  return { ...dimensions, overall };
}

/**
 * Format a template registry entry as context for LLM injection.
 * Used by the Template Scout agent to provide template data in prompts.
 */
export function formatTemplateForPrompt(template: WebTemplate): string {
  return [
    `Template: ${template.name} (${template.id})`,
    `Category: ${template.category} | Source: ${template.source}`,
    `Tags: ${template.tags.join(", ")}`,
    `Vibe: ${template.vibeKeywords.join(", ")}`,
    `Monetization Slots: ${template.monetizationSlots.length > 0 ? template.monetizationSlots.join(", ") : "none"}`,
    `Sections: ${template.sections.map((s) => s.id).join(", ")}`,
    `Dark Mode: ${template.darkMode} | Responsive: ${template.responsive}`,
    `---`,
    `Full Page HTML:`,
    template.fullPage,
  ].join("\n");
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/template-library.ts
git commit -m "feat: add pre-curated web template registry with 8 templates"
```

---

### Task 4: Create the Template Vibe LangGraph swarm

**Files:**
- Create: `src/core/agents/template-vibe-graph.ts`

**Step 1: Create the swarm graph**

Create `src/core/agents/template-vibe-graph.ts` following the exact pattern from `profit-graph.ts`:
- Annotation-based state
- Sub-agent node factory
- Supervisor merge node
- Conditional routing (iterate if vibe score < 70)
- `runTemplateVibeSwarm()` public API

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";
import {
  WEB_TEMPLATES,
  detectAppType,
  searchTemplates,
  formatTemplateForPrompt,
  computeVibeScore,
  type WebTemplate,
  type VibeMatchScore,
  type AppType,
} from "@/lib/template-library";

/**
 * Template Vibe Agent Swarm — LangGraph
 *
 * Multi-agent swarm for injecting professional web templates into generated code.
 * Detects app type, selects best-matching template, resynthesizes with user's
 * TasteProfile + Jhey CSS inspiration, adds monetization sections, and scores.
 *
 * Flow:
 *   __start__ → [template-scout, vibe-blender-prep] (parallel)
 *       ↓
 *   supervisor merges → [monetization-styler, output-assembler] (parallel)
 *       ↓
 *   vibe-scorer → conditional: iterate or __end__
 *
 * Sub-agents:
 * - Template Scout: Detects app type, searches registry, returns top matches
 * - Vibe Blender: Decomposes template, resynthesizes with taste + Jhey refs
 * - Monetization Styler: Adds pricing/CTA/conversion sections
 * - Output Assembler: Produces final clean TSX with dark mode + responsive
 * - Vibe Scorer: Computes multi-dimensional Vibe Match Score (0-100)
 */

// ── Sub-agent system prompts ──

const TEMPLATE_PROMPTS = {
  "template-scout": `You are the Template Scout for the Template Vibe Agent. Your job is to detect what type of web application the user wants to build and find the best-matching template from the registry.

Analyze the user's prompt to determine:
1. App Type: landing, dashboard, e-commerce, blog, portfolio, admin, saas, docs, pricing
2. Key Features: What sections/components are needed
3. Style Preferences: Any design hints (minimal, bold, corporate, playful, etc.)
4. Monetization Needs: Does this app need pricing pages, CTAs, checkout flows?

You will be provided with the available templates from the registry. Score each template's fit (0-100) and explain your reasoning.

Return your analysis as JSON:
{
  "agent": "template-scout",
  "detected_app_type": "<AppType>",
  "confidence": "high|medium|low",
  "template_rankings": [
    { "template_id": "<id>", "score": <0-100>, "reasoning": "<why this template fits>" }
  ],
  "required_sections": ["<section ids needed>"],
  "style_hints": ["<detected style preferences>"],
  "monetization_needed": <true|false>,
  "summary": "<2-3 sentence recommendation>"
}
Return ONLY valid JSON, no markdown fences.`,

  "vibe-blender": `You are the Vibe Blender for the Template Vibe Agent. You are a creative frontend synthesis engine deeply familiar with Jhey Tompkins' CSS work and modern CSS techniques.

Your job is to take a selected template and fully resynthesize it based on the user's taste profile:

1. Color Palette: Transform colors using oklch() values. Respect user's preferred mood/vibe.
2. Typography: Adjust font stacks, scales, weights. Consider variable fonts.
3. Animations: Add Jhey-inspired interactions:
   - 3D transforms on hover (perspective, rotateX/Y)
   - Scroll-driven animations (animation-timeline: scroll())
   - Creative clip-path transitions
   - Spring-like motion with cubic-bezier
   - Staggered entrance animations
4. Modern CSS: Use container queries, :has(), color-mix(), oklch, @layer
5. Layout: Enhance with CSS Grid subgrid, aspect-ratio, logical properties
6. Vibe Mode Adaptation:
   - "flow-state": Rich animations, creative effects, playful interactions
   - "shipping": Minimal animations, focus on function, clean transitions
   - "learning": Annotated code, visible structure, educational comments

Take the input template HTML and transform it. Output the COMPLETE resynthesized HTML/TSX.
Include a summary of what you changed and why.

Return as JSON:
{
  "agent": "vibe-blender",
  "transformed_html": "<complete resynthesized HTML/TSX>",
  "changes_made": [
    { "category": "color|typography|animation|layout|css", "description": "<what changed>", "jhey_ref": "<optional: which Jhey technique inspired this>" }
  ],
  "color_palette_used": {
    "primary": "<oklch value>",
    "secondary": "<oklch value>",
    "accent": "<oklch value>"
  },
  "animations_added": ["<description of each animation>"],
  "summary": "<2-3 sentence summary of the vibe transformation>"
}
Return ONLY valid JSON, no markdown fences.`,

  "monetization-styler": `You are the Monetization Styler for the Template Vibe Agent. You enrich web templates with conversion-optimized, profit-ready sections.

Given the template and any profit analysis context, add or enhance:
1. Pricing Tables: 2-3 tier cards with highlighted recommended plan
2. CTA Blocks: Conversion-optimized call-to-action sections with urgency
3. Testimonial Sections: Social proof layouts with rating stars
4. Feature Comparison: Side-by-side feature matrix for pricing tiers
5. Newsletter Signup: Email capture with value proposition
6. Trust Signals: Logos, security badges, money-back guarantees

Rules:
- Only add sections that make sense for the app type
- Use the same Tailwind CSS design system as the base template
- Include dark mode variants for all new sections
- Make all sections responsive (mobile-first)
- If profit analysis data is available, use real pricing tiers and strategies

Return as JSON:
{
  "agent": "monetization-styler",
  "sections_added": [
    { "id": "<section-id>", "type": "pricing|cta|testimonial|comparison|newsletter|trust", "html": "<complete Tailwind HTML>" }
  ],
  "monetization_strategy": "<brief strategy description>",
  "conversion_tips": ["<actionable conversion optimization tips>"],
  "summary": "<2-3 sentence summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "output-assembler": `You are the Output Assembler for the Template Vibe Agent. You take the blended template and monetization sections and produce the final, clean, production-ready TSX output.

Requirements:
1. Combine the vibe-blended template with monetization sections in logical order
2. Ensure ALL sections have dark: variants (dark mode support)
3. Ensure ALL sections are responsive (sm:, md:, lg: breakpoints, mobile-first)
4. Add prefers-reduced-motion media queries for all animations
5. Use semantic HTML (header, nav, main, section, footer)
6. Clean up any redundant wrappers or classes
7. Ensure consistent design system (spacing, colors, typography)
8. Output as a single React/TSX component if the user prefers React, or plain HTML otherwise

Output the COMPLETE, final, ready-to-use code.

Return as JSON:
{
  "agent": "output-assembler",
  "final_code": "<complete production-ready TSX/HTML>",
  "component_name": "<PascalCase component name>",
  "features": {
    "dark_mode": true,
    "responsive": true,
    "reduced_motion": true,
    "semantic_html": true
  },
  "sections_included": ["<ordered list of section ids>"],
  "summary": "<2-3 sentence summary of the final output>"
}
Return ONLY valid JSON, no markdown fences.`,

  "vibe-scorer": `You are the Vibe Scorer for the Template Vibe Agent. You evaluate the final output across 5 quality dimensions.

Score each dimension 0-100:

1. Design Fit (weight: 30%): How well does the output match the detected app type?
   - Correct layout patterns for the domain
   - Appropriate information hierarchy
   - Industry-standard UX patterns

2. Taste Alignment (weight: 25%): How well does it match the user's taste profile?
   - Framework preferences respected
   - Code style matches (functional vs OOP)
   - Vibe mode appropriate (animations for flow-state, minimal for shipping)

3. Monetization Ready (weight: 15%): Are conversion elements present?
   - Pricing tables if needed
   - Clear CTAs
   - Trust signals and social proof

4. Responsiveness (weight: 15%): Mobile-first design quality?
   - Proper breakpoint usage
   - Touch-friendly targets
   - Readable on all screen sizes

5. Animation Quality (weight: 15%): Jhey-inspired creativity + performance?
   - GPU-accelerated properties (transform, opacity)
   - prefers-reduced-motion support
   - Creative, delightful interactions
   - Not overdone or distracting

Return as JSON:
{
  "agent": "vibe-scorer",
  "scores": {
    "design_fit": <0-100>,
    "taste_alignment": <0-100>,
    "monetization_ready": <0-100>,
    "responsiveness": <0-100>,
    "animation_quality": <0-100>
  },
  "overall": <0-100 weighted composite>,
  "feedback": {
    "strengths": ["<what works well>"],
    "improvements": ["<what could be better>"],
    "jhey_suggestions": ["<specific Jhey-style animations to add>"]
  },
  "needs_iteration": <true if overall < 70>,
  "iteration_focus": "<what to focus on if iterating>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const TEMPLATE_SUPERVISOR_PROMPT = `You are the Template Vibe supervisor. You coordinate the template injection process.

Your job:
1. Review the Template Scout's app type detection and template selection
2. Select the BEST template from the scout's rankings (highest score)
3. Provide the selected template's full HTML to the Vibe Blender
4. After blending + monetization, validate coherence of the combined output
5. Determine if the output needs iteration (based on Vibe Score)

Return your decisions as JSON:
{
  "selected_template_id": "<template id>",
  "selection_reasoning": "<why this template was chosen>",
  "blend_instructions": "<specific instructions for the vibe blender>",
  "monetization_instructions": "<what monetization sections to add>",
  "quality_notes": "<any quality concerns>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface TemplateVibeMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface TemplateVibeReport {
  detectedAppType: AppType;
  selectedTemplateId: string;
  selectedTemplateName: string;
  vibeScore: VibeMatchScore;
  finalCode: string;
  componentName: string;
  changesMade: Array<{ category: string; description: string; jhey_ref?: string }>;
  monetizationSections: string[];
  iterationFocus?: string;
}

// ── LangGraph State ──

const TemplateVibeAnnotation = Annotation.Root({
  /** The user's app/feature description */
  task: Annotation<string>,

  /** Taste preferences injection */
  tasteProfile: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Profit context from profit-agent (optional) */
  profitContext: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Individual agent outputs (accumulated) */
  agentMessages: Annotation<TemplateVibeMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Supervisor's merged decisions */
  supervisorDecisions: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final assembled code */
  finalCode: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final report */
  vibeReport: Annotation<TemplateVibeReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),

  /** Current phase */
  status: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "scouting" as const,
  }),
});

type TemplateVibeState = typeof TemplateVibeAnnotation.State;

// ── Retry with backoff ──

async function completeWithRetry(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number },
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await complete(provider, systemPrompt, userMessage, options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}

// ── Provider resolution ──

const PROVIDER_ORDER: LLMProvider[] = ["anthropic", "openrouter", "openai", "groq"];

async function resolveProvider(): Promise<LLMProvider> {
  for (const p of PROVIDER_ORDER) {
    try {
      await complete(p, "Reply with OK", "test", { maxTokens: 5 });
      return p;
    } catch {
      continue;
    }
  }
  throw new Error("No working API key found. Add one in Settings.");
}

// ── Specialist node factory ──

function createTemplateSpecialistNode(
  agentName: keyof typeof TEMPLATE_PROMPTS,
  provider: LLMProvider
) {
  return async (state: TemplateVibeState): Promise<Partial<TemplateVibeState>> => {
    const systemPrompt = await injectMemoryContext(
      TEMPLATE_PROMPTS[agentName],
      state.task
    );

    let userContext: string;

    switch (agentName) {
      case "template-scout": {
        // Provide registry context for template selection
        const detectedType = detectAppType(state.task);
        const candidates = searchTemplates(state.task, detectedType);
        const allTemplates = candidates.length > 0
          ? candidates
          : Object.values(WEB_TEMPLATES).slice(0, 5);

        const templateContext = allTemplates
          .map((t) => formatTemplateForPrompt(t))
          .join("\n\n===\n\n");

        userContext = `User's request: ${state.task}\n\nDetected app type: ${detectedType}\n\nTaste Profile: ${state.tasteProfile || "Default (Tailwind, functional, clean)"}\n\nAvailable Templates:\n${templateContext}`;
        break;
      }

      case "vibe-blender": {
        // Provide selected template + taste for synthesis
        const scoutResult = state.specialistResults["template-scout"] ?? "";
        const supervisorResult = state.supervisorDecisions ?? "";
        let selectedTemplate: WebTemplate | undefined;

        try {
          const supervisorData = JSON.parse(
            supervisorResult.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
          );
          selectedTemplate = WEB_TEMPLATES[supervisorData.selected_template_id];
        } catch {
          // Fallback: try to get template from scout
          try {
            const scoutData = JSON.parse(
              scoutResult.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
            );
            const topTemplate = scoutData.template_rankings?.[0];
            if (topTemplate) {
              selectedTemplate = WEB_TEMPLATES[topTemplate.template_id];
            }
          } catch { /* use first template */ }
        }

        if (!selectedTemplate) {
          selectedTemplate = Object.values(WEB_TEMPLATES)[0];
        }

        userContext = `User's request: ${state.task}\n\nTaste Profile:\n${state.tasteProfile || "Default (Tailwind, functional, clean)"}\n\nSelected Template:\n${formatTemplateForPrompt(selectedTemplate)}\n\nSupervisor Instructions:\n${supervisorResult}`;
        break;
      }

      case "monetization-styler": {
        const blenderResult = state.specialistResults["vibe-blender"] ?? "";
        userContext = `User's request: ${state.task}\n\nBlended Template:\n${blenderResult}\n\nProfit Context:\n${state.profitContext || "No profit analysis available — use sensible defaults"}\n\nTaste Profile:\n${state.tasteProfile || "Default"}`;
        break;
      }

      case "output-assembler": {
        const blenderResult = state.specialistResults["vibe-blender"] ?? "";
        const monetizationResult = state.specialistResults["monetization-styler"] ?? "";
        userContext = `User's request: ${state.task}\n\nVibe-Blended Template:\n${blenderResult}\n\nMonetization Sections:\n${monetizationResult}\n\nTaste Profile:\n${state.tasteProfile || "Default"}`;
        break;
      }

      case "vibe-scorer": {
        const assemblerResult = state.specialistResults["output-assembler"] ?? "";
        const scoutResult = state.specialistResults["template-scout"] ?? "";
        userContext = `User's request: ${state.task}\n\nDetected App Type & Scout Analysis:\n${scoutResult}\n\nFinal Output:\n${assemblerResult}\n\nTaste Profile:\n${state.tasteProfile || "Default"}\n\nIteration: ${state.iteration + 1} of ${state.maxIterations}`;
        break;
      }

      default:
        userContext = `Analyze this request:\n\n${state.task}`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.4, maxTokens: 8192 }
    );

    const message: TemplateVibeMessage = {
      agent: agentName,
      content: result,
      timestamp: new Date().toISOString(),
    };

    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      message.parsedData = JSON.parse(cleaned);
    } catch {
      message.parsedData = { raw: result.slice(0, 500) };
    }

    return {
      agentMessages: [message],
      specialistResults: { [agentName]: result },
    };
  };
}

// ── Supervisor merge node ──

function createTemplateSupervisorNode(provider: LLMProvider) {
  return async (state: TemplateVibeState): Promise<Partial<TemplateVibeState>> => {
    const scoutOutput = state.specialistResults["template-scout"] ?? "No scout data";

    const result = await completeWithRetry(
      provider,
      TEMPLATE_SUPERVISOR_PROMPT,
      `User's request: ${state.task}\n\nTemplate Scout Analysis:\n${scoutOutput}\n\nTaste Profile:\n${state.tasteProfile || "Default"}`,
      { temperature: 0.2, maxTokens: 4096 }
    );

    return {
      supervisorDecisions: result,
      agentMessages: [{
        agent: "supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Final report assembler ──

function createVibeReportAssemblerNode() {
  return async (state: TemplateVibeState): Promise<Partial<TemplateVibeState>> => {
    let detectedAppType: AppType = "landing";
    let selectedTemplateId = "";
    let selectedTemplateName = "";
    let vibeScore: VibeMatchScore = {
      designFit: 50, tasteAlignment: 50, monetizationReady: 50,
      responsiveness: 50, animationQuality: 50, overall: 50,
    };
    let finalCode = "";
    let componentName = "GeneratedPage";
    let changesMade: Array<{ category: string; description: string; jhey_ref?: string }> = [];
    let monetizationSections: string[] = [];
    let iterationFocus: string | undefined;

    // Parse scout
    try {
      const cleaned = (state.specialistResults["template-scout"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      detectedAppType = data.detected_app_type ?? "landing";
    } catch { /* use defaults */ }

    // Parse supervisor
    try {
      const cleaned = (state.supervisorDecisions ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      selectedTemplateId = data.selected_template_id ?? "";
      const tmpl = WEB_TEMPLATES[selectedTemplateId];
      selectedTemplateName = tmpl?.name ?? selectedTemplateId;
    } catch { /* use defaults */ }

    // Parse vibe blender
    try {
      const cleaned = (state.specialistResults["vibe-blender"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      changesMade = data.changes_made ?? [];
    } catch { /* use defaults */ }

    // Parse monetization
    try {
      const cleaned = (state.specialistResults["monetization-styler"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      monetizationSections = (data.sections_added ?? []).map(
        (s: { id: string }) => s.id
      );
    } catch { /* use defaults */ }

    // Parse output assembler
    try {
      const cleaned = (state.specialistResults["output-assembler"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      finalCode = data.final_code ?? "";
      componentName = data.component_name ?? "GeneratedPage";
    } catch {
      finalCode = state.specialistResults["output-assembler"] ?? "";
    }

    // Parse vibe scorer
    try {
      const cleaned = (state.specialistResults["vibe-scorer"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      vibeScore = computeVibeScore({
        designFit: data.scores?.design_fit ?? 50,
        tasteAlignment: data.scores?.taste_alignment ?? 50,
        monetizationReady: data.scores?.monetization_ready ?? 50,
        responsiveness: data.scores?.responsiveness ?? 50,
        animationQuality: data.scores?.animation_quality ?? 50,
      });
      iterationFocus = data.iteration_focus;
    } catch { /* use defaults */ }

    const report: TemplateVibeReport = {
      detectedAppType,
      selectedTemplateId,
      selectedTemplateName,
      vibeScore,
      finalCode,
      componentName,
      changesMade,
      monetizationSections,
      iterationFocus,
    };

    return {
      vibeReport: report,
      finalCode,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "assembler",
        content: "Template vibe report assembled.",
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldIterateTemplateVibe(state: TemplateVibeState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";

  try {
    const cleaned = (state.specialistResults["vibe-scorer"] ?? "")
      .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    if (data.needs_iteration && data.overall < 70) return "iterate";
  } catch { /* proceed to finalize */ }

  return "finalize";
}

// ── Build the graph ──

function buildTemplateVibeGraph(provider: LLMProvider) {
  const graph = new StateGraph(TemplateVibeAnnotation)
    // Phase 1: Scout (needs to run first for template selection)
    .addNode("template-scout", createTemplateSpecialistNode("template-scout", provider))
    // Phase 2: Supervisor selects template
    .addNode("supervisor", createTemplateSupervisorNode(provider))
    // Phase 3: Blend + monetize in parallel
    .addNode("vibe-blender", createTemplateSpecialistNode("vibe-blender", provider))
    .addNode("monetization-styler", createTemplateSpecialistNode("monetization-styler", provider))
    // Phase 4: Assemble
    .addNode("output-assembler", createTemplateSpecialistNode("output-assembler", provider))
    // Phase 5: Score
    .addNode("vibe-scorer", createTemplateSpecialistNode("vibe-scorer", provider))
    // Phase 6: Final assembly
    .addNode("assembler", createVibeReportAssemblerNode())

    // Flow
    .addEdge("__start__", "template-scout")
    .addEdge("template-scout", "supervisor")

    // After supervisor: blend + monetize in parallel
    .addEdge("supervisor", "vibe-blender")
    .addEdge("supervisor", "monetization-styler")

    // Both → output assembler
    .addEdge("vibe-blender", "output-assembler")
    .addEdge("monetization-styler", "output-assembler")

    // Assemble → score → report
    .addEdge("output-assembler", "vibe-scorer")
    .addEdge("vibe-scorer", "assembler")

    // Conditional: iterate or end
    .addConditionalEdges("assembler", shouldIterateTemplateVibe, {
      iterate: "template-scout",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

export interface TemplateVibeSwarmResult {
  report: TemplateVibeReport;
  messages: TemplateVibeMessage[];
  iterations: number;
  provider: string;
}

/**
 * Execute the template vibe agent swarm on a user's app request.
 *
 * Flow:
 * 1. Resolves the user's best available LLM provider
 * 2. Template Scout detects app type and searches registry
 * 3. Supervisor selects best template
 * 4. Vibe Blender resynthesizes with taste + Jhey CSS refs
 * 5. Monetization Styler adds profit-ready sections
 * 6. Output Assembler produces final TSX with dark mode + responsive
 * 7. Vibe Scorer computes multi-dimensional quality score
 * 8. Iterates if score < 70 (up to maxIterations)
 */
export async function runTemplateVibeSwarm(
  task: string,
  options?: {
    tasteProfile?: string;
    profitContext?: string;
    maxIterations?: number;
  }
): Promise<TemplateVibeSwarmResult> {
  const provider = await resolveProvider();

  const app = buildTemplateVibeGraph(provider);

  const finalState = await app.invoke({
    task,
    tasteProfile: options?.tasteProfile ?? "",
    profitContext: options?.profitContext ?? "",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as TemplateVibeState;

  return {
    report: state.vibeReport ?? {
      detectedAppType: "landing",
      selectedTemplateId: "",
      selectedTemplateName: "Unknown",
      vibeScore: {
        designFit: 0, tasteAlignment: 0, monetizationReady: 0,
        responsiveness: 0, animationQuality: 0, overall: 0,
      },
      finalCode: "",
      componentName: "GeneratedPage",
      changesMade: [],
      monetizationSections: [],
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/core/agents/template-vibe-graph.ts
git commit -m "feat: add Template Vibe LangGraph swarm with 5 sub-agents"
```

---

### Task 5: Add template-vibe to Swarm Coordinator registry

**Files:**
- Modify: `src/core/agents/swarm-coordinator-graph.ts:33-97`

**Step 1: Add to AVAILABLE_SWARMS array**

Add a new entry at the end of the `AVAILABLE_SWARMS` array (before the `] as const;`):

```typescript
  {
    name: "template-vibe",
    description: "Professional web template injection with taste-driven vibe synthesis and Jhey CSS inspiration",
    capabilities: ["template-detection", "vibe-blending", "monetization-styling", "responsive-output", "vibe-scoring"],
    best_for: ["web apps", "SaaS", "landing pages", "dashboards", "e-commerce", "portfolios"],
    agent_count: 5,
  },
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/core/agents/swarm-coordinator-graph.ts
git commit -m "feat(swarm-coordinator): register template-vibe swarm"
```

---

### Task 6: Create API route

**Files:**
- Create: `src/app/api/agents/template-vibe/route.ts`

**Step 1: Create the API endpoint following the profit route pattern**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTemplateVibeSwarm } from "@/core/agents/template-vibe-graph";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/** POST /api/agents/template-vibe — execute the template vibe agent swarm */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { task, taste_profile, profit_context, max_iterations } = await request.json();

    if (!task || typeof task !== "string" || task.trim().length < 10) {
      return NextResponse.json(
        { error: "Task is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(task, MAX_SIZES.task, "Task");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await runTemplateVibeSwarm(task.trim(), {
      tasteProfile: typeof taste_profile === "string" ? taste_profile : undefined,
      profitContext: typeof profit_context === "string" ? profit_context : undefined,
      maxIterations: Math.min(Math.max(max_iterations ?? 2, 1), 5),
    });

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "swarm_run",
      metadata: {
        type: "template-vibe",
        provider: result.provider,
        iterations: result.iterations,
        vibe_score: result.report.vibeScore.overall,
        app_type: result.report.detectedAppType,
        template: result.report.selectedTemplateId,
      },
    });

    return NextResponse.json({
      data: {
        report: result.report,
        messages: result.messages,
        iterations: result.iterations,
        provider: result.provider,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/agents/template-vibe/route.ts
git commit -m "feat: add POST /api/agents/template-vibe endpoint"
```

---

### Task 7: Create TemplateGallery component

**Files:**
- Create: `src/components/TemplateGallery.tsx`

**Step 1: Create the gallery component**

This is the client component for browsing templates, seeing Vibe Match Scores, and triggering the swarm. It follows the `ProfitAgentUI` pattern (form → fetch → display results) but adds a template gallery grid with Jhey-inspired hover animations.

```typescript
"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type {
  TemplateVibeReport,
  TemplateVibeMessage,
} from "@/core/agents/template-vibe-graph";
import {
  WEB_TEMPLATES,
  getTemplateCategories,
  type AppType,
  type VibeMatchScore,
} from "@/lib/template-library";

// ── Agent display config ──

const AGENT_CONFIG: Record<string, { label: string; color: string }> = {
  "template-scout": { label: "Template Scout", color: "text-cyan-400" },
  "vibe-blender": { label: "Vibe Blender", color: "text-purple-400" },
  "monetization-styler": { label: "Monetization Styler", color: "text-green-400" },
  "output-assembler": { label: "Output Assembler", color: "text-blue-400" },
  "vibe-scorer": { label: "Vibe Scorer", color: "text-yellow-400" },
  supervisor: { label: "Supervisor", color: "text-primary-light" },
  assembler: { label: "Report Assembler", color: "text-orange-400" },
};

const SCORE_LABELS: Record<keyof VibeMatchScore, string> = {
  designFit: "Design Fit",
  tasteAlignment: "Taste",
  monetizationReady: "Monetization",
  responsiveness: "Responsive",
  animationQuality: "Animation",
  overall: "Overall",
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-success/20";
  if (score >= 40) return "bg-warning/20";
  return "bg-danger/20";
}

const CATEGORY_LABELS: Record<string, string> = {
  landing: "Landing Pages",
  dashboard: "Dashboards",
  "e-commerce": "E-Commerce",
  blog: "Blogs",
  portfolio: "Portfolios",
  admin: "Admin",
  saas: "SaaS",
  docs: "Documentation",
  pricing: "Pricing",
};

export function TemplateGallery() {
  const [task, setTask] = useState("");
  const [activeCategory, setActiveCategory] = useState<AppType | "all">("all");
  const [report, setReport] = useState<TemplateVibeReport | null>(null);
  const [messages, setMessages] = useState<TemplateVibeMessage[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const categories = getTemplateCategories();

  const filteredTemplates = Object.values(WEB_TEMPLATES).filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

  const triggerSwarm = useCallback(() => {
    if (task.trim() && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [task, pending]);

  async function handleRunSwarm(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;

    setError(null);
    setReport(null);
    setMessages([]);
    setShowCode(false);
    setShowMessages(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/template-vibe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: task.trim() }),
        });

        const json = await res.json();

        if (!res.ok || json.error) {
          setError(json.error ?? "Unknown error");
          return;
        }

        setReport(json.data.report);
        setMessages(json.data.messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Template Gallery */}
      <div>
        <h2 className="text-lg font-semibold">Template Gallery</h2>
        <p className="mt-1 text-sm text-muted">
          Browse available templates. Describe your app below to auto-select and inject the best match.
        </p>

        {/* Category tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary/15 text-primary-light"
                : "text-muted hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            All ({Object.keys(WEB_TEMPLATES).length})
          </button>
          {categories.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === category
                  ? "bg-primary/15 text-primary-light"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {CATEGORY_LABELS[category] ?? category} ({count})
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group rounded-xl border border-border bg-surface p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                e.currentTarget.style.transform = `perspective(600px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg)";
              }}
            >
              {/* Preview bar */}
              <div className="flex h-24 items-center justify-center rounded-lg bg-surface-elevated text-xs text-muted">
                {template.category.toUpperCase()}
              </div>

              <h3 className="mt-3 font-medium group-hover:text-primary-light transition-colors">
                {template.name}
              </h3>

              <div className="mt-2 flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {template.source} · {template.sections.length} sections
                </span>
                {template.monetizationSlots.length > 0 && (
                  <span className="text-success">$ monetizable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swarm Input */}
      <form ref={formRef} onSubmit={handleRunSwarm} className="space-y-4">
        <div>
          <label htmlFor="task" className="text-sm font-medium">
            Describe your app
          </label>
          <textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) triggerSwarm();
            }}
            placeholder="e.g., Build a SaaS dashboard for tracking user analytics with a pricing page..."
            className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={pending || !task.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Vibing templates..." : "Inject Template Vibe"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Results */}
      {report && (
        <div className="space-y-6">
          {/* Vibe Match Score */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vibe Match Score</h3>
              <span
                className={`text-3xl font-bold ${scoreColor(report.vibeScore.overall)}`}
              >
                {report.vibeScore.overall}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {(Object.entries(report.vibeScore) as [keyof VibeMatchScore, number][])
                .filter(([key]) => key !== "overall")
                .map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${scoreBg(value)}`}
                    >
                      <span className={`text-sm font-bold ${scoreColor(value)}`}>
                        {value}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {SCORE_LABELS[key]}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Template Info */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold">Template Used</h3>
            <p className="mt-1 text-sm text-muted">
              <span className="text-primary-light">{report.selectedTemplateName}</span>
              {" · "}App type: {report.detectedAppType}
              {report.monetizationSections.length > 0 &&
                ` · ${report.monetizationSections.length} monetization sections`}
            </p>

            {report.changesMade.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium">Vibe Transformations</h4>
                <div className="mt-2 space-y-1">
                  {report.changesMade.map((change, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-muted">
                        {change.category}
                      </span>
                      <span className="text-muted">{change.description}</span>
                      {change.jhey_ref && (
                        <span className="text-purple-400">
                          (Jhey: {change.jhey_ref})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generated Code */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Generated Code — {report.componentName}
              </h3>
              <button
                onClick={() => setShowCode(!showCode)}
                className="text-xs text-primary-light hover:underline"
              >
                {showCode ? "Hide" : "Show"} Code
              </button>
            </div>

            {showCode && (
              <div className="mt-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(report.finalCode);
                    }}
                    className="mb-2 text-xs text-muted hover:text-foreground"
                  >
                    Copy to clipboard
                  </button>
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg bg-background p-4 text-xs">
                  <code>{report.finalCode}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Agent Messages */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Agent Activity</h3>
              <button
                onClick={() => setShowMessages(!showMessages)}
                className="text-xs text-primary-light hover:underline"
              >
                {showMessages ? "Hide" : "Show"} ({messages.length} messages)
              </button>
            </div>

            {showMessages && (
              <div className="mt-4 space-y-3">
                {messages.map((msg, i) => {
                  const config = AGENT_CONFIG[msg.agent] ?? {
                    label: msg.agent,
                    color: "text-muted",
                  };
                  return (
                    <div key={i} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="mt-1 max-h-32 overflow-auto text-xs text-muted whitespace-pre-wrap">
                        {msg.content.slice(0, 500)}
                        {msg.content.length > 500 ? "..." : ""}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TemplateGallery.tsx
git commit -m "feat: add TemplateGallery component with Jhey-style hover animations"
```

---

### Task 8: Create dashboard page

**Files:**
- Create: `src/app/(dashboard)/template-vibe/page.tsx`

**Step 1: Create the page following the profit page pattern**

```typescript
import { TemplateGallery } from "@/components/TemplateGallery";

export const dynamic = "force-dynamic";

export default function TemplateVibePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Vibe</h1>
        <p className="mt-1 text-sm text-muted">
          Professional web template injection with taste-driven vibe synthesis.
          Describe your app and the swarm will detect the type, select the best
          template, blend it with your taste profile and Jhey CSS inspiration,
          add monetization sections, and score the result.
        </p>
      </div>

      <TemplateGallery />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/app/(dashboard)/template-vibe/page.tsx"
git commit -m "feat: add template-vibe dashboard page"
```

---

### Task 9: Add sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx:30`

**Step 1: Add nav item after Swarm Maestro**

In `src/components/layout/sidebar.tsx`, add a new entry to `NAV_ITEMS` after the "Swarm Maestro" item:

```typescript
  { href: "/dashboard/template-vibe", label: "Template Vibe" },
```

So the array now includes:
```typescript
  { href: "/dashboard/swarm-coordinator", label: "Swarm Maestro" },
  { href: "/dashboard/template-vibe", label: "Template Vibe" },
  { href: "/dashboard/tools", label: "Tool Belt" },
```

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(sidebar): add Template Vibe navigation item"
```

---

### Task 10: TypeScript verification and final commit

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to template-vibe files

**Step 2: Verify the build compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds (or at least template-vibe pages compile)

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "feat: complete Template Vibe Agent — swarm, registry, gallery, API"
```
