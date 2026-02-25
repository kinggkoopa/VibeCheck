// ── Core domain types for MetaVibeCoder ──

export interface User {
  id: string;
  email: string;
  created_at: string;
}

/** A single prompt optimization request/response */
export interface PromptOptimization {
  id: string;
  user_id: string;
  original_prompt: string;
  optimized_prompt: string;
  strategy: OptimizationStrategy;
  score_before: number | null;
  score_after: number | null;
  created_at: string;
}

export type OptimizationStrategy =
  | "clarity"
  | "specificity"
  | "chain-of-thought"
  | "few-shot"
  | "role-based";

/** An agent in the multi-agent swarm */
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  system_prompt: string;
  model: string;
  enabled: boolean;
}

export type AgentRole =
  | "planner"
  | "coder"
  | "reviewer"
  | "tester"
  | "documenter";

/** A single turn in a swarm execution */
export interface SwarmMessage {
  agent_id: string;
  agent_name: string;
  role: AgentRole;
  content: string;
  timestamp: string;
}

/** Result of a full swarm orchestration run */
export interface SwarmRun {
  id: string;
  user_id: string;
  task: string;
  messages: SwarmMessage[];
  final_output: string;
  status: "running" | "completed" | "failed";
  created_at: string;
}

/** A critique from the review agent */
export interface Critique {
  id: string;
  user_id: string;
  swarm_run_id: string | null;
  code_snippet: string;
  issues: CritiqueIssue[];
  overall_score: number;
  summary: string;
  created_at: string;
}

export interface CritiqueIssue {
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  line?: number;
  suggestion?: string;
}

/** A memory entry stored in the vector DB */
export interface MemoryEntry {
  id: string;
  user_id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Provider configuration for LLM calls */
export interface LLMProvider {
  name: "openai" | "ollama";
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
