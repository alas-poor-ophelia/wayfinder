import { describe, expect, it } from "vitest";
import { calculateSaves, classBaseSaves } from "../../../src/calc/saves";
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

describe("classBaseSaves + familiar master-save passthrough", () => {
  // Adarin: Paladin 6 (fort 5/ref 2/will 5), Skald 3 (3/1/3), Monk (Unchained)
  // 2 (3/3/0 — Monk(U) has POOR will per CLASS_STATS). Totals 11/6/8.
  const masterClasses = [
    { className: "Paladin", level: 6 },
    { className: "Skald", level: 3 },
    { className: "Monk (Unchained)", level: 2 },
  ];

  it("classBaseSaves sums base progressions, no ability mods", () => {
    expect(classBaseSaves(masterClasses)).toEqual({
      fort: 11,
      ref: 6,
      will: 8,
    });
  });

  it("a classless familiar uses the master's base saves + its own mods", () => {
    // Hwayoung: no classes, Con -1 / Dex +3 / Wis +1. Master base 11/6/8.
    const result = calculateSaves({
      classes: [],
      conMod: -1,
      dexMod: 3,
      wisMod: 1,
      masterBaseSaves: classBaseSaves(masterClasses),
    });
    expect(result).toEqual({ fort: 10, ref: 9, will: 9 });
  });

  it("takes the better of own vs master base, per save", () => {
    // Familiar's own base (Monk(U) 6 = fort 5/ref 5/will 2) beats the master's
    // poor Ref (2), but the master's Fort/Will (8 each) beat the familiar's.
    const result = calculateSaves({
      classes: [{ className: "Monk (Unchained)", level: 6 }],
      masterBaseSaves: { fort: 8, ref: 2, will: 8 },
    });
    expect(result).toEqual({ fort: 8, ref: 5, will: 8 });
  });
});
