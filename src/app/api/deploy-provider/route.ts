import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";

/**
 * POST /api/deploy-provider — Trigger deployment to Vercel or Netlify.
 *
 * Body: {
 *   provider: "vercel" | "netlify",
 *   hookUrl: string,       // Deploy hook URL
 *   branch?: string,       // Branch to deploy
 * }
 *
 * Vercel: Triggers deploy via webhook URL.
 * Netlify: Triggers build via build hook URL.
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

    const { provider, hookUrl, branch } = await request.json();

    if (!provider || !["vercel", "netlify"].includes(provider)) {
      return NextResponse.json(
        { error: "Provider must be 'vercel' or 'netlify'" },
        { status: 400 }
      );
    }
    if (!hookUrl || typeof hookUrl !== "string") {
      return NextResponse.json(
        { error: "Deploy hook URL is required" },
        { status: 400 }
      );
    }

    // Validate URL is a legitimate deploy hook
    const url = new URL(hookUrl);
    if (provider === "vercel" && !url.hostname.endsWith("vercel.com")) {
      return NextResponse.json(
        { error: "Invalid Vercel deploy hook URL" },
        { status: 400 }
      );
    }
    if (provider === "netlify" && !url.hostname.endsWith("netlify.com")) {
      return NextResponse.json(
        { error: "Invalid Netlify deploy hook URL" },
        { status: 400 }
      );
    }

    // Trigger deploy
    const deployBody = branch ? JSON.stringify({ branch }) : undefined;
    const deployRes = await fetch(hookUrl, {
      method: "POST",
      headers: deployBody ? { "Content-Type": "application/json" } : {},
      body: deployBody,
    });

    if (!deployRes.ok) {
      throw new Error(`Deploy trigger failed: ${deployRes.status}`);
    }

    // Log analytics
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "deploy_trigger",
        metadata: { provider, branch },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      data: {
        message: `Deploy triggered on ${provider}${branch ? ` (branch: ${branch})` : ""}.`,
        provider,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
