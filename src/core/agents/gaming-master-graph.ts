import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Gaming Master Agent — Advanced multi-engine game creation swarm
 *
 * Goes beyond the basic game-engine-master to provide deep genre templates,
 * cross-engine conversion, physics simulation, AI pathfinding, asset generation,
 * monetization planning, and playtest simulation.
 *
 * Flow:
 *   __start__ → [genre-templater, engine-selector] (parallel)
 *       ↓
 *   genre-templater + engine-selector → mechanics-engineer
 *       ↓
 *   mechanics-engineer → supervisor
 *       ↓
 *   supervisor → [asset-generator, cross-engine-converter, monetization-planner] (parallel)
 *       ↓
 *   asset-generator + cross-engine-converter + monetization-planner → playtest-simulator
 *       ↓
 *   playtest-simulator → assembler
 *       ↓
 *   assembler → conditional iterate or __end__
 *
 * Sub-agents (9 nodes):
 * - Genre Templater: Deep genre-specific template configs (RPG, platformer, shooter, etc.)
 * - Mechanics Engineer: AI behavior, pathfinding, physics, input systems, camera systems
 * - Engine Selector: Analyzes requirements and recommends the best engine with comparison
 * - Asset Generator: Sprite sheets, tilesets, audio design, UI themes, Midjourney prompts
 * - Cross-Engine Converter: Code conversion between engines with migration guides
 * - Monetization Planner: IAP, ads, premium pricing, DLC roadmap, battle pass, esports
 * - Playtest Simulator: Simulates playtesting with scoring across multiple dimensions
 * - Supervisor: Merges outputs, validates consistency, flags issues
 * - Assembler: Produces final GamingMasterReport
 */

// ── Prompts ──

const GAMING_MASTER_PROMPTS = {
  "genre-templater": `You are an expert game genre design specialist with deep knowledge of every major game genre.

For the given game idea, produce a comprehensive genre-specific template configuration.

Your expertise covers:
- RPG: Quest systems (branching dialogue, inventory, XP/leveling curves), turn-based vs action combat
- Platformer: Tile-based levels, physics tuning (gravity, jump height, coyote time), wall slides
- Shooter: Weapon stats, recoil patterns, hit detection, ammo systems, reload mechanics
- Puzzle: State machines, logic grids, hint systems, progressive difficulty
- Racing: Track generation, vehicle physics, drift mechanics, boost systems
- Strategy: Unit AI, fog of war, resource management, tech trees, diplomacy
- Survival: Crafting trees, hunger/health/stamina systems, day/night cycles, base building
- Roguelike: Procedural generation, permadeath, item synergies, meta-progression
- Fighting: Frame data, hitboxes/hurtboxes, combo systems, input buffering
- Rhythm: Beat detection, timing windows, score multipliers, note patterns

Return your analysis as JSON:
{
  "agent": "genre-templater",
  "genre": "<selected genre>",
  "template": {
    "core_systems": [{
      "name": "<e.g. Quest System>",
      "description": "<what it does>",
      "components": ["<e.g. QuestManager, DialogueTree, InventorySystem>"],
      "data_structures": [{
        "name": "<struct name>",
        "fields": [{ "name": "<field>", "type": "<type>", "default": "<value>" }]
      }]
    }],
    "level_design": {
      "structure": "<linear|open-world|hub-based|procedural>",
      "zones": [{
        "name": "<zone>",
        "difficulty": "<1-10>",
        "mechanics_introduced": ["<mechanic>"]
      }]
    },
    "progression_curve": {
      "type": "linear|exponential|logarithmic",
      "xp_formula": "<math expression>",
      "level_cap": "<number>",
      "milestones": [{ "level": "<n>", "unlock": "<what unlocks>" }]
    }
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "mechanics-engineer": `You are an expert game mechanics engineer specializing in AI behavior, pathfinding, physics, input systems, and camera systems.

Given a game idea with genre context and engine selection, produce engine-agnostic algorithm designs with engine-specific implementations.

Your expertise covers:
- AI Behavior: State machines, behavior trees, utility AI, GOAP (Goal-Oriented Action Planning)
- Pathfinding: A*, NavMesh, flow fields, jump point search, hierarchical pathfinding
- Physics: Rigid body dynamics, raycasting, ballistics simulation (gravity, drag, wind), collision layers
- Input Systems: Buffered input, combo detection, input remapping, dead zones
- Camera Systems: Follow cam, cinematic cam, split-screen, camera shake, parallax
- Combat: Hitbox/hurtbox systems, damage calculation, knockback, invincibility frames

Provide the ALGORITHM (engine-agnostic) plus ENGINE-SPECIFIC code for Godot (GDScript), Unity (C#), GameMaker (GML), and Bevy (Rust).

Return as JSON:
{
  "agent": "mechanics-engineer",
  "mechanics": [{
    "name": "<mechanic name>",
    "category": "ai|pathfinding|physics|input|camera|combat|movement",
    "algorithm": "<description of algorithm>",
    "math": {
      "formulas": [{
        "name": "<formula name>",
        "expression": "<math>",
        "variables": ["<var: description>"]
      }]
    },
    "implementations": {
      "godot": "<GDScript code>",
      "unity": "<C# code>",
      "gamemaker": "<GML code>",
      "bevy": "<Rust code>"
    }
  }],
  "ai_behaviors": [{
    "name": "<behavior>",
    "type": "state-machine|behavior-tree|utility|goap",
    "states_or_nodes": [{
      "name": "<node>",
      "transitions": ["<condition -> target>"]
    }]
  }],
  "physics_config": {
    "gravity": "<number>",
    "friction": "<number>",
    "restitution": "<number>",
    "custom_forces": [{ "name": "<force>", "formula": "<math>" }]
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "engine-selector": `You are a game engine selection analyst. Analyze game requirements and recommend the best engine with a detailed comparison.

Consider these factors:
1. Genre complexity and specific requirements
2. Target platform (PC, web, mobile, console, VR)
3. 2D vs 3D requirements
4. Team size and experience level
5. Performance needs (entity count, physics complexity, shader requirements)
6. Asset pipeline needs (sprite sheets, 3D models, audio, shaders)
7. Community size, plugin ecosystem, and marketplace support
8. Licensing costs and restrictions
9. Iteration speed and prototyping capability

Supported engines: Godot, Unity, GameMaker, Bevy, Unreal, Defold

Return as JSON:
{
  "agent": "engine-selector",
  "recommendation": {
    "primary": "<engine>",
    "reasoning": "<why this engine>",
    "alternatives": [{
      "engine": "<name>",
      "pros": ["<pro>"],
      "cons": ["<con>"],
      "suitability": "<0-100>"
    }]
  },
  "engine_config": {
    "engine": "<selected>",
    "version": "<recommended version>",
    "required_plugins": ["<plugin>"],
    "project_settings": {}
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "asset-generator": `You are a game asset design specialist. Produce comprehensive asset specifications, placeholder descriptions for AI art generation, sprite sheets, tilesets, UI themes, and audio design documents.

For each asset, provide:
- Technical specifications (dimensions, frame counts, formats)
- Visual descriptions optimized for AI art generation tools (Midjourney, DALL-E, Stable Diffusion)
- Art direction notes (palette, style, references)
- Audio design notes (mood, instrumentation, loop points)

Return as JSON:
{
  "agent": "asset-generator",
  "assets": {
    "sprites": [{
      "name": "<sprite>",
      "description": "<visual description for AI gen>",
      "dimensions": "<WxH>",
      "animation_frames": "<number>",
      "midjourney_prompt": "<optimized prompt>"
    }],
    "tilesets": [{
      "name": "<tileset>",
      "tile_size": "<px>",
      "tiles": ["<tile descriptions>"]
    }],
    "audio": [{
      "name": "<sound>",
      "type": "sfx|music|ambient",
      "description": "<audio description>",
      "duration_sec": "<number>"
    }],
    "ui_elements": [{
      "name": "<element>",
      "type": "button|panel|hud|menu",
      "style": "<visual style>"
    }]
  },
  "art_style": {
    "palette": ["<hex colors>"],
    "aesthetic": "<pixel-art|hand-drawn|low-poly|realistic|stylized>",
    "references": ["<style references>"]
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "cross-engine-converter": `You are a cross-engine game code conversion specialist. Handle converting game code between engines.

Your expertise covers mapping: Godot<->Unity, Unity<->GameMaker, GameMaker<->Godot, any<->Bevy, any<->Unreal, and all conceptual conversions.

For each conversion:
- Map API equivalents (e.g., KinematicBody2D -> Rigidbody2D)
- Translate code patterns (e.g., GDScript signals -> C# events)
- Note behavioral differences and gotchas
- Provide migration steps and compatibility assessment

Return as JSON:
{
  "agent": "cross-engine-converter",
  "conversion": {
    "source_engine": "<from>",
    "target_engine": "<to>",
    "compatibility": "<0-100>",
    "code_mappings": [{
      "concept": "<e.g. Player Movement>",
      "source_code": "<original>",
      "target_code": "<converted>",
      "notes": "<conversion notes>"
    }],
    "api_equivalents": [{
      "source_api": "<e.g. KinematicBody2D>",
      "target_api": "<e.g. Rigidbody2D>",
      "differences": "<behavioral differences>"
    }],
    "migration_steps": ["<step>"]
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "monetization-planner": `You are a game monetization strategist and esports integration expert.

Design a comprehensive monetization plan including:
1. IAP strategy: Cosmetics, premium currency, expansion packs, pricing tiers
2. Ad strategy: Rewarded video placement, interstitial timing, banner positioning
3. Premium pricing: One-time purchase, demo/full split, DLC structure
4. Battle pass design: Free/premium tiers, season length, reward pacing
5. DLC roadmap: Content releases, pricing, timeline
6. Esports integration: Ranked modes, tournaments, spectator features, leaderboards

Consider ethical monetization practices and platform-specific store requirements.

Return as JSON:
{
  "agent": "monetization-planner",
  "strategy": "<premium|freemium|free-with-ads|hybrid>",
  "iap": {
    "currency": { "name": "<premium currency>", "exchange_rate": "<real-money-to-currency>" },
    "items": [{ "sku": "<id>", "name": "<name>", "price_usd": "<price>", "type": "cosmetic|consumable|expansion" }]
  },
  "ads": {
    "placements": [{ "type": "rewarded|interstitial|banner", "location": "<where>", "frequency": "<how often>" }]
  },
  "battle_pass": {
    "enabled": true,
    "season_length_days": 90,
    "premium_price_usd": "<price>",
    "tiers": "<number>",
    "free_rewards_pct": "<percent>"
  },
  "dlc_roadmap": [{ "name": "<dlc>", "price_usd": "<price>", "timeline": "<when>", "content": ["<what>"] }],
  "esports": {
    "ranked_mode": { "enabled": true, "elo_system": "<description>", "seasons": true },
    "tournaments": { "bracket_type": "<single-elim|double-elim|round-robin>", "entry_fee": "<free or price>" },
    "spectator": { "enabled": true, "features": ["<feature>"] },
    "leaderboard": { "scoring": "<metric>", "reset_schedule": "<when>" }
  },
  "revenue_projections": {
    "month_1": "<estimate>",
    "month_6": "<estimate>",
    "year_1": "<estimate>"
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "playtest-simulator": `You are a game playtest simulation specialist. Analyze a complete game design and simulate playtesting to identify issues.

Evaluate these dimensions (each scored 0-100):
1. Fun Factor: Core loop engagement, moment-to-moment enjoyment, "one more round" appeal
2. Difficulty Balance: Learning curve, spike detection, accessibility for different skill levels
3. Pacing: Flow of content, rest points, escalation, avoiding tedium
4. Accessibility: Controller support, colorblind modes, difficulty options, font size, subtitles
5. Retention: Day 1/7/30 retention prediction, engagement hooks, endgame content
6. Polish: UI/UX quality, juice/feedback, sound design, visual consistency

Also identify:
- Difficulty spikes (specific moments that may frustrate players)
- Tutorial effectiveness (is the onboarding smooth?)
- Potential exploits or balance-breaking combos
- Missing quality-of-life features

Return as JSON:
{
  "agent": "playtest-simulator",
  "scores": {
    "fun_factor": "<0-100>",
    "difficulty_balance": "<0-100>",
    "pacing": "<0-100>",
    "accessibility": "<0-100>",
    "retention": "<0-100>",
    "polish": "<0-100>",
    "overall": "<0-100>"
  },
  "difficulty_spikes": [{ "location": "<where>", "severity": "<low|medium|high>", "suggestion": "<fix>" }],
  "tutorial_analysis": { "effectiveness": "<0-100>", "issues": ["<issue>"], "suggestions": ["<suggestion>"] },
  "potential_exploits": [{ "exploit": "<description>", "severity": "<low|medium|high>", "fix": "<suggestion>" }],
  "qol_missing": ["<feature>"],
  "retention_hooks": ["<hook>"],
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  supervisor: `You are the Gaming Master supervisor. You merge and validate all sub-agent outputs for consistency and quality.

Your responsibilities:
1. Validate genre template <-> mechanics consistency: Do the mechanics match the genre requirements?
2. Check engine compatibility: Are all mechanics implementable in the selected engine?
3. Ensure cross-engine conversions are accurate: Are API mappings correct?
4. Validate asset specs: Are dimensions and formats appropriate for the engine/platform?
5. Check monetization plan coherence: Is the strategy appropriate for the genre and target audience?
6. Flag critical issues that need iteration

Return as JSON:
{
  "agent": "supervisor",
  "validation": {
    "genre_mechanics_consistent": true,
    "engine_compatible": true,
    "conversions_accurate": true,
    "assets_valid": true,
    "monetization_coherent": true,
    "issues": ["<issue description>"]
  },
  "recommendations": ["<improvement suggestion>"],
  "priority_fixes": ["<critical fix needed>"],
  "summary": "<2-3 sentence validation summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  assembler: `You are the Gaming Master assembler. Produce the final comprehensive game creation report.

You receive all sub-agent outputs (genre template, mechanics, engine selection, assets, cross-engine conversion, monetization, playtest simulation, supervisor validation).

Merge everything into a clean, actionable final report. Include:
1. Selected engine with reasoning and alternatives
2. Genre template with core systems and progression
3. All mechanics with multi-engine implementations
4. AI behavior designs
5. Physics configuration
6. Complete asset manifest with Midjourney prompts
7. Cross-engine conversion guide
8. Monetization plan (if applicable)
9. Playtest scores and analysis
10. Project file stubs for immediate development

Return as JSON:
{
  "agent": "assembler",
  "selected_engine": "<engine>",
  "selected_genre": "<genre>",
  "genre_template": {
    "core_systems": [],
    "level_design": {},
    "progression_curve": {}
  },
  "mechanics": [{
    "name": "<name>",
    "category": "<category>",
    "algorithm": "<description>",
    "math": { "formulas": [] },
    "implementations": { "godot": "", "unity": "", "gamemaker": "", "bevy": "" }
  }],
  "ai_behaviors": [{
    "name": "<behavior>",
    "type": "<type>",
    "states_or_nodes": []
  }],
  "physics_config": {
    "gravity": 0,
    "friction": 0,
    "restitution": 0,
    "custom_forces": []
  },
  "assets": {
    "sprites": [],
    "tilesets": [],
    "audio": [],
    "ui_elements": [],
    "art_style": { "palette": [], "aesthetic": "", "references": [] }
  },
  "engine_conversion": {
    "source_engine": "",
    "target_engine": "",
    "compatibility": 0,
    "code_mappings": [],
    "api_equivalents": [],
    "migration_steps": []
  },
  "monetization": {},
  "playtest_scores": { "fun_factor": 0, "difficulty_balance": 0, "pacing": 0, "accessibility": 0, "retention": 0, "polish": 0, "overall": 0 },
  "project_files": [{ "path": "<path>", "content": "<code>", "language": "<lang>" }],
  "summary": "<executive summary>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

// ── Types ──

export interface GenreTemplate {
  genre: string;
  core_systems: Array<{
    name: string;
    description: string;
    components: string[];
    data_structures: Array<{
      name: string;
      fields: Array<{ name: string; type: string; default: string }>;
    }>;
  }>;
  level_design: {
    structure: string;
    zones: Array<{
      name: string;
      difficulty: number;
      mechanics_introduced: string[];
    }>;
  };
  progression_curve: {
    type: string;
    xp_formula: string;
    level_cap: number;
    milestones: Array<{ level: number; unlock: string }>;
  };
}

export interface GameMechanic {
  name: string;
  category: string;
  algorithm: string;
  math: {
    formulas: Array<{
      name: string;
      expression: string;
      variables: string[];
    }>;
  };
  implementations: {
    godot: string;
    unity: string;
    gamemaker: string;
    bevy: string;
  };
}

export interface AIBehavior {
  name: string;
  type: string;
  states_or_nodes: Array<{
    name: string;
    transitions: string[];
  }>;
}

export interface AssetManifest {
  sprites: Array<{
    name: string;
    description: string;
    dimensions: string;
    animation_frames: number;
    midjourney_prompt: string;
  }>;
  tilesets: Array<{
    name: string;
    tile_size: number;
    tiles: string[];
  }>;
  audio: Array<{
    name: string;
    type: string;
    description: string;
    duration_sec: number;
  }>;
  ui_elements: Array<{
    name: string;
    type: string;
    style: string;
  }>;
  art_style: {
    palette: string[];
    aesthetic: string;
    references: string[];
  };
}

export interface EngineConversion {
  source_engine: string;
  target_engine: string;
  compatibility: number;
  code_mappings: Array<{
    concept: string;
    source_code: string;
    target_code: string;
    notes: string;
  }>;
  api_equivalents: Array<{
    source_api: string;
    target_api: string;
    differences: string;
  }>;
  migration_steps: string[];
}

export interface PlaytestScore {
  fun_factor: number;
  difficulty_balance: number;
  pacing: number;
  accessibility: number;
  retention: number;
  polish: number;
  overall: number;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface GamingMasterReport {
  selectedEngine: string;
  selectedGenre: string;
  genreTemplate: GenreTemplate;
  mechanics: GameMechanic[];
  aiBehaviors: AIBehavior[];
  physicsConfig: {
    gravity: number;
    friction: number;
    restitution: number;
    custom_forces: Array<{ name: string; formula: string }>;
  };
  assets: AssetManifest;
  engineConversion: EngineConversion;
  monetization: Record<string, unknown>;
  playtestScore: PlaytestScore;
  projectFiles: ProjectFile[];
  summary: string;
}

export interface GamingMasterMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface GamingMasterResult {
  report: GamingMasterReport;
  messages: GamingMasterMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const GamingMasterAnnotation = Annotation.Root({
  /** User's game idea description */
  gameIdea: Annotation<string>,

  /** User's explicit engine preference (or "auto") */
  enginePreference: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "auto",
  }),

  /** User's explicit genre preference (or "auto") */
  genrePreference: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "auto",
  }),

  /** Whether to include esports features */
  includeEsports: Annotation<boolean>({
    reducer: (_, v) => v,
    default: () => false,
  }),

  /** Selected engine after analysis */
  selectedEngine: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Selected genre after analysis */
  selectedGenre: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Individual agent messages (accumulated) */
  agentMessages: Annotation<GamingMasterMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** The final master report */
  masterReport: Annotation<GamingMasterReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),
});

type GamingMasterState = typeof GamingMasterAnnotation.State;

// ── Retry with exponential backoff ──

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

// ── Node: genre-templater ──

function createGenreTemplaterNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["genre-templater"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Genre Preference: ${state.genrePreference === "auto" ? "No preference — analyze the idea and select the best genre." : `User prefers: ${state.genrePreference}. Design a template for this genre.`}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.4, maxTokens: 8192 }
    );

    let selectedGenre = state.genrePreference !== "auto" ? state.genrePreference : "";
    try {
      const parsed = parseJSON(result);
      if (parsed.genre) {
        selectedGenre = parsed.genre as string;
      }
    } catch { /* use preference or empty */ }

    const message: GamingMasterMessage = {
      agent: "genre-templater",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      selectedGenre,
      agentMessages: [message],
      specialistResults: { "genre-templater": result },
    };
  };
}

// ── Node: engine-selector ──

function createEngineSelectorNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["engine-selector"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Engine Preference: ${state.enginePreference === "auto" ? "No preference — recommend the best engine based on the game requirements." : `User prefers: ${state.enginePreference}. Validate this choice and provide alternatives.`}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 4096 }
    );

    let selectedEngine = state.enginePreference !== "auto" ? state.enginePreference : "godot";
    try {
      const parsed = parseJSON(result);
      const rec = parsed.recommendation as Record<string, unknown> | undefined;
      if (rec?.primary) {
        selectedEngine = rec.primary as string;
      }
    } catch { /* use default */ }

    const message: GamingMasterMessage = {
      agent: "engine-selector",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      selectedEngine,
      agentMessages: [message],
      specialistResults: { "engine-selector": result },
    };
  };
}

// ── Node: mechanics-engineer ──

function createMechanicsEngineerNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["mechanics-engineer"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Genre: ${state.selectedGenre}
Selected Engine: ${state.selectedEngine}

Genre Template Analysis:
${state.specialistResults["genre-templater"]?.slice(0, 4000) ?? "N/A"}

Engine Selection Analysis:
${state.specialistResults["engine-selector"]?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.4, maxTokens: 8192 }
    );

    const message: GamingMasterMessage = {
      agent: "mechanics-engineer",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "mechanics-engineer": result },
    };
  };
}

// ── Node: supervisor ──

function createSupervisorNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const relevantOutputs = ["genre-templater", "engine-selector", "mechanics-engineer"]
      .map((agent) => `=== ${agent.toUpperCase()} ===\n${state.specialistResults[agent]?.slice(0, 3000) ?? "N/A"}`)
      .join("\n\n");

    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS.supervisor,
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea.slice(0, 1000)}

Selected Engine: ${state.selectedEngine}
Selected Genre: ${state.selectedGenre}

Sub-Agent Outputs:
${relevantOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: GamingMasterMessage = {
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

// ── Node: asset-generator ──

function createAssetGeneratorNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["asset-generator"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Engine: ${state.selectedEngine}
Selected Genre: ${state.selectedGenre}

Genre Template:
${state.specialistResults["genre-templater"]?.slice(0, 3000) ?? "N/A"}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 1500) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.5, maxTokens: 8192 }
    );

    const message: GamingMasterMessage = {
      agent: "asset-generator",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "asset-generator": result },
    };
  };
}

// ── Node: cross-engine-converter ──

function createCrossEngineConverterNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["cross-engine-converter"],
      state.gameIdea
    );

    // Find an alternative engine for conversion
    let altEngine = "unity";
    try {
      const selectorData = parseJSON(state.specialistResults["engine-selector"] ?? "{}");
      const rec = selectorData.recommendation as Record<string, unknown> | undefined;
      const alts = rec?.alternatives as Array<{ engine: string }> | undefined;
      if (alts && alts.length > 0) {
        altEngine = alts[0].engine;
      }
    } catch { /* use default */ }

    if (altEngine.toLowerCase() === state.selectedEngine.toLowerCase()) {
      altEngine = state.selectedEngine.toLowerCase() === "godot" ? "unity" : "godot";
    }

    const context = `Game Idea:
${state.gameIdea}

Primary Engine: ${state.selectedEngine}
Convert To: ${altEngine}

Mechanics to Convert:
${state.specialistResults["mechanics-engineer"]?.slice(0, 4000) ?? "N/A"}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 1500) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: GamingMasterMessage = {
      agent: "cross-engine-converter",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "cross-engine-converter": result },
    };
  };
}

// ── Node: monetization-planner ──

function createMonetizationPlannerNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["monetization-planner"],
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea}

Selected Engine: ${state.selectedEngine}
Selected Genre: ${state.selectedGenre}
Include Esports Features: ${state.includeEsports ? "YES — include ranked modes, tournaments, spectator, and leaderboards" : "No esports features needed"}

Genre Template:
${state.specialistResults["genre-templater"]?.slice(0, 2000) ?? "N/A"}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 1500) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 6144 }
    );

    const message: GamingMasterMessage = {
      agent: "monetization-planner",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "monetization-planner": result },
    };
  };
}

// ── Node: playtest-simulator ──

function createPlaytestSimulatorNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS["playtest-simulator"],
      state.gameIdea
    );

    const allOutputs = [
      "genre-templater", "engine-selector", "mechanics-engineer",
      "asset-generator", "cross-engine-converter", "monetization-planner",
    ]
      .map((agent) => `=== ${agent.toUpperCase()} ===\n${state.specialistResults[agent]?.slice(0, 2000) ?? "N/A"}`)
      .join("\n\n");

    const context = `Game Idea:
${state.gameIdea.slice(0, 1000)}

Selected Engine: ${state.selectedEngine}
Selected Genre: ${state.selectedGenre}

All Agent Outputs for Playtesting:
${allOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 6144 }
    );

    const message: GamingMasterMessage = {
      agent: "playtest-simulator",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "playtest-simulator": result },
    };
  };
}

// ── Node: assembler ──

function createAssemblerNode(provider: LLMProvider) {
  return async (state: GamingMasterState): Promise<Partial<GamingMasterState>> => {
    const allOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const systemPrompt = await injectMemoryContext(
      GAMING_MASTER_PROMPTS.assembler,
      state.gameIdea
    );

    const context = `Game Idea:
${state.gameIdea.slice(0, 1000)}

Selected Engine: ${state.selectedEngine}
Selected Genre: ${state.selectedGenre}

All Sub-Agent Outputs:
${allOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 8192 }
    );

    // Parse into GamingMasterReport
    let report: GamingMasterReport;
    try {
      const parsed = parseJSON(result);

      // Parse genre template
      let genreTemplate: GenreTemplate = {
        genre: state.selectedGenre,
        core_systems: [],
        level_design: { structure: "linear", zones: [] },
        progression_curve: { type: "linear", xp_formula: "", level_cap: 1, milestones: [] },
      };
      try {
        const genreData = parseJSON(state.specialistResults["genre-templater"] ?? "{}");
        const tmpl = genreData.template as Record<string, unknown> | undefined;
        if (tmpl) {
          genreTemplate = {
            genre: (genreData.genre as string) ?? state.selectedGenre,
            core_systems: (tmpl.core_systems as GenreTemplate["core_systems"]) ?? [],
            level_design: (tmpl.level_design as GenreTemplate["level_design"]) ?? { structure: "linear", zones: [] },
            progression_curve: (tmpl.progression_curve as GenreTemplate["progression_curve"]) ?? { type: "linear", xp_formula: "", level_cap: 1, milestones: [] },
          };
        }
      } catch { /* use defaults */ }

      // Parse mechanics
      let mechanics: GameMechanic[] = [];
      try {
        const mechData = parseJSON(state.specialistResults["mechanics-engineer"] ?? "{}");
        mechanics = ((mechData.mechanics as GameMechanic[]) ?? []).map((m) => ({
          name: m.name ?? "",
          category: m.category ?? "movement",
          algorithm: m.algorithm ?? "",
          math: m.math ?? { formulas: [] },
          implementations: {
            godot: (m.implementations as Record<string, string>)?.godot ?? "",
            unity: (m.implementations as Record<string, string>)?.unity ?? "",
            gamemaker: (m.implementations as Record<string, string>)?.gamemaker ?? "",
            bevy: (m.implementations as Record<string, string>)?.bevy ?? "",
          },
        }));
      } catch { /* use empty */ }

      // Parse AI behaviors
      let aiBehaviors: AIBehavior[] = [];
      try {
        const mechData = parseJSON(state.specialistResults["mechanics-engineer"] ?? "{}");
        aiBehaviors = ((mechData.ai_behaviors as AIBehavior[]) ?? []).map((b) => ({
          name: b.name ?? "",
          type: b.type ?? "state-machine",
          states_or_nodes: (b.states_or_nodes ?? []).map((s) => ({
            name: s.name ?? "",
            transitions: s.transitions ?? [],
          })),
        }));
      } catch { /* use empty */ }

      // Parse physics config
      let physicsConfig = { gravity: 980, friction: 0.5, restitution: 0.3, custom_forces: [] as Array<{ name: string; formula: string }> };
      try {
        const mechData = parseJSON(state.specialistResults["mechanics-engineer"] ?? "{}");
        const pc = mechData.physics_config as Record<string, unknown> | undefined;
        if (pc) {
          physicsConfig = {
            gravity: Number(pc.gravity) || 980,
            friction: Number(pc.friction) || 0.5,
            restitution: Number(pc.restitution) || 0.3,
            custom_forces: (pc.custom_forces as Array<{ name: string; formula: string }>) ?? [],
          };
        }
      } catch { /* use defaults */ }

      // Parse assets
      let assets: AssetManifest = {
        sprites: [], tilesets: [], audio: [], ui_elements: [],
        art_style: { palette: [], aesthetic: "pixel-art", references: [] },
      };
      try {
        const assetData = parseJSON(state.specialistResults["asset-generator"] ?? "{}");
        const rawAssets = assetData.assets as Record<string, unknown> | undefined;
        if (rawAssets) {
          assets = {
            sprites: ((rawAssets.sprites as AssetManifest["sprites"]) ?? []).map((s) => ({
              name: s.name ?? "",
              description: s.description ?? "",
              dimensions: s.dimensions ?? "32x32",
              animation_frames: Number(s.animation_frames) || 1,
              midjourney_prompt: s.midjourney_prompt ?? "",
            })),
            tilesets: ((rawAssets.tilesets as AssetManifest["tilesets"]) ?? []).map((t) => ({
              name: t.name ?? "",
              tile_size: Number(t.tile_size) || 16,
              tiles: t.tiles ?? [],
            })),
            audio: ((rawAssets.audio as AssetManifest["audio"]) ?? []).map((a) => ({
              name: a.name ?? "",
              type: a.type ?? "sfx",
              description: a.description ?? "",
              duration_sec: Number(a.duration_sec) || 1,
            })),
            ui_elements: ((rawAssets.ui_elements as AssetManifest["ui_elements"]) ?? []).map((u) => ({
              name: u.name ?? "",
              type: u.type ?? "button",
              style: u.style ?? "",
            })),
          };
        }
        const artStyle = assetData.art_style as AssetManifest["art_style"] | undefined;
        if (artStyle) {
          assets.art_style = {
            palette: artStyle.palette ?? [],
            aesthetic: artStyle.aesthetic ?? "pixel-art",
            references: artStyle.references ?? [],
          };
        }
      } catch { /* use defaults */ }

      // Parse engine conversion
      let engineConversion: EngineConversion = {
        source_engine: state.selectedEngine,
        target_engine: "",
        compatibility: 0,
        code_mappings: [],
        api_equivalents: [],
        migration_steps: [],
      };
      try {
        const convData = parseJSON(state.specialistResults["cross-engine-converter"] ?? "{}");
        const conv = convData.conversion as Record<string, unknown> | undefined;
        if (conv) {
          engineConversion = {
            source_engine: (conv.source_engine as string) ?? state.selectedEngine,
            target_engine: (conv.target_engine as string) ?? "",
            compatibility: Number(conv.compatibility) || 0,
            code_mappings: ((conv.code_mappings as EngineConversion["code_mappings"]) ?? []).map((cm) => ({
              concept: cm.concept ?? "",
              source_code: cm.source_code ?? "",
              target_code: cm.target_code ?? "",
              notes: cm.notes ?? "",
            })),
            api_equivalents: ((conv.api_equivalents as EngineConversion["api_equivalents"]) ?? []).map((ae) => ({
              source_api: ae.source_api ?? "",
              target_api: ae.target_api ?? "",
              differences: ae.differences ?? "",
            })),
            migration_steps: (conv.migration_steps as string[]) ?? [],
          };
        }
      } catch { /* use defaults */ }

      // Parse monetization
      let monetization: Record<string, unknown> = {};
      try {
        monetization = parseJSON(state.specialistResults["monetization-planner"] ?? "{}");
      } catch { /* use empty */ }

      // Parse playtest scores
      let playtestScore: PlaytestScore = {
        fun_factor: 50, difficulty_balance: 50, pacing: 50,
        accessibility: 50, retention: 50, polish: 50, overall: 50,
      };
      try {
        const ptData = parseJSON(state.specialistResults["playtest-simulator"] ?? "{}");
        const scores = ptData.scores as Record<string, unknown> | undefined;
        if (scores) {
          playtestScore = {
            fun_factor: Number(scores.fun_factor) || 50,
            difficulty_balance: Number(scores.difficulty_balance) || 50,
            pacing: Number(scores.pacing) || 50,
            accessibility: Number(scores.accessibility) || 50,
            retention: Number(scores.retention) || 50,
            polish: Number(scores.polish) || 50,
            overall: Number(scores.overall) || 50,
          };
        }
      } catch { /* use defaults */ }

      // Parse project files
      const projectFiles: ProjectFile[] = ((parsed.project_files as ProjectFile[]) ?? []).map((f) => ({
        path: f.path ?? "",
        content: f.content ?? "",
        language: f.language ?? "",
      }));

      report = {
        selectedEngine: (parsed.selected_engine as string) ?? state.selectedEngine,
        selectedGenre: (parsed.selected_genre as string) ?? state.selectedGenre,
        genreTemplate,
        mechanics,
        aiBehaviors,
        physicsConfig,
        assets,
        engineConversion,
        monetization,
        playtestScore,
        projectFiles,
        summary: (parsed.summary as string) ?? "Game project assembled.",
      };
    } catch {
      // Fallback report
      report = {
        selectedEngine: state.selectedEngine,
        selectedGenre: state.selectedGenre,
        genreTemplate: {
          genre: state.selectedGenre,
          core_systems: [],
          level_design: { structure: "linear", zones: [] },
          progression_curve: { type: "linear", xp_formula: "", level_cap: 1, milestones: [] },
        },
        mechanics: [],
        aiBehaviors: [],
        physicsConfig: { gravity: 980, friction: 0.5, restitution: 0.3, custom_forces: [] },
        assets: {
          sprites: [], tilesets: [], audio: [], ui_elements: [],
          art_style: { palette: [], aesthetic: "pixel-art", references: [] },
        },
        engineConversion: {
          source_engine: state.selectedEngine,
          target_engine: "",
          compatibility: 0,
          code_mappings: [],
          api_equivalents: [],
          migration_steps: [],
        },
        monetization: {},
        playtestScore: {
          fun_factor: 0, difficulty_balance: 0, pacing: 0,
          accessibility: 0, retention: 0, polish: 0, overall: 0,
        },
        projectFiles: [],
        summary: result.slice(0, 500),
      };
    }

    const message: GamingMasterMessage = {
      agent: "assembler",
      content: "Gaming Master report assembled.",
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

function shouldIterate(state: GamingMasterState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  const score = state.masterReport?.playtestScore.overall ?? 0;
  if (score < 30 && state.iteration < state.maxIterations) return "iterate";
  return "finalize";
}

// ── Build the graph ──

function buildGamingMasterGraph(provider: LLMProvider) {
  const graph = new StateGraph(GamingMasterAnnotation)
    // Nodes
    .addNode("genre-templater", createGenreTemplaterNode(provider))
    .addNode("engine-selector", createEngineSelectorNode(provider))
    .addNode("mechanics-engineer", createMechanicsEngineerNode(provider))
    .addNode("supervisor", createSupervisorNode(provider))
    .addNode("asset-generator", createAssetGeneratorNode(provider))
    .addNode("cross-engine-converter", createCrossEngineConverterNode(provider))
    .addNode("monetization-planner", createMonetizationPlannerNode(provider))
    .addNode("playtest-simulator", createPlaytestSimulatorNode(provider))
    .addNode("assembler", createAssemblerNode(provider))

    // Flow: __start__ → [genre-templater, engine-selector] (parallel)
    .addEdge("__start__", "genre-templater")
    .addEdge("__start__", "engine-selector")

    // genre-templater + engine-selector → mechanics-engineer
    .addEdge("genre-templater", "mechanics-engineer")
    .addEdge("engine-selector", "mechanics-engineer")

    // mechanics-engineer → supervisor
    .addEdge("mechanics-engineer", "supervisor")

    // supervisor → [asset-generator, cross-engine-converter, monetization-planner] (parallel)
    .addEdge("supervisor", "asset-generator")
    .addEdge("supervisor", "cross-engine-converter")
    .addEdge("supervisor", "monetization-planner")

    // asset-generator + cross-engine-converter + monetization-planner → playtest-simulator
    .addEdge("asset-generator", "playtest-simulator")
    .addEdge("cross-engine-converter", "playtest-simulator")
    .addEdge("monetization-planner", "playtest-simulator")

    // playtest-simulator → assembler
    .addEdge("playtest-simulator", "assembler")

    // assembler → conditional iterate or __end__
    .addConditionalEdges("assembler", shouldIterate, {
      iterate: "genre-templater",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the Gaming Master multi-agent swarm.
 *
 * Flow:
 * 1. Resolves best available provider (Anthropic first)
 * 2. Genre Templater + Engine Selector run in parallel
 * 3. Mechanics Engineer builds systems with genre + engine context
 * 4. Supervisor validates consistency
 * 5. Asset Generator + Cross-Engine Converter + Monetization Planner run in parallel
 * 6. Playtest Simulator scores the complete design
 * 7. Assembler produces final GamingMasterReport
 * 8. Conditional iteration if playtest score is too low
 */
export async function runGamingMasterSwarm(
  idea: string,
  options?: { engine?: string; genre?: string; maxIterations?: number; esports?: boolean }
): Promise<GamingMasterResult> {
  const provider = await resolveProvider();

  const app = buildGamingMasterGraph(provider);

  const finalState = await app.invoke({
    gameIdea: idea,
    enginePreference: options?.engine ?? "auto",
    genrePreference: options?.genre ?? "auto",
    includeEsports: options?.esports ?? false,
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as GamingMasterState;

  const fallbackScore: PlaytestScore = {
    fun_factor: 0,
    difficulty_balance: 0,
    pacing: 0,
    accessibility: 0,
    retention: 0,
    polish: 0,
    overall: 0,
  };

  return {
    report: state.masterReport ?? {
      selectedEngine: state.selectedEngine || "unknown",
      selectedGenre: state.selectedGenre || "unknown",
      genreTemplate: {
        genre: state.selectedGenre || "unknown",
        core_systems: [],
        level_design: { structure: "linear", zones: [] },
        progression_curve: { type: "linear", xp_formula: "", level_cap: 1, milestones: [] },
      },
      mechanics: [],
      aiBehaviors: [],
      physicsConfig: { gravity: 980, friction: 0.5, restitution: 0.3, custom_forces: [] },
      assets: {
        sprites: [], tilesets: [], audio: [], ui_elements: [],
        art_style: { palette: [], aesthetic: "pixel-art", references: [] },
      },
      engineConversion: {
        source_engine: state.selectedEngine || "unknown",
        target_engine: "",
        compatibility: 0,
        code_mappings: [],
        api_equivalents: [],
        migration_steps: [],
      },
      monetization: {},
      playtestScore: fallbackScore,
      projectFiles: [],
      summary: "Gaming Master failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
