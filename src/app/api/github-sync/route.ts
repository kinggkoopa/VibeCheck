import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";

/**
 * POST /api/github-sync — Full Ship: create branch, commit, push, open PR, optionally deploy.
 *
 * Body: {
 *   code: string,
 *   title: string,
 *   description?: string,
 *   branch?: string,
 *   autoMerge?: boolean,
 *   deploy?: boolean,
 * }
 *
 * Uses GitHub token from user_settings (stored by the user in Settings).
 * Uses Octokit-compatible REST API calls.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkApiRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const { code, title, description, branch, autoMerge, deploy } = await request.json();

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return NextResponse.json({ error: "Code is required (min 10 chars)" }, { status: 400 });
    }
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get GitHub token and repo from user settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("github_token, github_default_repo")
      .eq("user_id", user.id)
      .single();

    if (!settings?.github_token) {
      return NextResponse.json(
        { error: "GitHub token not configured. Add it in Settings." },
        { status: 400 }
      );
    }
    if (!settings?.github_default_repo) {
      return NextResponse.json(
        { error: "Default GitHub repo not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    const token = settings.github_token;
    const repo = settings.github_default_repo; // format: "owner/repo"
    const [owner, repoName] = repo.split("/");

    if (!owner || !repoName) {
      return NextResponse.json(
        { error: "Invalid repo format. Expected 'owner/repo'." },
        { status: 400 }
      );
    }

    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    const branchName = branch ?? `metavibe/${Date.now()}-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;

    // 1. Get default branch SHA
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: ghHeaders,
    });
    if (!repoRes.ok) {
      throw new Error(`GitHub repo not found or no access: ${repoRes.status}`);
    }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch ?? "main";

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`,
      { headers: ghHeaders }
    );
    if (!refRes.ok) throw new Error("Failed to get default branch ref");
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // 2. Create branch
    const createBranchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
      }
    );
    if (!createBranchRes.ok) {
      const err = await createBranchRes.json().catch(() => ({}));
      throw new Error(`Failed to create branch: ${err.message ?? createBranchRes.status}`);
    }

    // 3. Create blob (code content)
    const blobRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/blobs`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ content: code, encoding: "utf-8" }),
      }
    );
    if (!blobRes.ok) throw new Error("Failed to create blob");
    const blobData = await blobRes.json();

    // 4. Create tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          base_tree: baseSha,
          tree: [
            {
              path: `metavibe-output/${title.replace(/\s+/g, "-").toLowerCase()}.tsx`,
              mode: "100644",
              type: "blob",
              sha: blobData.sha,
            },
          ],
        }),
      }
    );
    if (!treeRes.ok) throw new Error("Failed to create tree");
    const treeData = await treeRes.json();

    // 5. Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          message: `feat(metavibe): ${title}`,
          tree: treeData.sha,
          parents: [baseSha],
        }),
      }
    );
    if (!commitRes.ok) throw new Error("Failed to create commit");
    const commitData = await commitRes.json();

    // 6. Update branch ref
    await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${branchName}`,
      {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ sha: commitData.sha }),
      }
    );

    // 7. Create PR
    const prBody = [
      description ?? `Auto-generated by MetaVibeCoder.`,
      "",
      "---",
      `Branch: \`${branchName}\``,
      `Generated at: ${new Date().toISOString()}`,
    ].join("\n");

    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/pulls`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          title: `[MetaVibe] ${title}`,
          body: prBody,
          head: branchName,
          base: defaultBranch,
        }),
      }
    );
    if (!prRes.ok) throw new Error("Failed to create PR");
    const prData = await prRes.json();

    // 8. Optional: Auto-merge
    if (autoMerge && prData.number) {
      try {
        await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/pulls/${prData.number}/merge`,
          {
            method: "PUT",
            headers: ghHeaders,
            body: JSON.stringify({ merge_method: "squash" }),
          }
        );
      } catch {
        // Auto-merge may fail if branch protection is on — non-fatal
      }
    }

    // 9. Optional: Trigger deploy
    let deployStatus: string | null = null;
    if (deploy) {
      deployStatus = "Deploy trigger not yet configured — PR created for manual deploy.";
    }

    // Log analytics
    await supabase.from("analytics").insert({
      user_id: user.id,
      event_type: "full_ship",
      metadata: {
        repo,
        branch: branchName,
        pr_number: prData.number,
        pr_url: prData.html_url,
        auto_merge: autoMerge ?? false,
        deploy: deploy ?? false,
      },
    });

    return NextResponse.json({
      data: {
        branch: branchName,
        commit_sha: commitData.sha,
        pr_number: prData.number,
        pr_url: prData.html_url,
        auto_merged: autoMerge ?? false,
        deploy_status: deployStatus,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
