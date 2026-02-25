// ── MetaVibeCoder v1 — Domain Types ──

/** Supported BYOK LLM providers */
export type LLMProvider = "anthropic" | "openrouter" | "groq" | "openai" | "ollama";

/** A user's stored API key (metadata only — never includes the raw key) */
export interface UserLLMKey {
  id: string;
  provider: LLMProvider;
  display_label: string;
  model_default: string | null;
  is_active: boolean;
  key_hint: string;
  validated_at: string | null;
  created_at: string;
}

/** Prompt optimization strategies */
export type OptimizationStrategy =
  | "clarity"
  | "specificity"
  | "chain-of-thought"
  | "few-shot"
  | "role-based"
  | "best-practice";

/** A prompt optimization record */
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

/** Agent roles in the swarm */
export type AgentRole = "planner" | "coder" | "reviewer" | "tester";

/** A message from one agent in a swarm run */
export interface SwarmMessage {
  agent_name: string;
  role: AgentRole;
  content: string;
  timestamp: string;
}

/** A complete swarm execution run */
export interface SwarmRun {
  id: string;
  user_id: string;
  task: string;
  messages: SwarmMessage[];
  final_output: string;
  status: "running" | "completed" | "failed";
  iteration: number;
  created_at: string;
}

/** An issue found during code critique */
export interface CritiqueIssue {
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  line?: number;
  suggestion?: string;
}

/** A code critique result */
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

/** A vector memory entry */
export interface MemoryEntry {
  id: string;
  user_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
  created_at: string;
}

/** A saved prompt in the library */
export interface PromptLibraryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  usage_count: number;
  created_at: string;
}

/** Analytics event types */
export type AnalyticsEventType =
  | "optimization"
  | "swarm_run"
  | "critique"
  | "memory_store"
  | "memory_search";

/** An analytics event */
export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: AnalyticsEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Generic API response envelope */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/** Provider config passed to the LLM factory */
export interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** Supported model entry */
export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  isDefault?: boolean;
}

/** LangGraph agent swarm state */
export interface SwarmState {
  task: string;
  plan: string;
  code: string;
  review: string;
  testResults: string;
  messages: SwarmMessage[];
  iteration: number;
  maxIterations: number;
  status: "planning" | "coding" | "reviewing" | "testing" | "complete" | "failed";
}
