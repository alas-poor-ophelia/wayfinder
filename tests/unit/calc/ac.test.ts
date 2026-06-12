import { describe, expect, it } from "vitest";
import { calculateACValues, type ACInput } from "../../../src/calc/ac";
import fixtures from "../fixtures/captured-fixtures.json";

interface ACFixtureOutput {
  normalAC: number;
  touchAC: number;
  flatFootedAC: number;
  cmb: number;
  cmd: number;
}

/** The captured fixtures (frozen legacy truth) name the bravo-AC driver
 *  `paladinLevel` — the legacy sheet granted the Virtuous Bravo dodge bonus
 *  to every paladin, and its captured characters WERE bravos. The calc
 *  input renamed the field `bravoLevel` when the bonus moved behind the
 *  archetype; translate at the boundary, never touch the fixture file.
 *  Likewise the legacy monk AC bonus was hardcoded CHA-based — its captured
 *  monk WAS a Scaled Fist, so declare the archetype on the inputs. */
function adaptLegacyInput(input: Record<string, unknown>): ACInput {
  const adapted: Record<string, unknown> = { ...input, scaledFist: true };
  if ("paladinLevel" in adapted) {
    adapted.bravoLevel = adapted.paladinLevel;
    delete adapted.paladinLevel;
  }
  return adapted as ACInput;
}

function expectMatch(rawInput: ACInput, expected: ACFixtureOutput) {
  const result = calculateACValues(
    adaptLegacyInput(rawInput as Record<string, unknown>)
  );
  expect(result.normalAC).toBe(expected.normalAC);
  expect(result.touchAC).toBe(expected.touchAC);
  expect(result.flatFootedAC).toBe(expected.flatFootedAC);
  expect(result.cmb).toBe(expected.cmb);
  expect(result.cmd).toBe(expected.cmd);
}

describe("calculateACValues (characterization vs old ac-renderer)", () => {
  it("live Adarin baseline", () => {
    expectMatch(
      fixtures.acLive.input as ACInput,
      fixtures.acLive.output as ACFixtureOutput
    );
  });

  const base = fixtures.attackMatrixBase as Record<string, unknown>;
  for (const c of fixtures.acMatrix) {
    it(`acMatrix: ${c.name}`, () => {
      const input = { ...base, ...c.overrides } as ACInput;
      expectMatch(input, c.output as ACFixtureOutput);
    });
  }

  for (const c of fixtures.integration) {
    it(`integration: ${c.name}`, () => {
      const effects = fixtures.conditionMatrix.find(
        (m) => m.name === c.name.replace("integration:", "condition:")
      ) ??
        fixtures.conditionMatrix.find(
          (m) => m.name === c.name.replace("integration:", "buff:")
        );
      expect(effects).toBeDefined();
      const input = {
        ...base,
        conditionEffects: effects!.output,
      } as ACInput;
      expectMatch(input, c.ac as ACFixtureOutput);
    });
  }

  it("hwayoung baseline", () => {
    expectMatch(
      fixtures.hwayoung.input as ACInput,
      fixtures.hwayoung.ac as ACFixtureOutput
    );
  });
});
