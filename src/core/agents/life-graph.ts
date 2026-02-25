import { StateGraph, Annotation } from "@langchain/langgraph";
import type { LLMProvider } from "@/types";
import { complete } from "@/core/llm/provider";

/**
 * Life Swarm — Personal daily planning agent for non-code tasks.
 *
 * A LangGraph agent swarm for life management:
 *   Prioritizer → Scheduler → Motivator
 *
 * Prioritizer: Takes goals/tasks, ranks by urgency and impact
 * Scheduler: Builds a realistic time-blocked schedule
 * Motivator: Adds encouragement, accountability checkpoints, and tips
 */

// ── State ──

export const LifeAnnotation = Annotation.Root({
  /** Raw user input: goals, tasks, notes for the day */
  input: Annotation<string>,

  /** Prioritized task list from the prioritizer */
  priorities: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Time-blocked schedule from the scheduler */
  schedule: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Final output with motivation and accountability from the motivator */
  finalPlan: Annotation<string>({ reducer: (_, v) => v, default: () => "" }),

  /** Current phase */
  status: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "prioritizing" as const,
  }),
});

export type LifeState = typeof LifeAnnotation.State;

// ── Agent Prompts ──

const LIFE_PROMPTS = {
  prioritizer: `You are a personal productivity coach. Given the user's goals and tasks for the day,
rank them by urgency and impact using an Eisenhower matrix approach.

Output a prioritized list with:
- Priority level (P1 = urgent+important, P2 = important, P3 = nice-to-have)
- Estimated time for each task
- Any dependencies between tasks
- Suggested order of execution

Be realistic about what fits in one day. If overloaded, suggest what to defer.`,

  scheduler: `You are a time management expert. Given a prioritized task list,
create a realistic time-blocked schedule for the day.

Rules:
- Start from current time or morning
- Include breaks (Pomodoro-style: 25 min work / 5 min break)
- Group similar tasks together for flow state
- Leave buffer time for unexpected interruptions (15-20%)
- Include meals and self-care
- End the day at a reasonable hour

Output a clean schedule with time blocks.`,

  motivator: `You are an encouraging accountability partner. Given the day's schedule,
enhance it with:

- A motivational morning kickoff message
- Brief encouragement notes between major blocks
- Realistic completion checkpoints (mark 25%, 50%, 75%, 100%)
- An end-of-day reflection prompt
- One practical productivity tip relevant to the tasks

Keep it genuine and supportive — not cheesy. Be direct and practical.
Output the complete enhanced daily plan.`,
};

// ── Node Factories ──

function createPrioritizerNode(provider: LLMProvider) {
  return async (state: LifeState): Promise<Partial<LifeState>> => {
    const result = await complete(
      provider,
      LIFE_PROMPTS.prioritizer,
      state.input
    );
    return {
      priorities: result,
      status: "scheduling",
    };
  };
}

function createSchedulerNode(provider: LLMProvider) {
  return async (state: LifeState): Promise<Partial<LifeState>> => {
    const context = `## Prioritized Tasks\n${state.priorities}\n\n## Original Request\n${state.input}`;
    const result = await complete(
      provider,
      LIFE_PROMPTS.scheduler,
      context
    );
    return {
      schedule: result,
      status: "motivating",
    };
  };
}

function createMotivatorNode(provider: LLMProvider) {
  return async (state: LifeState): Promise<Partial<LifeState>> => {
    const context = `## Today's Schedule\n${state.schedule}\n\n## Priorities\n${state.priorities}\n\n## Original Goals\n${state.input}`;
    const result = await complete(
      provider,
      LIFE_PROMPTS.motivator,
      context
    );
    return {
      finalPlan: result,
      status: "complete",
    };
  };
}

// ── Graph ──

export function buildLifeGraph(provider: LLMProvider) {
  const graph = new StateGraph(LifeAnnotation)
    .addNode("prioritizer", createPrioritizerNode(provider))
    .addNode("scheduler", createSchedulerNode(provider))
    .addNode("motivator", createMotivatorNode(provider))
    .addEdge("__start__", "prioritizer")
    .addEdge("prioritizer", "scheduler")
    .addEdge("scheduler", "motivator")
    .addEdge("motivator", "__end__");

  return graph.compile();
}

/** Execute the life planning swarm. Returns the final state. */
export async function runLifeSwarm(
  provider: LLMProvider,
  input: string
): Promise<LifeState> {
  const app = buildLifeGraph(provider);

  const finalState = await app.invoke({ input });

  return {
    ...finalState,
    status: "complete",
  } as LifeState;
}
