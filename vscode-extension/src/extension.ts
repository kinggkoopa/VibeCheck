import * as vscode from "vscode";

/**
 * MetaVibeCoder VS Code Extension
 *
 * Commands:
 * - Meta Vibe: Run Swarm on Selection
 * - Meta Vibe: Optimize Prompt
 * - Meta Vibe: Critique Current File
 * - Meta Vibe: Auto-Iterate on Selection
 *
 * Modes:
 * 1. Web bridge: sends requests to the MetaVibeCoder web app (auth via session)
 * 2. Direct API: calls Anthropic directly using the configured API key
 */

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("MetaVibeCoder");

  // ── Run Swarm on Selection ──
  context.subscriptions.push(
    vscode.commands.registerCommand("metaVibe.runSwarm", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor.");
        return;
      }

      const selection = editor.document.getText(editor.selection);
      const code = selection || editor.document.getText();

      if (code.trim().length < 10) {
        vscode.window.showWarningMessage(
          "Select at least 10 characters of code."
        );
        return;
      }

      await runWithProgress("Running critique swarm...", async () => {
        const result = await callMetaVibe("/api/critique", { code });
        showResultPanel(outputChannel, "Critique Swarm", result);
      });
    })
  );

  // ── Optimize Prompt ──
  context.subscriptions.push(
    vscode.commands.registerCommand("metaVibe.optimizePrompt", async () => {
      const prompt = await vscode.window.showInputBox({
        prompt: "Enter the prompt to optimize",
        placeHolder: "Build a habit tracker with AI coaching...",
      });

      if (!prompt || prompt.trim().length < 5) return;

      const strategy = await vscode.window.showQuickPick(
        [
          "best-practice",
          "clarity",
          "specificity",
          "chain-of-thought",
          "few-shot",
          "role-based",
        ],
        { placeHolder: "Select optimization strategy" }
      );

      if (!strategy) return;

      await runWithProgress("Optimizing prompt...", async () => {
        const result = await callMetaVibe("/api/optimize", {
          prompt,
          strategy,
        });
        showResultPanel(outputChannel, "Optimized Prompt", result);
      });
    })
  );

  // ── Critique Current File ──
  context.subscriptions.push(
    vscode.commands.registerCommand("metaVibe.critiqueFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor.");
        return;
      }

      const code = editor.document.getText();
      if (code.trim().length < 10) {
        vscode.window.showWarningMessage("File is too short to critique.");
        return;
      }

      const filename = editor.document.fileName.split("/").pop() ?? "file";

      await runWithProgress(`Critiquing ${filename}...`, async () => {
        const result = await callMetaVibe("/api/critique", { code });
        showResultPanel(outputChannel, `Critique: ${filename}`, result);

        // Show inline diagnostics if we got issues
        if (result?.data?.issues) {
          showDiagnostics(editor.document.uri, result.data.issues);
        }
      });
    })
  );

  // ── Auto-Iterate on Selection ──
  context.subscriptions.push(
    vscode.commands.registerCommand("metaVibe.autoIterate", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor.");
        return;
      }

      const selection = editor.document.getText(editor.selection);
      const code = selection || editor.document.getText();

      if (code.trim().length < 10) {
        vscode.window.showWarningMessage(
          "Select at least 10 characters of code."
        );
        return;
      }

      const maxIter = await vscode.window.showQuickPick(["1", "2", "3"], {
        placeHolder: "Max iteration passes",
      });

      await runWithProgress("Auto-iterating...", async () => {
        const result = await callMetaVibe("/api/iterate", {
          code,
          max_iterations: Number(maxIter ?? 3),
        });

        showResultPanel(outputChannel, "Auto-Iterate", result);

        // Offer to apply the improved code
        if (result?.data?.finalCode) {
          const apply = await vscode.window.showInformationMessage(
            `Vibe Score: ${result.data.finalVibeScore}/100. Apply improved code?`,
            "Apply",
            "Show Diff",
            "Cancel"
          );

          if (apply === "Apply") {
            await editor.edit((edit) => {
              const range = editor.selection.isEmpty
                ? new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(editor.document.getText().length)
                  )
                : editor.selection;
              edit.replace(range, result.data.finalCode);
            });
          } else if (apply === "Show Diff") {
            const uri = vscode.Uri.parse(
              `metavibe:improved-${Date.now()}.tsx`
            );
            const doc = await vscode.workspace.openTextDocument({
              content: result.data.finalCode,
              language: editor.document.languageId,
            });
            await vscode.window.showTextDocument(doc, {
              viewColumn: vscode.ViewColumn.Beside,
            });
          }
        }
      });
    })
  );

  outputChannel.appendLine("MetaVibeCoder extension activated.");
}

export function deactivate() {}

// ── Helpers ──

function getConfig() {
  const config = vscode.workspace.getConfiguration("metaVibe");
  return {
    serverUrl: config.get<string>("serverUrl", "http://localhost:3000"),
    apiKey: config.get<string>("anthropicApiKey", ""),
    model: config.get<string>("defaultModel", "claude-opus-4-20250918"),
  };
}

async function callMetaVibe(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { serverUrl, apiKey } = getConfig();

  // Try web app bridge first
  try {
    const res = await fetch(`${serverUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return (await res.json()) as Record<string, unknown>;
    }

    // If web app is unavailable and we have an API key, fall back to direct
    if (res.status === 401 && apiKey) {
      return callAnthropicDirect(body);
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, string>)?.error ??
        `Server returned ${res.status}`
    );
  } catch (err) {
    // Network error — try direct API if key is configured
    if (apiKey) {
      return callAnthropicDirect(body);
    }
    throw err;
  }
}

async function callAnthropicDirect(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { apiKey, model } = getConfig();

  const code = (body.code as string) ?? (body.prompt as string) ?? "";
  const systemPrompt =
    "You are an expert code reviewer. Analyze the code and return a JSON object with: overall_score (0-100), summary (string), and issues (array of {severity, category, message, suggestion}). Return ONLY valid JSON.";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        { role: "user", content: `${systemPrompt}\n\nCode:\n${code}` },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  const text = data.content?.[0]?.text ?? "";

  try {
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return { data: JSON.parse(cleaned), error: null };
  } catch {
    return { data: { summary: text.slice(0, 500) }, error: null };
  }
}

async function runWithProgress(
  title: string,
  task: () => Promise<void>
): Promise<void> {
  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title },
      async () => {
        await task();
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    vscode.window.showErrorMessage(`MetaVibe: ${msg}`);
  }
}

function showResultPanel(
  channel: vscode.OutputChannel,
  title: string,
  result: Record<string, unknown>
): void {
  channel.clear();
  channel.appendLine(`=== ${title} ===`);
  channel.appendLine(JSON.stringify(result, null, 2));
  channel.show(true);
}

const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("metavibe");

function showDiagnostics(
  uri: vscode.Uri,
  issues: { severity?: string; message?: string; line?: number }[]
): void {
  const diagnostics = issues
    .filter((i) => i.message)
    .map((issue) => {
      const line = Math.max(0, (issue.line ?? 1) - 1);
      const range = new vscode.Range(line, 0, line, 200);
      const severity =
        issue.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : issue.severity === "warning"
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;

      return new vscode.Diagnostic(range, issue.message!, severity);
    });

  diagnosticCollection.set(uri, diagnostics);
}
