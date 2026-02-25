import { complete } from "@/core/llm/provider";
import { AGENT_PROMPTS, type SwarmState } from "./types";
import type { LLMProvider, SwarmMessage } from "@/types";

/**
 * Agent Node Functions for LangGraph
 *
 * Each function is a node in the state graph. It receives the current state,
 * calls the LLM, and returns a partial state update.
 *
 * All nodes use the user's BYOK key via the `complete()` helper.
 */

function msg(agent_name: string, role: SwarmMessage["role"], content: string): SwarmMessage {
  return { agent_name, role, content, timestamp: new Date().toISOString() };
}

/** Planner: decomposes the task into an actionable plan */
export function createPlannerNode(provider: LLMProvider) {
  return async (state: SwarmState): Promise<Partial<SwarmState>> => {
    const context = state.iteration > 0
      ? `\n\nPrevious review feedback:\n${state.review}\n\nPrevious test results:\n${state.testResults}\n\nRevise the plan to address these issues.`
      : "";

    const result = await complete(
      provider,
      AGENT_PROMPTS.planner,
      `Task: ${state.task}${context}`,
      { temperature: 0.3 }
    );

    return {
      plan: result,
      status: "coding",
      messages: [msg("Planner", "planner", result)],
    };
  };
}

/** Coder: implements the plan as production code */
export function createCoderNode(provider: LLMProvider) {
  return async (state: SwarmState): Promise<Partial<SwarmState>> => {
    const prompt = state.iteration > 0
      ? `Revise this code based on review feedback.\n\nOriginal plan:\n${state.plan}\n\nCurrent code:\n${state.code}\n\nReview feedback:\n${state.review}\n\nTest results:\n${state.testResults}`
      : `Implement this plan:\n\n${state.plan}`;

    const result = await complete(
      provider,
      AGENT_PROMPTS.coder,
      prompt,
      { temperature: 0.2, maxTokens: 8192 }
    );

    return {
      code: result,
      status: "reviewing",
      messages: [msg("Coder", "coder", result)],
    };
  };
}

/** Reviewer: critiques the code for quality, security, and correctness */
export function createReviewerNode(provider: LLMProvider) {
  return async (state: SwarmState): Promise<Partial<SwarmState>> => {
    const result = await complete(
      provider,
      AGENT_PROMPTS.reviewer,
      `Task: ${state.task}\n\nPlan:\n${state.plan}\n\nCode to review:\n${state.code}`,
      { temperature: 0.4 }
    );

    return {
      review: result,
      status: "testing",
      messages: [msg("Reviewer", "reviewer", result)],
    };
  };
}

/** Tester: evaluates the code and determines if it passes */
export function createTesterNode(provider: LLMProvider) {
  return async (state: SwarmState): Promise<Partial<SwarmState>> => {
    const result = await complete(
      provider,
      AGENT_PROMPTS.tester,
      `Task: ${state.task}\n\nCode:\n${state.code}\n\nReview notes:\n${state.review}`,
      { temperature: 0.3 }
    );

    return {
      testResults: result,
      iteration: state.iteration + 1,
      messages: [msg("Tester", "tester", result)],
    };
  };
}

/** Inspiration Agent: suggests creative CSS/UI patterns from Jhey references */
export function createInspirationNode(provider: LLMProvider) {
  return async (state: SwarmState): Promise<Partial<SwarmState>> => {
    const result = await complete(
      provider,
      AGENT_PROMPTS.inspiration,
      `Task: ${state.task}\n\nPlan:\n${state.plan}\n\nSuggest creative CSS/UI approaches for this implementation.`,
      { temperature: 0.8 }
    );

    return {
      inspiration: result,
      messages: [msg("Inspiration", "inspiration", result)],
    };
  };
}

/** Animation Critic: evaluates animations and transitions for quality */
export function createAnimationCriticNode(provider: LLMProvider) {
  return async (state: SwarmState): Promise<Partial<SwarmState>> => {
    const result = await complete(
      provider,
      AGENT_PROMPTS["animation-critic"],
      `Task: ${state.task}\n\nCode:\n${state.code}\n\nReview the animations and transitions in this code.`,
      { temperature: 0.4 }
    );

    return {
      animationReview: result,
      messages: [msg("Animation Critic", "animation-critic", result)],
    };
  };
}

/**
 * Routing function: decides whether to iterate or complete.
 * Returns "iterate" if the review score is < 80 and we haven't hit max iterations.
 * Returns "complete" otherwise.
 */
export function shouldIterate(state: SwarmState): "iterate" | "complete" {
  if (state.iteration >= state.maxIterations) return "complete";

  // Check if the review contains a passing score (80+)
  const scoreMatch = state.review.match(/(?:score|rating)[:\s]*(\d+)/i);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1], 10);
    if (score >= 80) return "complete";
  }

  // Check for explicit pass signals
  const passSignals = ["production-ready", "looks good", "approved", "no issues"];
  const reviewLower = state.review.toLowerCase();
  if (passSignals.some((s) => reviewLower.includes(s))) return "complete";

  return "iterate";
}
