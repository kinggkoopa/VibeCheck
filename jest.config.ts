import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        // Allow importing server-only modules in tests
        diagnostics: { ignoreDiagnostics: [1343] },
      },
    ],
  },
  // Ignore Next.js build output
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

export default config;
