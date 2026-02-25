import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth callback handler.
 * Supabase redirects here after authentication.
 * Exchanges the auth code for a session, then redirects to the dashboard.
 *
 * SECURITY: Validates redirect URL to prevent open redirect attacks.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";

  // Validate redirect to prevent open redirect attacks
  const next = validateRedirect(rawNext, origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

/** Only allow same-origin relative paths. */
function validateRedirect(url: string, origin: string): string {
  if (!url.startsWith("/")) return "/dashboard";
  if (url.startsWith("//")) return "/dashboard";
  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== origin) return "/dashboard";
    return parsed.pathname + parsed.search;
  } catch {
    return "/dashboard";
  }
}
