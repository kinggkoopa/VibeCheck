/**
 * Swarm Team Delegation & Adaptation Library
 *
 * Provides swarm descriptors, domain mapping, execution strategies,
 * taste profiles, and utility functions for the Swarm Maestro Coordinator.
 *
 * This is the knowledge layer — the coordinator graph uses these
 * constants and helpers to make orchestration decisions.
 */

// ── Types ──

export interface SwarmDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  bestFor: string[];
  agentCount: number;
  avgExecutionTime: string;
  dependencies: string[];
  outputs: string[];
}

export interface IdeaAnalysis {
  domain: string;
  subDomains: string[];
  complexity: "simple" | "moderate" | "complex" | "very-complex";
  requiredCapabilities: string[];
  matchedSwarms: string[];
  keywords: string[];
  confidenceScore: number;
}

export interface SwarmTeam {
  primarySwarm: string;
  supportingSwarms: string[];
  totalAgents: number;
  estimatedTime: string;
  rationale: string;
}

export interface ExecutionPhase {
  phase: number;
  swarms: string[];
  parallel: boolean;
  inputFrom: string;
  expectedOutput: string;
  estimatedTime: string;
}

export interface ExecutionPlan {
  strategy: "sequential" | "parallel" | "hybrid" | "adaptive";
  phases: ExecutionPhase[];
  dataFlow: Array<{ from: string; to: string; dataKey: string }>;
  totalEstimatedTime: string;
  totalAgents: number;
}

export interface TeamScore {
  coherence: number;
  completeness: number;
  quality: number;
  innovation: number;
  actionability: number;
  overall: number;
}

export interface RetryDecision {
  shouldRetry: boolean;
  swarmsToRetry: string[];
  reasons: string[];
  adjustments: Array<{ swarm: string; change: string }>;
  maxRetriesRemaining: number;
}

export interface FlowchartNode {
  id: string;
  label: string;
  type: "swarm" | "phase" | "decision" | "start" | "end";
  phase: number;
  color: string;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  phases: Array<{ phase: number; label: string; parallel: boolean }>;
}

export interface SwarmOutput {
  swarmId: string;
  status: "completed" | "partial" | "failed";
  score: number;
  artifacts: Array<{
    type: "code" | "design" | "analysis" | "report";
    name: string;
    content: string;
  }>;
  summary: string;
  issues: string[];
}

export interface MergedOutput {
  unifiedSummary: string;
  allArtifacts: Array<{
    type: string;
    name: string;
    content: string;
    sourceSwarm: string;
  }>;
  deduplicatedInsights: string[];
  conflicts: Array<{ issue: string; resolution: string }>;
  overallScore: number;
}

// ── Available Swarms ──

export const AVAILABLE_SWARMS: SwarmDescriptor[] = [
  {
    id: "code-critique",
    name: "Code Critique",
    description: "Multi-specialist code review covering architecture, security, UX, and performance",
    capabilities: [
      "architecture-analysis",
      "security-audit",
      "ux-audit",
      "performance-audit",
      "code-quality",
      "best-practices",
    ],
    bestFor: ["code review", "quality assurance", "security hardening", "refactoring", "tech debt"],
    agentCount: 4,
    avgExecutionTime: "30s",
    dependencies: [],
    outputs: ["critique-report", "findings", "score", "recommendations"],
  },
  {
    id: "profit-agent",
    name: "Profit Agent",
    description: "Revenue modeling, market asymmetry analysis, legal checking, and MVP boilerplate generation",
    capabilities: [
      "revenue-modeling",
      "market-analysis",
      "legal-compliance",
      "boilerplate-generation",
      "profit-scoring",
      "pricing-strategy",
    ],
    bestFor: ["SaaS ideas", "monetization", "market validation", "MVP planning", "business models"],
    agentCount: 5,
    avgExecutionTime: "45s",
    dependencies: [],
    outputs: ["revenue-models", "market-gaps", "legal-risks", "boilerplate-code", "profit-score"],
  },
  {
    id: "godot-viber",
    name: "Godot Viber",
    description: "Godot 4 game development with scene building, GDScript generation, and asset integration",
    capabilities: [
      "godot-scenes",
      "gdscript-generation",
      "asset-integration",
      "math-physics",
      "game-monetization",
      "2d-game-design",
    ],
    bestFor: ["2D games", "indie games", "Godot projects", "pixel art games", "mobile games"],
    agentCount: 5,
    avgExecutionTime: "40s",
    dependencies: [],
    outputs: ["scene-files", "gdscript-code", "asset-configs", "monetization-plan"],
  },
  {
    id: "unreal-pro",
    name: "Unreal Pro",
    description: "Unreal Engine development with Blueprints, C++ engineering, and level design",
    capabilities: [
      "blueprint-design",
      "cpp-engineering",
      "level-design",
      "asset-pipeline",
      "game-monetization",
      "3d-game-design",
    ],
    bestFor: ["AAA games", "3D games", "Unreal Engine", "realistic graphics", "VR/AR"],
    agentCount: 5,
    avgExecutionTime: "45s",
    dependencies: [],
    outputs: ["blueprints", "cpp-code", "level-layouts", "asset-pipeline-config"],
  },
  {
    id: "game-engine-master",
    name: "Game Engine Master",
    description: "Universal game engine orchestrator supporting Unity, GameMaker, Bevy, Defold, Godot, and Unreal",
    capabilities: [
      "engine-detection",
      "engine-adaptation",
      "mechanics-building",
      "platform-export",
      "game-monetization",
      "cross-engine",
    ],
    bestFor: ["engine selection", "cross-engine dev", "multi-platform", "engine migration", "prototyping"],
    agentCount: 5,
    avgExecutionTime: "50s",
    dependencies: [],
    outputs: ["engine-recommendation", "project-structure", "mechanics-code", "export-configs"],
  },
  {
    id: "music-edu",
    name: "Music Edu",
    description: "Music theory analysis, composition generation, lesson building, and harmonic math",
    capabilities: [
      "theory-analysis",
      "composition-generation",
      "lesson-building",
      "instrument-simulation",
      "math-harmonics",
      "music-monetization",
    ],
    bestFor: ["music apps", "education platforms", "audio tools", "music theory", "learning tools"],
    agentCount: 6,
    avgExecutionTime: "40s",
    dependencies: [],
    outputs: ["theory-analysis", "compositions", "lessons", "instrument-configs", "harmonic-data"],
  },
  {
    id: "cyber-shield",
    name: "Cyber Shield",
    description: "Comprehensive cybersecurity with vulnerability scanning, threat modeling, and penetration testing",
    capabilities: [
      "vulnerability-scanning",
      "threat-modeling",
      "secure-code-generation",
      "crypto-validation",
      "pentest-planning",
      "security-scoring",
    ],
    bestFor: ["security tools", "secure apps", "penetration testing", "compliance", "hardening"],
    agentCount: 6,
    avgExecutionTime: "50s",
    dependencies: [],
    outputs: ["vuln-report", "threat-model", "secure-code", "crypto-audit", "pentest-plan", "security-score"],
  },
  {
    id: "osint-hunter",
    name: "OSINT Hunter",
    description: "Open-source intelligence with data aggregation, pattern finding, and privacy-aware reporting",
    capabilities: [
      "data-aggregation",
      "pattern-finding",
      "privacy-protection",
      "report-generation",
      "tool-generation",
      "intelligence-scoring",
    ],
    bestFor: ["intelligence gathering", "data analysis", "investigation tools", "threat intel", "research"],
    agentCount: 6,
    avgExecutionTime: "45s",
    dependencies: [],
    outputs: ["data-sources", "patterns", "privacy-review", "intel-report", "osint-tools"],
  },
  {
    id: "gaming-master",
    name: "Gaming Master",
    description: "Complete game development pipeline with genre templates, mechanics engineering, and playtesting",
    capabilities: [
      "genre-templating",
      "mechanics-engineering",
      "engine-selection",
      "asset-generation",
      "cross-engine-conversion",
      "monetization-planning",
      "playtest-simulation",
    ],
    bestFor: ["full game projects", "game design", "prototyping", "cross-platform", "game jams"],
    agentCount: 7,
    avgExecutionTime: "55s",
    dependencies: [],
    outputs: ["genre-template", "mechanics-code", "assets", "conversion-guide", "playtest-results", "monetization-plan"],
  },
];

// ── Domain-to-Swarm Mapping ──

export const DOMAIN_SWARM_MAP: Record<string, string[]> = {
  finance: ["profit-agent", "code-critique"],
  "gaming-2d": ["godot-viber", "gaming-master", "code-critique"],
  "gaming-3d": ["unreal-pro", "gaming-master", "code-critique"],
  "gaming-general": ["game-engine-master", "gaming-master", "code-critique"],
  music: ["music-edu", "code-critique"],
  security: ["cyber-shield", "code-critique"],
  intelligence: ["osint-hunter", "cyber-shield", "code-critique"],
  "prediction-market": ["profit-agent", "code-critique"],
  education: ["music-edu", "code-critique"],
  "full-stack-app": ["profit-agent", "code-critique"],
};

// ── Execution Strategies ──

export const EXECUTION_STRATEGIES: Record<
  string,
  { description: string; pros: string[]; cons: string[]; bestWhen: string }
> = {
  sequential: {
    description:
      "Each swarm completes fully before the next one starts. Output of one swarm feeds directly into the next.",
    pros: [
      "Maximum context passing between swarms",
      "Each swarm can build on previous results",
      "Easier to debug and trace issues",
      "Lower peak API usage",
    ],
    cons: [
      "Slowest total execution time",
      "Bottleneck if one swarm is slow",
      "No parallelism benefits",
    ],
    bestWhen:
      "Swarms have strong data dependencies, or the idea is highly specialized and each swarm needs full context from previous ones.",
  },
  parallel: {
    description:
      "All swarms execute simultaneously. Results are merged after all complete.",
    pros: [
      "Fastest total execution time",
      "No blocking between swarms",
      "Good for independent analyses",
    ],
    cons: [
      "No cross-swarm context during execution",
      "Higher peak API usage",
      "Potential contradictions in outputs",
      "Results fusion is more complex",
    ],
    bestWhen:
      "Swarms are analyzing independent aspects of the idea (e.g., security + monetization + code quality).",
  },
  hybrid: {
    description:
      "Some phases run in parallel, others sequentially. Balances speed with context sharing.",
    pros: [
      "Good balance of speed and context",
      "Dependent swarms wait for prerequisites",
      "Independent swarms run in parallel",
      "Flexible for complex orchestrations",
    ],
    cons: [
      "More complex execution planning",
      "Phase transitions add overhead",
      "Some swarms may idle waiting",
    ],
    bestWhen:
      "Multi-domain projects where some swarms are independent but others need input from earlier phases.",
  },
  adaptive: {
    description:
      "Starts parallel, then dynamically routes based on intermediate results. Auto-tuner adjusts on the fly.",
    pros: [
      "Most intelligent execution path",
      "Self-correcting via auto-tuner",
      "Handles unexpected results gracefully",
      "Optimal resource utilization",
    ],
    cons: [
      "Most complex to implement",
      "Harder to predict execution time",
      "May trigger extra retries",
    ],
    bestWhen:
      "Complex or ambiguous ideas where the best swarm combination is not clear upfront.",
  },
};

// ── Taste Profiles ──

export const TASTE_PROFILES: Record<
  string,
  {
    style: string;
    preferences: string[];
    prioritize: string[];
    deprioritize: string[];
  }
> = {
  "lean-startup": {
    style: "Minimal, fast-to-ship, validation-focused",
    preferences: [
      "MVP-first approach",
      "Minimal UI with maximum functionality",
      "Quick iteration cycles",
      "Data-driven decisions",
      "Feature flags over feature completeness",
    ],
    prioritize: [
      "speed-to-market",
      "core-value-proposition",
      "analytics-hooks",
      "payment-integration",
      "user-feedback-loops",
    ],
    deprioritize: [
      "pixel-perfect-design",
      "comprehensive-documentation",
      "edge-case-handling",
      "full-test-coverage",
    ],
  },
  enterprise: {
    style: "Robust, scalable, compliance-ready",
    preferences: [
      "Comprehensive error handling",
      "Full audit logging",
      "Role-based access control",
      "Horizontal scalability",
      "API versioning",
    ],
    prioritize: [
      "security",
      "compliance",
      "scalability",
      "monitoring",
      "documentation",
      "test-coverage",
    ],
    deprioritize: [
      "rapid-prototyping",
      "experimental-features",
      "cutting-edge-tech",
    ],
  },
  "indie-hacker": {
    style: "Scrappy, profitable, solo-dev optimized",
    preferences: [
      "Single-file deployments where possible",
      "Serverless/edge-first",
      "Stripe integration from day one",
      "SEO-optimized landing pages",
      "Low-maintenance architecture",
    ],
    prioritize: [
      "monetization",
      "distribution",
      "low-ops-overhead",
      "seo",
      "conversion-optimization",
    ],
    deprioritize: [
      "team-scaling",
      "enterprise-features",
      "complex-architectures",
    ],
  },
  creative: {
    style: "Expressive, experimental, design-forward",
    preferences: [
      "Unique visual design",
      "Smooth animations and transitions",
      "Creative interactions",
      "Bold color schemes",
      "Storytelling through UI",
    ],
    prioritize: [
      "design-quality",
      "user-delight",
      "animations",
      "visual-identity",
      "creative-features",
    ],
    deprioritize: [
      "performance-micro-optimization",
      "strict-conventions",
      "enterprise-patterns",
    ],
  },
  "security-first": {
    style: "Hardened, audited, zero-trust",
    preferences: [
      "Defense in depth",
      "Input validation everywhere",
      "Encrypted at rest and in transit",
      "Principle of least privilege",
      "Security headers and CSP",
    ],
    prioritize: [
      "security-audit",
      "penetration-testing",
      "crypto-validation",
      "threat-modeling",
      "compliance",
    ],
    deprioritize: [
      "rapid-shipping",
      "experimental-features",
      "third-party-dependencies",
    ],
  },
};

// ── Swarm color mapping for UI ──

const SWARM_COLORS: Record<string, string> = {
  "code-critique": "#6366f1",
  "profit-agent": "#22c55e",
  "godot-viber": "#3b82f6",
  "unreal-pro": "#ef4444",
  "game-engine-master": "#f59e0b",
  "music-edu": "#a855f7",
  "cyber-shield": "#06b6d4",
  "osint-hunter": "#64748b",
  "gaming-master": "#ec4899",
};

// ── Keyword-to-domain mapping ──

const KEYWORD_DOMAIN_MAP: Record<string, string[]> = {
  // Finance/Business
  saas: ["finance", "full-stack-app"],
  revenue: ["finance"],
  subscription: ["finance"],
  payment: ["finance"],
  stripe: ["finance"],
  monetization: ["finance"],
  pricing: ["finance"],
  marketplace: ["finance", "full-stack-app"],
  fintech: ["finance"],
  trading: ["finance", "prediction-market"],
  prediction: ["prediction-market"],
  betting: ["prediction-market"],
  kalshi: ["prediction-market"],
  polymarket: ["prediction-market"],
  arbitrage: ["finance"],

  // Gaming
  game: ["gaming-general"],
  "2d": ["gaming-2d"],
  "3d": ["gaming-3d"],
  pixel: ["gaming-2d"],
  sprite: ["gaming-2d"],
  godot: ["gaming-2d"],
  unreal: ["gaming-3d"],
  unity: ["gaming-general"],
  gamemaker: ["gaming-2d"],
  bevy: ["gaming-general"],
  platformer: ["gaming-2d"],
  rpg: ["gaming-general"],
  fps: ["gaming-3d"],
  mmorpg: ["gaming-3d"],
  mobile: ["gaming-general"],
  arcade: ["gaming-2d"],
  puzzle: ["gaming-2d"],
  simulation: ["gaming-general"],
  racing: ["gaming-3d"],
  vr: ["gaming-3d"],
  ar: ["gaming-3d"],

  // Music
  music: ["music"],
  audio: ["music"],
  song: ["music"],
  melody: ["music"],
  harmony: ["music"],
  chord: ["music"],
  piano: ["music"],
  guitar: ["music"],
  synthesizer: ["music"],
  composition: ["music"],
  "music-theory": ["music"],
  beat: ["music"],
  rhythm: ["music"],

  // Security
  security: ["security"],
  vulnerability: ["security"],
  pentest: ["security"],
  penetration: ["security"],
  firewall: ["security"],
  encryption: ["security"],
  authentication: ["security"],
  oauth: ["security"],
  cyber: ["security"],
  malware: ["security"],
  phishing: ["security"],

  // Intelligence
  osint: ["intelligence"],
  intelligence: ["intelligence"],
  investigation: ["intelligence"],
  surveillance: ["intelligence"],
  reconnaissance: ["intelligence"],
  scraping: ["intelligence"],
  monitoring: ["intelligence"],

  // Education
  education: ["education"],
  learning: ["education"],
  tutorial: ["education"],
  course: ["education"],
  lesson: ["education"],
  teaching: ["education"],

  // Full-stack
  app: ["full-stack-app"],
  website: ["full-stack-app"],
  dashboard: ["full-stack-app"],
  api: ["full-stack-app"],
  platform: ["full-stack-app"],
  tool: ["full-stack-app"],
  webapp: ["full-stack-app"],
  nextjs: ["full-stack-app"],
  react: ["full-stack-app"],
};

// ── Utility Functions ──

/**
 * Analyze an idea string to determine domain and complexity.
 * Uses keyword matching against the domain map.
 */
export function analyzeIdea(idea: string): IdeaAnalysis {
  const lowerIdea = idea.toLowerCase();
  const words = lowerIdea.split(/\s+/);

  // Count domain hits
  const domainScores: Record<string, number> = {};
  const matchedKeywords: string[] = [];

  for (const word of words) {
    // Clean punctuation
    const cleanWord = word.replace(/[^a-z0-9-]/g, "");
    if (KEYWORD_DOMAIN_MAP[cleanWord]) {
      matchedKeywords.push(cleanWord);
      for (const domain of KEYWORD_DOMAIN_MAP[cleanWord]) {
        domainScores[domain] = (domainScores[domain] ?? 0) + 1;
      }
    }
  }

  // Also check multi-word phrases
  for (const [keyword, domains] of Object.entries(KEYWORD_DOMAIN_MAP)) {
    if (keyword.includes("-") && lowerIdea.includes(keyword.replace(/-/g, " "))) {
      matchedKeywords.push(keyword);
      for (const domain of domains) {
        domainScores[domain] = (domainScores[domain] ?? 0) + 2;
      }
    }
  }

  // Sort domains by score
  const sortedDomains = Object.entries(domainScores)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => domain);

  const primaryDomain = sortedDomains[0] ?? "full-stack-app";
  const subDomains = sortedDomains.slice(1, 4);

  // Determine complexity based on domain count and keyword variety
  let complexity: IdeaAnalysis["complexity"] = "moderate";
  const uniqueDomains = new Set(sortedDomains).size;
  if (uniqueDomains >= 4 || idea.length > 500) complexity = "very-complex";
  else if (uniqueDomains >= 3 || idea.length > 300) complexity = "complex";
  else if (uniqueDomains <= 1 && idea.length < 100) complexity = "simple";

  // Map domains to swarms
  const matchedSwarms = new Set<string>();
  for (const domain of [primaryDomain, ...subDomains]) {
    const swarms = DOMAIN_SWARM_MAP[domain] ?? DOMAIN_SWARM_MAP["full-stack-app"];
    for (const s of swarms) matchedSwarms.add(s);
  }

  // Determine required capabilities from matched swarms
  const requiredCapabilities: string[] = [];
  for (const swarmId of matchedSwarms) {
    const swarm = AVAILABLE_SWARMS.find((s) => s.id === swarmId);
    if (swarm) {
      requiredCapabilities.push(...swarm.capabilities.slice(0, 3));
    }
  }

  const confidenceScore = Math.min(
    100,
    Math.round((matchedKeywords.length / Math.max(words.length, 1)) * 100 + 30)
  );

  return {
    domain: primaryDomain,
    subDomains,
    complexity,
    requiredCapabilities: [...new Set(requiredCapabilities)],
    matchedSwarms: [...matchedSwarms],
    keywords: [...new Set(matchedKeywords)],
    confidenceScore,
  };
}

/**
 * Select the optimal swarm team based on idea analysis.
 * Respects user-preferred swarms (force-include).
 */
export function selectSwarmTeam(
  analysis: IdeaAnalysis,
  preferences?: string[]
): SwarmTeam {
  // Start with domain-mapped swarms
  const domainSwarms = DOMAIN_SWARM_MAP[analysis.domain] ?? DOMAIN_SWARM_MAP["full-stack-app"];
  const selectedSwarms = new Set<string>(domainSwarms);

  // Add swarms from sub-domains
  for (const subDomain of analysis.subDomains) {
    const subSwarms = DOMAIN_SWARM_MAP[subDomain];
    if (subSwarms) {
      for (const s of subSwarms) selectedSwarms.add(s);
    }
  }

  // Force-include user-preferred swarms
  if (preferences) {
    for (const pref of preferences) {
      if (AVAILABLE_SWARMS.some((s) => s.id === pref)) {
        selectedSwarms.add(pref);
      }
    }
  }

  const swarmList = [...selectedSwarms];
  const primarySwarm = swarmList[0] ?? "code-critique";
  const supportingSwarms = swarmList.slice(1);

  // Calculate total agents
  const totalAgents = swarmList.reduce((sum, id) => {
    const swarm = AVAILABLE_SWARMS.find((s) => s.id === id);
    return sum + (swarm?.agentCount ?? 3);
  }, 0);

  // Estimate execution time
  const maxTime = Math.max(
    ...swarmList.map((id) => {
      const swarm = AVAILABLE_SWARMS.find((s) => s.id === id);
      return parseInt(swarm?.avgExecutionTime ?? "30s", 10);
    })
  );
  const estimatedTime =
    analysis.complexity === "very-complex"
      ? `${maxTime * 2}s`
      : analysis.complexity === "complex"
        ? `${Math.round(maxTime * 1.5)}s`
        : `${maxTime}s`;

  return {
    primarySwarm,
    supportingSwarms,
    totalAgents,
    estimatedTime,
    rationale: `Selected ${swarmList.length} swarms (${totalAgents} agents) for ${analysis.domain} domain with ${analysis.complexity} complexity.`,
  };
}

/**
 * Build a phased execution plan for the swarm team.
 */
export function buildExecutionPlan(
  team: SwarmTeam,
  strategy?: string
): ExecutionPlan {
  const allSwarms = [team.primarySwarm, ...team.supportingSwarms];

  // Auto-select strategy based on swarm count
  const effectiveStrategy =
    (strategy as ExecutionPlan["strategy"]) ??
    (allSwarms.length <= 2
      ? "sequential"
      : allSwarms.length <= 3
        ? "parallel"
        : "hybrid");

  const phases: ExecutionPhase[] = [];
  const dataFlow: ExecutionPlan["dataFlow"] = [];

  if (effectiveStrategy === "sequential") {
    for (let i = 0; i < allSwarms.length; i++) {
      const swarmId = allSwarms[i];
      const swarm = AVAILABLE_SWARMS.find((s) => s.id === swarmId);
      phases.push({
        phase: i + 1,
        swarms: [swarmId],
        parallel: false,
        inputFrom: i === 0 ? "user" : `phase-${i}`,
        expectedOutput: swarm?.outputs.join(", ") ?? "analysis",
        estimatedTime: swarm?.avgExecutionTime ?? "30s",
      });
      if (i > 0) {
        dataFlow.push({
          from: allSwarms[i - 1],
          to: swarmId,
          dataKey: "previous-phase-output",
        });
      }
    }
  } else if (effectiveStrategy === "parallel") {
    phases.push({
      phase: 1,
      swarms: allSwarms,
      parallel: true,
      inputFrom: "user",
      expectedOutput: "all-swarm-outputs",
      estimatedTime: Math.max(
        ...allSwarms.map((id) => {
          const s = AVAILABLE_SWARMS.find((sw) => sw.id === id);
          return parseInt(s?.avgExecutionTime ?? "30s", 10);
        })
      ) + "s",
    });
  } else {
    // Hybrid: primary swarm first, then supporting in parallel, then code-critique last
    const critIndex = allSwarms.indexOf("code-critique");
    const nonCrit = allSwarms.filter((s) => s !== "code-critique");
    const primary = nonCrit[0];
    const parallel = nonCrit.slice(1);

    if (primary) {
      const primarySwarm = AVAILABLE_SWARMS.find((s) => s.id === primary);
      phases.push({
        phase: 1,
        swarms: [primary],
        parallel: false,
        inputFrom: "user",
        expectedOutput: primarySwarm?.outputs.join(", ") ?? "primary-output",
        estimatedTime: primarySwarm?.avgExecutionTime ?? "40s",
      });
    }

    if (parallel.length > 0) {
      phases.push({
        phase: 2,
        swarms: parallel,
        parallel: true,
        inputFrom: "phase-1",
        expectedOutput: "supporting-outputs",
        estimatedTime: Math.max(
          ...parallel.map((id) => {
            const s = AVAILABLE_SWARMS.find((sw) => sw.id === id);
            return parseInt(s?.avgExecutionTime ?? "30s", 10);
          })
        ) + "s",
      });

      for (const s of parallel) {
        if (primary) {
          dataFlow.push({
            from: primary,
            to: s,
            dataKey: "primary-analysis",
          });
        }
      }
    }

    if (critIndex !== -1) {
      phases.push({
        phase: phases.length + 1,
        swarms: ["code-critique"],
        parallel: false,
        inputFrom: `phase-${phases.length}`,
        expectedOutput: "critique-report, findings, score",
        estimatedTime: "30s",
      });

      for (const s of nonCrit) {
        dataFlow.push({
          from: s,
          to: "code-critique",
          dataKey: "generated-code",
        });
      }
    }
  }

  // Calculate total time
  let totalSeconds = 0;
  for (const phase of phases) {
    totalSeconds += parseInt(phase.estimatedTime, 10) || 30;
  }

  return {
    strategy: effectiveStrategy,
    phases,
    dataFlow,
    totalEstimatedTime: `${totalSeconds}s`,
    totalAgents: team.totalAgents,
  };
}

/**
 * Calculate a weighted team score from individual swarm results.
 */
export function calculateTeamScore(results: SwarmOutput[]): TeamScore {
  if (results.length === 0) {
    return { coherence: 0, completeness: 0, quality: 0, innovation: 0, actionability: 0, overall: 0 };
  }

  const completedResults = results.filter((r) => r.status === "completed");
  const completionRate = completedResults.length / results.length;

  // Average scores from completed swarms
  const avgScore =
    completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + r.score, 0) / completedResults.length
      : 0;

  // Check for issues
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const issuesPenalty = Math.min(totalIssues * 3, 30);

  const coherence = Math.round(Math.min(100, avgScore * completionRate - issuesPenalty * 0.5));
  const completeness = Math.round(completionRate * 100);
  const quality = Math.round(Math.min(100, avgScore - issuesPenalty * 0.3));
  const innovation = Math.round(Math.min(100, avgScore * 0.9));
  const actionability = Math.round(
    Math.min(
      100,
      (results.reduce((sum, r) => sum + r.artifacts.filter((a) => a.type === "code").length, 0) > 0
        ? avgScore * 1.1
        : avgScore * 0.7) - issuesPenalty * 0.2
    )
  );

  // Weighted overall: quality 30%, completeness 25%, coherence 20%, actionability 15%, innovation 10%
  const overall = Math.round(
    quality * 0.3 +
      completeness * 0.25 +
      coherence * 0.2 +
      actionability * 0.15 +
      innovation * 0.1
  );

  return { coherence, completeness, quality, innovation, actionability, overall };
}

/**
 * Determine if any swarm needs re-execution based on score thresholds.
 */
export function shouldRetry(
  scores: TeamScore,
  threshold: number = 60
): RetryDecision {
  const lowDimensions: string[] = [];
  const adjustments: RetryDecision["adjustments"] = [];

  if (scores.coherence < threshold) {
    lowDimensions.push("coherence");
    adjustments.push({
      swarm: "results-fuser",
      change: "Increase emphasis on cross-swarm consistency and integration",
    });
  }
  if (scores.completeness < threshold) {
    lowDimensions.push("completeness");
    adjustments.push({
      swarm: "swarm-executor",
      change: "Ensure all required capabilities are covered with more detailed output",
    });
  }
  if (scores.quality < threshold) {
    lowDimensions.push("quality");
    adjustments.push({
      swarm: "swarm-executor",
      change: "Focus on production-quality code and adherence to best practices",
    });
  }
  if (scores.actionability < threshold) {
    lowDimensions.push("actionability");
    adjustments.push({
      swarm: "results-fuser",
      change: "Provide more concrete, immediately-implementable code and clear next steps",
    });
  }

  return {
    shouldRetry: scores.overall < threshold || lowDimensions.length >= 2,
    swarmsToRetry: adjustments.map((a) => a.swarm),
    reasons: lowDimensions.map(
      (dim) => `${dim} score (${scores[dim as keyof TeamScore]}) is below threshold (${threshold})`
    ),
    adjustments,
    maxRetriesRemaining: 2,
  };
}

/**
 * Modify a base prompt based on a taste profile preset.
 */
export function adaptPromptForTaste(basePrompt: string, taste: string): string {
  const profile = TASTE_PROFILES[taste];
  if (!profile) return basePrompt;

  const tasteBlock = [
    "\n\n<taste_profile>",
    `Style: ${profile.style}`,
    `Preferences: ${profile.preferences.join("; ")}`,
    `PRIORITIZE: ${profile.prioritize.join(", ")}`,
    `DEPRIORITIZE: ${profile.deprioritize.join(", ")}`,
    "</taste_profile>",
  ].join("\n");

  return basePrompt + tasteBlock;
}

/**
 * Estimate total execution time for a plan.
 */
export function estimateExecutionTime(plan: ExecutionPlan): string {
  let totalSeconds = 0;

  for (const phase of plan.phases) {
    const phaseTime = parseInt(phase.estimatedTime, 10) || 30;
    if (phase.parallel) {
      // Parallel phases: time = max of individual swarm times
      totalSeconds += phaseTime;
    } else {
      // Sequential: time = sum of swarm times in this phase
      totalSeconds += phaseTime * phase.swarms.length;
    }
  }

  // Add overhead for coordinator agents (analysis, planning, fusion, scoring)
  totalSeconds += 40;

  if (totalSeconds < 60) return `~${totalSeconds}s`;
  const minutes = Math.ceil(totalSeconds / 60);
  return `~${minutes}m`;
}

/**
 * Generate structured data for rendering a team execution flowchart.
 */
export function generateTeamFlowchart(plan: ExecutionPlan): FlowchartData {
  const nodes: FlowchartNode[] = [];
  const edges: FlowchartEdge[] = [];
  const phases: FlowchartData["phases"] = [];

  // Start node
  nodes.push({
    id: "start",
    label: "User Idea",
    type: "start",
    phase: 0,
    color: "#6b7280",
  });

  // Phase nodes
  for (const phase of plan.phases) {
    phases.push({
      phase: phase.phase,
      label: `Phase ${phase.phase}`,
      parallel: phase.parallel,
    });

    for (const swarmId of phase.swarms) {
      const swarm = AVAILABLE_SWARMS.find((s) => s.id === swarmId);
      const nodeId = `${swarmId}-p${phase.phase}`;
      nodes.push({
        id: nodeId,
        label: swarm?.name ?? swarmId,
        type: "swarm",
        phase: phase.phase,
        color: SWARM_COLORS[swarmId] ?? "#6b7280",
      });

      // Edge from previous phase or start
      if (phase.phase === 1) {
        edges.push({ from: "start", to: nodeId });
      }
    }

    // Connect phases
    if (phase.phase > 1) {
      const prevPhase = plan.phases.find((p) => p.phase === phase.phase - 1);
      if (prevPhase) {
        for (const prevSwarm of prevPhase.swarms) {
          for (const currSwarm of phase.swarms) {
            edges.push({
              from: `${prevSwarm}-p${prevPhase.phase}`,
              to: `${currSwarm}-p${phase.phase}`,
            });
          }
        }
      }
    }
  }

  // End node
  const lastPhase = plan.phases[plan.phases.length - 1];
  nodes.push({
    id: "end",
    label: "Fused Result",
    type: "end",
    phase: (lastPhase?.phase ?? 0) + 1,
    color: "#6b7280",
  });

  if (lastPhase) {
    for (const swarmId of lastPhase.swarms) {
      edges.push({
        from: `${swarmId}-p${lastPhase.phase}`,
        to: "end",
      });
    }
  }

  return { nodes, edges, phases };
}

/**
 * Intelligently merge outputs from multiple swarms.
 * Deduplicates, resolves conflicts, and produces a unified result.
 */
export function mergeSwarmOutputs(outputs: SwarmOutput[]): MergedOutput {
  const allArtifacts: MergedOutput["allArtifacts"] = [];
  const allInsights: string[] = [];
  const conflicts: MergedOutput["conflicts"] = [];
  let overallScore = 0;

  if (outputs.length === 0) {
    return {
      unifiedSummary: "No swarm outputs to merge.",
      allArtifacts: [],
      deduplicatedInsights: [],
      conflicts: [],
      overallScore: 0,
    };
  }

  // Collect all artifacts with source attribution
  for (const output of outputs) {
    for (const artifact of output.artifacts) {
      allArtifacts.push({
        type: artifact.type,
        name: artifact.name,
        content: artifact.content,
        sourceSwarm: output.swarmId,
      });
    }
    if (output.summary) {
      allInsights.push(output.summary);
    }
    overallScore += output.score;
  }

  overallScore = Math.round(overallScore / outputs.length);

  // Deduplicate insights (simple similarity check: skip if >80% word overlap)
  const deduplicatedInsights: string[] = [];
  for (const insight of allInsights) {
    const insightWords = new Set(insight.toLowerCase().split(/\s+/));
    const isDuplicate = deduplicatedInsights.some((existing) => {
      const existingWords = new Set(existing.toLowerCase().split(/\s+/));
      const overlap = [...insightWords].filter((w) => existingWords.has(w)).length;
      return overlap / Math.max(insightWords.size, existingWords.size) > 0.8;
    });
    if (!isDuplicate) {
      deduplicatedInsights.push(insight);
    }
  }

  // Detect potential conflicts (same artifact type from different swarms)
  const artifactsByType: Record<string, string[]> = {};
  for (const artifact of allArtifacts) {
    const key = `${artifact.type}:${artifact.name}`;
    if (!artifactsByType[key]) artifactsByType[key] = [];
    artifactsByType[key].push(artifact.sourceSwarm);
  }
  for (const [key, sources] of Object.entries(artifactsByType)) {
    if (sources.length > 1) {
      conflicts.push({
        issue: `Multiple swarms (${sources.join(", ")}) produced artifact "${key}"`,
        resolution: "Keep highest-scoring swarm's version, merge unique elements from others",
      });
    }
  }

  const completedCount = outputs.filter((o) => o.status === "completed").length;
  const unifiedSummary = `Merged ${outputs.length} swarm outputs (${completedCount} completed). Produced ${allArtifacts.length} artifacts with ${deduplicatedInsights.length} unique insights. ${conflicts.length > 0 ? `Resolved ${conflicts.length} conflicts.` : "No conflicts detected."}`;

  return {
    unifiedSummary,
    allArtifacts,
    deduplicatedInsights,
    conflicts,
    overallScore,
  };
}
