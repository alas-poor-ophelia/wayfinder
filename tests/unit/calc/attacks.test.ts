/**
 * Characterization tests for src/calc/attacks.ts.
 *
 * Fixtures in tests/unit/fixtures/captured-fixtures.json were captured by
 * running the REAL legacy AttackCalculator inside Obsidian — the port must
 * reproduce every attack string exactly (byte-for-byte).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { calculateAttackStrings, type AttackInput, type ConditionEffects } from "../../../src/calc/attacks";

interface LegacyAttackOutput {
  waveblade: string;
  ranged: string;
  unarmed: string;
}

interface Fixtures {
  attacksLive: { input: AttackInput; output: LegacyAttackOutput };
  attackMatrixBase: AttackInput;
  attackMatrix: { name: string; overrides: Partial<AttackInput>; output: LegacyAttackOutput }[];
  conditionMatrix: { name: string; output: ConditionEffects }[];
  integration: { name: string; attacks: LegacyAttackOutput }[];
  hwayoung: { input: AttackInput; attacks: LegacyAttackOutput };
}

const fixtures: Fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/captured-fixtures.json", import.meta.url)), "utf-8")
);

/** Assert port output matches a legacy capture exactly (melee ↔ waveblade). */
function expectMatchesLegacy(input: AttackInput, expected: LegacyAttackOutput): void {
  const result = calculateAttackStrings(input);
  expect(result.melee).toBe(expected.waveblade);
  expect(result.ranged).toBe(expected.ranged);
  expect(result.unarmed).toBe(expected.unarmed);
}

describe("calculateAttackStrings", () => {
  describe("attacksLive (full live input)", () => {
    it("reproduces the live capture exactly", () => {
      expectMatchesLegacy(fixtures.attacksLive.input, fixtures.attacksLive.output);
    });
  });

  describe("attackMatrix (base + overrides)", () => {
    it.each(fixtures.attackMatrix.map((c) => [c.name, c] as const))("%s", (_name, testCase) => {
      const input: AttackInput = { ...fixtures.attackMatrixBase, ...testCase.overrides };
      expectMatchesLegacy(input, testCase.output);
    });
  });

  describe("integration (base + conditionMatrix conditionEffects)", () => {
    // "integration:prone" pairs with "condition:prone", "integration:haste"
    // with "buff:haste", etc. — match on the suffix after the colon.
    function conditionEffectsFor(integrationName: string): ConditionEffects {
      const suffix = integrationName.split(":")[1];
      const entry = fixtures.conditionMatrix.find((c) => c.name.endsWith(`:${suffix}`));
      if (!entry) throw new Error(`No conditionMatrix entry for ${integrationName}`);
      return entry.output;
    }

    it.each(fixtures.integration.map((c) => [c.name, c] as const))("%s", (name, testCase) => {
      const input: AttackInput = {
        ...fixtures.attackMatrixBase,
        conditionEffects: conditionEffectsFor(name),
      };
      expectMatchesLegacy(input, testCase.attacks);
    });
  });

  describe("hwayoung (familiar baseline)", () => {
    it("reproduces the familiar capture exactly", () => {
      expectMatchesLegacy(fixtures.hwayoung.input, fixtures.hwayoung.attacks);
    });
  });
});
