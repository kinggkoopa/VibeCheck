import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge Middleware — Security headers + Auth session + Route protection + CSRF.
 *
 * Layers:
 * 1. Security headers (CSP, X-Frame-Options, HSTS, etc.)
 * 2. CSRF token validation for mutating API requests
 * 3. Supabase session refresh
 * 4. Route-based auth redirects
 */

// ── Security headers applied to every response ──

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "on",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://openrouter.ai https://api.openai.com https://api.groq.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

// ── CSRF protection ──

const CSRF_COOKIE = "mvc-csrf";
const CSRF_HEADER = "x-csrf-token";

/** Generate a random CSRF token. */
function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Check if a request requires CSRF validation. */
function requiresCsrf(method: string, pathname: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return false;
  // Only enforce CSRF on API routes (server actions use their own protection)
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/");
}

// ── Protected route patterns ──

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/optimizer",
  "/agents",
  "/critique",
  "/memory",
  "/analytics",
  "/iterate",
  "/tools",
];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // ── 1. Apply security headers ──
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // ── 2. CSRF token management ──
  const existingCsrf = request.cookies.get(CSRF_COOKIE)?.value;

  if (!existingCsrf) {
    // Set a new CSRF token cookie on first visit
    const token = generateCsrfToken();
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // JS must read it to send in headers
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  // Validate CSRF on mutating API requests
  if (requiresCsrf(request.method, request.nextUrl.pathname)) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token." },
        { status: 403, headers: Object.fromEntries(Object.entries(SECURITY_HEADERS)) }
      );
    }
  }

  // ── 3. Supabase session refresh ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session — MUST be called before getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── 4. Route protection ──
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authed users away from auth pages
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
