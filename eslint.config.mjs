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
      "**/*.mjs",
      "*.config.ts",
      // obsidianmd@0.3.0's recommended config applies its type-checked plugin
      // rules globally (no `files` filter), so non-source JSON/config files it
      // can't type-check crash the run. These aren't plugin runtime code.
      "package.json",
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
        project: "./tsconfig.json",
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
      // Non-null assertions here are deliberate invariants (post-guard,
      // known-present registry/map lookups, regex-after-test). They are also
      // the pragmatic bridge for noUncheckedIndexedAccess (e.g. `mods[k]!`),
      // which the rule would otherwise fight.
      "@typescript-eslint/no-non-null-assertion": "off",
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

      // "War" (from the 3pp product name "Path of War") and "Wayfinder" (the
      // plugin brand) are proper nouns; allow them capitalized mid-sentence in
      // UI copy instead of lowercasing the names. Brands keep their defaults.
      "obsidianmd/ui/sentence-case": [
        "error",
        { ignoreWords: ["War", "Wayfinder"] },
      ],
    },
  },

  // Calc math core: `x || 0` / `x || false` / `x || ""` is the established
  // idiom (provably equivalent to `??` for those falsy fallbacks), and a few
  // are intentional `||` guards (e.g. `divisor || 1` avoids divide-by-zero).
  // Enforcing nullish-coalescing here would be churn at best, bugs at worst.
  {
    files: ["src/calc/**/*.ts"],
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "off",
    },
  },

  // Tests: pragmatic relaxations.
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.test.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Test code legitimately uses Node builtins (fixture loading) and
      // loosely-typed helpers; the plugin-runtime guardrails do not apply.
      "import/no-nodejs-modules": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/unbound-method": "off",
      // The test bootstrap aliases the Node global to `window`; popout-window
      // runtime rules don't apply to code that never ships in the plugin.
      "obsidianmd/no-global-this": "off",
    },
  },

  // Defer formatting to Prettier; keep ESLint focused on correctness.
  prettier,
]);
