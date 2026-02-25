import { chatCompletion } from "@/lib/llm";
import { getSwarmAgents } from "./registry";
import { searchMemories } from "@/lib/memory";
import type { Agent, SwarmMessage, SwarmRun } from "@/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Multi-agent swarm orchestrator.
 * Runs agents sequentially in a pipeline: planner → coder → reviewer → tester.
 * Each agent receives the accumulated context from previous agents.
 *
 * Architecture inspired by CrewAI's sequential process:
 * - Each agent has a specialized role and system prompt
 * - Output from one agent feeds into the next
 * - The orchestrator manages state and handles failures
 */

export interface OrchestratorOptions {
  userId: string;
  task: string;
  /** Override which agents to run (defaults to all enabled) */
  agents?: Agent[];
  /** Include relevant memories as context */
  useMemory?: boolean;
  /** Callback fired after each agent completes */
  onAgentComplete?: (message: SwarmMessage) => void;
}

export async function runSwarm(options: OrchestratorOptions): Promise<SwarmRun> {
  const { userId, task, useMemory = true, onAgentComplete } = options;
  const agents = options.agents ?? getSwarmAgents();

  const runId = uuidv4();
  const messages: SwarmMessage[] = [];

  // Gather relevant memories for context
  let memoryContext = "";
  if (useMemory) {
    try {
      const relevantMemories = await searchMemories(userId, task, 3);
      if (relevantMemories.length > 0) {
        memoryContext =
          "\n\n## Relevant Context from Memory\n" +
          relevantMemories.map((m) => `- ${m.content}`).join("\n");
      }
    } catch {
      // Memory search is non-critical; continue without it
    }
  }

  let accumulatedContext = `## Task\n${task}${memoryContext}`;

  for (const agent of agents) {
    try {
      const agentOutput = await chatCompletion(
        [
          { role: "system", content: agent.system_prompt },
          {
            role: "user",
            content: `${accumulatedContext}\n\n---\nYour role: ${agent.role}. Proceed.`,
          },
        ],
        {
          temperature: agent.role === "planner" ? 0.3 : 0.5,
          maxTokens: 3000,
        }
      );

      const message: SwarmMessage = {
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        content: agentOutput,
        timestamp: new Date().toISOString(),
      };

      messages.push(message);
      onAgentComplete?.(message);

      // Feed this agent's output to the next one
      accumulatedContext += `\n\n## ${agent.name} (${agent.role}) Output\n${agentOutput}`;
    } catch (err) {
      const errorMsg: SwarmMessage = {
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        content: `[ERROR] Agent failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      messages.push(errorMsg);
      onAgentComplete?.(errorMsg);
    }
  }

  // The final output is the last successful agent's content
  const lastSuccessful = [...messages].reverse().find((m) => !m.content.startsWith("[ERROR]"));

  return {
    id: runId,
    user_id: userId,
    task,
    messages,
    final_output: lastSuccessful?.content ?? "Swarm failed to produce output.",
    status: messages.some((m) => m.content.startsWith("[ERROR]")) ? "failed" : "completed",
    created_at: new Date().toISOString(),
  };
}
