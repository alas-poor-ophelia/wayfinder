/**
 * ESLint flat config (ESLint 9+) for the Wayfinder Obsidian plugin.
 *
 * Layers, in order:
 *   1. Global ignores (build artifacts, vendored code, data fixtures).
 *   2. `obsidianmd` recommended — enforces the Obsidian Community Plugin
 *      guidelines (innerHTML, vault iteration, detached leaves, lookbehind
 *      regex, sentence-case UI, manifest validation, ...). Spread per the
 *      plugin's documented flat-config form: it is an iterable of four
 *      config blocks built on `typescript-eslint` type-checked rules.
 *   3. Our strict TypeScript + Preact-hooks layer for `src/`.
 *   4. Relaxations for the test suite.
 *   5. `eslint-config-prettier` last, to defer all formatting to Prettier.
 */
import { defineConfig } from "eslint/config";
import tsparser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import obsidianmd from "eslint-plugin-obsidianmd";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "mcp/**",
      "scripts/**",
      "references/**",
      "main.js",
      "styles.css",
      "**/*.js",
      "**/*.jsx",
      "**/*.cjs",
      "*.config.ts",
      "tests/unit/fixtures/**",
      "src/data/icons/registry.ts",
    ],
  },

  // Obsidian Community Plugin guidelines.
  ...obsidianmd.configs.recommended,

  // Strict TypeScript + Preact layer for plugin source.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // TypeScript's compiler already reports undefined identifiers, and
      // ESLint's core rule produces false positives on TS globals/types.
      "no-undef": "off",

      "@typescript-eslint/no-explicit-any": "error",
      // Return types are inferred idiomatically in Preact components; an
      // annotation on every function adds noise without catching bugs.
      "@typescript-eslint/explicit-function-return-type": "off",
      // Too aggressive for application code (flags every truthy check);
      // the signal-to-noise does not justify it here.
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "no-unreachable": "error",
      "no-console": "warn",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
    },
  },

  // Tests: pragmatic relaxations.
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "no-console": "off",
      // Test code legitimately uses Node builtins (fixture loading) and
      // loosely-typed helpers; the plugin-runtime guardrails do not apply.
      "import/no-nodejs-modules": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },

  // Defer formatting to Prettier; keep ESLint focused on correctness.
  prettier,
]);
