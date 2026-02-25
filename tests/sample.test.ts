import { describe, it, expect } from "@jest/globals";

/**
 * Sample test — validates that the test infrastructure works.
 * This runs in the CI pipeline and catches config issues early.
 */
describe("Test infrastructure", () => {
  it("should have test environment configured", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("should resolve @/ path aliases", async () => {
    // Verify that the module mapper resolves our path aliases
    const types = await import("@/types");
    expect(types).toBeDefined();
  });

  it("should have valid type exports", async () => {
    const { MODEL_REGISTRY, getDefaultModel } = await import(
      "@/core/llm/models"
    );
    expect(MODEL_REGISTRY.length).toBeGreaterThan(0);

    const defaultAnthropic = getDefaultModel("anthropic");
    expect(defaultAnthropic).toBeDefined();
    expect(defaultAnthropic?.provider).toBe("anthropic");
  });
});
