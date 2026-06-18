import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
  },
  resolve: {
    alias: {
      // production code value-imports from "obsidian", which has no resolvable
      // npm entry point; the unit tests run pure logic, so alias it to a stub
      obsidian: fileURLToPath(new URL("./tests/unit/obsidian-stub.ts", import.meta.url)),
    },
  },
});
