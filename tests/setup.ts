/**
 * Jest global setup for MetaVibeCoder tests.
 *
 * This file runs before every test suite. It:
 * - Mocks server-only modules (Supabase, crypto)
 * - Sets up environment variables for test context
 * - Provides test utilities for common assertions
 */

// ── Mock environment variables ──
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// ── Mock server-only import (prevents build-time guard in tests) ──
jest.mock("server-only", () => ({}));

// ── Mock Supabase server client ──
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

// ── Global test timeout (LLM calls can be slow in integration tests) ──
jest.setTimeout(30_000);

// ── Test utilities ──

/** Assert a value is a valid UUID v4 */
export function expectUUID(value: unknown): void {
  expect(value).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
}

/** Assert a value is a valid ISO date string */
export function expectISODate(value: unknown): void {
  expect(typeof value).toBe("string");
  expect(new Date(value as string).toISOString()).toBe(value);
}
