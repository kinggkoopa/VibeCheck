# Template Vibe Agent — Design Document

**Date:** 2026-02-25
**Status:** Approved
**Scope:** Web/frontend templates only (Next.js, React, Tailwind, Shadcn)

## Overview

A LangGraph swarm that injects professional HTML/TSX templates into MetaVibeCoder's generated code. When a user asks to build a SaaS dashboard, landing page, or e-commerce site, this agent detects the app type, selects the best-matching template from a pre-curated registry, and fully resynthesizes it based on the user's TasteProfile + Jhey CSS inspiration.

## Architecture

### Swarm Graph (`template-vibe-graph.ts`)

5 sub-agents + supervisor, following the established LangGraph StateGraph pattern.

```
Flow:
  __start__ → [template-scout, vibe-blender-prep] (parallel)
      ↓
  supervisor merges → [monetization-styler, output-assembler] (parallel)
      ↓
  vibe-scorer → conditional: iterate (if overall < 70) or __end__
```

### Sub-Agents

1. **Template Scout**
   - Detects app type from user prompt (landing, dashboard, e-commerce, saas, blog, portfolio, admin, docs, pricing)
   - Searches pre-curated registry in `lib/template-library.ts`
   - Returns top 3 template matches with reasoning and preliminary Vibe Match scores

2. **Vibe Blender**
   - Creative synthesis core
   - Takes selected template + TasteProfile + Jhey CSS references
   - Decomposes template into sections, resynthesizes with:
     - Color palette swaps (oklch-based, user-taste-driven)
     - Typography adjustments (font stack, scale, weight)
     - Scroll-driven animations, Jhey-inspired hover effects
     - Container queries, `:has()`, `color-mix()`, modern CSS
   - Outputs transformed TSX/HTML with full creative treatment

3. **Monetization Styler**
   - Enriches blended template with profit-ready sections
   - Pricing tables, CTA blocks, testimonial grids, feature comparison charts
   - Pulls from profit-agent revenue model when available (via Swarm Coordinator)
   - Ensures conversion-optimized layout patterns

4. **Output Assembler**
   - Produces final clean TSX with Tailwind v4
   - Dark mode defaults (`dark:` variants on all sections)
   - Responsive breakpoints (mobile-first)
   - `prefers-reduced-motion` support for animations
   - Clean component structure, no redundant wrappers

5. **Vibe Scorer**
   - Computes multi-dimensional Vibe Match Score
   - Triggers re-iteration if `overall < 70`

## Template Registry (`lib/template-library.ts`)

Pre-curated library of web templates, organized as both full pages and composable sections.

### Types

```typescript
type AppType = "landing" | "dashboard" | "e-commerce" | "blog" | "portfolio"
             | "admin" | "saas" | "docs" | "pricing";

type TemplateSource = "shadcn" | "hyperui" | "custom";

interface TemplateSection {
  id: string;              // "hero" | "features" | "pricing" | "testimonials" | ...
  html: string;            // Tailwind HTML/TSX snippet
  variants: string[];      // Alternative styles for this section
}

interface ColorScheme {
  primary: string;         // oklch value
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

interface WebTemplate {
  id: string;
  name: string;
  category: AppType;
  tags: string[];
  source: TemplateSource;
  fullPage: string;                   // Complete page HTML/TSX
  sections: TemplateSection[];        // Decomposable sections
  colorScheme: ColorScheme;
  responsive: boolean;                // Always true
  darkMode: boolean;                  // Always true
  monetizationSlots: string[];
  vibeKeywords: string[];             // For taste matching
  thumbnail?: string;
}
```

### Pre-Curated Categories (v1: ~15-20 templates)

- **Landing pages**: Hero sections, feature grids, testimonials, CTAs (Shadcn-style + HyperUI-style)
- **Dashboards**: Sidebar layout, stat cards, data tables, chart panels
- **SaaS**: Pricing pages, onboarding flows, settings panels
- **E-commerce**: Product grids, cart layouts, checkout flows
- **Portfolio**: Project showcases, about sections, contact forms

All templates ship with dark mode and responsive defaults baked in.

### Utility Functions

- `searchTemplates(query, category?)` — Keyword + category search
- `matchTemplateToTaste(template, taste)` — Score template against TasteProfile
- `getTemplateSections(templateId)` — Get decomposable sections
- `detectAppType(prompt)` — Classify user prompt into AppType

## Vibe Match Score

```typescript
interface VibeMatchScore {
  designFit: number;         // 0-100: Template matches detected app type
  tasteAlignment: number;    // 0-100: Match to TasteProfile
  monetizationReady: number; // 0-100: Has pricing/CTA/conversion sections
  responsiveness: number;    // 0-100: Mobile-first, responsive
  animationQuality: number;  // 0-100: Jhey-inspired creativity + performance + a11y
  overall: number;           // 0-100: Weighted composite
}

// Weights: design 30%, taste 25%, monetization 15%, responsive 15%, animation 15%
```

If `overall < 70` after scoring, the supervisor triggers re-iteration with a different template selection.

## Integration Points

### Swarm Coordinator
Add `template-vibe` to `AVAILABLE_SWARMS` registry:
```typescript
{
  name: "template-vibe",
  description: "Professional web template injection with taste-driven vibe synthesis",
  capabilities: ["template-detection", "vibe-blending", "monetization-styling", "responsive-output", "vibe-scoring"],
  best_for: ["web apps", "SaaS", "landing pages", "dashboards", "e-commerce", "portfolios"],
  agent_count: 5,
}
```

### Type System
- Add `"template-vibe"` to `AgentRole` union in `src/types/index.ts`
- Add template-vibe summary prompt to `AGENT_PROMPTS` in `src/core/agents/types.ts`

### Taste Integration
- Vibe Blender reads `TasteProfile` via `getTasteInjection()`
- `vibeKeywords` on templates are matched against taste preferences
- `vibe_mode` drives animation intensity (flow-state = subtle, shipping = minimal, learning = annotated)

### Profit Integration
- When composed with profit-agent via Swarm Coordinator, Monetization Styler consumes revenue model output
- Pricing tiers from profit-agent drive pricing table generation
- CTA copy adapts to recommended monetization strategy

## Files

### New
| File | Purpose |
|------|---------|
| `src/core/agents/template-vibe-graph.ts` | LangGraph swarm (main agent) |
| `src/lib/template-library.ts` | Pre-curated template registry + types + utilities |
| `src/components/TemplateGallery.tsx` | Browse/preview/select UI with Jhey animations |
| `src/app/api/agents/template-vibe/route.ts` | API endpoint |
| `src/app/(dashboard)/template-vibe/page.tsx` | Dashboard page |

### Modified
| File | Change |
|------|--------|
| `src/types/index.ts` | Add `"template-vibe"` to AgentRole |
| `src/core/agents/types.ts` | Add template-vibe prompt to AGENT_PROMPTS |
| `src/core/agents/swarm-coordinator-graph.ts` | Add to AVAILABLE_SWARMS |
| `src/components/layout/sidebar.tsx` | Add nav item |

## TemplateGallery Component

Dashboard UI for browsing templates:
- Grid view of templates organized by category
- Vibe Match Score badges on each template card
- Jhey-inspired hover animations (3D card tilt, color-shift borders, staggered fade-ins)
- Category filter tabs (Landing, Dashboard, SaaS, E-commerce, Portfolio)
- Click to select template for injection into current generation
- Preview panel showing template sections

## Constraints

- Web/frontend templates only (game engines already have their own template systems)
- Pre-curated registry (no live API fetching) for reliability and offline support
- All templates must include dark mode and responsive defaults
- Follows existing LangGraph StateGraph pattern exactly
- JSON-structured outputs from all sub-agents
