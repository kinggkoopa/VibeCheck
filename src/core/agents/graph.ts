import { StateGraph } from "@langchain/langgraph";
import { SwarmAnnotation, type SwarmState } from "./types";
import {
  createPlannerNode,
  createCoderNode,
  createReviewerNode,
  createTesterNode,
  shouldIterate,
} from "./nodes";
import type { LLMProvider } from "@/types";

/**
 * Multi-Agent Critique Swarm — LangGraph State Graph
 *
 * Flow:
 *   planner → coder → reviewer → tester → (iterate or complete)
 *                                    ↑                |
 *                                    └── if score<80 ─┘
 *
 * The graph auto-iterates up to `maxIterations` times until the
 * reviewer scores the code >= 80 or gives an explicit pass.
 *
 * All LLM calls use the user's BYOK key — no app-level keys.
 */
export function buildSwarmGraph(provider: LLMProvider) {
  const graph = new StateGraph(SwarmAnnotation)
    .addNode("planner", createPlannerNode(provider))
    .addNode("coder", createCoderNode(provider))
    .addNode("reviewer", createReviewerNode(provider))
    .addNode("tester", createTesterNode(provider))

    // Linear flow: planner → coder → reviewer → tester
    .addEdge("__start__", "planner")
    .addEdge("planner", "coder")
    .addEdge("coder", "reviewer")
    .addEdge("reviewer", "tester")

    // Conditional: tester decides to iterate or complete
    .addConditionalEdges("tester", shouldIterate, {
      iterate: "planner",
      complete: "__end__",
    });

  return graph.compile();
}

/** Execute the full swarm for a given task. Returns the final state. */
export async function runSwarm(
  provider: LLMProvider,
  task: string,
  maxIterations: number = 3
): Promise<SwarmState> {
  const app = buildSwarmGraph(provider);

  const finalState = await app.invoke({
    task,
    maxIterations,
  });

  return {
    ...finalState,
    status: "complete",
  } as SwarmState;
}
