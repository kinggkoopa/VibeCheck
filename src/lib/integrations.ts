import "server-only";

/**
 * Tool Belt — External Integrations Library (Server-Only)
 *
 * Export adapters for v0, Replit, CodeSandbox, StackBlitz, and GitHub Gist.
 * Each adapter formats code for the target platform and returns either
 * a URL for redirect or a payload for API-based creation.
 *
 * SECURITY: GitHub Gist creation requires a user-provided PAT.
 * All other integrations use URL-based export (no server-side tokens).
 */

// ── Types ──

export type IntegrationTool =
  | "v0"
  | "replit"
  | "codesandbox"
  | "stackblitz"
  | "gist";

export interface ToolInfo {
  id: IntegrationTool;
  name: string;
  description: string;
  color: string;
  urlBased: boolean;
  supportsAutoExport: boolean;
}

export interface ExportPayload {
  code: string;
  filename: string;
  language: string;
  title?: string;
  description?: string;
}

export interface ExportResult {
  success: boolean;
  tool: IntegrationTool;
  url: string | null;
  method: "redirect" | "api" | "clipboard";
  error: string | null;
  payload?: Record<string, unknown>;
}

// ── Tool Registry ──

export const TOOLS: ToolInfo[] = [
  {
    id: "v0",
    name: "v0 by Vercel",
    description: "Generate UI components from prompts. Paste code to iterate with AI.",
    color: "#000000",
    urlBased: true,
    supportsAutoExport: true,
  },
  {
    id: "replit",
    name: "Replit",
    description: "Cloud IDE with instant deploy. Run and share code in the browser.",
    color: "#F26207",
    urlBased: true,
    supportsAutoExport: true,
  },
  {
    id: "codesandbox",
    name: "CodeSandbox",
    description: "Instant dev environments. Preview React/Next.js projects live.",
    color: "#151515",
    urlBased: true,
    supportsAutoExport: true,
  },
  {
    id: "stackblitz",
    name: "StackBlitz",
    description: "Full-stack web IDE powered by WebContainers. Zero-install Node.js.",
    color: "#1389FD",
    urlBased: true,
    supportsAutoExport: true,
  },
  {
    id: "gist",
    name: "GitHub Gist",
    description: "Share code snippets instantly. Supports versioning and comments.",
    color: "#24292F",
    urlBased: false,
    supportsAutoExport: true,
  },
];

export function getToolInfo(id: IntegrationTool): ToolInfo | undefined {
  return TOOLS.find((t) => t.id === id);
}

// ── Language detection ──

function detectLanguage(code: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext) {
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "typescriptreact",
      js: "javascript",
      jsx: "javascriptreact",
      py: "python",
      rs: "rust",
      go: "go",
      css: "css",
      html: "html",
      json: "json",
      md: "markdown",
      sql: "sql",
    };
    if (map[ext]) return map[ext];
  }

  // Heuristic detection
  if (code.includes("import React") || code.includes("\"use client\"")) return "typescriptreact";
  if (code.includes(": string") || code.includes("interface ")) return "typescript";
  if (code.includes("def ") && code.includes(":")) return "python";
  if (code.includes("func ") && code.includes("package ")) return "go";
  return "typescript";
}

// ── v0 Export ──

function buildV0Export(payload: ExportPayload): ExportResult {
  // v0 uses a URL-based prompt interface
  // Encode the code as a prompt for v0 to iterate on
  const prompt = `Improve this code:\n\n\`\`\`${payload.language}\n${payload.code}\n\`\`\``;
  const encoded = encodeURIComponent(prompt);

  // v0.dev accepts prompts via URL
  const url = `https://v0.dev/chat?q=${encoded}`;

  return {
    success: true,
    tool: "v0",
    url,
    method: "redirect",
    error: null,
  };
}

// ── Replit Export ──

function buildReplitExport(payload: ExportPayload): ExportResult {
  // Replit supports importing from GitHub or direct creation
  // Use the Replit "new repl" URL with language preset
  const langMap: Record<string, string> = {
    typescript: "nodejs",
    typescriptreact: "nextjs",
    javascript: "nodejs",
    javascriptreact: "react",
    python: "python3",
    go: "go",
    rust: "rust",
  };

  const replLang = langMap[payload.language] ?? "nodejs";
  const url = `https://replit.com/new/${replLang}`;

  return {
    success: true,
    tool: "replit",
    url,
    method: "redirect",
    error: null,
    payload: {
      code: payload.code,
      filename: payload.filename,
      instruction: `Paste the exported code into ${payload.filename} after creating the Repl.`,
    },
  };
}

// ── CodeSandbox Export ──

function buildCodeSandboxExport(payload: ExportPayload): ExportResult {
  // CodeSandbox supports defining sandboxes via URL parameters
  // Use the define API to create a sandbox with the code
  const files: Record<string, { content: string }> = {
    [payload.filename]: { content: payload.code },
  };

  // For React/Next.js files, add a basic package.json
  if (payload.language.includes("react") || payload.language.includes("typescript")) {
    files["package.json"] = {
      content: JSON.stringify(
        {
          name: payload.title ?? "metavibecoder-export",
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
            next: "^15.0.0",
            typescript: "^5.7.0",
          },
        },
        null,
        2
      ),
    };
  }

  // CodeSandbox define API uses compressed parameters
  // For simplicity, use the import endpoint with base64-encoded files
  const compressed = Buffer.from(JSON.stringify({ files })).toString("base64url");
  const url = `https://codesandbox.io/api/v1/sandboxes/define?json=1&parameters=${compressed}`;

  return {
    success: true,
    tool: "codesandbox",
    url: `https://codesandbox.io/s`,
    method: "redirect",
    error: null,
    payload: {
      files,
      defineUrl: url,
      instruction: "Use the CodeSandbox import to create a new sandbox with this code.",
    },
  };
}

// ── StackBlitz Export ──

function buildStackBlitzExport(payload: ExportPayload): ExportResult {
  // StackBlitz supports creating projects from URL-encoded data
  const projectData = {
    title: payload.title ?? "MetaVibeCoder Export",
    description: payload.description ?? "Exported from MetaVibeCoder",
    files: {
      [payload.filename]: payload.code,
    },
    template: payload.language.includes("react") ? "node" : "node",
  };

  // StackBlitz SDK URL format
  const url = `https://stackblitz.com/edit/node-${Date.now().toString(36)}`;

  return {
    success: true,
    tool: "stackblitz",
    url,
    method: "redirect",
    error: null,
    payload: {
      project: projectData,
      openFile: payload.filename,
      instruction: "The code has been copied to clipboard. Paste it into the StackBlitz editor.",
    },
  };
}

// ── GitHub Gist Export ──

async function buildGistExport(
  payload: ExportPayload,
  githubToken?: string
): Promise<ExportResult> {
  // If no token, fall back to clipboard + manual gist creation URL
  if (!githubToken) {
    return {
      success: true,
      tool: "gist",
      url: "https://gist.github.com",
      method: "clipboard",
      error: null,
      payload: {
        code: payload.code,
        filename: payload.filename,
        instruction: "Code copied. Click the URL to create a new Gist and paste your code.",
      },
    };
  }

  // Create gist via API
  try {
    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        description: payload.description ?? `MetaVibeCoder: ${payload.title ?? payload.filename}`,
        public: false,
        files: {
          [payload.filename]: { content: payload.code },
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        success: false,
        tool: "gist",
        url: null,
        method: "api",
        error: `GitHub API error (${res.status}): ${errBody.slice(0, 200)}`,
      };
    }

    const gist = (await res.json()) as { html_url: string };
    return {
      success: true,
      tool: "gist",
      url: gist.html_url,
      method: "api",
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      tool: "gist",
      url: null,
      method: "api",
      error: err instanceof Error ? err.message : "Failed to create Gist.",
    };
  }
}

// ── Public API ──

/**
 * Export code to an external tool.
 *
 * For URL-based tools (v0, Replit, CodeSandbox, StackBlitz), returns a URL to open.
 * For API-based tools (GitHub Gist), creates the resource and returns the URL.
 * All exports also copy code to clipboard via the client-side handler.
 */
export async function exportToTool(
  tool: IntegrationTool,
  payload: ExportPayload,
  options?: { githubToken?: string }
): Promise<ExportResult> {
  // Ensure language is detected
  const resolvedPayload = {
    ...payload,
    language: payload.language || detectLanguage(payload.code, payload.filename),
  };

  switch (tool) {
    case "v0":
      return buildV0Export(resolvedPayload);
    case "replit":
      return buildReplitExport(resolvedPayload);
    case "codesandbox":
      return buildCodeSandboxExport(resolvedPayload);
    case "stackblitz":
      return buildStackBlitzExport(resolvedPayload);
    case "gist":
      return buildGistExport(resolvedPayload, options?.githubToken);
    default:
      return {
        success: false,
        tool,
        url: null,
        method: "redirect",
        error: `Unknown tool: ${tool}`,
      };
  }
}

/**
 * Generate auto-export payloads for all tools at once.
 * Used by the ToolOrchestrator to pre-compute export URLs.
 */
export async function autoExportAll(
  payload: ExportPayload,
  options?: { githubToken?: string }
): Promise<Record<IntegrationTool, ExportResult>> {
  const results = await Promise.all(
    TOOLS.map(async (t) => {
      const result = await exportToTool(t.id, payload, options);
      return [t.id, result] as const;
    })
  );

  return Object.fromEntries(results) as Record<IntegrationTool, ExportResult>;
}
