import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Godot Game Development Agent Swarm — LangGraph
 *
 * Multi-agent swarm for vibe-coding Godot games (2D and 3D).
 *
 * Flow:
 *   __start__ → [scene-builder, script-generator, asset-integrator] (parallel)
 *       ↓
 *   supervisor merges → [math-guardian, monetization-advisor] (parallel)
 *       ↓
 *   assembler → (iterate or finalize)
 *
 * Sub-agents:
 * - Scene Builder: Designs Godot node hierarchy and scene trees
 * - Script Generator: Produces GDScript 4.x code for gameplay systems
 * - Asset Integrator: Organizes project structure, resources, and shaders
 * - Math Guardian: Validates game math, algorithms, and scoring curves
 * - Monetization Advisor: Publishing strategy, pricing, and DLC structure
 * - Supervisor: Merges outputs, checks scene↔script consistency
 * - Assembler: Produces final GodotVibeReport
 */

// ── Sub-agent system prompts ──

const GODOT_PROMPTS = {
  "scene-builder": `You are an expert Godot 4.x scene architect specializing in node hierarchy design.
Analyze the user's game idea and produce a complete scene tree structure.

For 2D games use: Node2D, CharacterBody2D, Sprite2D, CollisionShape2D, Area2D, TileMap, Camera2D, AnimatedSprite2D, RigidBody2D, StaticBody2D, CanvasLayer, Control, Label, Button, TextureRect, ProgressBar, Timer, AudioStreamPlayer2D, ParallaxBackground, ParallaxLayer, GPUParticles2D, NavigationAgent2D, Path2D, PathFollow2D, Line2D, RayCast2D.

For 3D games use: Node3D, CharacterBody3D, MeshInstance3D, CollisionShape3D, Camera3D, DirectionalLight3D, OmniLight3D, SpotLight3D, WorldEnvironment, RigidBody3D, StaticBody3D, Area3D, NavigationAgent3D, GPUParticles3D, AudioStreamPlayer3D, AnimationPlayer.

Design principles:
1. Each scene should have a clear root node type matching its purpose
2. Include preload/export variable annotations for configurable properties
3. Group related nodes logically (e.g., player scene has body + sprite + collision + camera)
4. Add UI scenes separately using CanvasLayer
5. Include a main scene that ties everything together

Return your analysis as JSON:
{
  "agent": "scene-builder",
  "scenes": [
    {
      "name": "<scene_name.tscn>",
      "root_node_type": "<GodotNodeType>",
      "description": "<what this scene represents>",
      "children": [
        {
          "name": "<node_name>",
          "type": "<GodotNodeType>",
          "properties": { "<property>": "<value>" },
          "children": []
        }
      ]
    }
  ],
  "preload_resources": ["<res://path/to/resource>"],
  "export_vars": [
    { "scene": "<scene_name>", "var_name": "<name>", "type": "<GDScript type>", "default": "<value>" }
  ],
  "summary": "<2-3 sentence scene architecture overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "script-generator": `You are an expert GDScript 4.x developer specializing in Godot game programming.
Given a game idea and scene structure, generate production-ready GDScript code.

You MUST use Godot 4.x syntax exclusively:
- @export for exported variables (NOT export)
- @onready for onready vars (NOT onready var)
- func _ready(), func _process(delta), func _physics_process(delta)
- Signal declaration: signal <name>(<params>)
- Signal connection: <node>.<signal>.connect(<callable>)
- Type hints: var speed: float = 200.0
- StringName for input actions: Input.is_action_pressed(&"move_left")
- super() instead of .method() for parent calls
- await and Callable for async patterns

Generate scripts for:
1. Player controller (movement, input handling, animation state machine)
2. Enemy AI (patrol, chase, attack states using match or state enum)
3. Physics/collision handlers (damage, pickups, triggers)
4. UI controllers (HUD updates, menus, pause screen)
5. Game manager (singleton/autoload for score, lives, level transitions)
6. Signal bus (global event system autoload)

Return your code as JSON:
{
  "agent": "script-generator",
  "scripts": [
    {
      "filename": "<script_name.gd>",
      "attached_to": "<scene_name/node_name>",
      "description": "<what this script does>",
      "gdscript_code": "<complete GDScript 4.x code>"
    }
  ],
  "autoloads": [
    { "name": "<AutoloadName>", "path": "res://scripts/<file>.gd" }
  ],
  "input_actions": [
    { "name": "<action_name>", "keys": ["<key>"] }
  ],
  "summary": "<2-3 sentence code architecture overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "asset-integrator": `You are a Godot project organization expert and resource manager.
Given a game idea, generate the complete project configuration and resource structure.

Handle:
1. project.godot configuration (project name, main scene, window size, input mappings, autoloads, rendering settings)
2. Folder structure following Godot best practices:
   - res://scenes/ (scene files organized by type)
   - res://scripts/ (GDScript files)
   - res://assets/sprites/ (2D textures and spritesheets)
   - res://assets/models/ (3D models for 3D games)
   - res://assets/audio/sfx/ and res://assets/audio/music/
   - res://assets/fonts/
   - res://assets/shaders/
   - res://themes/ (UI themes)
   - res://resources/ (custom Resource files)
3. Placeholder asset references with descriptive names
4. Custom shaders for UI polish (Jhey-inspired: glow effects, animated gradients, hover transitions)
5. Theme resources for consistent UI styling
6. Export presets for target platforms

Return your configuration as JSON:
{
  "agent": "asset-integrator",
  "project_config": "<complete project.godot file content>",
  "folder_structure": [
    { "path": "res://<path>/", "purpose": "<description>" }
  ],
  "asset_manifest": [
    { "path": "res://<full_path>", "type": "texture|audio|font|shader|theme|resource", "description": "<what this asset is for>", "placeholder": true }
  ],
  "shader_code": [
    { "filename": "<shader_name>.gdshader", "path": "res://assets/shaders/", "code": "<GLSL shader code>", "description": "<visual effect description>" }
  ],
  "theme_config": "<Godot theme resource description>",
  "export_presets": ["<platform: notes>"],
  "summary": "<2-3 sentence project structure overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "math-guardian": `You are a game mathematics and algorithm validation specialist.
Analyze the game design for mathematical correctness and balance.

Validate and optimize:
1. Pathfinding: A* implementation correctness, heuristic selection, grid vs navmesh tradeoffs
2. Physics formulas: Gravity, velocity, acceleration, friction, jump curves (coyote time, jump buffering)
3. Procedural generation: Noise functions, BSP for dungeons, wave function collapse, L-systems
4. Scoring/XP curves: Logarithmic/exponential progression, level-up thresholds, difficulty scaling
5. Probability distributions: Loot table weights, drop rates, pity systems, pseudo-random distribution
6. Game balance: DPS calculations, time-to-kill, economy sinks/faucets, difficulty curves
7. Performance math: Spatial partitioning, LOD thresholds, culling distances

Return your analysis as JSON:
{
  "agent": "math-guardian",
  "algorithms": [
    {
      "name": "<algorithm name>",
      "category": "pathfinding|physics|procedural|progression|probability|balance|performance",
      "formula": "<mathematical formula or pseudocode>",
      "correctness": "valid|warning|invalid",
      "explanation": "<why it's correct or what's wrong>",
      "edge_cases": ["<edge case and how to handle it>"],
      "optimization_notes": "<performance considerations>"
    }
  ],
  "game_alpha_score": {
    "playability": <1-10>,
    "polish": <1-10>,
    "fun_factor": <1-10>,
    "technical": <1-10>,
    "monetization": <1-10>,
    "overall": <1-10>
  },
  "balance_warnings": ["<potential balance issue>"],
  "recommended_constants": [
    { "name": "<CONSTANT_NAME>", "value": "<recommended value>", "reasoning": "<why>" }
  ],
  "summary": "<2-3 sentence math validation overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "monetization-advisor": `You are a game monetization and publishing strategist.
Analyze the game concept for revenue potential and publishing strategy.

Evaluate:
1. Platform Strategy: itch.io (free/PWYW for visibility), Steam (wishlists, launch discount, festivals), Epic, GOG, mobile stores
2. Pricing: Base price analysis based on genre, scope, and market comps; regional pricing
3. DLC/Expansion Structure: Content packs, cosmetic DLC, level packs, season passes
4. In-Game Purchases: Cosmetics, convenience items, battle passes (if appropriate for genre)
5. Revenue Timeline: Launch window, post-launch content cadence, long-tail strategies
6. Marketing: Steam Next Fest, itch.io jams, social media strategy, streamer outreach, demo strategy
7. Community Building: Discord, dev logs, early access vs full release

Return your strategy as JSON:
{
  "agent": "monetization-advisor",
  "platform_strategy": [
    { "platform": "<name>", "priority": "primary|secondary|optional", "reasoning": "<why>", "revenue_share": "<percentage>" }
  ],
  "pricing": {
    "base_price_usd": <number>,
    "launch_discount_pct": <number>,
    "reasoning": "<price justification>",
    "regional_notes": "<regional pricing strategy>"
  },
  "dlc_ideas": [
    { "name": "<DLC name>", "type": "content|cosmetic|expansion", "price_usd": <number>, "description": "<what's included>", "timeline": "<when to release>" }
  ],
  "monetization_model": "<premium|freemium|free-with-iap|early-access>",
  "estimated_revenue": {
    "month_1": <number>,
    "month_6": <number>,
    "year_1": <number>,
    "wishlists_needed": <number>,
    "conversion_rate_pct": <number>
  },
  "marketing_plan": ["<action item>"],
  "community_strategy": "<how to build and retain community>",
  "summary": "<2-3 sentence monetization overview>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const GODOT_SUPERVISOR_PROMPT = `You are the Godot Game Development supervisor. You coordinate the analysis from the scene builder,
script generator, and asset integrator to ensure a cohesive, buildable Godot project.

Your job:
1. Verify scene-script consistency: every scene node that needs a script has one, every script references valid nodes
2. Check that exported variables in scripts match the properties defined in scenes
3. Validate signal connections: signals emitted in one script are connected in the appropriate scene
4. Ensure autoloads are properly configured in project.godot
5. Flag missing assets referenced in scenes or scripts
6. Identify inconsistencies between 2D/3D types (e.g., CharacterBody2D in a 3D game)
7. Determine if iteration is needed to fix issues

Return your merged analysis as JSON:
{
  "consistency_check": {
    "scenes_with_scripts": <number>,
    "orphaned_scripts": ["<script with no scene attachment>"],
    "missing_scripts": ["<scene node that needs a script but lacks one>"],
    "signal_issues": ["<signal connection problem>"],
    "type_mismatches": ["<2D/3D mismatch>"]
  },
  "fixes_applied": ["<description of fix>"],
  "quality_notes": ["<suggestion for improvement>"],
  "needs_iteration": <true if critical issues found>,
  "summary": "<2-3 sentence consistency assessment>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface SceneNode {
  name: string;
  type: string;
  properties?: Record<string, string>;
  children?: SceneNode[];
}

export interface GodotScene {
  name: string;
  root_node_type: string;
  description: string;
  children: SceneNode[];
}

export interface GodotScript {
  filename: string;
  attached_to: string;
  description: string;
  gdscript_code: string;
}

export interface GodotShader {
  filename: string;
  path: string;
  code: string;
  description: string;
}

export interface GameAlphaScore {
  playability: number;
  polish: number;
  fun_factor: number;
  technical: number;
  monetization: number;
  overall: number;
}

export interface MathAlgorithm {
  name: string;
  category: string;
  formula: string;
  correctness: string;
  explanation: string;
  edge_cases: string[];
  optimization_notes?: string;
}

export interface PlatformStrategy {
  platform: string;
  priority: string;
  reasoning: string;
  revenue_share?: string;
}

export interface DlcIdea {
  name: string;
  type: string;
  price_usd: number;
  description: string;
  timeline?: string;
}

export interface MonetizationData {
  platform_strategy: PlatformStrategy[];
  pricing: {
    base_price_usd: number;
    launch_discount_pct: number;
    reasoning: string;
    regional_notes?: string;
  };
  dlc_ideas: DlcIdea[];
  monetization_model: string;
  estimated_revenue: Record<string, number>;
  marketing_plan: string[];
  community_strategy: string;
}

export interface GodotVibeReport {
  scenes: GodotScene[];
  scripts: GodotScript[];
  projectConfig: string;
  assets: {
    folder_structure: Array<{ path: string; purpose: string }>;
    asset_manifest: Array<{ path: string; type: string; description: string; placeholder: boolean }>;
    shader_code: GodotShader[];
  };
  gameAlphaScore: GameAlphaScore;
  mathAnalysis: {
    algorithms: MathAlgorithm[];
    balance_warnings: string[];
    recommended_constants: Array<{ name: string; value: string; reasoning: string }>;
  };
  monetization: MonetizationData;
  consistencyCheck: {
    scenes_with_scripts: number;
    orphaned_scripts: string[];
    missing_scripts: string[];
    signal_issues: string[];
    type_mismatches: string[];
    quality_notes: string[];
  };
  verdict: string;
}

export interface GodotVibeMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface GodotVibeResult {
  report: GodotVibeReport;
  messages: GodotVibeMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const GodotVibeAnnotation = Annotation.Root({
  /** The user's game idea */
  idea: Annotation<string>,

  /** Game type: 2d or 3d */
  gameType: Annotation<string>({ reducer: (_, v) => v, default: () => "2d" }),

  /** Optional template key */
  template: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Individual agent outputs (accumulated) */
  agentMessages: Annotation<GodotVibeMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Supervisor's merged consistency check */
  supervisorResult: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final assembled report */
  godotReport: Annotation<GodotVibeReport | null>({
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
    default: () => "building" as const,
  }),
});

type GodotVibeState = typeof GodotVibeAnnotation.State;

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

function createGodotSpecialistNode(
  agentName: keyof typeof GODOT_PROMPTS,
  provider: LLMProvider
) {
  return async (state: GodotVibeState): Promise<Partial<GodotVibeState>> => {
    const systemPrompt = await injectMemoryContext(
      GODOT_PROMPTS[agentName],
      state.idea
    );

    let userContext: string;

    if (agentName === "math-guardian") {
      userContext = `Game Idea: ${state.idea}\nGame Type: ${state.gameType}\n\nScene Structure:\n${state.specialistResults["scene-builder"] ?? "N/A"}\n\nScripts:\n${state.specialistResults["script-generator"] ?? "N/A"}\n\nSupervisor Notes:\n${state.supervisorResult || "N/A"}`;
    } else if (agentName === "monetization-advisor") {
      userContext = `Game Idea: ${state.idea}\nGame Type: ${state.gameType}\n\nScene Structure:\n${state.specialistResults["scene-builder"] ?? "N/A"}\n\nProject Config:\n${state.specialistResults["asset-integrator"] ?? "N/A"}\n\nSupervisor Notes:\n${state.supervisorResult || "N/A"}`;
    } else {
      const templateHint = state.template ? `\nTemplate: ${state.template}` : "";
      userContext = `Design a ${state.gameType.toUpperCase()} Godot game based on this idea:\n\n${state.idea}${templateHint}`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: GodotVibeMessage = {
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

function createGodotSupervisorNode(provider: LLMProvider) {
  return async (state: GodotVibeState): Promise<Partial<GodotVibeState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([key]) => ["scene-builder", "script-generator", "asset-integrator"].includes(key))
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      GODOT_SUPERVISOR_PROMPT,
      `Game Idea: ${state.idea}\nGame Type: ${state.gameType}\n\nSpecialist Outputs:\n${specialistOutputs}`,
      { temperature: 0.2, maxTokens: 4096 }
    );

    return {
      supervisorResult: result,
      agentMessages: [{
        agent: "supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Final report assembler ──

function createGodotAssemblerNode() {
  return async (state: GodotVibeState): Promise<Partial<GodotVibeState>> => {
    // Parse scene builder
    let scenes: GodotScene[] = [];
    let preloadResources: string[] = [];
    try {
      const cleaned = (state.specialistResults["scene-builder"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      scenes = data.scenes ?? [];
      preloadResources = data.preload_resources ?? [];
    } catch { /* use defaults */ }

    // Parse script generator
    let scripts: GodotScript[] = [];
    let autoloads: Array<{ name: string; path: string }> = [];
    try {
      const cleaned = (state.specialistResults["script-generator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      scripts = data.scripts ?? [];
      autoloads = data.autoloads ?? [];
    } catch { /* use defaults */ }

    // Parse asset integrator
    let projectConfig = "";
    let folderStructure: Array<{ path: string; purpose: string }> = [];
    let assetManifest: Array<{ path: string; type: string; description: string; placeholder: boolean }> = [];
    let shaderCode: GodotShader[] = [];
    try {
      const cleaned = (state.specialistResults["asset-integrator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      projectConfig = data.project_config ?? "";
      folderStructure = data.folder_structure ?? [];
      assetManifest = data.asset_manifest ?? [];
      shaderCode = data.shader_code ?? [];
    } catch { /* use defaults */ }

    // Parse math guardian
    let gameAlphaScore: GameAlphaScore = {
      playability: 5, polish: 5, fun_factor: 5, technical: 5, monetization: 5, overall: 5,
    };
    let algorithms: MathAlgorithm[] = [];
    let balanceWarnings: string[] = [];
    let recommendedConstants: Array<{ name: string; value: string; reasoning: string }> = [];
    try {
      const cleaned = (state.specialistResults["math-guardian"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      gameAlphaScore = data.game_alpha_score ?? gameAlphaScore;
      algorithms = data.algorithms ?? [];
      balanceWarnings = data.balance_warnings ?? [];
      recommendedConstants = data.recommended_constants ?? [];
    } catch { /* use defaults */ }

    // Parse monetization advisor
    let monetization: MonetizationData = {
      platform_strategy: [],
      pricing: { base_price_usd: 0, launch_discount_pct: 0, reasoning: "", regional_notes: "" },
      dlc_ideas: [],
      monetization_model: "premium",
      estimated_revenue: {},
      marketing_plan: [],
      community_strategy: "",
    };
    try {
      const cleaned = (state.specialistResults["monetization-advisor"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      monetization = {
        platform_strategy: data.platform_strategy ?? [],
        pricing: data.pricing ?? monetization.pricing,
        dlc_ideas: data.dlc_ideas ?? [],
        monetization_model: data.monetization_model ?? "premium",
        estimated_revenue: data.estimated_revenue ?? {},
        marketing_plan: data.marketing_plan ?? [],
        community_strategy: data.community_strategy ?? "",
      };
    } catch { /* use defaults */ }

    // Parse supervisor consistency check
    let consistencyCheck = {
      scenes_with_scripts: 0,
      orphaned_scripts: [] as string[],
      missing_scripts: [] as string[],
      signal_issues: [] as string[],
      type_mismatches: [] as string[],
      quality_notes: [] as string[],
    };
    let verdict = "Godot project generated successfully.";
    try {
      const cleaned = (state.supervisorResult ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      const cc = data.consistency_check ?? {};
      consistencyCheck = {
        scenes_with_scripts: cc.scenes_with_scripts ?? scenes.length,
        orphaned_scripts: cc.orphaned_scripts ?? [],
        missing_scripts: cc.missing_scripts ?? [],
        signal_issues: cc.signal_issues ?? [],
        type_mismatches: cc.type_mismatches ?? [],
        quality_notes: data.quality_notes ?? [],
      };
      verdict = data.summary ?? verdict;
    } catch { /* use defaults */ }

    const report: GodotVibeReport = {
      scenes,
      scripts,
      projectConfig,
      assets: {
        folder_structure: folderStructure,
        asset_manifest: assetManifest,
        shader_code: shaderCode,
      },
      gameAlphaScore,
      mathAnalysis: {
        algorithms,
        balance_warnings: balanceWarnings,
        recommended_constants: recommendedConstants,
      },
      monetization,
      consistencyCheck,
      verdict,
    };

    return {
      godotReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "assembler",
        content: "Godot project report assembled.",
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldIterateGodot(state: GodotVibeState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";

  // Check if supervisor flagged need for iteration
  try {
    const cleaned = (state.supervisorResult ?? "")
      .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    if (data.needs_iteration) return "iterate";
  } catch { /* proceed to finalize */ }

  return "finalize";
}

// ── Build the graph ──

function buildGodotVibeGraph(provider: LLMProvider) {
  const graph = new StateGraph(GodotVibeAnnotation)
    // Phase 1: Parallel game design (scene, scripts, assets)
    .addNode("scene-builder", createGodotSpecialistNode("scene-builder", provider))
    .addNode("script-generator", createGodotSpecialistNode("script-generator", provider))
    .addNode("asset-integrator", createGodotSpecialistNode("asset-integrator", provider))
    // Phase 2: Supervisor merge and consistency check
    .addNode("supervisor", createGodotSupervisorNode(provider))
    // Phase 3: Parallel validation and strategy
    .addNode("math-guardian", createGodotSpecialistNode("math-guardian", provider))
    .addNode("monetization-advisor", createGodotSpecialistNode("monetization-advisor", provider))
    // Phase 4: Final assembly
    .addNode("assembler", createGodotAssemblerNode())

    // Fan-out: start → all design specialists in parallel
    .addEdge("__start__", "scene-builder")
    .addEdge("__start__", "script-generator")
    .addEdge("__start__", "asset-integrator")

    // All design specialists → supervisor
    .addEdge("scene-builder", "supervisor")
    .addEdge("script-generator", "supervisor")
    .addEdge("asset-integrator", "supervisor")

    // Supervisor → validation + monetization in parallel
    .addEdge("supervisor", "math-guardian")
    .addEdge("supervisor", "monetization-advisor")

    // Both → assembler
    .addEdge("math-guardian", "assembler")
    .addEdge("monetization-advisor", "assembler")

    // Assembler → conditional: iterate or end
    .addConditionalEdges("assembler", shouldIterateGodot, {
      iterate: "scene-builder",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the Godot game development agent swarm on a game idea.
 *
 * Flow:
 * 1. Resolves the user's best available provider
 * 2. Fans out to 3 design specialists: Scene Builder, Script Generator, Asset Integrator
 * 3. Supervisor merges and checks consistency between scenes, scripts, and assets
 * 4. Math Guardian validates game algorithms, physics, and balance
 * 5. Monetization Advisor produces publishing and pricing strategy
 * 6. Assembler produces the final unified Godot project report
 */
export async function runGodotVibeSwarm(
  idea: string,
  options?: { gameType?: "2d" | "3d"; template?: string; maxIterations?: number }
): Promise<GodotVibeResult> {
  const provider = await resolveProvider();

  const app = buildGodotVibeGraph(provider);

  const finalState = await app.invoke({
    idea,
    gameType: options?.gameType ?? "2d",
    template: options?.template ?? "",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as GodotVibeState;

  return {
    report: state.godotReport ?? {
      scenes: [],
      scripts: [],
      projectConfig: "",
      assets: { folder_structure: [], asset_manifest: [], shader_code: [] },
      gameAlphaScore: { playability: 0, polish: 0, fun_factor: 0, technical: 0, monetization: 0, overall: 0 },
      mathAnalysis: { algorithms: [], balance_warnings: [], recommended_constants: [] },
      monetization: {
        platform_strategy: [],
        pricing: { base_price_usd: 0, launch_discount_pct: 0, reasoning: "" },
        dlc_ideas: [],
        monetization_model: "premium",
        estimated_revenue: {},
        marketing_plan: [],
        community_strategy: "",
      },
      consistencyCheck: {
        scenes_with_scripts: 0, orphaned_scripts: [], missing_scripts: [],
        signal_issues: [], type_mismatches: [], quality_notes: [],
      },
      verdict: "Godot vibe swarm failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
