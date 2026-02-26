import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Unreal Engine Game Development Agent Swarm — LangGraph
 *
 * Multi-agent swarm for vibe-coding Unreal Engine 5 games.
 *
 * Flow:
 *   __start__ → [blueprint-creator, level-designer, asset-handler] (parallel)
 *       ↓
 *   supervisor merges → [cpp-engineer, monetization-advisor] (parallel)
 *       ↓
 *   assembler → conditional iterate or __end__
 *
 * Sub-agents:
 * - Blueprint Creator: UE5 visual scripting graphs, event systems, variables
 * - Level Designer: Level layouts, lighting (Lumen), landscape, nav mesh, triggers
 * - Asset Handler: .uproject config, Content/ folder hierarchy, materials, imports
 * - C++ Engineer: Performance-critical UCLASS/UPROPERTY/UFUNCTION code generation
 * - Monetization Advisor: Skin systems, battle passes, DLC, store publishing
 * - Supervisor: Merges outputs, validates Blueprint-C++ consistency, flags issues
 * - Assembler: Produces final UnrealVibeReport with fidelity scoring
 */

// ── Sub-agent system prompts ──

const UNREAL_PROMPTS = {
  "blueprint-creator": `You are an expert in Unreal Engine 5 Blueprints and visual scripting.
Given a game idea, generate structured Blueprint descriptions covering the core gameplay systems:

1. Player Character Blueprint: Movement, input handling, animation state machine
2. Enemy AI Blueprint: Behavior tree hooks, perception system, combat logic
3. Game Mode Blueprint: Match rules, scoring, win/lose conditions, player spawning
4. HUD Widget Blueprint: Health bars, ammo counters, minimap, score display
5. Additional Blueprints: Projectiles, pickups, interactables, doors/triggers as needed

For each Blueprint describe: event graphs, functions, variables, macros, and interfaces.

Return your analysis as JSON:
{
  "agent": "blueprint-creator",
  "blueprints": [
    {
      "name": "<BP_Name>",
      "type": "actor|widget|game-mode|component",
      "description": "<what this Blueprint does>",
      "nodes": [
        { "type": "event|function|macro|branch|cast|sequence", "properties": { "name": "<node name>", "category": "<category>" }, "connections": ["<connected node names>"] }
      ],
      "variables": [
        { "name": "<VarName>", "type": "float|int|bool|vector|rotator|string|object-ref", "default": "<default value>" }
      ]
    }
  ],
  "interfaces": ["<Blueprint Interface names>"],
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "level-designer": `You are an expert Unreal Engine 5 level designer specializing in environment art, lighting, and gameplay spaces.
Given a game idea, produce detailed level layouts:

1. Level Layout: Spawn points, key areas, flow paths, choke points
2. Lighting Setup: Lumen global illumination config, directional/point/spot lights, sky atmosphere
3. Landscape/Terrain: Heightmap description, material layers, foliage placement
4. BSP/Static Mesh: Key geometry placement, modular kit suggestions
5. Navigation Mesh: NavMesh bounds, nav modifiers, agent radius/height
6. Trigger Volumes: Gameplay triggers, kill zones, checkpoints, loading zones
7. Post-Process Volumes: Color grading, bloom, ambient occlusion, exposure

Return your analysis as JSON:
{
  "agent": "level-designer",
  "levels": [
    {
      "name": "<LevelName>",
      "layout_description": "<detailed layout description>",
      "actors": [
        { "class": "<UE class name>", "location": { "x": 0, "y": 0, "z": 0 }, "rotation": { "pitch": 0, "yaw": 0, "roll": 0 }, "properties": {} }
      ],
      "lighting": {
        "type": "lumen|baked|mixed",
        "directional_light": { "intensity": 10, "color": "#FFFDE0", "angle": 45 },
        "sky_atmosphere": true,
        "post_process": { "bloom": 0.5, "ambient_occlusion": 0.6, "auto_exposure": true }
      },
      "nav_mesh_config": {
        "agent_radius": 42,
        "agent_height": 192,
        "cell_size": 19,
        "nav_modifiers": ["<modifier descriptions>"]
      },
      "key_areas": ["<area name and purpose>"],
      "trigger_volumes": ["<trigger description>"]
    }
  ],
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "asset-handler": `You are an Unreal Engine 5 project structure and asset management expert.
Given a game idea, generate the complete project configuration:

1. .uproject File: Engine version, plugins, target platforms, modules
2. Content/ Folder Hierarchy: /Content/Blueprints/, /Content/Maps/, /Content/Materials/,
   /Content/Meshes/, /Content/UI/, /Content/Audio/, /Content/Textures/, /Content/VFX/
3. Material Instances: Nanite/Lumen compatible materials, master material setup
4. Import Configs: Texture compression, mesh LOD settings, audio format configs
5. Plugin Requirements: Enhanced Input, Niagara, Chaos Physics, MetaSounds

Return your analysis as JSON:
{
  "agent": "asset-handler",
  "uproject_config": {
    "engine_version": "5.4",
    "modules": [{ "name": "<ModuleName>", "type": "Runtime", "loading_phase": "Default" }],
    "plugins": [{ "name": "<PluginName>", "enabled": true }],
    "target_platforms": ["Win64", "Linux"]
  },
  "folder_structure": [
    { "path": "/Content/<subfolder>", "purpose": "<what goes here>" }
  ],
  "material_setup": [
    { "name": "<M_MaterialName>", "type": "master|instance", "features": ["<feature>"], "nanite_compatible": true }
  ],
  "import_settings": {
    "textures": { "compression": "BC7", "max_resolution": 4096, "generate_mips": true },
    "meshes": { "nanite_enabled": true, "lod_count": 4, "collision": "complex-as-simple" },
    "audio": { "format": "OGG", "sample_rate": 48000, "compression_quality": 80 }
  },
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "cpp-engineer": `You are an expert Unreal Engine 5 C++ programmer specializing in performance-critical game systems.
Given a game idea and existing Blueprint/level designs, generate C++ code for core engine-level systems:

1. Game Instance (UGameInstance subclass): Persistent game state, save/load, subsystem management
2. Player Controller (APlayerController subclass): Input mapping, camera control, HUD management
3. Custom Movement Component (UCharacterMovementComponent subclass): Custom movement modes, physics integration
4. Physics Subsystem: Ballistics calculations, projectile prediction, collision response

Use proper UE5 macros: UCLASS(), UPROPERTY(), UFUNCTION(), GENERATED_BODY().
Include math safeguards (NaN checks, divide-by-zero guards) for ballistics and physics calculations.
Follow Unreal naming conventions (A- for Actors, U- for UObjects, F- for structs, E- for enums).

Return as JSON:
{
  "agent": "cpp-engineer",
  "cpp_files": [
    {
      "class_name": "<ClassName>",
      "parent_class": "<ParentClass>",
      "header": "<complete .h file content>",
      "source": "<complete .cpp file content>"
    }
  ],
  "additional_structs": ["<FStructName with description>"],
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "monetization-advisor": `You are an expert in video game monetization, live service models, and digital storefront strategy.
Given a game idea, produce a comprehensive monetization plan:

1. Monetization Model: Premium, F2P, hybrid, subscription, season pass
2. In-Game Economy: Skin systems, cosmetics, battle passes, loot boxes (if applicable)
3. DLC Strategy: Content packs, expansions, season content roadmap
4. Microtransaction Design: Currency tiers, pricing anchors, bundle strategies
5. Platform Publishing: Steam, Epic Games Store, console marketplace requirements
6. Age Rating Considerations: ESRB/PEGI implications of monetization choices
7. Revenue Projections: Estimated ARPU, conversion rates, whale/dolphin/minnow segmentation

Return as JSON:
{
  "agent": "monetization-advisor",
  "monetization_model": {
    "type": "premium|f2p|hybrid|subscription",
    "base_price": "<price or free>",
    "reasoning": "<why this model>"
  },
  "pricing_strategy": {
    "currency_name": "<in-game currency name>",
    "currency_tiers": [{ "amount": 0, "price_usd": 0, "bonus_pct": 0 }],
    "key_price_points": [{ "item_type": "<type>", "price_range": "<range>" }]
  },
  "dlc_plan": [
    { "name": "<DLC name>", "type": "expansion|cosmetic-pack|season-pass|battle-pass", "target_price": 0, "content_description": "<what's included>" }
  ],
  "platform_requirements": [
    { "platform": "Steam|Epic|PlayStation|Xbox|Nintendo", "revenue_share": "<pct>", "requirements": ["<requirement>"] }
  ],
  "age_rating_notes": ["<rating consideration>"],
  "estimated_revenue": {
    "arpu_monthly": 0,
    "conversion_rate_pct": 0,
    "year1_projection": 0,
    "whale_pct": 0
  },
  "summary": "<2-3 sentence overview>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const UNREAL_SUPERVISOR_PROMPT = `You are the Unreal Vibe supervisor. You coordinate the analysis of a game idea
across multiple specialist agents (Blueprint Creator, Level Designer, Asset Handler).

Your job:
1. Merge all specialist findings into a unified Unreal project plan
2. Validate Blueprint-C++ consistency (ensure BPs reference valid C++ base classes)
3. Check level references (actors, assets referenced in levels must exist in project)
4. Identify missing pieces (gameplay systems, assets, UI elements)
5. Flag any issues or contradictions between agent outputs
6. Determine if iteration is needed for completeness

Return the merged report as JSON:
{
  "validation_results": {
    "blueprint_cpp_consistent": <boolean>,
    "level_refs_valid": <boolean>,
    "asset_coverage_complete": <boolean>,
    "issues": ["<issue description>"]
  },
  "merged_project_summary": "<unified project description>",
  "missing_pieces": ["<what still needs to be created>"],
  "recommended_next_steps": ["<action item>"],
  "needs_iteration": <true if critical issues found>
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface UnrealFidelityScore {
  graphics: number;
  gameplay: number;
  performance: number;
  audio: number;
  monetization: number;
  overall: number;
}

export interface BlueprintEntry {
  name: string;
  type: string;
  description: string;
  nodes: Array<{
    type: string;
    properties: Record<string, string>;
    connections: string[];
  }>;
  variables: Array<{
    name: string;
    type: string;
    default: string;
  }>;
}

export interface LevelEntry {
  name: string;
  layout_description: string;
  actors: Array<{
    class: string;
    location: Record<string, number>;
    rotation: Record<string, number>;
    properties: Record<string, unknown>;
  }>;
  lighting: Record<string, unknown>;
  nav_mesh_config: Record<string, unknown>;
  key_areas: string[];
  trigger_volumes: string[];
}

export interface CppFileEntry {
  class_name: string;
  parent_class: string;
  header: string;
  source: string;
}

export interface MonetizationPlan {
  monetization_model: Record<string, unknown>;
  pricing_strategy: Record<string, unknown>;
  dlc_plan: Array<Record<string, unknown>>;
  platform_requirements: Array<Record<string, unknown>>;
  age_rating_notes: string[];
  estimated_revenue: Record<string, number>;
}

export interface UnrealVibeReport {
  blueprints: BlueprintEntry[];
  levels: LevelEntry[];
  cppFiles: CppFileEntry[];
  projectConfig: Record<string, unknown>;
  assets: {
    folder_structure: Array<{ path: string; purpose: string }>;
    material_setup: Array<Record<string, unknown>>;
    import_settings: Record<string, unknown>;
  };
  fidelityScore: UnrealFidelityScore;
  monetization: MonetizationPlan;
  supervisorNotes: string[];
  summary: string;
}

export interface UnrealVibeMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

// ── LangGraph State ──

const UnrealAnnotation = Annotation.Root({
  /** The user's game idea */
  idea: Annotation<string>,

  /** Selected template key (optional) */
  template: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Individual agent outputs (accumulated) */
  agentMessages: Annotation<UnrealVibeMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Supervisor's merged validation */
  mergedValidation: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final report */
  unrealReport: Annotation<UnrealVibeReport | null>({
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
    default: () => "designing" as const,
  }),
});

type UnrealState = typeof UnrealAnnotation.State;

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

function createUnrealSpecialistNode(
  agentName: keyof typeof UNREAL_PROMPTS,
  provider: LLMProvider
) {
  return async (state: UnrealState): Promise<Partial<UnrealState>> => {
    const systemPrompt = await injectMemoryContext(
      UNREAL_PROMPTS[agentName],
      state.idea
    );

    let userContext: string;

    if (agentName === "cpp-engineer") {
      userContext = `Game Idea: ${state.idea}\n\nTemplate: ${state.template || "custom"}\n\nBlueprint Designs:\n${state.specialistResults["blueprint-creator"] ?? "N/A"}\n\nLevel Designs:\n${state.specialistResults["level-designer"] ?? "N/A"}\n\nProject Config:\n${state.specialistResults["asset-handler"] ?? "N/A"}\n\nSupervisor Notes:\n${state.mergedValidation}`;
    } else if (agentName === "monetization-advisor") {
      userContext = `Game Idea: ${state.idea}\n\nTemplate: ${state.template || "custom"}\n\nBlueprint Summary:\n${state.specialistResults["blueprint-creator"]?.slice(0, 1000) ?? "N/A"}\n\nLevel Summary:\n${state.specialistResults["level-designer"]?.slice(0, 1000) ?? "N/A"}\n\nSupervisor Notes:\n${state.mergedValidation}`;
    } else {
      userContext = `Design the Unreal Engine 5 project for this game idea:\n\n${state.idea}${state.template ? `\n\nTemplate: ${state.template}` : ""}`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const message: UnrealVibeMessage = {
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

function createUnrealSupervisorNode(provider: LLMProvider) {
  return async (state: UnrealState): Promise<Partial<UnrealState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([key]) => ["blueprint-creator", "level-designer", "asset-handler"].includes(key))
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      UNREAL_SUPERVISOR_PROMPT,
      `Game Idea: ${state.idea}\n\nTemplate: ${state.template || "custom"}\n\nSpecialist Analyses:\n${specialistOutputs}`,
      { temperature: 0.2, maxTokens: 4096 }
    );

    return {
      mergedValidation: result,
      agentMessages: [{
        agent: "supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Final report assembler ──

function createUnrealAssemblerNode() {
  return async (state: UnrealState): Promise<Partial<UnrealState>> => {
    // Parse Blueprint Creator
    let blueprints: BlueprintEntry[] = [];
    try {
      const cleaned = (state.specialistResults["blueprint-creator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      blueprints = (data.blueprints ?? []).map((bp: Record<string, unknown>) => ({
        name: (bp.name ?? "") as string,
        type: (bp.type ?? "actor") as string,
        description: (bp.description ?? "") as string,
        nodes: (bp.nodes ?? []) as BlueprintEntry["nodes"],
        variables: (bp.variables ?? []) as BlueprintEntry["variables"],
      }));
    } catch { /* use defaults */ }

    // Parse Level Designer
    let levels: LevelEntry[] = [];
    try {
      const cleaned = (state.specialistResults["level-designer"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      levels = (data.levels ?? []).map((lv: Record<string, unknown>) => ({
        name: (lv.name ?? "") as string,
        layout_description: (lv.layout_description ?? "") as string,
        actors: (lv.actors ?? []) as LevelEntry["actors"],
        lighting: (lv.lighting ?? {}) as Record<string, unknown>,
        nav_mesh_config: (lv.nav_mesh_config ?? {}) as Record<string, unknown>,
        key_areas: (lv.key_areas ?? []) as string[],
        trigger_volumes: (lv.trigger_volumes ?? []) as string[],
      }));
    } catch { /* use defaults */ }

    // Parse C++ Engineer
    let cppFiles: CppFileEntry[] = [];
    try {
      const cleaned = (state.specialistResults["cpp-engineer"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      cppFiles = (data.cpp_files ?? []).map((f: Record<string, unknown>) => ({
        class_name: (f.class_name ?? "") as string,
        parent_class: (f.parent_class ?? "") as string,
        header: (f.header ?? "") as string,
        source: (f.source ?? "") as string,
      }));
    } catch { /* use defaults */ }

    // Parse Asset Handler
    let projectConfig: Record<string, unknown> = {};
    let assets = {
      folder_structure: [] as Array<{ path: string; purpose: string }>,
      material_setup: [] as Array<Record<string, unknown>>,
      import_settings: {} as Record<string, unknown>,
    };
    try {
      const cleaned = (state.specialistResults["asset-handler"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      projectConfig = data.uproject_config ?? {};
      assets = {
        folder_structure: data.folder_structure ?? [],
        material_setup: data.material_setup ?? [],
        import_settings: data.import_settings ?? {},
      };
    } catch { /* use defaults */ }

    // Parse Monetization Advisor
    let monetization: MonetizationPlan = {
      monetization_model: {},
      pricing_strategy: {},
      dlc_plan: [],
      platform_requirements: [],
      age_rating_notes: [],
      estimated_revenue: {},
    };
    try {
      const cleaned = (state.specialistResults["monetization-advisor"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      monetization = {
        monetization_model: data.monetization_model ?? {},
        pricing_strategy: data.pricing_strategy ?? {},
        dlc_plan: data.dlc_plan ?? [],
        platform_requirements: data.platform_requirements ?? [],
        age_rating_notes: data.age_rating_notes ?? [],
        estimated_revenue: data.estimated_revenue ?? {},
      };
    } catch { /* use defaults */ }

    // Parse Supervisor notes
    let supervisorNotes: string[] = [];
    let summary = "";
    try {
      const cleaned = (state.mergedValidation ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      supervisorNotes = [
        ...(data.validation_results?.issues ?? []),
        ...(data.missing_pieces ?? []),
        ...(data.recommended_next_steps ?? []),
      ];
      summary = data.merged_project_summary ?? "";
    } catch {
      summary = state.mergedValidation ?? "";
    }

    // Compute fidelity score heuristics
    const graphicsScore = Math.min(10, Math.max(1,
      (levels.length > 0 ? 3 : 0) +
      (assets.material_setup.length > 0 ? 3 : 0) +
      (assets.import_settings && Object.keys(assets.import_settings).length > 0 ? 2 : 0) +
      2
    ));
    const gameplayScore = Math.min(10, Math.max(1,
      (blueprints.length * 1.5) +
      (levels.length > 0 ? 2 : 0) +
      1
    ));
    const performanceScore = Math.min(10, Math.max(1,
      (cppFiles.length * 2) +
      (assets.material_setup.some((m: Record<string, unknown>) => m.nanite_compatible) ? 2 : 0) +
      2
    ));
    const audioScore = Math.min(10, Math.max(1,
      (assets.import_settings && (assets.import_settings as Record<string, unknown>).audio ? 4 : 1) +
      (assets.folder_structure.some((f) => f.path.includes("Audio")) ? 3 : 0) +
      2
    ));
    const monetizationScore = Math.min(10, Math.max(1,
      (monetization.dlc_plan.length > 0 ? 3 : 0) +
      (monetization.estimated_revenue && Object.keys(monetization.estimated_revenue).length > 0 ? 3 : 0) +
      (monetization.platform_requirements.length > 0 ? 2 : 0) +
      2
    ));

    const overall = Math.round(
      (graphicsScore * 0.25 + gameplayScore * 0.25 + performanceScore * 0.2 +
       audioScore * 0.1 + monetizationScore * 0.2) * 10
    ) / 10;

    const fidelityScore: UnrealFidelityScore = {
      graphics: Math.round(graphicsScore),
      gameplay: Math.round(gameplayScore),
      performance: Math.round(performanceScore),
      audio: Math.round(audioScore),
      monetization: Math.round(monetizationScore),
      overall: Math.round(overall),
    };

    const report: UnrealVibeReport = {
      blueprints,
      levels,
      cppFiles,
      projectConfig,
      assets,
      fidelityScore,
      monetization,
      supervisorNotes,
      summary,
    };

    return {
      unrealReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "assembler",
        content: "Unreal Vibe report assembled.",
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldIterateUnreal(state: UnrealState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";

  // Check if supervisor flagged need for iteration
  try {
    const cleaned = (state.mergedValidation ?? "")
      .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    if (data.needs_iteration) return "iterate";
  } catch { /* proceed to finalize */ }

  return "finalize";
}

// ── Build the graph ──

function buildUnrealGraph(provider: LLMProvider) {
  const graph = new StateGraph(UnrealAnnotation)
    // Phase 1: Parallel design agents
    .addNode("blueprint-creator", createUnrealSpecialistNode("blueprint-creator", provider))
    .addNode("level-designer", createUnrealSpecialistNode("level-designer", provider))
    .addNode("asset-handler", createUnrealSpecialistNode("asset-handler", provider))
    // Phase 2: Supervisor merge
    .addNode("supervisor", createUnrealSupervisorNode(provider))
    // Phase 3: Parallel implementation agents
    .addNode("cpp-engineer", createUnrealSpecialistNode("cpp-engineer", provider))
    .addNode("monetization-advisor", createUnrealSpecialistNode("monetization-advisor", provider))
    // Phase 4: Final assembly
    .addNode("assembler", createUnrealAssemblerNode())

    // Fan-out: start → design specialists in parallel
    .addEdge("__start__", "blueprint-creator")
    .addEdge("__start__", "level-designer")
    .addEdge("__start__", "asset-handler")

    // All design specialists → supervisor
    .addEdge("blueprint-creator", "supervisor")
    .addEdge("level-designer", "supervisor")
    .addEdge("asset-handler", "supervisor")

    // Supervisor → implementation agents in parallel
    .addEdge("supervisor", "cpp-engineer")
    .addEdge("supervisor", "monetization-advisor")

    // Both → assembler
    .addEdge("cpp-engineer", "assembler")
    .addEdge("monetization-advisor", "assembler")

    // Assembler → conditional: iterate or end
    .addConditionalEdges("assembler", shouldIterateUnreal, {
      iterate: "blueprint-creator",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

export interface UnrealVibeResult {
  report: UnrealVibeReport;
  messages: UnrealVibeMessage[];
  iterations: number;
  provider: string;
}

/**
 * Execute the Unreal Engine game development agent swarm on a game idea.
 *
 * Flow:
 * 1. Resolves the user's best available provider
 * 2. Fans out to 3 design specialists: Blueprint Creator, Level Designer, Asset Handler
 * 3. Supervisor merges findings, validates consistency, flags issues
 * 4. Fans out to 2 implementation specialists: C++ Engineer, Monetization Advisor
 * 5. Assembler produces the final UnrealVibeReport with fidelity scoring
 */
export async function runUnrealVibeSwarm(
  idea: string,
  options?: { template?: string; maxIterations?: number }
): Promise<UnrealVibeResult> {
  const provider = await resolveProvider();

  const app = buildUnrealGraph(provider);

  const finalState = await app.invoke({
    idea,
    template: options?.template ?? "",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as UnrealState;

  return {
    report: state.unrealReport ?? {
      blueprints: [],
      levels: [],
      cppFiles: [],
      projectConfig: {},
      assets: { folder_structure: [], material_setup: [], import_settings: {} },
      fidelityScore: { graphics: 0, gameplay: 0, performance: 0, audio: 0, monetization: 0, overall: 0 },
      monetization: { monetization_model: {}, pricing_strategy: {}, dlc_plan: [], platform_requirements: [], age_rating_notes: [], estimated_revenue: {} },
      supervisorNotes: [],
      summary: "Unreal Vibe swarm failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
