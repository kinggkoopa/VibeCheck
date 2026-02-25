import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoIterate } from "@/features/iterate/actions";
import { checkLlmRateLimit, validateInputSize, MAX_SIZES } from "@/lib/security";

/**
 * POST /api/iterate — Auto-iterate on code.
 *
 * Body: { code: string, max_iterations?: number }
 *
 * Runs the critique → test-gen → preview → vibe-check → refine loop
 * up to max_iterations (default 3, max 3). Returns the full iteration
 * history with phase results, final code, and vibe score.
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

    const rateLimited = await checkLlmRateLimit(user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { code, max_iterations } = body;

    if (!code || typeof code !== "string" || code.trim().length < 10) {
      return NextResponse.json(
        { error: "Code is required (min 10 characters)" },
        { status: 400 }
      );
    }

    const sizeErr = validateInputSize(code, MAX_SIZES.code, "Code");
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    const result = await autoIterate(code, max_iterations ?? 3);

    if (!result.success) {
      return NextResponse.json(
        { data: null, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
