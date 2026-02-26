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
