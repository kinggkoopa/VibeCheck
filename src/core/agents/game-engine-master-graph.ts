import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Game Engine Master Agent — Universal game engine supervisor swarm
 *
 * Multi-agent system that builds complete game projects across engines:
 * Unity (C#), GameMaker (GML), Bevy (Rust), Defold (Lua), with Godot/Unreal awareness.
 *
 * Flow:
 *   __start__ → engine-detector → [engine-adapter, mechanics-builder] (parallel)
 *       ↓
 *   supervisor → [platform-exporter, monetization-advisor] (parallel)
 *       ↓
 *   assembler → conditional iterate or __end__
 *
 * Sub-agents (7 nodes):
 * - Engine Detector: Analyzes idea, recommends or confirms engine choice
 * - Engine Adapter: Generates engine-specific project structure and code
 * - Mechanics Builder: Core game loop, scoring, AI, procedural gen, physics
 * - Platform Exporter: Multi-platform export configs (PC/Web/Mobile/Console)
 * - Monetization Advisor: Ads, IAP, premium, store requirements
 * - Supervisor: Merges outputs, validates engine-code consistency
 * - Assembler: Produces final GameEngineMasterReport
 */

// ── Prompts ──

const ENGINE_PROMPTS = {
  "engine-detector": `You are a game engine selection specialist. Analyze the user's game idea and determine the best engine.

Consider:
1. Game complexity (2D vs 3D, physics needs, shader requirements)
2. Target platforms (PC, web, mobile, console)
3. Team size and experience level
4. Performance requirements (particle count, entity count, real-time physics)
5. Asset pipeline needs (sprite sheets, 3D models, audio)
6. Community and marketplace support

Supported engines: Unity (C#), GameMaker (GML), Bevy (Rust), Defold (Lua), Godot (GDScript), Unreal (C++/Blueprints)

If the user explicitly chose an engine, validate that choice and still provide alternatives.

Return your analysis as JSON:
{
  "agent": "engine-detector",
  "selected_engine": "<unity|gamemaker|bevy|defold|godot|unreal>",
  "reasoning": "<2-3 sentences explaining why this engine is best>",
  "alternatives": [
    { "engine": "<name>", "pros": ["<pro>"], "cons": ["<con>"] }
  ],
  "engine_config": {
    "render_pipeline": "<2d|3d|both>",
    "physics_engine": "<built-in|custom|none>",
    "scripting_language": "<language>",
    "recommended_version": "<version string>"
  }
}
Return ONLY valid JSON, no markdown fences.`,

  "engine-adapter": `You are a game engine project architect. Given a selected engine and game idea, generate a complete project structure with starter code.

Engine-specific outputs:
- Unity: C# MonoBehaviours, ScriptableObjects, .unity scene files, .asmdef assembly definitions
- GameMaker: GML scripts, room configs, object events (Create/Step/Draw), sprite placeholders
- Bevy: Rust ECS (Components, Systems, Resources, Bundles), Cargo.toml with dependencies
- Defold: Lua scripts, .collection files, .go game objects, game.project settings
- Godot: GDScript files, .tscn scene files, project.godot
- Unreal: C++ headers/source, Blueprint stubs, .uproject

Generate real, functional starter code — not pseudocode.

Return as JSON:
{
  "agent": "engine-adapter",
  "engine": "<selected engine>",
  "project_files": [
    { "path": "<relative file path>", "content": "<full file content>", "language": "<cs|gml|rs|lua|gd|cpp>" }
  ],
  "build_config": {
    "build_system": "<msbuild|yyc|cargo|bob|scons|ue-build>",
    "entry_point": "<main file path>",
    "output_format": "<exe|html5|apk|etc>"
  },
  "dependencies": [
    { "name": "<package name>", "version": "<version>", "purpose": "<why needed>" }
  ]
}
Return ONLY valid JSON, no markdown fences.`,

  "mechanics-builder": `You are a core game mechanics engineer. Build game systems with engine-agnostic algorithms and engine-specific implementations.

Design these systems based on the game idea:
1. Scoring System: Points, combos, multipliers, leaderboard data structures
2. AI Behavior: State machines, behavior trees, or utility AI for NPCs/enemies
3. Procedural Generation: Noise-based terrain, dungeon/room generation, loot tables
4. Physics Helpers: Collision layers, raycasting utilities, movement controllers
5. Input Handling: Keyboard/mouse/gamepad/touch abstraction layer
6. Game Loop: State management (menu, playing, paused, game-over), save/load

Provide the ALGORITHM (engine-agnostic) plus the ENGINE-SPECIFIC code.

Return as JSON:
{
  "agent": "mechanics-builder",
  "mechanics": [
    {
      "name": "<mechanic name>",
      "description": "<what it does>",
      "algorithm": "<pseudocode or engine-agnostic description>",
      "code": "<engine-specific implementation code>",
      "engine_specific_notes": "<gotchas, performance tips, engine quirks>"
    }
  ]
}
Return ONLY valid JSON, no markdown fences.`,

  "platform-exporter": `You are a multi-platform game export specialist. Configure build and export settings for all target platforms.

For each applicable platform:
- PC (Windows/Mac/Linux): Build settings, resolution configs, input remapping
- Web (HTML5/WebGL): Canvas settings, loading screen, compression, hosting requirements
- Mobile (iOS/Android): Touch input adaptation, screen orientation, app store icons/splash, permissions
- Console (Switch/PS/Xbox): Requirements notes, certification gotchas, performance budgets

Return as JSON:
{
  "agent": "platform-exporter",
  "platforms": [
    {
      "name": "<platform name>",
      "config": { "<key>": "<value>" },
      "build_steps": ["<step>"],
      "requirements": ["<requirement>"]
    }
  ],
  "deploy_guides": [
    {
      "platform": "<store/platform name>",
      "steps": ["<deployment step>"]
    }
  ]
}
Return ONLY valid JSON, no markdown fences.`,

  "monetization-advisor": `You are a game monetization strategist. Design a cross-engine monetization plan.

Consider:
1. Ads Integration: AdMob, Unity Ads, IronSource — rewarded video, interstitial, banner placement
2. IAP Setup: Consumables, non-consumables, subscriptions — SKU design, pricing tiers
3. Premium Pricing: One-time purchase, demo/full split, DLC structure
4. Store Requirements: Steam (Steamworks SDK), itch.io (butler), Google Play (billing library), App Store (StoreKit)
5. Cross-platform consistency: Same IAP across platforms, receipt validation
6. Ethical monetization: No pay-to-win, fair free tier, parental controls if needed

Return as JSON:
{
  "agent": "monetization-advisor",
  "strategy": "<premium|freemium|free-with-ads|hybrid>",
  "integrations": [
    { "platform": "<ad/payment platform>", "type": "<ads|iap|premium>", "setup_steps": ["<step>"], "sdk_required": "<sdk name>" }
  ],
  "pricing": {
    "base_price": "<price or free>",
    "iap_tiers": [{ "sku": "<id>", "name": "<display name>", "price": "<price>", "type": "consumable|non-consumable|subscription" }],
    "regional_pricing": "<notes on regional adjustment>"
  },
  "store_requirements": [
    { "store": "<store name>", "requirements": ["<requirement>"], "fees": "<fee structure>" }
  ]
}
Return ONLY valid JSON, no markdown fences.`,

  supervisor: `You are the Game Engine Master supervisor. You merge and validate all sub-agent outputs.

Your job:
1. Validate engine-code consistency: Does the adapter code match the selected engine?
2. Check mechanics compatibility: Are all mechanics implementable in the selected engine?
3. Verify platform compatibility: Can the engine actually export to all listed platforms?
4. Flag issues: Missing dependencies, impossible configurations, version conflicts
5. Handle cross-engine remix: If user wants to see how the game would look in another engine, note differences
6. Compute a playtest score (each 0-10): fun_factor, technical_quality, polish, replayability, monetization_fit, overall

Return as JSON:
{
  "agent": "supervisor",
  "validation": {
    "engine_code_consistent": <boolean>,
    "mechanics_compatible": <boolean>,
    "platforms_valid": <boolean>,
    "issues": ["<issue description>"]
  },
  "playtest_score": {
    "fun_factor": <0-10>,
    "technical_quality": <0-10>,
    "polish": <0-10>,
    "replayability": <0-10>,
    "monetization_fit": <0-10>,
    "overall": <0-10>
  },
  "cross_engine_notes": ["<note about how this game would differ in another engine>"],
  "recommendations": ["<improvement suggestion>"],
  "summary": "<2-3 sentence validation summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  assembler: `You are the Game Engine Master assembler. Produce the final comprehensive report.

You receive all sub-agent outputs (engine detection, adapted project files, mechanics, platform exports, monetization, supervisor validation).

Merge everything into a clean, actionable final report. Ensure:
1. Project files are complete and buildable
2. Mechanics code is included and tested
3. Platform configs are realistic
4. Monetization strategy is coherent
5. Supervisor issues are addressed or acknowledged
6. Cross-engine notes are included if applicable

Return as JSON:
{
  "agent": "assembler",
  "selected_engine": "<engine>",
  "engine_reasoning": "<why this engine>",
  "project_files": [{ "path": "<path>", "content": "<code>", "language": "<lang>" }],
  "mechanics": [{ "name": "<name>", "description": "<desc>", "code": "<code>" }],
  "platforms": [{ "name": "<platform>", "config": {}, "build_steps": [], "requirements": [] }],
  "monetization": { "strategy": "<strategy>", "integrations": [], "pricing": {} },
  "playtest_score": { "fun_factor": 0, "technical_quality": 0, "polish": 0, "replayability": 0, "monetization_fit": 0, "overall": 0 },
  "cross_engine_notes": [],
  "summary": "<executive summary of the complete game project>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

// ── Types ──

export interface PlaytestScore {
  fun_factor: number;
  technical_quality: number;
  polish: number;
  replayability: number;
  monetization_fit: number;
  overall: number;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface GameMechanic {
  name: string;
  description: string;
  algorithm?: string;
  code: string;
  engine_specific_notes?: string;
}

export interface PlatformConfig {
  name: string;
  config: Record<string, string>;
  build_steps: string[];
  requirements: string[];
}

export interface DeployGuide {
  platform: string;
  steps: string[];
}

export interface MonetizationPlan {
  strategy: string;
  integrations: Array<{
    platform: string;
    type: string;
    setup_steps: string[];
    sdk_required: string;
  }>;
  pricing: {
    base_price: string;
    iap_tiers: Array<{
      sku: string;
      name: string;
      price: string;
      type: string;
    }>;
    regional_pricing: string;
  };
  store_requirements: Array<{
    store: string;
    requirements: string[];
    fees: string;
  }>;
}

export interface EngineAlternative {
  engine: string;
  pros: string[];
  cons: string[];
}

export interface GameEngineMasterReport {
  selectedEngine: string;
  engineReasoning: string;
  alternatives: EngineAlternative[];
  projectFiles: ProjectFile[];
  mechanics: GameMechanic[];
  platforms: PlatformConfig[];
  deployGuides: DeployGuide[];
  monetization: MonetizationPlan;
  playtestScore: PlaytestScore;
  crossEngineNotes: string[];
  summary: string;
}

export interface GameEngineMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface GameEngineMasterResult {
  report: GameEngineMasterReport;
  messages: GameEngineMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const GameEngineAnnotation = Annotation.Root({
  /** User's game idea description */
  gameIdea: Annotation<string>,

  /** User's explicit engine preference (or "auto") */
  enginePreference: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "auto",
  }),

  /** Selected engine after detection */
  selectedEngine: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Individual agent messages (accumulated) */
  agentMessages: Annotation<GameEngineMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** The final master report */
  masterReport: Annotation<GameEngineMasterReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),
});

type GameEngineState = typeof GameEngineAnnotation.State;

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
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError ?? new Error("Max retries exceeded");
}

// ── Resolve provider ──

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

// ── Helper: parse JSON from LLM response ──

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json?\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Node: engine-detector ──

function createEngineDetectorNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS["engine-detector"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Engine Preference: ${state.enginePreference === "auto" ? "No preference — recommend the best engine." : `User prefers: ${state.enginePreference}. Validate this choice.`}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 4096 }
    );

    let selectedEngine = state.enginePreference !== "auto" ? state.enginePreference : "unity";
    try {
      const parsed = parseJSON(result);
      if (parsed.selected_engine) {
        selectedEngine = parsed.selected_engine as string;
      }
    } catch { /* use default */ }

    const message: GameEngineMessage = {
      agent: "engine-detector",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      selectedEngine,
      agentMessages: [message],
      specialistResults: { "engine-detector": result },
    };
  };
}

// ── Node: engine-adapter ──

function createEngineAdapterNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS["engine-adapter"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Engine: ${state.selectedEngine}

Engine Detection Analysis:
${state.specialistResults["engine-detector"]?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: GameEngineMessage = {
      agent: "engine-adapter",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "engine-adapter": result },
    };
  };
}

// ── Node: mechanics-builder ──

function createMechanicsBuilderNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS["mechanics-builder"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Engine: ${state.selectedEngine}

Engine Detection Analysis:
${state.specialistResults["engine-detector"]?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.4, maxTokens: 8192 }
    );

    const message: GameEngineMessage = {
      agent: "mechanics-builder",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "mechanics-builder": result },
    };
  };
}

// ── Node: supervisor ──

function createSupervisorNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS.supervisor,
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea.slice(0, 1000)}

Selected Engine: ${state.selectedEngine}

Sub-Agent Outputs:
${specialistOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: GameEngineMessage = {
      agent: "supervisor",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { supervisor: result },
    };
  };
}

// ── Node: platform-exporter ──

function createPlatformExporterNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS["platform-exporter"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Engine: ${state.selectedEngine}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: GameEngineMessage = {
      agent: "platform-exporter",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "platform-exporter": result },
    };
  };
}

// ── Node: monetization-advisor ──

function createMonetizationAdvisorNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS["monetization-advisor"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Engine: ${state.selectedEngine}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const message: GameEngineMessage = {
      agent: "monetization-advisor",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "monetization-advisor": result },
    };
  };
}

// ── Node: assembler ──

function createAssemblerNode(provider: LLMProvider) {
  return async (state: GameEngineState): Promise<Partial<GameEngineState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const systemPrompt = await injectMemoryContext(
      ENGINE_PROMPTS.assembler,
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea.slice(0, 1000)}

Selected Engine: ${state.selectedEngine}

All Sub-Agent Outputs:
${specialistOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 8192 }
    );

    // Parse into GameEngineMasterReport
    let report: GameEngineMasterReport;
    try {
      const parsed = parseJSON(result);

      // Parse engine-detector data for alternatives
      let alternatives: EngineAlternative[] = [];
      try {
        const detectorData = parseJSON(state.specialistResults["engine-detector"] ?? "{}");
        alternatives = ((detectorData.alternatives as EngineAlternative[]) ?? []).map((a) => ({
          engine: a.engine ?? "",
          pros: a.pros ?? [],
          cons: a.cons ?? [],
        }));
      } catch { /* use defaults */ }

      // Parse deploy guides from platform-exporter
      let deployGuides: DeployGuide[] = [];
      try {
        const platformData = parseJSON(state.specialistResults["platform-exporter"] ?? "{}");
        deployGuides = ((platformData.deploy_guides as DeployGuide[]) ?? []).map((d) => ({
          platform: d.platform ?? "",
          steps: d.steps ?? [],
        }));
      } catch { /* use defaults */ }

      // Parse monetization from monetization-advisor
      let monetization: MonetizationPlan = {
        strategy: "premium",
        integrations: [],
        pricing: { base_price: "TBD", iap_tiers: [], regional_pricing: "" },
        store_requirements: [],
      };
      try {
        const monData = parseJSON(state.specialistResults["monetization-advisor"] ?? "{}");
        monetization = {
          strategy: (monData.strategy as string) ?? "premium",
          integrations: ((monData.integrations as MonetizationPlan["integrations"]) ?? []).map((i) => ({
            platform: i.platform ?? "",
            type: i.type ?? "",
            setup_steps: i.setup_steps ?? [],
            sdk_required: i.sdk_required ?? "",
          })),
          pricing: {
            base_price: ((monData.pricing as Record<string, unknown>)?.base_price as string) ?? "TBD",
            iap_tiers: (((monData.pricing as Record<string, unknown>)?.iap_tiers as MonetizationPlan["pricing"]["iap_tiers"]) ?? []),
            regional_pricing: ((monData.pricing as Record<string, unknown>)?.regional_pricing as string) ?? "",
          },
          store_requirements: ((monData.store_requirements as MonetizationPlan["store_requirements"]) ?? []).map((s) => ({
            store: s.store ?? "",
            requirements: s.requirements ?? [],
            fees: s.fees ?? "",
          })),
        };
      } catch { /* use default monetization */ }

      report = {
        selectedEngine: (parsed.selected_engine as string) ?? state.selectedEngine,
        engineReasoning: (parsed.engine_reasoning as string) ?? "",
        alternatives,
        projectFiles: ((parsed.project_files as ProjectFile[]) ?? []).map((f) => ({
          path: f.path ?? "",
          content: f.content ?? "",
          language: f.language ?? "",
        })),
        mechanics: ((parsed.mechanics as GameMechanic[]) ?? []).map((m) => ({
          name: m.name ?? "",
          description: m.description ?? "",
          code: m.code ?? "",
          algorithm: m.algorithm,
          engine_specific_notes: m.engine_specific_notes,
        })),
        platforms: ((parsed.platforms as PlatformConfig[]) ?? []).map((p) => ({
          name: p.name ?? "",
          config: p.config ?? {},
          build_steps: p.build_steps ?? [],
          requirements: p.requirements ?? [],
        })),
        deployGuides,
        monetization,
        playtestScore: (parsed.playtest_score as PlaytestScore) ?? {
          fun_factor: 5, technical_quality: 5, polish: 5,
          replayability: 5, monetization_fit: 5, overall: 5,
        },
        crossEngineNotes: (parsed.cross_engine_notes as string[]) ?? [],
        summary: (parsed.summary as string) ?? "Game project assembled.",
      };
    } catch {
      // Fallback report
      report = {
        selectedEngine: state.selectedEngine,
        engineReasoning: "Assembly failed to produce structured results.",
        alternatives: [],
        projectFiles: [],
        mechanics: [],
        platforms: [],
        deployGuides: [],
        monetization: {
          strategy: "premium",
          integrations: [],
          pricing: { base_price: "TBD", iap_tiers: [], regional_pricing: "" },
          store_requirements: [],
        },
        playtestScore: {
          fun_factor: 0, technical_quality: 0, polish: 0,
          replayability: 0, monetization_fit: 0, overall: 0,
        },
        crossEngineNotes: [],
        summary: result.slice(0, 500),
      };
    }

    const message: GameEngineMessage = {
      agent: "assembler",
      content: "Game project report assembled.",
      timestamp: new Date().toISOString(),
    };

    return {
      masterReport: report,
      iteration: state.iteration + 1,
      agentMessages: [message],
    };
  };
}

// ── Routing ──

function shouldIterate(state: GameEngineState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  const score = state.masterReport?.playtestScore.overall ?? 0;
  if (score < 4 && state.iteration < state.maxIterations) return "iterate";
  return "finalize";
}

// ── Build the graph ──

function buildGameEngineMasterGraph(provider: LLMProvider) {
  const graph = new StateGraph(GameEngineAnnotation)
    // Nodes
    .addNode("engine-detector", createEngineDetectorNode(provider))
    .addNode("engine-adapter", createEngineAdapterNode(provider))
    .addNode("mechanics-builder", createMechanicsBuilderNode(provider))
    .addNode("supervisor", createSupervisorNode(provider))
    .addNode("platform-exporter", createPlatformExporterNode(provider))
    .addNode("monetization-advisor", createMonetizationAdvisorNode(provider))
    .addNode("assembler", createAssemblerNode(provider))

    // Flow: __start__ → engine-detector
    .addEdge("__start__", "engine-detector")

    // engine-detector → [engine-adapter, mechanics-builder] (parallel)
    .addEdge("engine-detector", "engine-adapter")
    .addEdge("engine-detector", "mechanics-builder")

    // Both → supervisor
    .addEdge("engine-adapter", "supervisor")
    .addEdge("mechanics-builder", "supervisor")

    // supervisor → [platform-exporter, monetization-advisor] (parallel)
    .addEdge("supervisor", "platform-exporter")
    .addEdge("supervisor", "monetization-advisor")

    // Both → assembler
    .addEdge("platform-exporter", "assembler")
    .addEdge("monetization-advisor", "assembler")

    // assembler → conditional iterate or __end__
    .addConditionalEdges("assembler", shouldIterate, {
      iterate: "engine-detector",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the Game Engine Master multi-agent swarm.
 *
 * Flow:
 * 1. Resolves best available provider (Anthropic first)
 * 2. Engine Detector analyzes idea and selects engine
 * 3. Engine Adapter + Mechanics Builder run in parallel
 * 4. Supervisor validates consistency
 * 5. Platform Exporter + Monetization Advisor run in parallel
 * 6. Assembler produces final GameEngineMasterReport
 * 7. Conditional iteration if quality is too low
 */
export async function runGameEngineMasterSwarm(
  idea: string,
  options?: { engine?: string; maxIterations?: number }
): Promise<GameEngineMasterResult> {
  const provider = await resolveProvider();

  const app = buildGameEngineMasterGraph(provider);

  const finalState = await app.invoke({
    gameIdea: idea,
    enginePreference: options?.engine ?? "auto",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as GameEngineState;

  const fallbackScore: PlaytestScore = {
    fun_factor: 0,
    technical_quality: 0,
    polish: 0,
    replayability: 0,
    monetization_fit: 0,
    overall: 0,
  };

  return {
    report: state.masterReport ?? {
      selectedEngine: state.selectedEngine || "unknown",
      engineReasoning: "Game Engine Master failed to produce a report.",
      alternatives: [],
      projectFiles: [],
      mechanics: [],
      platforms: [],
      deployGuides: [],
      monetization: {
        strategy: "premium",
        integrations: [],
        pricing: { base_price: "TBD", iap_tiers: [], regional_pricing: "" },
        store_requirements: [],
      },
      playtestScore: fallbackScore,
      crossEngineNotes: [],
      summary: "Game Engine Master failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
