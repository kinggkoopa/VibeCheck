import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/security";
import {
  scanReferenceFolder,
  saveReferenceIndex,
  loadReferenceIndex,
} from "@/lib/reference-sync";

/**
 * POST /api/reference-scan — Scan a local folder for CSS/HTML reference snippets.
 *
 * Body: { folderPath: string }
 * Returns: { data: { count, categories, lastScanned }, error: null }
 *
 * GET /api/reference-scan — Get current reference index status.
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

    const { folderPath } = await request.json();

    if (!folderPath || typeof folderPath !== "string" || folderPath.trim().length < 2) {
      return NextResponse.json(
        { error: "folderPath is required" },
        { status: 400 }
      );
    }

    // Scan the folder
    const index = await scanReferenceFolder(folderPath.trim());

    // Save to user settings
    await saveReferenceIndex(index);

    // Categorize results
    const categories: Record<string, number> = {};
    for (const snippet of index.snippets) {
      categories[snippet.category] = (categories[snippet.category] ?? 0) + 1;
    }

    // Log analytics
    try {
      await supabase.from("analytics").insert({
        user_id: user.id,
        event_type: "reference_scan",
        metadata: {
          folder: folderPath,
          count: index.snippets.length,
          categories,
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      data: {
        count: index.snippets.length,
        categories,
        lastScanned: index.lastScanned,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const index = await loadReferenceIndex();

    if (!index) {
      return NextResponse.json({
        data: { configured: false, count: 0 },
        error: null,
      });
    }

    const categories: Record<string, number> = {};
    for (const snippet of index.snippets) {
      categories[snippet.category] = (categories[snippet.category] ?? 0) + 1;
    }

    return NextResponse.json({
      data: {
        configured: true,
        count: index.snippets.length,
        categories,
        lastScanned: index.lastScanned,
        folderPath: index.folderPath,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
