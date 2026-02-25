/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * Used for:
 * - Sentry initialization (install @sentry/nextjs when ready)
 * - Global error handlers
 * - Startup logging
 *
 * To enable Sentry:
 *   1. npm install @sentry/nextjs
 *   2. Set SENTRY_DSN in your environment
 *   3. Uncomment the Sentry init block below
 */

export async function register() {
  // Sentry setup — uncomment after installing @sentry/nextjs
  // if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   const Sentry = await import("@sentry/nextjs");
  //   Sentry.init({
  //     dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  //     environment: process.env.NODE_ENV,
  //     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  //     debug: false,
  //     ignoreErrors: [
  //       "NEXT_NOT_FOUND",
  //       "NEXT_REDIRECT",
  //       "AbortError",
  //       "TypeError: Failed to fetch",
  //     ],
  //   });
  // }

  console.log(
    `[instrumentation] MetaVibeCoder server started (${process.env.NODE_ENV})`
  );
}
