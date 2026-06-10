import { describe, expect, it } from "vitest";
import { calculateSaves } from "../../../src/calc/saves";
import fixtures from "../fixtures/captured-fixtures.json";

describe("calculateSaves (characterization vs old MiniSheetSaves block)", () => {
  it("reproduces Adarin's stored save values", () => {
    const inputs = fixtures.savesFixture.inputs;
    const stored = fixtures.savesFixture.storedSaves!;
    // The old saves block reads class levels from the CONFIG note
    // (paladin 5 there) - the savesFixture inputs carry those values.
    const result = calculateSaves({
      classes: [
        { className: "Paladin", level: inputs.paladinLevel },
        { className: "Skald", level: inputs.skaldLevel },
        { className: "Monk (Unchained)", level: inputs.monkunchainedLevel },
      ],
      conMod: inputs.conMod,
      dexMod: inputs.dexMod,
      wisMod: inputs.wisMod,
      chaMod: inputs.chaMod,
      resistanceEnhancement: inputs.resistanceEnhancement,
      conditionEffects: inputs.conditionEffects,
    });
    expect(result.fort).toBe(stored.fort.value);
    expect(result.ref).toBe(stored.ref.value);
    expect(result.will).toBe(stored.will.value);
  });

  it("zero classes -> ability mods + resistance only", () => {
    const result = calculateSaves({
      classes: [],
      conMod: 2,
      dexMod: 1,
      wisMod: 0,
      chaMod: 4,
      resistanceEnhancement: 1,
    });
    expect(result).toEqual({ fort: 3, ref: 2, will: 1 });
  });

  it("paladin divine grace adds cha to all saves", () => {
    const without = calculateSaves({
      classes: [{ className: "Fighter", level: 2 }],
      chaMod: 5,
    });
    const withPaladin = calculateSaves({
      classes: [{ className: "Paladin", level: 2 }],
      chaMod: 5,
    });
    // Fighter 2: fort 3/ref 0/will 0. Paladin 2: fort 3/ref 0/will 3, +5 cha.
    expect(without).toEqual({ fort: 3, ref: 0, will: 0 });
    expect(withPaladin).toEqual({ fort: 8, ref: 5, will: 8 });
  });
});
