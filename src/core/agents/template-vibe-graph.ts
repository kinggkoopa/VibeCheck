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
