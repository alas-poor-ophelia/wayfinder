import { defineConfig } from "vitest/config";
import path from "path";

const testVaultPath = path.resolve(__dirname, "tests/fixtures/test-vault");

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    // Longer timeout — Obsidian startup + plugin loading + meta-bind rendering
    testTimeout: 120000,
    hookTimeout: 60000,
    // Sequential — each test uses the same Obsidian instance
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Setup symlinks before tests run
    globalSetup: ["tests/e2e/setup.ts"],
    // Inject test vault path for obsidian-testing-framework
    provide: {
      vault: testVaultPath,
    },
  },
});
