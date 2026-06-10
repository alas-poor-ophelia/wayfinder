/**
 * Characterization tests for the condition/buff effects calculator.
 * Fixtures were captured from the REAL legacy calculator running in Obsidian —
 * every output (including note text) must match byte-for-byte.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateConditionEffects,
  createDefaultEffects,
  type ConditionInput,
  type ConditionEffects,
} from "../../../src/calc/conditions";

interface ConditionMatrixCase {
  name: string;
  input: ConditionInput;
  output: ConditionEffects;
}

const fixturesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "captured-fixtures.json"
);
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf-8")) as {
  conditionMatrix: ConditionMatrixCase[];
};

describe("calculateConditionEffects", () => {
  it("has 41 captured fixture cases", () => {
    expect(fixtures.conditionMatrix).toHaveLength(41);
  });

  it.each(fixtures.conditionMatrix)(
    "matches legacy output for $name",
    ({ input, output }) => {
      expect(calculateConditionEffects(input)).toEqual(output);
    }
  );
});

describe("createDefaultEffects", () => {
  it("matches the output of an empty calculation", () => {
    expect(calculateConditionEffects({})).toEqual(createDefaultEffects());
  });

  it("returns fresh objects (no shared extraAttacks array)", () => {
    const a = createDefaultEffects();
    const b = createDefaultEffects();
    expect(a.extraAttacks).not.toBe(b.extraAttacks);
  });
});
