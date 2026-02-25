#!/usr/bin/env npx ts-node

/**
 * MetaVibeCoder CLI — Local tool for running agents from the terminal.
 *
 * Usage:
 *   npx ts-node cli/index.ts optimize "build habit tracker with AI coach"
 *   npx ts-node cli/index.ts critique [file]
 *   npx ts-node cli/index.ts iterate [file] --max-iter 3
 *   npx ts-node cli/index.ts swarm "task description"
 *
 * Reads ANTHROPIC_API_KEY from environment or .env.local.
 * Reads files from current working directory.
 * Proposes diffs and applies only after user confirms.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename } from "path";
import { createInterface } from "readline";

// ── Config ──

const API_KEY =
  process.env.ANTHROPIC_API_KEY ??
  loadEnvKey("ANTHROPIC_API_KEY") ??
  loadEnvKey("OPENAI_API_KEY");

const MODEL = process.env.META_VIBE_MODEL ?? "claude-opus-4-20250918";
const SERVER_URL =
  process.env.META_VIBE_SERVER ?? "http://localhost:3000";

// ── Helpers ──

function loadEnvKey(name: string): string | undefined {
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const path = resolve(process.cwd(), f);
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      const match = content.match(new RegExp(`^${name}=(.+)$`, "m"));
      if (match) return match[1].trim();
    }
  }
  return undefined;
}

function log(msg: string) {
  console.log(`\x1b[36m[meta-vibe]\x1b[0m ${msg}`);
}

function error(msg: string) {
  console.error(`\x1b[31m[meta-vibe error]\x1b[0m ${msg}`);
}

function success(msg: string) {
  console.log(`\x1b[32m[meta-vibe]\x1b[0m ${msg}`);
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

// ── Anthropic API ──

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "No API key found. Set ANTHROPIC_API_KEY in env or .env.local"
    );
  }

  // Detect provider from key format
  const isAnthropic = API_KEY.startsWith("sk-ant-");
  const baseUrl = isAnthropic
    ? "https://api.anthropic.com/v1/messages"
    : `${SERVER_URL}/api/critique`;

  if (!isAnthropic) {
    // Fallback to server bridge
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: userMessage }),
    });
    const data = await res.json();
    return JSON.stringify(data.data ?? data, null, 2);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  return data.content?.[0]?.text ?? "";
}

// ── Commands ──

async function cmdOptimize(prompt: string) {
  log(`Optimizing prompt: "${prompt.slice(0, 80)}..."`);

  const system = `You are a world-class prompt engineering expert. Apply ALL best practices to rewrite the user's prompt:
1. Add a clear expert persona/role definition
2. Structure with chain-of-thought reasoning
3. Include 1-2 concrete input/output examples
4. Add explicit constraints, edge cases, and quality criteria
5. Specify the exact output format expected
Return ONLY the optimized prompt.`;

  const result = await callAnthropic(system, prompt, { maxTokens: 2048 });

  console.log("\n" + "=".repeat(60));
  console.log("\x1b[33mOptimized Prompt:\x1b[0m\n");
  console.log(result);
  console.log("\n" + "=".repeat(60));
}

async function cmdCritique(filePath?: string) {
  const file = filePath ?? findMainFile();
  if (!file) {
    error("No file specified and could not find a main file in cwd.");
    process.exit(1);
  }

  const resolved = resolve(process.cwd(), file);
  if (!existsSync(resolved)) {
    error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const code = readFileSync(resolved, "utf-8");
  log(`Critiquing ${basename(resolved)} (${code.length} chars)...`);

  const system = `You are an expert code reviewer. Analyze the code and return a JSON object:
{
  "overall_score": <0-100>,
  "summary": "<brief summary>",
  "issues": [
    { "severity": "error|warning|info", "category": "<category>", "message": "<issue>", "line": <line number>, "suggestion": "<fix>" }
  ]
}
Return ONLY valid JSON, no markdown fences.`;

  const raw = await callAnthropic(system, code);
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const result = JSON.parse(cleaned);
    console.log("\n" + "=".repeat(60));
    console.log(
      `\x1b[33mScore:\x1b[0m ${result.overall_score}/100`
    );
    console.log(`\x1b[33mSummary:\x1b[0m ${result.summary}\n`);

    for (const issue of result.issues ?? []) {
      const color =
        issue.severity === "error"
          ? "\x1b[31m"
          : issue.severity === "warning"
            ? "\x1b[33m"
            : "\x1b[36m";
      const line = issue.line ? `:${issue.line}` : "";
      console.log(
        `${color}[${issue.severity.toUpperCase()}]\x1b[0m ${issue.message} (${basename(resolved)}${line})`
      );
      if (issue.suggestion) {
        console.log(`  Fix: ${issue.suggestion}`);
      }
    }
    console.log("=".repeat(60));
  } catch {
    console.log(raw);
  }
}

async function cmdIterate(filePath?: string, maxIter = 3) {
  const file = filePath ?? findMainFile();
  if (!file) {
    error("No file specified and could not find a main file in cwd.");
    process.exit(1);
  }

  const resolved = resolve(process.cwd(), file);
  if (!existsSync(resolved)) {
    error(`File not found: ${resolved}`);
    process.exit(1);
  }

  let code = readFileSync(resolved, "utf-8");
  log(
    `Auto-iterating ${basename(resolved)} (up to ${maxIter} passes)...`
  );

  for (let i = 0; i < maxIter; i++) {
    log(`\n--- Pass ${i + 1}/${maxIter} ---`);

    // Critique
    const critiqueSystem = `Analyze this code. Return JSON: { "score": <0-100>, "issues": [{ "severity": "error|warning|info", "message": "<issue>", "suggestion": "<fix>" }], "summary": "<summary>" }. Return ONLY valid JSON.`;
    const critiqueRaw = await callAnthropic(critiqueSystem, code);
    const critique = safeJsonParse(critiqueRaw, { score: 50, issues: [], summary: "" });

    log(`Score: ${critique.score}/100 — ${critique.summary}`);

    if (critique.score >= 80) {
      success(`Code passed with score ${critique.score}. No more iterations needed.`);
      break;
    }

    // Improve
    const improveSystem = `You are a code improvement specialist. Fix ALL issues from the critique. Maintain the same API/interface. Return ONLY the improved code, no explanations.`;
    const improved = await callAnthropic(
      improveSystem,
      `Code:\n${code}\n\nCritique:\n${critiqueRaw}`,
      { maxTokens: 8192 }
    );

    // Show diff preview
    console.log(`\n\x1b[33m--- Proposed changes (pass ${i + 1}) ---\x1b[0m`);
    console.log(improved.slice(0, 500) + (improved.length > 500 ? "\n...(truncated)" : ""));

    if (i < maxIter - 1) {
      code = improved;
    } else {
      // Last pass — ask to apply
      const apply = await confirm(
        `\nApply improved code to ${basename(resolved)}?`
      );
      if (apply) {
        writeFileSync(resolved, improved);
        success(`Updated ${basename(resolved)}`);
      } else {
        log("Changes discarded.");
      }
    }
  }
}

async function cmdSwarm(task: string) {
  log(`Running swarm on task: "${task.slice(0, 80)}..."`);

  const agents = ["Architect", "Security", "UX", "Performance"];

  for (const agent of agents) {
    log(`[${agent}] Analyzing...`);

    const system = `You are a ${agent.toLowerCase()} specialist. Analyze the task and provide focused critique from your perspective. Be concise (3-5 bullet points). Return plain text.`;

    const result = await callAnthropic(system, task, { maxTokens: 1024 });

    console.log(`\n\x1b[33m=== ${agent} ===\x1b[0m`);
    console.log(result);
  }

  console.log("\n" + "=".repeat(60));
  success("Swarm complete.");
}

// ── Utilities ──

function findMainFile(): string | null {
  const candidates = [
    "src/app/page.tsx",
    "src/index.ts",
    "src/main.ts",
    "index.ts",
    "index.tsx",
    "main.ts",
  ];
  for (const c of candidates) {
    if (existsSync(resolve(process.cwd(), c))) return c;
  }
  return null;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    console.log(`
\x1b[36mMetaVibeCoder CLI\x1b[0m

Usage:
  meta-vibe optimize "<prompt>"          Optimize a prompt with best practices
  meta-vibe critique [file]              Critique a file (default: auto-detect)
  meta-vibe iterate [file] [--max N]     Auto-iterate with critique loop
  meta-vibe swarm "<task>"               Run multi-agent swarm on a task

Options:
  --max N    Max iteration passes (default: 3)

Environment:
  ANTHROPIC_API_KEY     Your Anthropic API key
  META_VIBE_MODEL       Model to use (default: claude-opus-4-20250918)
  META_VIBE_SERVER      Web app URL for bridge mode (default: http://localhost:3000)
`);
    return;
  }

  try {
    switch (command) {
      case "optimize":
        if (!args[1]) {
          error('Usage: meta-vibe optimize "<prompt>"');
          process.exit(1);
        }
        await cmdOptimize(args.slice(1).join(" "));
        break;

      case "critique":
        await cmdCritique(args[1]);
        break;

      case "iterate": {
        const maxIdx = args.indexOf("--max");
        const maxIter = maxIdx !== -1 ? Number(args[maxIdx + 1]) || 3 : 3;
        const file = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
        await cmdIterate(file, maxIter);
        break;
      }

      case "swarm":
        if (!args[1]) {
          error('Usage: meta-vibe swarm "<task>"');
          process.exit(1);
        }
        await cmdSwarm(args.slice(1).join(" "));
        break;

      default:
        error(`Unknown command: ${command}. Run 'meta-vibe help' for usage.`);
        process.exit(1);
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
