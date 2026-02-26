import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Cyber Security Agent Swarm — LangGraph
 *
 * Multi-agent swarm for vibe-coding cybersecurity tools and hardened applications.
 *
 * Flow:
 *   __start__ → [vuln-scanner, threat-modeler] (parallel, analyze threats first)
 *       ↓
 *   supervisor merges → [secure-code-generator, crypto-validator] (parallel)
 *       ↓
 *   secure-code-generator → pentest-planner
 *   crypto-validator → pentest-planner
 *       ↓
 *   pentest-planner → security-scorer → assembler → (iterate or finalize)
 *
 * Sub-agents:
 * - Vuln Scanner: Vulnerability analysis with Semgrep-style rules and OWASP methodology
 * - Threat Modeler: MITRE ATT&CK and STRIDE threat modeling
 * - Secure Code Generator: Security-hardened code following OWASP best practices
 * - Crypto Validator: Cryptographic algorithm correctness validation
 * - Pentest Planner: Penetration testing plans and security testing tools
 * - Security Scorer: Comprehensive security posture scoring
 * - Supervisor: Cross-references and validates all specialist outputs
 * - Assembler: Produces final CyberSecReport
 */

// ── Sub-agent system prompts ──

const CYBER_SEC_PROMPTS = {
  "vuln-scanner": `You are an expert in vulnerability analysis using Semgrep-style rule patterns and OWASP methodology.
Analyze the user's application concept to identify potential attack surfaces and generate Semgrep-compatible rules.

Methodology:
1. Map all entry points, data flows, and trust boundaries
2. Apply OWASP Top 10 2021 categories systematically
3. Generate Semgrep-compatible YAML rules for each finding
4. Classify by CWE/CVE reference where applicable
5. Provide actionable remediation for each vulnerability

Return your analysis as JSON:
{
  "agent": "vuln-scanner",
  "scan_results": [
    {
      "id": "<CVE/CWE reference>",
      "severity": "critical|high|medium|low|info",
      "title": "<vulnerability name>",
      "category": "injection|auth|xss|csrf|ssrf|crypto|config|data-exposure|access-control|logging",
      "description": "<what the vulnerability is>",
      "attack_vector": "<how it can be exploited>",
      "remediation": "<how to fix>",
      "semgrep_rule": "<YAML-formatted Semgrep rule>"
    }
  ],
  "attack_surface_map": [
    {
      "component": "<e.g. login endpoint>",
      "risk_level": "high|medium|low",
      "threats": ["<threat description>"]
    }
  ],
  "owasp_coverage": {
    "categories_addressed": ["<A01:2021 Broken Access Control>"],
    "categories_missing": ["<uncovered categories>"]
  },
  "summary": "<2-3 sentences>"
}
Return ONLY valid JSON, no markdown fences.`,

  "threat-modeler": `You are an expert in threat modeling using MITRE ATT&CK framework and STRIDE methodology.
Map potential attack scenarios, create threat trees, and identify adversary techniques.

Methodology:
1. Apply STRIDE to every component: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
2. Map each threat to MITRE ATT&CK techniques with IDs
3. Design realistic attack scenarios with prerequisite chains
4. Identify trust boundaries and data crossing points
5. Propose detection and countermeasure strategies

Return your analysis as JSON:
{
  "agent": "threat-modeler",
  "threat_model": {
    "methodology": "STRIDE",
    "stride_analysis": [
      {
        "category": "Spoofing|Tampering|Repudiation|Information-Disclosure|Denial-of-Service|Elevation-of-Privilege",
        "threats": [
          {
            "id": "<T-001>",
            "description": "<threat description>",
            "likelihood": "high|medium|low",
            "impact": "critical|high|medium|low",
            "mitre_technique": "<e.g. T1078 Valid Accounts>",
            "countermeasure": "<mitigation>"
          }
        ]
      }
    ]
  },
  "attack_scenarios": [
    {
      "name": "<scenario name>",
      "steps": ["<attack step>"],
      "prerequisites": ["<what attacker needs>"],
      "detection": "<how to detect>"
    }
  ],
  "trust_boundaries": [
    {
      "boundary": "<e.g. client-server>",
      "data_crossing": "<what data crosses>",
      "risk": "<risk assessment>"
    }
  ],
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "secure-code-generator": `You are an expert in writing security-hardened code following OWASP best practices.
Generate production-ready security modules including: input validation, output encoding, authentication flows
(bcrypt/argon2, JWT with rotation), authorization (RBAC/ABAC), CSRF protection, rate limiting, security headers,
CSP policies, secure session management, and encrypted storage patterns.

Use the vulnerability scan results and threat model to prioritize which security modules to generate.
Ensure every identified vulnerability has a corresponding security implementation.

Return your code as JSON:
{
  "agent": "secure-code-generator",
  "security_modules": [
    {
      "name": "<e.g. Auth System>",
      "description": "<what it secures>",
      "code": "<TypeScript/Python security implementation>",
      "dependencies": ["<required packages>"],
      "security_features": ["<feature list>"]
    }
  ],
  "security_headers": {
    "csp": "<Content-Security-Policy value>",
    "headers": [
      { "name": "<header>", "value": "<value>", "purpose": "<why>" }
    ]
  },
  "env_config": {
    "required_secrets": ["<env var>"],
    "rotation_policy": "<key rotation guidance>"
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "crypto-validator": `You are an expert in cryptographic algorithm correctness.
Validate implementations and recommend best-practice cryptographic choices:

Areas of expertise:
- Symmetric encryption: AES-256-GCM, AES-128-GCM, ChaCha20-Poly1305
- Asymmetric encryption: RSA key sizes (minimum 2048-bit), ECDSA curves (P-256, P-384)
- Hashing: SHA-256, SHA-3, bcrypt, argon2id (NOT MD5, NOT SHA-1 for security)
- Key derivation: PBKDF2 (with SHA-256), scrypt, HKDF, argon2id
- TLS configuration: minimum TLS 1.2, recommended cipher suites
- Certificate management: generation, rotation, pinning

Check mathematical correctness of all cryptographic operations.

Return your audit as JSON:
{
  "agent": "crypto-validator",
  "crypto_audit": [
    {
      "algorithm": "<e.g. AES-256-GCM>",
      "usage": "<where/how used>",
      "implementation": "<code reference>",
      "is_secure": true,
      "strength_bits": <number>,
      "known_weaknesses": ["<any concerns>"],
      "recommendation": "<guidance>"
    }
  ],
  "key_management": {
    "generation": "<recommended method>",
    "storage": "<secure storage approach>",
    "rotation": "<rotation schedule>",
    "destruction": "<key destruction procedure>"
  },
  "tls_config": {
    "min_version": "TLS 1.2",
    "cipher_suites": ["<recommended suites>"],
    "certificate_requirements": "<cert guidance>"
  },
  "math_verification": [
    {
      "algorithm": "<name>",
      "formula": "<math expression>",
      "correctness": "verified|warning|failed",
      "notes": "<details>"
    }
  ],
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "pentest-planner": `You are a penetration testing specialist who designs comprehensive security testing plans.
Generate testing strategies, OSINT reconnaissance scripts, port scanning configs, fuzzing strategies,
API testing sequences, and compliance verification procedures.

All tools and scripts MUST be for authorized testing only. Include ethical disclaimers.

Use the secure code output and crypto audit to design tests that verify the implemented defenses work correctly.

Return your plan as JSON:
{
  "agent": "pentest-planner",
  "test_plan": {
    "scope": "<what to test>",
    "methodology": "<testing approach>",
    "phases": [
      {
        "phase": "recon|scanning|exploitation|post-exploit|reporting",
        "tasks": [
          {
            "task": "<what to do>",
            "tools": ["<tool name>"],
            "expected_output": "<what to look for>"
          }
        ]
      }
    ]
  },
  "testing_scripts": [
    {
      "name": "<script name>",
      "purpose": "<what it tests>",
      "code": "<TypeScript/Python code>",
      "ethical_notice": "<disclaimer>"
    }
  ],
  "compliance_checks": [
    {
      "standard": "SOC2|HIPAA|PCI-DSS|GDPR|ISO27001",
      "requirements": ["<requirement>"],
      "test_method": "<how to verify>"
    }
  ],
  "disclaimer": "For authorized security testing only. Always obtain written permission before testing.",
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "security-scorer": `You are a security posture assessment specialist.
Compute a comprehensive security score across multiple dimensions based on all previous agent outputs.

Scoring dimensions (0-100 each):
1. Vulnerability Density: fewer vulnerabilities = higher score
2. Threat Coverage: more threats identified and mitigated = higher score
3. Code Hardening: more security modules and best practices = higher score
4. Crypto Strength: stronger algorithms and proper key management = higher score
5. Compliance Readiness: more compliance requirements met = higher score

Overall score: weighted average (vuln 25%, threat 20%, code 25%, crypto 15%, compliance 15%)

Security levels:
- Critical: 0-29
- Poor: 30-49
- Fair: 50-69
- Good: 70-84
- Excellent: 85-100

Return your scoring as JSON:
{
  "agent": "security-scorer",
  "scores": {
    "vulnerability_density": <0-100>,
    "threat_coverage": <0-100>,
    "code_hardening": <0-100>,
    "crypto_strength": <0-100>,
    "compliance_readiness": <0-100>,
    "overall": <0-100>
  },
  "security_level": "Critical|Poor|Fair|Good|Excellent",
  "score_reasoning": {
    "vulnerability_density": "<why this score>",
    "threat_coverage": "<why this score>",
    "code_hardening": "<why this score>",
    "crypto_strength": "<why this score>",
    "compliance_readiness": "<why this score>"
  },
  "top_risks": ["<most critical remaining risk>"],
  "improvement_priorities": ["<highest impact improvement>"],
  "summary": "<2-3 sentence security posture assessment>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const CYBER_SEC_SUPERVISOR_PROMPT = `You are the Cyber Security supervisor. You coordinate the analysis from all specialist agents
to ensure a comprehensive, consistent security assessment.

Your job:
1. Merge vulnerability scan results with threat model to verify all attack surfaces are covered
2. Cross-reference vulnerabilities with threat scenarios to check for gaps
3. Validate that secure code modules address each identified vulnerability
4. Ensure cryptographic recommendations are consistent with secure code implementations
5. Verify the pentest plan covers all identified attack surfaces
6. Flag any contradictions between specialist outputs
7. Determine if iteration is needed to fix critical gaps

Return your merged analysis as JSON:
{
  "cross_reference": {
    "vulns_with_mitigations": <number>,
    "vulns_without_mitigations": ["<vulnerability not addressed by secure code>"],
    "threats_without_detection": ["<threat with no detection strategy>"],
    "crypto_inconsistencies": ["<conflicting crypto recommendations>"],
    "untested_surfaces": ["<attack surface not in pentest plan>"]
  },
  "fixes_applied": ["<description of fix>"],
  "quality_notes": ["<suggestion for improvement>"],
  "needs_iteration": <true if critical gaps found>,
  "summary": "<2-3 sentence cross-reference assessment>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface Vulnerability {
  id: string;
  severity: string;
  title: string;
  category: string;
  description: string;
  attack_vector: string;
  remediation: string;
  semgrep_rule: string;
}

export interface ThreatModel {
  methodology: string;
  stride_analysis: Array<{
    category: string;
    threats: Array<{
      id: string;
      description: string;
      likelihood: string;
      impact: string;
      mitre_technique: string;
      countermeasure: string;
    }>;
  }>;
  attack_scenarios: Array<{
    name: string;
    steps: string[];
    prerequisites: string[];
    detection: string;
  }>;
  trust_boundaries: Array<{
    boundary: string;
    data_crossing: string;
    risk: string;
  }>;
}

export interface SecurityModule {
  name: string;
  description: string;
  code: string;
  dependencies: string[];
  security_features: string[];
}

export interface CryptoAudit {
  algorithm: string;
  usage: string;
  is_secure: boolean;
  strength_bits: number;
  known_weaknesses: string[];
  recommendation: string;
}

export interface PentestPlan {
  scope: string;
  methodology: string;
  phases: Array<{
    phase: string;
    tasks: Array<{
      task: string;
      tools: string[];
      expected_output: string;
    }>;
  }>;
  testing_scripts: Array<{
    name: string;
    purpose: string;
    code: string;
    ethical_notice: string;
  }>;
  compliance_checks: Array<{
    standard: string;
    requirements: string[];
    test_method: string;
  }>;
}

export interface SecurityScore {
  vulnerability_density: number;
  threat_coverage: number;
  code_hardening: number;
  crypto_strength: number;
  compliance_readiness: number;
  overall: number;
}

export interface CyberSecReport {
  vulnerabilities: Vulnerability[];
  threatModel: ThreatModel;
  securityModules: SecurityModule[];
  cryptoAudit: CryptoAudit[];
  pentestPlan: PentestPlan;
  securityScore: SecurityScore;
  securityLevel: string;
  semgrepRules: string[];
  securityHeaders: {
    csp: string;
    headers: Array<{ name: string; value: string; purpose: string }>;
  };
  crossReference: {
    vulns_with_mitigations: number;
    vulns_without_mitigations: string[];
    threats_without_detection: string[];
    crypto_inconsistencies: string[];
    untested_surfaces: string[];
    quality_notes: string[];
  };
  verdict: string;
}

export interface CyberSecMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface CyberSecResult {
  report: CyberSecReport;
  messages: CyberSecMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const CyberSecAnnotation = Annotation.Root({
  /** The user's app/tool idea to secure */
  idea: Annotation<string>,

  /** Focus area */
  focus: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "full-audit",
  }),

  /** Target compliance standards */
  complianceTargets: Annotation<string[]>({
    reducer: (_, v) => v,
    default: () => [],
  }),

  /** Individual agent outputs (accumulated) */
  agentMessages: Annotation<CyberSecMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Supervisor's merged cross-reference check */
  supervisorResult: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final assembled report */
  cyberSecReport: Annotation<CyberSecReport | null>({
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
    default: () => "analyzing" as const,
  }),
});

type CyberSecState = typeof CyberSecAnnotation.State;

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

function createCyberSecSpecialistNode(
  agentName: keyof typeof CYBER_SEC_PROMPTS,
  provider: LLMProvider
) {
  return async (state: CyberSecState): Promise<Partial<CyberSecState>> => {
    const systemPrompt = await injectMemoryContext(
      CYBER_SEC_PROMPTS[agentName],
      state.idea
    );

    let userContext: string;

    if (agentName === "secure-code-generator") {
      userContext = `Application Idea: ${state.idea}\nFocus: ${state.focus}\nCompliance Targets: ${state.complianceTargets.join(", ") || "None specified"}\n\nVulnerability Scan:\n${state.specialistResults["vuln-scanner"] ?? "N/A"}\n\nThreat Model:\n${state.specialistResults["threat-modeler"] ?? "N/A"}\n\nSupervisor Notes:\n${state.supervisorResult || "N/A"}`;
    } else if (agentName === "crypto-validator") {
      userContext = `Application Idea: ${state.idea}\nFocus: ${state.focus}\n\nVulnerability Scan:\n${state.specialistResults["vuln-scanner"] ?? "N/A"}\n\nThreat Model:\n${state.specialistResults["threat-modeler"] ?? "N/A"}\n\nSupervisor Notes:\n${state.supervisorResult || "N/A"}`;
    } else if (agentName === "pentest-planner") {
      userContext = `Application Idea: ${state.idea}\nFocus: ${state.focus}\nCompliance Targets: ${state.complianceTargets.join(", ") || "None specified"}\n\nVulnerability Scan:\n${state.specialistResults["vuln-scanner"] ?? "N/A"}\n\nThreat Model:\n${state.specialistResults["threat-modeler"] ?? "N/A"}\n\nSecure Code Modules:\n${state.specialistResults["secure-code-generator"] ?? "N/A"}\n\nCrypto Audit:\n${state.specialistResults["crypto-validator"] ?? "N/A"}`;
    } else if (agentName === "security-scorer") {
      userContext = `Application Idea: ${state.idea}\nFocus: ${state.focus}\nCompliance Targets: ${state.complianceTargets.join(", ") || "None specified"}\n\nVulnerability Scan:\n${state.specialistResults["vuln-scanner"] ?? "N/A"}\n\nThreat Model:\n${state.specialistResults["threat-modeler"] ?? "N/A"}\n\nSecure Code Modules:\n${state.specialistResults["secure-code-generator"] ?? "N/A"}\n\nCrypto Audit:\n${state.specialistResults["crypto-validator"] ?? "N/A"}\n\nPentest Plan:\n${state.specialistResults["pentest-planner"] ?? "N/A"}`;
    } else {
      const focusHint = state.focus !== "full-audit" ? `\nFocus Area: ${state.focus}` : "";
      const complianceHint = state.complianceTargets.length > 0 ? `\nCompliance Targets: ${state.complianceTargets.join(", ")}` : "";
      userContext = `Analyze the security of this application concept:\n\n${state.idea}${focusHint}${complianceHint}`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: CyberSecMessage = {
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

function createCyberSecSupervisorNode(provider: LLMProvider) {
  return async (state: CyberSecState): Promise<Partial<CyberSecState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([key]) => ["vuln-scanner", "threat-modeler"].includes(key))
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      CYBER_SEC_SUPERVISOR_PROMPT,
      `Application Idea: ${state.idea}\nFocus: ${state.focus}\nCompliance Targets: ${state.complianceTargets.join(", ") || "None specified"}\n\nSpecialist Outputs:\n${specialistOutputs}`,
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

function createCyberSecAssemblerNode() {
  return async (state: CyberSecState): Promise<Partial<CyberSecState>> => {
    // Parse vuln-scanner
    let vulnerabilities: Vulnerability[] = [];
    let attackSurfaceMap: Array<{ component: string; risk_level: string; threats: string[] }> = [];
    let owaspCoverage = { categories_addressed: [] as string[], categories_missing: [] as string[] };
    try {
      const cleaned = (state.specialistResults["vuln-scanner"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      vulnerabilities = data.scan_results ?? [];
      attackSurfaceMap = data.attack_surface_map ?? [];
      owaspCoverage = data.owasp_coverage ?? owaspCoverage;
    } catch { /* use defaults */ }

    // Parse threat-modeler
    let threatModel: ThreatModel = {
      methodology: "STRIDE",
      stride_analysis: [],
      attack_scenarios: [],
      trust_boundaries: [],
    };
    try {
      const cleaned = (state.specialistResults["threat-modeler"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      threatModel = {
        methodology: data.threat_model?.methodology ?? "STRIDE",
        stride_analysis: data.threat_model?.stride_analysis ?? [],
        attack_scenarios: data.attack_scenarios ?? [],
        trust_boundaries: data.trust_boundaries ?? [],
      };
    } catch { /* use defaults */ }

    // Parse secure-code-generator
    let securityModules: SecurityModule[] = [];
    let securityHeaders = {
      csp: "",
      headers: [] as Array<{ name: string; value: string; purpose: string }>,
    };
    let envConfig = { required_secrets: [] as string[], rotation_policy: "" };
    try {
      const cleaned = (state.specialistResults["secure-code-generator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      securityModules = data.security_modules ?? [];
      securityHeaders = {
        csp: data.security_headers?.csp ?? "",
        headers: data.security_headers?.headers ?? [],
      };
      envConfig = data.env_config ?? envConfig;
    } catch { /* use defaults */ }

    // Parse crypto-validator
    let cryptoAudit: CryptoAudit[] = [];
    let keyManagement = { generation: "", storage: "", rotation: "", destruction: "" };
    let tlsConfig = { min_version: "TLS 1.2", cipher_suites: [] as string[], certificate_requirements: "" };
    let mathVerification: Array<{ algorithm: string; formula: string; correctness: string; notes: string }> = [];
    try {
      const cleaned = (state.specialistResults["crypto-validator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      cryptoAudit = data.crypto_audit ?? [];
      keyManagement = data.key_management ?? keyManagement;
      tlsConfig = data.tls_config ?? tlsConfig;
      mathVerification = data.math_verification ?? [];
    } catch { /* use defaults */ }

    // Parse pentest-planner
    let pentestPlan: PentestPlan = {
      scope: "",
      methodology: "",
      phases: [],
      testing_scripts: [],
      compliance_checks: [],
    };
    try {
      const cleaned = (state.specialistResults["pentest-planner"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      pentestPlan = {
        scope: data.test_plan?.scope ?? "",
        methodology: data.test_plan?.methodology ?? "",
        phases: data.test_plan?.phases ?? [],
        testing_scripts: data.testing_scripts ?? [],
        compliance_checks: data.compliance_checks ?? [],
      };
    } catch { /* use defaults */ }

    // Parse security-scorer
    let securityScore: SecurityScore = {
      vulnerability_density: 0,
      threat_coverage: 0,
      code_hardening: 0,
      crypto_strength: 0,
      compliance_readiness: 0,
      overall: 0,
    };
    let securityLevel = "Critical";
    try {
      const cleaned = (state.specialistResults["security-scorer"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      securityScore = {
        vulnerability_density: data.scores?.vulnerability_density ?? 0,
        threat_coverage: data.scores?.threat_coverage ?? 0,
        code_hardening: data.scores?.code_hardening ?? 0,
        crypto_strength: data.scores?.crypto_strength ?? 0,
        compliance_readiness: data.scores?.compliance_readiness ?? 0,
        overall: data.scores?.overall ?? 0,
      };
      securityLevel = data.security_level ?? securityLevel;
    } catch { /* use defaults */ }

    // Parse supervisor cross-reference
    let crossReference = {
      vulns_with_mitigations: 0,
      vulns_without_mitigations: [] as string[],
      threats_without_detection: [] as string[],
      crypto_inconsistencies: [] as string[],
      untested_surfaces: [] as string[],
      quality_notes: [] as string[],
    };
    let verdict = "Cyber security analysis complete.";
    try {
      const cleaned = (state.supervisorResult ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      const cr = data.cross_reference ?? {};
      crossReference = {
        vulns_with_mitigations: cr.vulns_with_mitigations ?? vulnerabilities.length,
        vulns_without_mitigations: cr.vulns_without_mitigations ?? [],
        threats_without_detection: cr.threats_without_detection ?? [],
        crypto_inconsistencies: cr.crypto_inconsistencies ?? [],
        untested_surfaces: cr.untested_surfaces ?? [],
        quality_notes: data.quality_notes ?? [],
      };
      verdict = data.summary ?? verdict;
    } catch { /* use defaults */ }

    // Extract all Semgrep rules
    const semgrepRules = vulnerabilities
      .map((v) => v.semgrep_rule)
      .filter((r) => r && r.trim().length > 0);

    const report: CyberSecReport = {
      vulnerabilities,
      threatModel,
      securityModules,
      cryptoAudit,
      pentestPlan,
      securityScore,
      securityLevel,
      semgrepRules,
      securityHeaders,
      crossReference,
      verdict,
    };

    return {
      cyberSecReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "assembler",
        content: "Cyber security report assembled.",
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldIterateCyberSec(state: CyberSecState): "iterate" | "finalize" {
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

function buildCyberSecGraph(provider: LLMProvider) {
  const graph = new StateGraph(CyberSecAnnotation)
    // Phase 1: Parallel threat analysis (vuln-scanner + threat-modeler)
    .addNode("vuln-scanner", createCyberSecSpecialistNode("vuln-scanner", provider))
    .addNode("threat-modeler", createCyberSecSpecialistNode("threat-modeler", provider))
    // Phase 2: Supervisor merge and cross-reference
    .addNode("supervisor", createCyberSecSupervisorNode(provider))
    // Phase 3: Parallel defense generation (secure-code-generator + crypto-validator)
    .addNode("secure-code-generator", createCyberSecSpecialistNode("secure-code-generator", provider))
    .addNode("crypto-validator", createCyberSecSpecialistNode("crypto-validator", provider))
    // Phase 4: Pentest planning (needs secure code + crypto audit)
    .addNode("pentest-planner", createCyberSecSpecialistNode("pentest-planner", provider))
    // Phase 5: Security scoring
    .addNode("security-scorer", createCyberSecSpecialistNode("security-scorer", provider))
    // Phase 6: Final assembly
    .addNode("assembler", createCyberSecAssemblerNode())

    // Fan-out: start → threat analysis specialists in parallel
    .addEdge("__start__", "vuln-scanner")
    .addEdge("__start__", "threat-modeler")

    // Both threat analysts → supervisor
    .addEdge("vuln-scanner", "supervisor")
    .addEdge("threat-modeler", "supervisor")

    // Supervisor → defense generation in parallel
    .addEdge("supervisor", "secure-code-generator")
    .addEdge("supervisor", "crypto-validator")

    // Both defense generators → pentest planner
    .addEdge("secure-code-generator", "pentest-planner")
    .addEdge("crypto-validator", "pentest-planner")

    // Pentest planner → security scorer
    .addEdge("pentest-planner", "security-scorer")

    // Security scorer → assembler
    .addEdge("security-scorer", "assembler")

    // Assembler → conditional: iterate or end
    .addConditionalEdges("assembler", shouldIterateCyberSec, {
      iterate: "vuln-scanner",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the Cyber Security agent swarm on an application idea.
 *
 * Flow:
 * 1. Resolves the user's best available provider
 * 2. Fans out to 2 threat analysis specialists: Vuln Scanner, Threat Modeler
 * 3. Supervisor merges and cross-references vulnerabilities with threats
 * 4. Fans out to 2 defense generators: Secure Code Generator, Crypto Validator
 * 5. Pentest Planner designs testing strategies against the generated defenses
 * 6. Security Scorer computes comprehensive posture score
 * 7. Assembler produces the final unified cyber security report
 */
export async function runCyberSecSwarm(
  idea: string,
  options?: {
    focus?: "vuln-scan" | "threat-model" | "hardened-code" | "pentest" | "full-audit";
    complianceTargets?: string[];
    maxIterations?: number;
  }
): Promise<CyberSecResult> {
  const provider = await resolveProvider();

  const app = buildCyberSecGraph(provider);

  const finalState = await app.invoke({
    idea,
    focus: options?.focus ?? "full-audit",
    complianceTargets: options?.complianceTargets ?? [],
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as CyberSecState;

  return {
    report: state.cyberSecReport ?? {
      vulnerabilities: [],
      threatModel: {
        methodology: "STRIDE",
        stride_analysis: [],
        attack_scenarios: [],
        trust_boundaries: [],
      },
      securityModules: [],
      cryptoAudit: [],
      pentestPlan: {
        scope: "",
        methodology: "",
        phases: [],
        testing_scripts: [],
        compliance_checks: [],
      },
      securityScore: {
        vulnerability_density: 0,
        threat_coverage: 0,
        code_hardening: 0,
        crypto_strength: 0,
        compliance_readiness: 0,
        overall: 0,
      },
      securityLevel: "Critical",
      semgrepRules: [],
      securityHeaders: { csp: "", headers: [] },
      crossReference: {
        vulns_with_mitigations: 0,
        vulns_without_mitigations: [],
        threats_without_detection: [],
        crypto_inconsistencies: [],
        untested_surfaces: [],
        quality_notes: [],
      },
      verdict: "Cyber security swarm failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
