import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * OSINT (Open-Source Intelligence) Agent — Multi-agent swarm for
 * vibe-coding OSINT tools and intelligence gathering applications.
 *
 * Flow:
 *   __start__ → [data-aggregator, privacy-protector] (parallel)
 *       ↓
 *   data-aggregator → pattern-finder
 *   privacy-protector → supervisor
 *   pattern-finder → supervisor
 *       ↓
 *   supervisor → [report-generator, tool-generator] (parallel)
 *       ↓
 *   report-generator → intelligence-scorer
 *   tool-generator → intelligence-scorer
 *       ↓
 *   intelligence-scorer → assembler
 *       ↓
 *   assembler → conditional iterate or __end__
 *
 * Sub-agents (8 nodes):
 * - Data Aggregator: Multi-source intelligence collection pipelines
 * - Pattern Finder: Link analysis and graph-based pattern detection
 * - Privacy Protector: GDPR/CCPA compliance and ethical OSINT review
 * - Report Generator: Structured intelligence report formatting
 * - Tool Generator: Generates actual OSINT tool code (scrapers, integrators, dashboards)
 * - Intelligence Scorer: Scores the intelligence product on multiple dimensions
 * - Supervisor: Merges outputs, validates consistency, flags ethical concerns
 * - Assembler: Produces final OSINTReport
 */

// ── Prompts ──

const OSINT_PROMPTS = {
  "data-aggregator": `You are an expert in multi-source open-source intelligence collection. Design data collection pipelines for the given OSINT investigation or tool idea.

Consider these data sources:
1. Public records APIs (court records, business registrations, property records)
2. Social media APIs (X/Twitter API, LinkedIn, Facebook Graph, Reddit, GitHub)
3. Domain/WHOIS lookup and DNS records
4. Search engine dorking (Google, Bing, DuckDuckGo advanced operators)
5. Infrastructure scanning (Shodan, Censys for IoT/infrastructure)
6. Web archives (Wayback Machine, Archive.org)
7. Paste sites and code repositories
8. Breach databases (ethical/legal use only — Have I Been Pwned)

IMPORTANT: All data collection must be ethical and legal. Only reference publicly available data sources.

Return your analysis as JSON:
{
  "agent": "data-aggregator",
  "data_sources": [
    {
      "name": "<source name>",
      "type": "api|scraper|database|search",
      "url_pattern": "<API endpoint or search pattern>",
      "data_fields": ["<what data is returned>"],
      "rate_limit": "<requests/min>",
      "auth_required": true,
      "legal_notes": "<usage restrictions>"
    }
  ],
  "collection_pipeline": [
    {
      "step": 1,
      "source": "<source name>",
      "query_template": "<parameterized query>",
      "output_format": "<JSON structure description>"
    }
  ],
  "aggregation_strategy": "<how to merge multi-source data>",
  "summary": "<overview of the data collection approach>"
}
Return ONLY valid JSON, no markdown fences.`,

  "pattern-finder": `You are an expert in link analysis and pattern detection using graph theory. Given collected data sources, identify entity relationships and patterns.

Perform the following analyses:
1. Entity relationships — person-org-location-event connections
2. Communication patterns — who connects to whom and how
3. Temporal patterns — activity timelines, frequency analysis
4. Network centrality — who is most connected (PageRank, betweenness)
5. Community detection — identify clusters of related entities
6. Anomaly detection — flag unusual patterns

Use graph theory concepts (networkx-inspired): nodes, edges, centrality scores, community membership.

Return your analysis as JSON:
{
  "agent": "pattern-finder",
  "entity_graph": {
    "nodes": [
      {
        "id": "<entity id>",
        "type": "person|organization|location|domain|ip|email|phone|social-account",
        "attributes": {},
        "centrality_score": 0.0
      }
    ],
    "edges": [
      {
        "source": "<node id>",
        "target": "<node id>",
        "relationship": "<type of connection>",
        "confidence": 0.0,
        "evidence": "<source>"
      }
    ]
  },
  "patterns": [
    {
      "type": "temporal|network|behavioral|geographic",
      "description": "<what was found>",
      "significance": "high|medium|low",
      "supporting_data": ["<evidence>"]
    }
  ],
  "communities": [
    {
      "name": "<cluster label>",
      "members": ["<entity ids>"],
      "cohesion": 0.0
    }
  ],
  "graph_algorithms_used": ["<e.g. PageRank, Betweenness Centrality>"],
  "summary": "<overview of patterns and graph analysis>"
}
Return ONLY valid JSON, no markdown fences.`,

  "privacy-protector": `You are an expert in privacy law compliance and ethical OSINT practices. Evaluate the proposed OSINT investigation or tool for legal and ethical concerns.

Assess the following:
1. GDPR compliance (EU data subjects — lawful basis, data minimization, right to erasure)
2. CCPA compliance (California consumers — disclosure, opt-out, data access)
3. Other jurisdictional requirements (UK Data Protection Act, PIPEDA, etc.)
4. Data minimization — is collected data minimal and necessary
5. Consent requirements — what consent is needed for collection/processing
6. Ethical boundaries — no stalking, harassment, doxxing, or unauthorized surveillance
7. Responsible disclosure — how to handle sensitive findings

Return your analysis as JSON:
{
  "agent": "privacy-protector",
  "legal_assessment": [
    {
      "jurisdiction": "<e.g. EU/US/UK>",
      "regulation": "<GDPR/CCPA/etc>",
      "applicable_articles": ["<specific articles>"],
      "compliance_status": "compliant|partial|non-compliant",
      "required_actions": ["<what to do>"]
    }
  ],
  "ethical_review": {
    "purpose_legitimacy": "<assessment of stated purpose>",
    "data_minimization": "<is collected data minimal and necessary>",
    "consent_requirements": "<what consent is needed>",
    "retention_policy": "<how long to keep data>",
    "red_flags": ["<ethical concerns>"]
  },
  "privacy_controls": [
    {
      "control": "<e.g. data anonymization>",
      "implementation": "<how to implement>",
      "priority": "required|recommended|optional"
    }
  ],
  "disclaimer_text": "<legal disclaimer for the tool>",
  "summary": "<overview of privacy and ethical assessment>"
}
Return ONLY valid JSON, no markdown fences.`,

  "report-generator": `You are an expert in intelligence report formatting. Produce a structured OSINT report with executive summaries, entity profiles, timelines, confidence assessments, and actionable intelligence.

Format the intelligence into a professional report including:
1. Executive summary — brief overview of findings
2. Entity profiles — detailed information on each key entity with source attribution
3. Timeline — chronological event sequence with entity involvement
4. Confidence assessments — how reliable is each finding
5. Recommendations — actionable next steps

Return your analysis as JSON:
{
  "agent": "report-generator",
  "report_structure": {
    "title": "<report title>",
    "classification": "UNCLASSIFIED",
    "executive_summary": "<brief overview of key findings>",
    "entity_profiles": [
      {
        "name": "<entity>",
        "type": "<type>",
        "data_points": [
          {
            "field": "<e.g. email>",
            "value": "<data>",
            "source": "<where found>",
            "confidence": "high|medium|low",
            "timestamp": "<when found>"
          }
        ],
        "risk_assessment": "<assessment>"
      }
    ],
    "timeline": [
      {
        "date": "<when>",
        "event": "<what>",
        "entities_involved": ["<who>"],
        "significance": "<why it matters>"
      }
    ],
    "recommendations": ["<actionable items>"]
  },
  "visualization_configs": [
    {
      "type": "graph|timeline|heatmap|table",
      "title": "<visualization title>",
      "data_key": "<reference to data>",
      "config": {}
    }
  ],
  "summary": "<overview of the report>"
}
Return ONLY valid JSON, no markdown fences.`,

  "tool-generator": `You are an OSINT tool generator. Produce actual, functional code for OSINT tools — web scrapers (ethical), API integrators, data processing scripts, and dashboard components.

All generated code MUST include:
1. Rate limiting and respectful crawling (honor robots.txt)
2. Error handling and retry logic
3. Legal disclaimers and ethical usage notices
4. Input validation and sanitization
5. Proper API authentication handling

Generate tools relevant to the investigation: search aggregators, profile builders, domain investigators, network mappers, etc.

Return as JSON:
{
  "agent": "tool-generator",
  "tools": [
    {
      "name": "<tool name>",
      "purpose": "<what it does>",
      "language": "typescript|python",
      "code": "<full source code>",
      "dependencies": ["<required packages>"],
      "usage_example": "<how to run>",
      "ethical_notice": "<usage disclaimer>"
    }
  ],
  "api_integrations": [
    {
      "api": "<API name>",
      "setup_code": "<initialization code>",
      "query_functions": ["<function signatures>"]
    }
  ],
  "dashboard_components": [
    {
      "name": "<component name>",
      "description": "<what it shows>",
      "react_code": "<JSX component code>"
    }
  ],
  "summary": "<overview of generated tools>"
}
Return ONLY valid JSON, no markdown fences.`,

  "intelligence-scorer": `You are an intelligence quality assessor. Score the OSINT product on multiple dimensions.

Evaluate:
1. Source Reliability (0-100): Are sources credible, diverse, and verifiable?
2. Data Completeness (0-100): How comprehensive is the collected information?
3. Analytical Depth (0-100): How thorough is the pattern analysis and link analysis?
4. Privacy Compliance (0-100): Does the product comply with privacy laws and ethics?
5. Actionability (0-100): Can the findings be acted upon? Are recommendations clear?

Return as JSON:
{
  "agent": "intelligence-scorer",
  "scores": {
    "source_reliability": 0,
    "data_completeness": 0,
    "analytical_depth": 0,
    "privacy_compliance": 0,
    "actionability": 0,
    "overall": 0
  },
  "scoring_rationale": {
    "source_reliability": "<why this score>",
    "data_completeness": "<why this score>",
    "analytical_depth": "<why this score>",
    "privacy_compliance": "<why this score>",
    "actionability": "<why this score>"
  },
  "quality_badge": "Poor|Fair|Good|Excellent|Outstanding",
  "improvement_suggestions": ["<how to improve the score>"],
  "summary": "<overall quality assessment>"
}
Return ONLY valid JSON, no markdown fences.`,

  supervisor: `You are the OSINT Swarm supervisor. You merge and validate all sub-agent outputs.

Your responsibilities:
1. Validate source-pattern consistency: Do the patterns found match the collected data sources?
2. Ensure privacy compliance: Are the privacy protector's recommendations being followed?
3. Cross-reference entity data: Do entity profiles from different agents match?
4. Flag ethical concerns: Any data collection that crosses ethical boundaries?
5. Check tool quality: Are generated tools safe, legal, and functional?
6. Determine if iteration is needed: Are there gaps that require another data collection pass?

ETHICAL OSINT PRINCIPLES:
- Only use publicly available information
- Respect privacy and do not enable harassment, stalking, or doxxing
- Comply with terms of service of data sources
- Apply data minimization — collect only what is necessary
- Include legal disclaimers on all outputs

Return as JSON:
{
  "agent": "supervisor",
  "validation": {
    "source_pattern_consistent": true,
    "privacy_compliant": true,
    "entities_cross_referenced": true,
    "tools_safe": true,
    "issues": ["<issue description>"]
  },
  "ethical_flags": ["<any ethical concerns>"],
  "cross_reference_notes": ["<entity data discrepancies>"],
  "iteration_needed": false,
  "iteration_reason": "<why another pass is needed, if applicable>",
  "recommendations": ["<improvement suggestions>"],
  "summary": "<2-3 sentence validation summary>"
}
Return ONLY valid JSON, no markdown fences.`,

  assembler: `You are the OSINT Swarm assembler. Produce the final comprehensive intelligence report.

You receive all sub-agent outputs: data sources, entity graph, patterns, privacy assessment, intelligence report, generated tools, quality scores, and supervisor validation.

Merge everything into a clean, actionable final OSINT report. Ensure:
1. Data sources are documented with legal notes
2. Entity graph is complete and cross-referenced
3. Patterns are evidence-backed
4. Privacy controls are implemented
5. Report is professional and structured
6. Tools are functional and include ethical disclaimers
7. Quality scores are realistic and improvement paths noted

MANDATORY: Include ethical disclaimer and legal notice in the report.

Return as JSON:
{
  "agent": "assembler",
  "data_sources": [],
  "entity_graph": { "nodes": [], "edges": [] },
  "patterns": [],
  "privacy_assessment": {
    "legal_assessment": [],
    "ethical_review": { "purpose_legitimacy": "", "data_minimization": "", "consent_requirements": "", "retention_policy": "", "red_flags": [] },
    "privacy_controls": [],
    "disclaimer_text": ""
  },
  "intel_report": {
    "title": "",
    "executive_summary": "",
    "entity_profiles": [],
    "timeline": [],
    "recommendations": []
  },
  "tools": [],
  "intelligence_score": {
    "source_reliability": 0,
    "data_completeness": 0,
    "analytical_depth": 0,
    "privacy_compliance": 0,
    "actionability": 0,
    "overall": 0
  },
  "visualizations": [],
  "summary": "<executive summary of the complete OSINT product>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

// ── Types ──

export interface DataSource {
  name: string;
  type: "api" | "scraper" | "database" | "search";
  url_pattern: string;
  data_fields: string[];
  rate_limit: string;
  auth_required: boolean;
  legal_notes: string;
}

export interface EntityNode {
  id: string;
  type: "person" | "organization" | "location" | "domain" | "ip" | "email" | "phone" | "social-account";
  attributes: Record<string, unknown>;
  centrality_score: number;
}

export interface EntityEdge {
  source: string;
  target: string;
  relationship: string;
  confidence: number;
  evidence: string;
}

export interface EntityGraph {
  nodes: EntityNode[];
  edges: EntityEdge[];
}

export interface PrivacyAssessment {
  legal_assessment: Array<{
    jurisdiction: string;
    regulation: string;
    applicable_articles: string[];
    compliance_status: "compliant" | "partial" | "non-compliant";
    required_actions: string[];
  }>;
  ethical_review: {
    purpose_legitimacy: string;
    data_minimization: string;
    consent_requirements: string;
    retention_policy: string;
    red_flags: string[];
  };
  privacy_controls: Array<{
    control: string;
    implementation: string;
    priority: "required" | "recommended" | "optional";
  }>;
  disclaimer_text: string;
}

export interface IntelReport {
  title: string;
  executive_summary: string;
  entity_profiles: Array<{
    name: string;
    type: string;
    data_points: Array<{
      field: string;
      value: string;
      source: string;
      confidence: "high" | "medium" | "low";
      timestamp: string;
    }>;
    risk_assessment: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    entities_involved: string[];
    significance: string;
  }>;
  recommendations: string[];
}

export interface OSINTTool {
  name: string;
  purpose: string;
  language: "typescript" | "python";
  code: string;
  dependencies: string[];
  ethical_notice: string;
}

export interface IntelligenceScore {
  source_reliability: number;
  data_completeness: number;
  analytical_depth: number;
  privacy_compliance: number;
  actionability: number;
  overall: number;
}

export interface OSINTReport {
  dataSources: DataSource[];
  entityGraph: EntityGraph;
  patterns: Array<{
    type: "temporal" | "network" | "behavioral" | "geographic";
    description: string;
    significance: "high" | "medium" | "low";
    supporting_data: string[];
  }>;
  privacyAssessment: PrivacyAssessment;
  intelReport: IntelReport;
  tools: OSINTTool[];
  intelligenceScore: IntelligenceScore;
  visualizations: Array<{
    type: "graph" | "timeline" | "heatmap" | "table";
    title: string;
    data_key: string;
    config: Record<string, unknown>;
  }>;
  summary: string;
}

export interface OSINTMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface OSINTResult {
  report: OSINTReport;
  messages: OSINTMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const OSINTAnnotation = Annotation.Root({
  /** User's OSINT tool/investigation idea */
  idea: Annotation<string>,

  /** Investigation focus */
  focus: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "full-investigation",
  }),

  /** Ethical mode — adds extra privacy/legal guardrails */
  ethicalMode: Annotation<boolean>({
    reducer: (_, v) => v,
    default: () => true,
  }),

  /** Individual agent messages (accumulated) */
  agentMessages: Annotation<OSINTMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** The final OSINT report */
  osintReport: Annotation<OSINTReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),
});

type OSINTState = typeof OSINTAnnotation.State;

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

// ── Ethical preamble injected when ethicalMode is true ──

const ETHICAL_PREAMBLE = `ETHICAL OSINT PRINCIPLES (MANDATORY):
- Only use publicly available, legally accessible information
- Respect all terms of service and API usage policies
- Apply data minimization — collect only what is necessary for the stated purpose
- Never enable or facilitate harassment, stalking, doxxing, or unauthorized surveillance
- Comply with GDPR, CCPA, and all applicable privacy regulations
- Include legal disclaimers on all outputs and generated tools
- Follow responsible disclosure practices for any sensitive findings
- Respect the right to be forgotten and data subject access requests

`;

// ── Node: data-aggregator ──

function createDataAggregatorNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const ethicalPrefix = state.ethicalMode ? ETHICAL_PREAMBLE : "";

    const systemPrompt = await injectMemoryContext(
      ethicalPrefix + OSINT_PROMPTS["data-aggregator"],
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea}

Focus: ${state.focus}
Ethical Mode: ${state.ethicalMode ? "ENABLED — all collection must be legal and ethical" : "Standard"}

${state.specialistResults["data-aggregator"] ? `Previous iteration data sources:\n${state.specialistResults["data-aggregator"].slice(0, 2000)}` : ""}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 6144 }
    );

    const message: OSINTMessage = {
      agent: "data-aggregator",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "data-aggregator": result },
    };
  };
}

// ── Node: pattern-finder ──

function createPatternFinderNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const ethicalPrefix = state.ethicalMode ? ETHICAL_PREAMBLE : "";

    const systemPrompt = await injectMemoryContext(
      ethicalPrefix + OSINT_PROMPTS["pattern-finder"],
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea}

Focus: ${state.focus}

Data Sources Collected:
${state.specialistResults["data-aggregator"]?.slice(0, 4000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.4, maxTokens: 6144 }
    );

    const message: OSINTMessage = {
      agent: "pattern-finder",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "pattern-finder": result },
    };
  };
}

// ── Node: privacy-protector ──

function createPrivacyProtectorNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const systemPrompt = await injectMemoryContext(
      ETHICAL_PREAMBLE + OSINT_PROMPTS["privacy-protector"],
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea}

Focus: ${state.focus}
Ethical Mode: ${state.ethicalMode ? "ENABLED — strict privacy and legal compliance required" : "Standard — still apply baseline privacy protections"}

Note: Even when ethical mode is standard, all OSINT activities must comply with applicable laws.`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: OSINTMessage = {
      agent: "privacy-protector",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "privacy-protector": result },
    };
  };
}

// ── Node: supervisor ──

function createSupervisorNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const ethicalPrefix = state.ethicalMode ? ETHICAL_PREAMBLE : "";

    const systemPrompt = await injectMemoryContext(
      ethicalPrefix + OSINT_PROMPTS.supervisor,
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea.slice(0, 1000)}

Focus: ${state.focus}
Ethical Mode: ${state.ethicalMode ? "ENABLED" : "Standard"}

Sub-Agent Outputs:
${specialistOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: OSINTMessage = {
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

// ── Node: report-generator ──

function createReportGeneratorNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const ethicalPrefix = state.ethicalMode ? ETHICAL_PREAMBLE : "";

    const systemPrompt = await injectMemoryContext(
      ethicalPrefix + OSINT_PROMPTS["report-generator"],
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea}

Focus: ${state.focus}

Data Sources:
${state.specialistResults["data-aggregator"]?.slice(0, 3000) ?? "N/A"}

Pattern Analysis:
${state.specialistResults["pattern-finder"]?.slice(0, 3000) ?? "N/A"}

Privacy Assessment:
${state.specialistResults["privacy-protector"]?.slice(0, 2000) ?? "N/A"}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: OSINTMessage = {
      agent: "report-generator",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "report-generator": result },
    };
  };
}

// ── Node: tool-generator ──

function createToolGeneratorNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const ethicalPrefix = state.ethicalMode ? ETHICAL_PREAMBLE : "";

    const systemPrompt = await injectMemoryContext(
      ethicalPrefix + OSINT_PROMPTS["tool-generator"],
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea}

Focus: ${state.focus}
Ethical Mode: ${state.ethicalMode ? "ENABLED — all tools must include rate limiting, legal disclaimers, and ethical safeguards" : "Standard"}

Data Sources:
${state.specialistResults["data-aggregator"]?.slice(0, 3000) ?? "N/A"}

Supervisor Validation:
${state.specialistResults.supervisor?.slice(0, 2000) ?? "N/A"}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: OSINTMessage = {
      agent: "tool-generator",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "tool-generator": result },
    };
  };
}

// ── Node: intelligence-scorer ──

function createIntelligenceScorerNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([agent]) => agent !== "assembler")
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result.slice(0, 2000)}`)
      .join("\n\n");

    const systemPrompt = await injectMemoryContext(
      OSINT_PROMPTS["intelligence-scorer"],
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea.slice(0, 500)}

Focus: ${state.focus}
Ethical Mode: ${state.ethicalMode ? "ENABLED" : "Standard"}

All Sub-Agent Outputs:
${specialistOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 4096 }
    );

    const message: OSINTMessage = {
      agent: "intelligence-scorer",
      content: result,
      timestamp: new Date().toISOString(),
    };
    try {
      message.parsedData = parseJSON(result);
    } catch { /* raw text fallback */ }

    return {
      agentMessages: [message],
      specialistResults: { "intelligence-scorer": result },
    };
  };
}

// ── Node: assembler ──

function createAssemblerNode(provider: LLMProvider) {
  return async (state: OSINTState): Promise<Partial<OSINTState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const ethicalPrefix = state.ethicalMode ? ETHICAL_PREAMBLE : "";

    const systemPrompt = await injectMemoryContext(
      ethicalPrefix + OSINT_PROMPTS.assembler,
      state.idea
    );

    const context = `OSINT Investigation/Tool Idea:
${state.idea.slice(0, 1000)}

Focus: ${state.focus}
Ethical Mode: ${state.ethicalMode ? "ENABLED" : "Standard"}

All Sub-Agent Outputs:
${specialistOutputs}`;

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      context,
      { temperature: 0.2, maxTokens: 8192 }
    );

    // Parse into OSINTReport
    let report: OSINTReport;
    try {
      const parsed = parseJSON(result);

      // Parse data sources
      let dataSources: DataSource[] = [];
      try {
        const aggData = parseJSON(state.specialistResults["data-aggregator"] ?? "{}");
        dataSources = ((aggData.data_sources as DataSource[]) ?? []).map((s) => ({
          name: s.name ?? "",
          type: s.type ?? "api",
          url_pattern: s.url_pattern ?? "",
          data_fields: s.data_fields ?? [],
          rate_limit: s.rate_limit ?? "unknown",
          auth_required: s.auth_required ?? false,
          legal_notes: s.legal_notes ?? "",
        }));
      } catch { /* use assembler data */ }
      if (dataSources.length === 0) {
        dataSources = ((parsed.data_sources as DataSource[]) ?? []).map((s) => ({
          name: s.name ?? "",
          type: s.type ?? "api",
          url_pattern: s.url_pattern ?? "",
          data_fields: s.data_fields ?? [],
          rate_limit: s.rate_limit ?? "unknown",
          auth_required: s.auth_required ?? false,
          legal_notes: s.legal_notes ?? "",
        }));
      }

      // Parse entity graph
      let entityGraph: EntityGraph = { nodes: [], edges: [] };
      try {
        const patternData = parseJSON(state.specialistResults["pattern-finder"] ?? "{}");
        const eg = patternData.entity_graph as Record<string, unknown> | undefined;
        if (eg) {
          entityGraph = {
            nodes: ((eg.nodes as EntityNode[]) ?? []).map((n) => ({
              id: n.id ?? "",
              type: n.type ?? "person",
              attributes: n.attributes ?? {},
              centrality_score: n.centrality_score ?? 0,
            })),
            edges: ((eg.edges as EntityEdge[]) ?? []).map((e) => ({
              source: e.source ?? "",
              target: e.target ?? "",
              relationship: e.relationship ?? "",
              confidence: e.confidence ?? 0,
              evidence: e.evidence ?? "",
            })),
          };
        }
      } catch { /* use assembler data */ }
      if (entityGraph.nodes.length === 0) {
        const eg = parsed.entity_graph as Record<string, unknown> | undefined;
        if (eg) {
          entityGraph = {
            nodes: ((eg.nodes as EntityNode[]) ?? []).map((n) => ({
              id: n.id ?? "",
              type: n.type ?? "person",
              attributes: n.attributes ?? {},
              centrality_score: n.centrality_score ?? 0,
            })),
            edges: ((eg.edges as EntityEdge[]) ?? []).map((e) => ({
              source: e.source ?? "",
              target: e.target ?? "",
              relationship: e.relationship ?? "",
              confidence: e.confidence ?? 0,
              evidence: e.evidence ?? "",
            })),
          };
        }
      }

      // Parse patterns
      let patterns: OSINTReport["patterns"] = [];
      try {
        const patternData = parseJSON(state.specialistResults["pattern-finder"] ?? "{}");
        patterns = ((patternData.patterns as OSINTReport["patterns"]) ?? []).map((p) => ({
          type: p.type ?? "network",
          description: p.description ?? "",
          significance: p.significance ?? "medium",
          supporting_data: p.supporting_data ?? [],
        }));
      } catch { /* use assembler data */ }
      if (patterns.length === 0) {
        patterns = ((parsed.patterns as OSINTReport["patterns"]) ?? []).map((p) => ({
          type: p.type ?? "network",
          description: p.description ?? "",
          significance: p.significance ?? "medium",
          supporting_data: p.supporting_data ?? [],
        }));
      }

      // Parse privacy assessment
      let privacyAssessment: PrivacyAssessment = {
        legal_assessment: [],
        ethical_review: {
          purpose_legitimacy: "",
          data_minimization: "",
          consent_requirements: "",
          retention_policy: "",
          red_flags: [],
        },
        privacy_controls: [],
        disclaimer_text: "",
      };
      try {
        const privData = parseJSON(state.specialistResults["privacy-protector"] ?? "{}");
        privacyAssessment = {
          legal_assessment: ((privData.legal_assessment as PrivacyAssessment["legal_assessment"]) ?? []).map((la) => ({
            jurisdiction: la.jurisdiction ?? "",
            regulation: la.regulation ?? "",
            applicable_articles: la.applicable_articles ?? [],
            compliance_status: la.compliance_status ?? "partial",
            required_actions: la.required_actions ?? [],
          })),
          ethical_review: {
            purpose_legitimacy: ((privData.ethical_review as Record<string, unknown>)?.purpose_legitimacy as string) ?? "",
            data_minimization: ((privData.ethical_review as Record<string, unknown>)?.data_minimization as string) ?? "",
            consent_requirements: ((privData.ethical_review as Record<string, unknown>)?.consent_requirements as string) ?? "",
            retention_policy: ((privData.ethical_review as Record<string, unknown>)?.retention_policy as string) ?? "",
            red_flags: ((privData.ethical_review as Record<string, unknown>)?.red_flags as string[]) ?? [],
          },
          privacy_controls: ((privData.privacy_controls as PrivacyAssessment["privacy_controls"]) ?? []).map((pc) => ({
            control: pc.control ?? "",
            implementation: pc.implementation ?? "",
            priority: pc.priority ?? "recommended",
          })),
          disclaimer_text: (privData.disclaimer_text as string) ?? "",
        };
      } catch { /* use assembler data */ }
      if (privacyAssessment.legal_assessment.length === 0) {
        const pa = parsed.privacy_assessment as Record<string, unknown> | undefined;
        if (pa) {
          privacyAssessment = {
            legal_assessment: ((pa.legal_assessment as PrivacyAssessment["legal_assessment"]) ?? []).map((la) => ({
              jurisdiction: la.jurisdiction ?? "",
              regulation: la.regulation ?? "",
              applicable_articles: la.applicable_articles ?? [],
              compliance_status: la.compliance_status ?? "partial",
              required_actions: la.required_actions ?? [],
            })),
            ethical_review: {
              purpose_legitimacy: ((pa.ethical_review as Record<string, unknown>)?.purpose_legitimacy as string) ?? "",
              data_minimization: ((pa.ethical_review as Record<string, unknown>)?.data_minimization as string) ?? "",
              consent_requirements: ((pa.ethical_review as Record<string, unknown>)?.consent_requirements as string) ?? "",
              retention_policy: ((pa.ethical_review as Record<string, unknown>)?.retention_policy as string) ?? "",
              red_flags: ((pa.ethical_review as Record<string, unknown>)?.red_flags as string[]) ?? [],
            },
            privacy_controls: ((pa.privacy_controls as PrivacyAssessment["privacy_controls"]) ?? []).map((pc) => ({
              control: pc.control ?? "",
              implementation: pc.implementation ?? "",
              priority: pc.priority ?? "recommended",
            })),
            disclaimer_text: (pa.disclaimer_text as string) ?? "",
          };
        }
      }

      // Parse intel report
      let intelReport: IntelReport = {
        title: "",
        executive_summary: "",
        entity_profiles: [],
        timeline: [],
        recommendations: [],
      };
      try {
        const reportData = parseJSON(state.specialistResults["report-generator"] ?? "{}");
        const rs = reportData.report_structure as Record<string, unknown> | undefined;
        if (rs) {
          intelReport = {
            title: (rs.title as string) ?? "",
            executive_summary: (rs.executive_summary as string) ?? "",
            entity_profiles: ((rs.entity_profiles as IntelReport["entity_profiles"]) ?? []).map((ep) => ({
              name: ep.name ?? "",
              type: ep.type ?? "",
              data_points: (ep.data_points ?? []).map((dp) => ({
                field: dp.field ?? "",
                value: dp.value ?? "",
                source: dp.source ?? "",
                confidence: dp.confidence ?? "medium",
                timestamp: dp.timestamp ?? "",
              })),
              risk_assessment: ep.risk_assessment ?? "",
            })),
            timeline: ((rs.timeline as IntelReport["timeline"]) ?? []).map((t) => ({
              date: t.date ?? "",
              event: t.event ?? "",
              entities_involved: t.entities_involved ?? [],
              significance: t.significance ?? "",
            })),
            recommendations: (rs.recommendations as string[]) ?? [],
          };
        }
      } catch { /* use assembler data */ }
      if (!intelReport.title) {
        const ir = parsed.intel_report as Record<string, unknown> | undefined;
        if (ir) {
          intelReport = {
            title: (ir.title as string) ?? "",
            executive_summary: (ir.executive_summary as string) ?? "",
            entity_profiles: ((ir.entity_profiles as IntelReport["entity_profiles"]) ?? []).map((ep) => ({
              name: ep.name ?? "",
              type: ep.type ?? "",
              data_points: (ep.data_points ?? []).map((dp) => ({
                field: dp.field ?? "",
                value: dp.value ?? "",
                source: dp.source ?? "",
                confidence: dp.confidence ?? "medium",
                timestamp: dp.timestamp ?? "",
              })),
              risk_assessment: ep.risk_assessment ?? "",
            })),
            timeline: ((ir.timeline as IntelReport["timeline"]) ?? []).map((t) => ({
              date: t.date ?? "",
              event: t.event ?? "",
              entities_involved: t.entities_involved ?? [],
              significance: t.significance ?? "",
            })),
            recommendations: (ir.recommendations as string[]) ?? [],
          };
        }
      }

      // Parse tools
      let tools: OSINTTool[] = [];
      try {
        const toolData = parseJSON(state.specialistResults["tool-generator"] ?? "{}");
        tools = ((toolData.tools as OSINTTool[]) ?? []).map((t) => ({
          name: t.name ?? "",
          purpose: t.purpose ?? "",
          language: t.language ?? "typescript",
          code: t.code ?? "",
          dependencies: t.dependencies ?? [],
          ethical_notice: t.ethical_notice ?? "",
        }));
      } catch { /* use assembler data */ }
      if (tools.length === 0) {
        tools = ((parsed.tools as OSINTTool[]) ?? []).map((t) => ({
          name: t.name ?? "",
          purpose: t.purpose ?? "",
          language: t.language ?? "typescript",
          code: t.code ?? "",
          dependencies: t.dependencies ?? [],
          ethical_notice: t.ethical_notice ?? "",
        }));
      }

      // Parse intelligence score
      let intelligenceScore: IntelligenceScore = {
        source_reliability: 0,
        data_completeness: 0,
        analytical_depth: 0,
        privacy_compliance: 0,
        actionability: 0,
        overall: 0,
      };
      try {
        const scorerData = parseJSON(state.specialistResults["intelligence-scorer"] ?? "{}");
        const scores = scorerData.scores as Record<string, number> | undefined;
        if (scores) {
          intelligenceScore = {
            source_reliability: scores.source_reliability ?? 0,
            data_completeness: scores.data_completeness ?? 0,
            analytical_depth: scores.analytical_depth ?? 0,
            privacy_compliance: scores.privacy_compliance ?? 0,
            actionability: scores.actionability ?? 0,
            overall: scores.overall ?? 0,
          };
        }
      } catch { /* use assembler data */ }
      if (intelligenceScore.overall === 0) {
        const is = parsed.intelligence_score as Record<string, number> | undefined;
        if (is) {
          intelligenceScore = {
            source_reliability: is.source_reliability ?? 0,
            data_completeness: is.data_completeness ?? 0,
            analytical_depth: is.analytical_depth ?? 0,
            privacy_compliance: is.privacy_compliance ?? 0,
            actionability: is.actionability ?? 0,
            overall: is.overall ?? 0,
          };
        }
      }

      // Parse visualizations
      const visualizations = ((parsed.visualizations as OSINTReport["visualizations"]) ?? []).map((v) => ({
        type: v.type ?? "table",
        title: v.title ?? "",
        data_key: v.data_key ?? "",
        config: v.config ?? {},
      }));

      report = {
        dataSources,
        entityGraph,
        patterns,
        privacyAssessment,
        intelReport,
        tools,
        intelligenceScore,
        visualizations,
        summary: (parsed.summary as string) ?? "OSINT report assembled.",
      };
    } catch {
      // Fallback report
      report = {
        dataSources: [],
        entityGraph: { nodes: [], edges: [] },
        patterns: [],
        privacyAssessment: {
          legal_assessment: [],
          ethical_review: {
            purpose_legitimacy: "",
            data_minimization: "",
            consent_requirements: "",
            retention_policy: "",
            red_flags: [],
          },
          privacy_controls: [],
          disclaimer_text: "This tool is for authorized, ethical use only.",
        },
        intelReport: {
          title: "OSINT Report",
          executive_summary: "Assembly failed to produce structured results.",
          entity_profiles: [],
          timeline: [],
          recommendations: [],
        },
        tools: [],
        intelligenceScore: {
          source_reliability: 0,
          data_completeness: 0,
          analytical_depth: 0,
          privacy_compliance: 0,
          actionability: 0,
          overall: 0,
        },
        visualizations: [],
        summary: result.slice(0, 500),
      };
    }

    const message: OSINTMessage = {
      agent: "assembler",
      content: "OSINT intelligence report assembled.",
      timestamp: new Date().toISOString(),
    };

    return {
      osintReport: report,
      iteration: state.iteration + 1,
      agentMessages: [message],
    };
  };
}

// ── Routing ──

function shouldIterate(state: OSINTState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";
  const score = state.osintReport?.intelligenceScore.overall ?? 0;
  if (score < 40 && state.iteration < state.maxIterations) return "iterate";
  return "finalize";
}

// ── Build the graph ──

function buildOSINTGraph(provider: LLMProvider) {
  const graph = new StateGraph(OSINTAnnotation)
    // Nodes
    .addNode("data-aggregator", createDataAggregatorNode(provider))
    .addNode("pattern-finder", createPatternFinderNode(provider))
    .addNode("privacy-protector", createPrivacyProtectorNode(provider))
    .addNode("supervisor", createSupervisorNode(provider))
    .addNode("report-generator", createReportGeneratorNode(provider))
    .addNode("tool-generator", createToolGeneratorNode(provider))
    .addNode("intelligence-scorer", createIntelligenceScorerNode(provider))
    .addNode("assembler", createAssemblerNode(provider))

    // Flow: __start__ → [data-aggregator, privacy-protector] (parallel)
    .addEdge("__start__", "data-aggregator")
    .addEdge("__start__", "privacy-protector")

    // data-aggregator → pattern-finder (needs data to find patterns)
    .addEdge("data-aggregator", "pattern-finder")

    // privacy-protector → supervisor
    .addEdge("privacy-protector", "supervisor")

    // pattern-finder → supervisor
    .addEdge("pattern-finder", "supervisor")

    // supervisor → [report-generator, tool-generator] (parallel)
    .addEdge("supervisor", "report-generator")
    .addEdge("supervisor", "tool-generator")

    // report-generator → intelligence-scorer
    .addEdge("report-generator", "intelligence-scorer")

    // tool-generator → intelligence-scorer
    .addEdge("tool-generator", "intelligence-scorer")

    // intelligence-scorer → assembler
    .addEdge("intelligence-scorer", "assembler")

    // assembler → conditional iterate or __end__
    .addConditionalEdges("assembler", shouldIterate, {
      iterate: "data-aggregator",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the OSINT multi-agent swarm.
 *
 * Flow:
 * 1. Resolves best available provider (Anthropic first)
 * 2. Data Aggregator + Privacy Protector run in parallel
 * 3. Pattern Finder analyzes collected data
 * 4. Supervisor validates and cross-references
 * 5. Report Generator + Tool Generator run in parallel
 * 6. Intelligence Scorer evaluates the product
 * 7. Assembler produces final OSINTReport
 * 8. Conditional iteration if quality is too low
 */
export async function runOSINTSwarm(
  idea: string,
  options?: {
    focus?: "recon" | "profile" | "network-analysis" | "tool-building" | "full-investigation";
    ethicalMode?: boolean;
    maxIterations?: number;
  }
): Promise<OSINTResult> {
  const provider = await resolveProvider();

  const app = buildOSINTGraph(provider);

  const finalState = await app.invoke({
    idea,
    focus: options?.focus ?? "full-investigation",
    ethicalMode: options?.ethicalMode ?? true,
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as OSINTState;

  const fallbackScore: IntelligenceScore = {
    source_reliability: 0,
    data_completeness: 0,
    analytical_depth: 0,
    privacy_compliance: 0,
    actionability: 0,
    overall: 0,
  };

  return {
    report: state.osintReport ?? {
      dataSources: [],
      entityGraph: { nodes: [], edges: [] },
      patterns: [],
      privacyAssessment: {
        legal_assessment: [],
        ethical_review: {
          purpose_legitimacy: "",
          data_minimization: "",
          consent_requirements: "",
          retention_policy: "",
          red_flags: [],
        },
        privacy_controls: [],
        disclaimer_text: "This tool is for authorized, ethical use only.",
      },
      intelReport: {
        title: "OSINT Report",
        executive_summary: "OSINT swarm failed to produce a report.",
        entity_profiles: [],
        timeline: [],
        recommendations: [],
      },
      tools: [],
      intelligenceScore: fallbackScore,
      visualizations: [],
      summary: "OSINT swarm failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
