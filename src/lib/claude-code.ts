import "server-only";

/**
 * Claude Code Integration — Server-Only
 *
 * Generates task files and manages execution of Claude Code CLI tasks.
 * This module handles task file generation, process spawning, and result polling.
 *
 * NOTE: Claude Code CLI must be installed locally. If not detected, the system
 * falls back to direct API calls via the BYOK provider system.
 */

import { spawn } from "child_process";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

// ── Types ──

export interface ClaudeCodeTask {
  id: string;
  idea: string;
  context: string;
  agents: string[];
  use_security_scan: boolean;
  created_at: string;
}

export interface ClaudeCodeResult {
  id: string;
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  output: string | null;
  patches: string[];
  report: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

// ── Task directory ──

const TASK_DIR = join(process.cwd(), ".claude-tasks");

async function ensureTaskDir(): Promise<void> {
  if (!existsSync(TASK_DIR)) {
    await mkdir(TASK_DIR, { recursive: true });
  }
}

// ── Detection ──

let claudeCodeAvailable: boolean | null = null;

/**
 * Check if Claude Code CLI is installed and available.
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  if (claudeCodeAvailable !== null) return claudeCodeAvailable;

  return new Promise((resolve) => {
    const proc = spawn("claude", ["--version"], {
      stdio: "pipe",
      timeout: 5000,
    });

    let output = "";
    proc.stdout?.on("data", (d) => (output += d.toString()));

    proc.on("close", (code) => {
      claudeCodeAvailable = code === 0 && output.length > 0;
      resolve(claudeCodeAvailable);
    });

    proc.on("error", () => {
      claudeCodeAvailable = false;
      resolve(false);
    });
  });
}

// ── Task file generation ──

/**
 * Generate a Claude Code task file for the given parameters.
 * Returns the task ID and file path.
 */
export async function generateTaskFile(params: {
  idea: string;
  context: string;
  agents?: string[];
  useSecurityScan?: boolean;
}): Promise<{ taskId: string; filePath: string; task: ClaudeCodeTask }> {
  await ensureTaskDir();

  const taskId = randomUUID();
  const task: ClaudeCodeTask = {
    id: taskId,
    idea: params.idea,
    context: params.context,
    agents: params.agents ?? ["Architect", "Security", "UX", "Perf"],
    use_security_scan: params.useSecurityScan ?? true,
    created_at: new Date().toISOString(),
  };

  const filePath = join(TASK_DIR, `${taskId}.json`);
  await writeFile(filePath, JSON.stringify(task, null, 2));

  return { taskId, filePath, task };
}

// ── Execution ──

/**
 * Execute a task via Claude Code CLI.
 * Spawns the process and returns the result ID for polling.
 */
export async function executeClaudeCodeTask(
  taskId: string,
  taskFilePath: string
): Promise<{ resultId: string }> {
  const available = await isClaudeCodeAvailable();
  if (!available) {
    throw new Error(
      "Claude Code CLI not detected. Install it or use the direct API fallback."
    );
  }

  await ensureTaskDir();

  const resultId = randomUUID();
  const resultPath = join(TASK_DIR, `result-${resultId}.json`);

  // Write initial pending result
  const initial: ClaudeCodeResult = {
    id: resultId,
    task_id: taskId,
    status: "running",
    output: null,
    patches: [],
    report: null,
    error: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  await writeFile(resultPath, JSON.stringify(initial, null, 2));

  // Spawn Claude Code process
  const proc = spawn(
    "claude",
    [
      "--print",
      "--output-format",
      "json",
      `Review and improve this project task. Task file: ${taskFilePath}`,
    ],
    {
      stdio: "pipe",
      timeout: 300000, // 5 min timeout
      cwd: process.cwd(),
    }
  );

  let stdout = "";
  let stderr = "";

  proc.stdout?.on("data", (d) => (stdout += d.toString()));
  proc.stderr?.on("data", (d) => (stderr += d.toString()));

  proc.on("close", async (code) => {
    const result: ClaudeCodeResult = {
      id: resultId,
      task_id: taskId,
      status: code === 0 ? "completed" : "failed",
      output: stdout || null,
      patches: [],
      report: stdout || null,
      error: code !== 0 ? stderr || `Process exited with code ${code}` : null,
      started_at: initial.started_at,
      completed_at: new Date().toISOString(),
    };
    await writeFile(resultPath, JSON.stringify(result, null, 2));
  });

  proc.on("error", async (err) => {
    const result: ClaudeCodeResult = {
      id: resultId,
      task_id: taskId,
      status: "failed",
      output: null,
      patches: [],
      report: null,
      error: err.message,
      started_at: initial.started_at,
      completed_at: new Date().toISOString(),
    };
    await writeFile(resultPath, JSON.stringify(result, null, 2));
  });

  return { resultId };
}

// ── Polling ──

/**
 * Check the status of a running Claude Code task.
 */
export async function getClaudeCodeResult(
  resultId: string
): Promise<ClaudeCodeResult | null> {
  const resultPath = join(TASK_DIR, `result-${resultId}.json`);

  try {
    const data = await readFile(resultPath, "utf-8");
    return JSON.parse(data) as ClaudeCodeResult;
  } catch {
    return null;
  }
}

/**
 * Generate a shareable task URL for remote control / mobile continuation.
 * Returns a data URI that encodes the task for QR code generation.
 */
export function generateTaskShareUrl(task: ClaudeCodeTask): string {
  const encoded = Buffer.from(JSON.stringify(task)).toString("base64url");
  // Return a deep link that can be used to resume the task
  return `metavibecoder://task/${task.id}?data=${encoded}`;
}
