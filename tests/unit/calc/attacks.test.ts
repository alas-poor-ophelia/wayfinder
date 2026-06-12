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

  // Equipped-weapon overrides are NEW behavior (no legacy counterpart) —
  // asserted relative to the stock output so the legacy quirks all carry
  // over to per-weapon blocks unchanged.
  describe("equipped-weapon overrides", () => {
    const base = fixtures.attackMatrixBase;

    it("meleeWeapon swaps die and crit only; ranged/unarmed untouched", () => {
      const stock = calculateAttackStrings(base);
      const out = calculateAttackStrings({
        ...base,
        meleeWeapon: { damageDie: "1d8", critRange: "19-20", critMult: "2" },
      });
      expect(out.melee).toBe(
        stock.melee.split("1d6").join("1d8").split("(18-20/x2)").join("(19-20/x2)")
      );
      expect(out.ranged).toBe(stock.ranged);
      expect(out.unarmed).toBe(stock.unarmed);
    });

    it("melee size enlargement applies to the override die", () => {
      const out = calculateAttackStrings({
        ...base,
        conditionEffects: { sizeAdjust: 1 },
        meleeWeapon: { damageDie: "1d8", critRange: "19-20", critMult: "2" },
      });
      expect(out.melee).toContain("2d6"); // 1d8 steps to 2d6 at +1 size
    });

    it("rangedWeapon replaces the style entry and suppresses Ray touch", () => {
      const out = calculateAttackStrings({
        ...base,
        rangedAttackStyle: "Ray",
        rangedWeapon: { damageDie: "1d10", critRange: "19-20", critMult: "2" },
      });
      expect(out.ranged).toContain("1d10");
      expect(out.ranged).toContain("(19-20/x2)");
      expect(out.ranged).not.toContain("(touch)");
    });

    it("rangedWeapon suppresses the Shuriken flurry path", () => {
      const flurryBase: AttackInput = {
        ...base,
        flurryOfBlows: true,
        monkLevel: 5,
        rangedAttackStyle: "Shuriken",
      };
      const fullLine = (s: string): string =>
        s.split("\n").find((l) => l.startsWith("**Full Attack:**")) ?? "";
      const stock = calculateAttackStrings(flurryBase);
      const out = calculateAttackStrings({
        ...flurryBase,
        rangedWeapon: { damageDie: "1d8", critRange: "20", critMult: "3" },
      });
      const slashes = (s: string): number => (s.match(/\//g) ?? []).length;
      expect(slashes(fullLine(out.ranged))).toBeLessThan(slashes(fullLine(stock.ranged)));
    });
  });
});
