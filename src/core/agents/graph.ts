import { StateGraph } from "@langchain/langgraph";
import { SwarmAnnotation, type SwarmState } from "./types";
import {
  createPlannerNode,
  createCoderNode,
  createReviewerNode,
  createTesterNode,
  createInspirationNode,
  createAnimationCriticNode,
  shouldIterate,
} from "./nodes";
import type { LLMProvider } from "@/types";

/**
 * Multi-Agent Critique Swarm — LangGraph State Graph
 *
 * Standard flow:
 *   planner → coder → reviewer → tester → (iterate or complete)
 *
 * Enhanced flow (with creative agents):
 *   planner → inspiration → coder → reviewer → animation-critic → tester → (iterate or complete)
 *
 * The graph auto-iterates up to `maxIterations` times until the
 * reviewer scores the code >= 80 or gives an explicit pass.
 *
 * All LLM calls use the user's BYOK key — no app-level keys.
 */

export interface SwarmOptions {
  /** Enable Inspiration Agent (creative CSS/UI suggestions) */
  enableInspiration?: boolean;
  /** Enable Animation Critic (motion design review) */
  enableAnimationCritic?: boolean;
}

/** Standard 4-agent swarm graph. */
function buildStandardGraph(provider: LLMProvider) {
  return new StateGraph(SwarmAnnotation)
    .addNode("planner", createPlannerNode(provider))
    .addNode("coder", createCoderNode(provider))
    .addNode("reviewer", createReviewerNode(provider))
    .addNode("tester", createTesterNode(provider))
    .addEdge("__start__", "planner")
    .addEdge("planner", "coder")
    .addEdge("coder", "reviewer")
    .addEdge("reviewer", "tester")
    .addConditionalEdges("tester", shouldIterate, {
      iterate: "planner",
      complete: "__end__",
    })
    .compile();
}

/** Enhanced 6-agent swarm graph with Inspiration and Animation Critic. */
function buildEnhancedGraph(provider: LLMProvider) {
  return new StateGraph(SwarmAnnotation)
    .addNode("planner", createPlannerNode(provider))
    .addNode("inspiration", createInspirationNode(provider))
    .addNode("coder", createCoderNode(provider))
    .addNode("reviewer", createReviewerNode(provider))
    .addNode("animation-critic", createAnimationCriticNode(provider))
    .addNode("tester", createTesterNode(provider))
    .addEdge("__start__", "planner")
    .addEdge("planner", "inspiration")
    .addEdge("inspiration", "coder")
    .addEdge("coder", "reviewer")
    .addEdge("reviewer", "animation-critic")
    .addEdge("animation-critic", "tester")
    .addConditionalEdges("tester", shouldIterate, {
      iterate: "planner",
      complete: "__end__",
    })
    .compile();
}

export function buildSwarmGraph(provider: LLMProvider, options?: SwarmOptions) {
  const { enableInspiration = false, enableAnimationCritic = false } = options ?? {};

  if (enableInspiration || enableAnimationCritic) {
    return buildEnhancedGraph(provider);
  }

  return buildStandardGraph(provider);
}

/** Execute the full swarm for a given task. Returns the final state. */
export async function runSwarm(
  provider: LLMProvider,
  task: string,
  maxIterations: number = 3,
  options?: SwarmOptions
): Promise<SwarmState> {
  const app = buildSwarmGraph(provider, options);

  const finalState = await app.invoke({
    task,
    maxIterations,
  });

  return {
    ...finalState,
    status: "complete",
  } as SwarmState;
}
