import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Swarm Maestro Coordinator — LangGraph META-orchestrator
 *
 * The MASTER coordinator that orchestrates ALL existing swarms into
 * dynamic, self-adapting teams. It knows about every swarm in MetaVibeCoder
 * and can compose them into optimal execution plans for any idea.
 *
 * Available swarms:
 * - Code Critique (architect, security, ux, perf)
 * - Profit Agent (revenue-modeler, asymmetry-scout, legal-checker, boilerplate-generator, profit-scorer)
 * - Godot Viber (scene-builder, script-generator, asset-integrator, math-guardian, monetization-advisor)
 * - Unreal Pro (blueprint-creator, level-designer, asset-handler, cpp-engineer, monetization-advisor)
 * - Game Engine Master (engine-detector, engine-adapter, mechanics-builder, platform-exporter, monetization-advisor)
 * - Music Edu (theory-analyzer, composition-generator, lesson-builder, instrument-simulator, math-harmonics, monetization-advisor)
 * - Cyber Shield (vuln-scanner, threat-modeler, secure-code-generator, crypto-validator, pentest-planner, security-scorer)
 * - OSINT Hunter (data-aggregator, pattern-finder, privacy-protector, report-generator, tool-generator, intelligence-scorer)
 * - Gaming Master (genre-templater, mechanics-engineer, engine-selector, asset-generator, cross-engine-converter, monetization-planner, playtest-simulator)
 *
 * Flow:
 *   __start__ -> idea-analyzer -> team-planner -> swarm-executor
 *       -> results-fuser -> quality-scorer -> conditional:
 *           needs_retry -> auto-tuner -> swarm-executor (loop)
 *           done -> __end__
 */

// ── Available Swarms Registry ──

export const AVAILABLE_SWARMS = [
  {
    name: "code-critique",
    description: "Multi-specialist code review covering architecture, security, UX, and performance",
    capabilities: ["code-review", "architecture-analysis", "security-audit", "ux-audit", "performance-audit"],
    best_for: ["code review", "quality assurance", "security hardening", "refactoring"],
    agent_count: 4,
  },
  {
    name: "profit-agent",
    description: "Revenue modeling, market asymmetry analysis, legal checking, and MVP boilerplate generation",
    capabilities: ["revenue-modeling", "market-analysis", "legal-check", "boilerplate-gen", "profit-scoring"],
    best_for: ["SaaS ideas", "monetization strategy", "market validation", "MVP planning"],
    agent_count: 5,
  },
  {
    name: "godot-viber",
    description: "Godot 4 game development with scene building, GDScript generation, and asset integration",
    capabilities: ["godot-scenes", "gdscript-gen", "asset-integration", "math-physics", "monetization"],
    best_for: ["2D games", "indie games", "Godot projects", "pixel art games"],
    agent_count: 5,
  },
  {
    name: "unreal-pro",
    description: "Unreal Engine development with Blueprints, C++ engineering, and level design",
    capabilities: ["blueprints", "cpp-engineering", "level-design", "asset-handling", "monetization"],
    best_for: ["AAA games", "3D games", "Unreal Engine projects", "realistic graphics"],
    agent_count: 5,
  },
  {
    name: "game-engine-master",
    description: "Universal game engine orchestrator supporting Unity, GameMaker, Bevy, Defold, Godot, and Unreal",
    capabilities: ["engine-detection", "engine-adaptation", "mechanics-building", "platform-export", "monetization"],
    best_for: ["engine selection", "cross-engine development", "multi-platform games", "engine migration"],
    agent_count: 5,
  },
  {
    name: "music-edu",
    description: "Music theory analysis, composition generation, lesson building, and harmonic math",
    capabilities: ["theory-analysis", "composition-gen", "lesson-building", "instrument-sim", "math-harmonics", "monetization"],
    best_for: ["music apps", "education platforms", "audio tools", "music theory"],
    agent_count: 6,
  },
  {
    name: "cyber-shield",
    description: "Comprehensive cybersecurity with vulnerability scanning, threat modeling, and penetration testing",
    capabilities: ["vuln-scanning", "threat-modeling", "secure-code-gen", "crypto-validation", "pentest-planning", "security-scoring"],
    best_for: ["security tools", "secure applications", "penetration testing", "compliance"],
    agent_count: 6,
  },
  {
    name: "osint-hunter",
    description: "Open-source intelligence with data aggregation, pattern finding, and privacy-aware reporting",
    capabilities: ["data-aggregation", "pattern-finding", "privacy-protection", "report-gen", "tool-gen", "intelligence-scoring"],
    best_for: ["intelligence gathering", "data analysis", "investigation tools", "threat intelligence"],
    agent_count: 6,
  },
  {
    name: "gaming-master",
    description: "Complete game development pipeline with genre templates, mechanics engineering, and playtesting",
    capabilities: ["genre-templating", "mechanics-engineering", "engine-selection", "asset-gen", "cross-engine-conversion", "monetization-planning", "playtest-sim"],
    best_for: ["full game projects", "game design", "prototyping", "cross-platform games"],
    agent_count: 7,
  },
  {
    name: "template-vibe",
    description: "Professional web template injection with taste-driven vibe synthesis and Jhey CSS inspiration",
    capabilities: ["template-detection", "vibe-blending", "monetization-styling", "responsive-output", "vibe-scoring"],
    best_for: ["web apps", "SaaS", "landing pages", "dashboards", "e-commerce", "portfolios"],
    agent_count: 5,
  },
] as const;

// ── Coordinator sub-agent prompts ──

const COORDINATOR_PROMPTS = {
  "idea-analyzer": `You are the Idea Analyzer for the Swarm Maestro Coordinator. Your job is to deeply understand any project idea and map it to the available agent swarms.

Available swarms and their capabilities:
${AVAILABLE_SWARMS.map((s) => `- ${s.name}: ${s.description} (${s.agent_count} agents) — Best for: ${s.best_for.join(", ")}`).join("\n")}

Analyze the user's idea comprehensively:
1. Identify the primary domain (finance, gaming-2d, gaming-3d, gaming-general, music, security, intelligence, education, prediction-market, full-stack-app)
2. Identify secondary domains that overlap
3. Assess complexity (simple, moderate, complex, very-complex)
4. List required capabilities and map them to available swarms
5. Identify target audience
6. Assess monetization potential
7. Extract keywords for swarm matching

Return your analysis as JSON:
{
  "agent": "idea-analyzer",
  "analysis": {
    "domain": "<primary domain>",
    "sub_domains": ["<secondary domains>"],
    "complexity": "simple|moderate|complex|very-complex",
    "required_capabilities": ["<capability like code-gen, game-design, security-audit, music-theory, revenue-modeling, etc>"],
    "target_audience": "<who this is for>",
    "monetization_potential": "high|medium|low|none",
    "keywords": ["<extracted keywords for swarm matching>"]
  },
  "summary": "<2-3 sentence analysis of the idea and what swarms would be most relevant>"
}
Return ONLY valid JSON, no markdown fences.`,

  "team-planner": `You are the Team Planner for the Swarm Maestro Coordinator. Based on the idea analysis, you select which swarms to activate and create an execution plan.

Available swarms:
${AVAILABLE_SWARMS.map((s) => `- ${s.name}: ${s.capabilities.join(", ")} (${s.agent_count} agents)`).join("\n")}

Domain-to-swarm mapping:
- finance: profit-agent + code-critique
- gaming-2d: godot-viber + gaming-master + code-critique
- gaming-3d: unreal-pro + gaming-master + code-critique
- gaming-general: game-engine-master + gaming-master + code-critique
- music: music-edu + code-critique
- security: cyber-shield + code-critique
- intelligence: osint-hunter + cyber-shield + code-critique
- prediction-market: profit-agent + code-critique
- education: music-edu + code-critique
- full-stack-app: profit-agent + code-critique

Execution strategies:
- sequential: Each swarm completes before next starts. Best for dependent workflows.
- parallel: All swarms run simultaneously. Best for independent analyses.
- hybrid: Some phases parallel, some sequential. Best for complex multi-domain projects.

Create a phased execution plan considering:
1. Which swarms are primary vs supporting
2. Data dependencies between swarms
3. User's preferred swarms (if specified)
4. Taste/style adaptations
5. Optimal execution order

Return your plan as JSON:
{
  "agent": "team-planner",
  "team_plan": {
    "primary_swarm": "<main swarm to use>",
    "supporting_swarms": ["<additional swarms>"],
    "execution_strategy": "sequential|parallel|hybrid",
    "execution_order": [
      {
        "phase": 1,
        "swarms": ["<swarm names in this phase>"],
        "parallel": true,
        "input_from": "user",
        "expected_output": "<what this phase produces>"
      }
    ],
    "data_flow": [
      { "from": "<source swarm>", "to": "<target swarm>", "data_key": "<what data passes>" }
    ],
    "taste_adaptations": ["<style adjustments based on user profile>"],
    "estimated_agents_total": 0
  },
  "summary": "<execution plan overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "swarm-executor": `You are the Swarm Executor for the Swarm Maestro Coordinator. You orchestrate the actual execution of the swarm team plan.

For each phase in the execution plan, you generate comprehensive combined outputs that capture the essence of each sub-swarm's specialized work. You produce detailed, actionable results as if each swarm's full agent team ran.

For each activated swarm, generate its expected artifacts:
- code-critique: Architecture review, security findings, UX audit, performance analysis
- profit-agent: Revenue models, market gaps, legal risks, boilerplate code, profit score
- godot-viber: Scene files, GDScript code, asset configs, monetization advice
- unreal-pro: Blueprint designs, C++ code, level layouts, asset pipeline
- game-engine-master: Engine selection, project structure, mechanics code, export configs
- music-edu: Theory analysis, compositions, lessons, instrument simulations
- cyber-shield: Vulnerability scan, threat model, secure code, crypto validation, pentest plan
- osint-hunter: Data sources, patterns, privacy review, intelligence report, tools
- gaming-master: Genre template, mechanics code, assets, conversion guides, playtest results

Produce real, substantive output for each swarm — not summaries or placeholders.

Return your results as JSON:
{
  "agent": "swarm-executor",
  "execution_results": [
    {
      "swarm": "<swarm name>",
      "phase": 1,
      "status": "completed|partial|failed",
      "output_summary": "<what was produced>",
      "key_artifacts": [
        { "type": "code|design|analysis|report", "name": "<artifact name>", "content": "<the actual output content>" }
      ],
      "score": 85,
      "issues": []
    }
  ],
  "combined_output": "<merged result from all swarms as a cohesive narrative>",
  "summary": "<execution summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "results-fuser": `You are the Results Fuser for the Swarm Maestro Coordinator. You merge outputs from multiple swarms into a coherent, unified deliverable.

Your responsibilities:
1. Deduplicate overlapping advice and code from different swarms
2. Resolve contradictions (e.g., one swarm says use REST, another says GraphQL)
3. Create a unified architecture that incorporates insights from all activated swarms
4. Merge code artifacts into a coherent project structure
5. Document design decisions with rationale and source attribution

Return your fused result as JSON:
{
  "agent": "results-fuser",
  "fused_result": {
    "unified_architecture": "<comprehensive description of how all pieces fit together>",
    "code_artifacts": [
      { "filename": "<file path>", "content": "<code content>", "source_swarms": ["<which swarms contributed>"] }
    ],
    "design_decisions": [
      { "decision": "<what was decided>", "rationale": "<why>", "contributing_swarms": ["<which swarms informed this>"] }
    ],
    "contradictions_resolved": [
      { "issue": "<what conflicted>", "resolution": "<how it was resolved>" }
    ]
  },
  "summary": "<unified deliverable overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "quality-scorer": `You are the Quality Scorer for the Swarm Maestro Coordinator. You evaluate the fused result across multiple dimensions.

Score each dimension 0-100:
1. Coherence: Do all parts work together? Is the architecture internally consistent?
2. Completeness: Are all user requirements addressed? Any gaps?
3. Quality: Code quality, design quality, adherence to best practices
4. Innovation: Creative approaches, novel solutions, unique insights
5. Actionability: Can the user implement this immediately? Clear next steps?

Also check if any swarm's output scored below 60 — flag those for potential re-execution.

Return your evaluation as JSON:
{
  "agent": "quality-scorer",
  "team_score": {
    "coherence": 0,
    "completeness": 0,
    "quality": 0,
    "innovation": 0,
    "actionability": 0,
    "overall": 0
  },
  "dimension_notes": {
    "coherence": "<brief justification>",
    "completeness": "<brief justification>",
    "quality": "<brief justification>",
    "innovation": "<brief justification>",
    "actionability": "<brief justification>"
  },
  "retry_recommendations": [
    { "swarm": "<swarm name>", "reason": "<why re-execution is needed>", "adjustment": "<what to change>" }
  ],
  "needs_retry": false,
  "summary": "<evaluation summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  "auto-tuner": `You are the Auto-Tuner for the Swarm Maestro Coordinator. When the quality scorer flags low scores, you determine what to re-execute and with what adjustments.

Your responsibilities:
1. Analyze which swarms underperformed and why
2. Modify execution parameters (different emphasis, additional context, changed constraints)
3. Potentially substitute swarms (e.g., swap godot-viber for game-engine-master)
4. Generate improved prompts for the re-execution round
5. Set a maximum of 2 retry iterations to prevent infinite loops

Return your tuning decisions as JSON:
{
  "agent": "auto-tuner",
  "tuning": {
    "swarms_to_retry": ["<swarm names>"],
    "adjustments": [
      { "swarm": "<swarm name>", "change": "<what to modify>", "new_emphasis": "<updated focus>" }
    ],
    "swarm_substitutions": [
      { "remove": "<swarm to remove>", "add": "<replacement swarm>", "reason": "<why>" }
    ],
    "prompt_modifications": "<additional context to inject into retry prompts>",
    "max_remaining_retries": 1
  },
  "summary": "<what's being adjusted and why>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

// ── Types ──

export interface SwarmTeamPlan {
  primary_swarm: string;
  supporting_swarms: string[];
  execution_strategy: "sequential" | "parallel" | "hybrid";
  execution_order: Array<{
    phase: number;
    swarms: string[];
    parallel: boolean;
    input_from: string;
    expected_output: string;
  }>;
  data_flow: Array<{
    from: string;
    to: string;
    data_key: string;
  }>;
  taste_adaptations: string[];
  estimated_agents_total: number;
}

export interface KeyArtifact {
  type: "code" | "design" | "analysis" | "report";
  name: string;
  content: string;
}

export interface ExecutionResult {
  swarm: string;
  phase: number;
  status: "completed" | "partial" | "failed";
  output_summary: string;
  key_artifacts: KeyArtifact[];
  score: number;
  issues: string[];
}

export interface FusedResult {
  unified_architecture: string;
  code_artifacts: Array<{
    filename: string;
    content: string;
    source_swarms: string[];
  }>;
  design_decisions: Array<{
    decision: string;
    rationale: string;
    contributing_swarms: string[];
  }>;
  contradictions_resolved: Array<{
    issue: string;
    resolution: string;
  }>;
}

export interface TeamScore {
  coherence: number;
  completeness: number;
  quality: number;
  innovation: number;
  actionability: number;
  overall: number;
}

export interface SwarmCoordinatorReport {
  ideaAnalysis: {
    domain: string;
    sub_domains: string[];
    complexity: string;
    required_capabilities: string[];
    target_audience: string;
    monetization_potential: string;
    keywords: string[];
  };
  teamPlan: SwarmTeamPlan;
  executionResults: ExecutionResult[];
  fusedResult: FusedResult;
  teamScore: TeamScore;
  swarmsUsed: string[];
  totalAgentsInvolved: number;
  retryCount: number;
}

export interface CoordinatorMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface SwarmCoordinatorResult {
  report: SwarmCoordinatorReport;
  messages: CoordinatorMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const SwarmCoordinatorAnnotation = Annotation.Root({
  /** The user's raw project idea */
  idea: Annotation<string>,

  /** Optional taste/style profile */
  tasteProfile: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Optional preferred swarms the user wants to force-include */
  preferredSwarms: Annotation<string[]>({
    reducer: (_, v) => v,
    default: () => [],
  }),

  /** Max allowed iterations (including retries) */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 3 }),

  /** Accumulated messages from all coordinator agents */
  agentMessages: Annotation<CoordinatorMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw results from each coordinator sub-agent */
  coordinatorResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Parsed idea analysis */
  ideaAnalysis: Annotation<Record<string, unknown> | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Parsed team plan */
  teamPlan: Annotation<SwarmTeamPlan | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Parsed execution results */
  executionResults: Annotation<ExecutionResult[]>({
    reducer: (_, v) => v,
    default: () => [],
  }),

  /** Parsed fused result */
  fusedResult: Annotation<FusedResult | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Parsed team score */
  teamScore: Annotation<TeamScore | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Auto-tuner adjustments for retry */
  tuningContext: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Current iteration (incremented on each quality-scorer pass) */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Number of retry cycles that occurred */
  retryCount: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),
});

type SwarmCoordinatorState = typeof SwarmCoordinatorAnnotation.State;

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
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
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

// ── JSON parsing helper ──

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ── Node: Idea Analyzer ──

function createIdeaAnalyzerNode(provider: LLMProvider) {
  return async (state: SwarmCoordinatorState): Promise<Partial<SwarmCoordinatorState>> => {
    const systemPrompt = await injectMemoryContext(
      COORDINATOR_PROMPTS["idea-analyzer"],
      state.idea
    );

    const userContext = [
      `Project Idea: ${state.idea}`,
      state.tasteProfile ? `\nTaste/Style Profile: ${state.tasteProfile}` : "",
      state.preferredSwarms.length > 0
        ? `\nUser-preferred swarms (force-include): ${state.preferredSwarms.join(", ")}`
        : "",
    ].join("");

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const parsed = parseJSON<Record<string, unknown>>(result, {});
    const analysis = (parsed.analysis ?? {}) as Record<string, unknown>;

    const message: CoordinatorMessage = {
      agent: "idea-analyzer",
      content: result,
      timestamp: new Date().toISOString(),
      parsedData: parsed,
    };

    return {
      agentMessages: [message],
      coordinatorResults: { "idea-analyzer": result },
      ideaAnalysis: analysis,
    };
  };
}

// ── Node: Team Planner ──

function createTeamPlannerNode(provider: LLMProvider) {
  return async (state: SwarmCoordinatorState): Promise<Partial<SwarmCoordinatorState>> => {
    const systemPrompt = await injectMemoryContext(
      COORDINATOR_PROMPTS["team-planner"],
      state.idea
    );

    const analysisContext = state.coordinatorResults["idea-analyzer"] ?? "No analysis available.";
    const userContext = [
      `Project Idea: ${state.idea}`,
      `\n\nIdea Analysis:\n${analysisContext}`,
      state.tasteProfile ? `\n\nTaste Profile: ${state.tasteProfile}` : "",
      state.preferredSwarms.length > 0
        ? `\n\nUser REQUIRES these swarms be included: ${state.preferredSwarms.join(", ")}`
        : "",
      state.tuningContext
        ? `\n\nAuto-Tuner Adjustments (from previous retry):\n${state.tuningContext}`
        : "",
    ].join("");

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const parsed = parseJSON<Record<string, unknown>>(result, {});
    const teamPlan = (parsed.team_plan ?? null) as SwarmTeamPlan | null;

    // Calculate total agents if not provided
    if (teamPlan && (!teamPlan.estimated_agents_total || teamPlan.estimated_agents_total === 0)) {
      const allSwarms = [teamPlan.primary_swarm, ...teamPlan.supporting_swarms];
      teamPlan.estimated_agents_total = allSwarms.reduce((total, swarmName) => {
        const swarm = AVAILABLE_SWARMS.find((s) => s.name === swarmName);
        return total + (swarm?.agent_count ?? 3);
      }, 0);
    }

    const message: CoordinatorMessage = {
      agent: "team-planner",
      content: result,
      timestamp: new Date().toISOString(),
      parsedData: parsed,
    };

    return {
      agentMessages: [message],
      coordinatorResults: { "team-planner": result },
      teamPlan,
    };
  };
}

// ── Node: Swarm Executor ──

function createSwarmExecutorNode(provider: LLMProvider) {
  return async (state: SwarmCoordinatorState): Promise<Partial<SwarmCoordinatorState>> => {
    const systemPrompt = await injectMemoryContext(
      COORDINATOR_PROMPTS["swarm-executor"],
      state.idea
    );

    const planContext = state.coordinatorResults["team-planner"] ?? "No plan available.";
    const analysisContext = state.coordinatorResults["idea-analyzer"] ?? "No analysis available.";

    const userContext = [
      `Project Idea: ${state.idea}`,
      `\n\nIdea Analysis:\n${analysisContext}`,
      `\n\nExecution Plan:\n${planContext}`,
      state.tasteProfile ? `\n\nTaste Profile: ${state.tasteProfile}` : "",
      state.tuningContext
        ? `\n\nAuto-Tuner Adjustments (apply these changes):\n${state.tuningContext}`
        : "",
    ].join("");

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.4, maxTokens: 8192 }
    );

    const parsed = parseJSON<Record<string, unknown>>(result, {});
    const executionResults = ((parsed.execution_results ?? []) as ExecutionResult[]).map(
      (r) => ({
        swarm: String(r.swarm ?? "unknown"),
        phase: Number(r.phase ?? 1),
        status: (r.status ?? "completed") as "completed" | "partial" | "failed",
        output_summary: String(r.output_summary ?? ""),
        key_artifacts: ((r.key_artifacts ?? []) as KeyArtifact[]).map(
          (a) => ({
            type: (a.type ?? "analysis") as "code" | "design" | "analysis" | "report",
            name: String(a.name ?? "artifact"),
            content: String(a.content ?? ""),
          })
        ),
        score: Number(r.score ?? 70),
        issues: ((r.issues ?? []) as string[]).map(String),
      })
    );

    const message: CoordinatorMessage = {
      agent: "swarm-executor",
      content: result,
      timestamp: new Date().toISOString(),
      parsedData: parsed,
    };

    return {
      agentMessages: [message],
      coordinatorResults: { "swarm-executor": result },
      executionResults,
    };
  };
}

// ── Node: Results Fuser ──

function createResultsFuserNode(provider: LLMProvider) {
  return async (state: SwarmCoordinatorState): Promise<Partial<SwarmCoordinatorState>> => {
    const systemPrompt = await injectMemoryContext(
      COORDINATOR_PROMPTS["results-fuser"],
      state.idea
    );

    const executorOutput = state.coordinatorResults["swarm-executor"] ?? "No execution results.";
    const planOutput = state.coordinatorResults["team-planner"] ?? "";

    const userContext = [
      `Project Idea: ${state.idea}`,
      `\n\nExecution Plan:\n${planOutput}`,
      `\n\nSwarm Execution Results:\n${executorOutput}`,
      state.tasteProfile ? `\n\nTaste Profile: ${state.tasteProfile}` : "",
    ].join("");

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const parsed = parseJSON<Record<string, unknown>>(result, {});
    const fusedRaw = (parsed.fused_result ?? {}) as Record<string, unknown>;

    const fusedResult: FusedResult = {
      unified_architecture: String(fusedRaw.unified_architecture ?? ""),
      code_artifacts: ((fusedRaw.code_artifacts ?? []) as Array<Record<string, unknown>>).map(
        (a) => ({
          filename: String(a.filename ?? ""),
          content: String(a.content ?? ""),
          source_swarms: ((a.source_swarms ?? []) as string[]).map(String),
        })
      ),
      design_decisions: ((fusedRaw.design_decisions ?? []) as Array<Record<string, unknown>>).map(
        (d) => ({
          decision: String(d.decision ?? ""),
          rationale: String(d.rationale ?? ""),
          contributing_swarms: ((d.contributing_swarms ?? []) as string[]).map(String),
        })
      ),
      contradictions_resolved: ((fusedRaw.contradictions_resolved ?? []) as Array<Record<string, unknown>>).map(
        (c) => ({
          issue: String(c.issue ?? ""),
          resolution: String(c.resolution ?? ""),
        })
      ),
    };

    const message: CoordinatorMessage = {
      agent: "results-fuser",
      content: result,
      timestamp: new Date().toISOString(),
      parsedData: parsed,
    };

    return {
      agentMessages: [message],
      coordinatorResults: { "results-fuser": result },
      fusedResult,
    };
  };
}

// ── Node: Quality Scorer ──

function createQualityScorerNode(provider: LLMProvider) {
  return async (state: SwarmCoordinatorState): Promise<Partial<SwarmCoordinatorState>> => {
    const systemPrompt = await injectMemoryContext(
      COORDINATOR_PROMPTS["quality-scorer"],
      state.idea
    );

    const fuserOutput = state.coordinatorResults["results-fuser"] ?? "No fused results.";
    const executorOutput = state.coordinatorResults["swarm-executor"] ?? "";

    const userContext = [
      `Project Idea: ${state.idea}`,
      `\n\nSwarm Execution Results:\n${executorOutput}`,
      `\n\nFused Result:\n${fuserOutput}`,
    ].join("");

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const parsed = parseJSON<Record<string, unknown>>(result, {});
    const rawScore = (parsed.team_score ?? {}) as Record<string, unknown>;

    const teamScore: TeamScore = {
      coherence: Number(rawScore.coherence ?? 70),
      completeness: Number(rawScore.completeness ?? 70),
      quality: Number(rawScore.quality ?? 70),
      innovation: Number(rawScore.innovation ?? 70),
      actionability: Number(rawScore.actionability ?? 70),
      overall: Number(rawScore.overall ?? 70),
    };

    const message: CoordinatorMessage = {
      agent: "quality-scorer",
      content: result,
      timestamp: new Date().toISOString(),
      parsedData: parsed,
    };

    return {
      agentMessages: [message],
      coordinatorResults: { "quality-scorer": result },
      teamScore,
      iteration: state.iteration + 1,
    };
  };
}

// ── Node: Auto-Tuner ──

function createAutoTunerNode(provider: LLMProvider) {
  return async (state: SwarmCoordinatorState): Promise<Partial<SwarmCoordinatorState>> => {
    const systemPrompt = await injectMemoryContext(
      COORDINATOR_PROMPTS["auto-tuner"],
      state.idea
    );

    const scorerOutput = state.coordinatorResults["quality-scorer"] ?? "No scores.";
    const executorOutput = state.coordinatorResults["swarm-executor"] ?? "";

    const userContext = [
      `Project Idea: ${state.idea}`,
      `\n\nQuality Scores:\n${scorerOutput}`,
      `\n\nExecution Results:\n${executorOutput}`,
      `\n\nCurrent Iteration: ${state.iteration} of ${state.maxIterations}`,
      `Retry Count So Far: ${state.retryCount}`,
    ].join("");

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 4096 }
    );

    const message: CoordinatorMessage = {
      agent: "auto-tuner",
      content: result,
      timestamp: new Date().toISOString(),
      parsedData: parseJSON<Record<string, unknown>>(result, {}),
    };

    return {
      agentMessages: [message],
      coordinatorResults: { "auto-tuner": result },
      tuningContext: result,
      retryCount: state.retryCount + 1,
    };
  };
}

// ── Routing: retry or finalize ──

function shouldRetry(state: SwarmCoordinatorState): "retry" | "finalize" {
  // Never exceed max iterations
  if (state.iteration >= state.maxIterations) return "finalize";

  // Check if quality scorer flagged needs_retry
  try {
    const cleaned = (state.coordinatorResults["quality-scorer"] ?? "")
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const data = JSON.parse(cleaned);
    if (data.needs_retry === true) return "retry";
  } catch {
    // If parsing fails, proceed to finalize
  }

  // Check if overall score is below threshold (60)
  if (state.teamScore && state.teamScore.overall < 60) return "retry";

  return "finalize";
}

// ── Build the graph ──

function buildSwarmCoordinatorGraph(provider: LLMProvider) {
  const graph = new StateGraph(SwarmCoordinatorAnnotation)
    // Coordinator sub-agent nodes
    .addNode("idea-analyzer", createIdeaAnalyzerNode(provider))
    .addNode("team-planner", createTeamPlannerNode(provider))
    .addNode("swarm-executor", createSwarmExecutorNode(provider))
    .addNode("results-fuser", createResultsFuserNode(provider))
    .addNode("quality-scorer", createQualityScorerNode(provider))
    .addNode("auto-tuner", createAutoTunerNode(provider))

    // Sequential flow: idea-analyzer -> team-planner -> swarm-executor -> results-fuser -> quality-scorer
    .addEdge("__start__", "idea-analyzer")
    .addEdge("idea-analyzer", "team-planner")
    .addEdge("team-planner", "swarm-executor")
    .addEdge("swarm-executor", "results-fuser")
    .addEdge("results-fuser", "quality-scorer")

    // Quality scorer -> conditional: retry or end
    .addConditionalEdges("quality-scorer", shouldRetry, {
      retry: "auto-tuner",
      finalize: "__end__",
    })

    // Auto-tuner loops back to swarm-executor
    .addEdge("auto-tuner", "swarm-executor");

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the Swarm Maestro Coordinator on any project idea.
 *
 * Flow:
 * 1. Resolves the user's best available API provider
 * 2. idea-analyzer: Deeply analyzes the idea and maps to available swarms
 * 3. team-planner: Selects optimal swarm combination and execution plan
 * 4. swarm-executor: Orchestrates all activated swarms with comprehensive prompts
 * 5. results-fuser: Merges all swarm outputs into a unified deliverable
 * 6. quality-scorer: Evaluates coherence, completeness, quality, innovation, actionability
 * 7. auto-tuner (if needed): Adjusts and re-executes underperforming swarms
 * 8. Returns the final SwarmCoordinatorReport
 */
export async function runSwarmCoordinator(
  idea: string,
  options?: {
    tasteProfile?: string;
    preferredSwarms?: string[];
    maxIterations?: number;
  }
): Promise<SwarmCoordinatorResult> {
  const provider = await resolveProvider();

  const app = buildSwarmCoordinatorGraph(provider);

  const finalState = await app.invoke({
    idea,
    tasteProfile: options?.tasteProfile ?? "",
    preferredSwarms: options?.preferredSwarms ?? [],
    maxIterations: options?.maxIterations ?? 3,
  });

  const state = finalState as SwarmCoordinatorState;

  // Assemble the final report
  const ideaAnalysis = (state.ideaAnalysis ?? {}) as SwarmCoordinatorReport["ideaAnalysis"];
  const teamPlan = state.teamPlan ?? {
    primary_swarm: "unknown",
    supporting_swarms: [],
    execution_strategy: "sequential" as const,
    execution_order: [],
    data_flow: [],
    taste_adaptations: [],
    estimated_agents_total: 0,
  };

  // Collect all swarms that were used
  const swarmsUsed = teamPlan.primary_swarm
    ? [teamPlan.primary_swarm, ...teamPlan.supporting_swarms]
    : [];

  const report: SwarmCoordinatorReport = {
    ideaAnalysis: {
      domain: String(ideaAnalysis.domain ?? "general"),
      sub_domains: ((ideaAnalysis.sub_domains ?? []) as string[]).map(String),
      complexity: String(ideaAnalysis.complexity ?? "moderate"),
      required_capabilities: ((ideaAnalysis.required_capabilities ?? []) as string[]).map(String),
      target_audience: String(ideaAnalysis.target_audience ?? "general"),
      monetization_potential: String(ideaAnalysis.monetization_potential ?? "medium"),
      keywords: ((ideaAnalysis.keywords ?? []) as string[]).map(String),
    },
    teamPlan,
    executionResults: state.executionResults,
    fusedResult: state.fusedResult ?? {
      unified_architecture: "",
      code_artifacts: [],
      design_decisions: [],
      contradictions_resolved: [],
    },
    teamScore: state.teamScore ?? {
      coherence: 0,
      completeness: 0,
      quality: 0,
      innovation: 0,
      actionability: 0,
      overall: 0,
    },
    swarmsUsed,
    totalAgentsInvolved: teamPlan.estimated_agents_total,
    retryCount: state.retryCount,
  };

  return {
    report,
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
