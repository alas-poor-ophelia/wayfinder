/**
 * evaluateResourceFormula — pure math:
 *   max(minimum, floor(base * multiplier / divisor) + flatBonus)
 */
import { describe, expect, it } from "vitest";
import { evaluateResourceFormula, type ResourceFormulaContext } from "../../../src/calc/resources";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter, type ResourcePool } from "../../../src/types/character";

const ctx: ResourceFormulaContext = {
  classes: [
    { className: "Paladin", level: 5 },
    { className: "Skald", level: 3 },
    { className: "Monk (Unchained)", level: 2 },
  ],
  mods: { str: -1, dex: 6, con: 2, int: 1, wis: -1, cha: 6 },
  scores: { str: 8, dex: 22, con: 14, int: 13, wis: 8, cha: 22 },
};

describe("evaluateResourceFormula", () => {
  it("classLevel matches case-insensitive substrings (same as calc classLevel)", () => {
    expect(evaluateResourceFormula({ source: "classLevel", className: "paladin" }, ctx)).toBe(5);
    expect(evaluateResourceFormula({ source: "classLevel", className: "Monk" }, ctx)).toBe(2);
    expect(evaluateResourceFormula({ source: "classLevel", className: "wizard" }, ctx)).toBe(0);
  });

  it("characterLevel sums all classes", () => {
    expect(evaluateResourceFormula({ source: "characterLevel" }, ctx)).toBe(10);
  });

  it("abilityMod and abilityScore read the right tables", () => {
    expect(evaluateResourceFormula({ source: "abilityMod", ability: "cha" }, ctx)).toBe(6);
    expect(evaluateResourceFormula({ source: "abilityScore", ability: "cha" }, ctx)).toBe(22);
  });

  it("floors after multiplier/divisor, then adds the flat bonus", () => {
    // ki-pool shape: level/2 + Wis → floor(10/2) + (-1)... via flatBonus of a
    // separate formula; here: floor(5 * 1 / 2) = 2, +3 = 5
    expect(
      evaluateResourceFormula(
        { source: "classLevel", className: "paladin", divisor: 2, flatBonus: 3 },
        ctx
      )
    ).toBe(5);
    expect(
      evaluateResourceFormula({ source: "characterLevel", multiplier: 3, divisor: 4 }, ctx)
    ).toBe(7); // floor(30/4)
  });

  it("clamps to minimum (panache: Cha mod, min 1)", () => {
    const panache = { source: "abilityMod" as const, ability: "cha" as const, minimum: 1 };
    expect(evaluateResourceFormula(panache, ctx)).toBe(6);
    expect(
      evaluateResourceFormula(panache, { ...ctx, mods: { ...ctx.mods, cha: -2 } })
    ).toBe(1);
  });

  it("negative mods floor toward -Infinity but minimum 0 default applies", () => {
    // wis -1: floor(-1 * 1 / 1) = -1 → clamped to default minimum 0
    expect(evaluateResourceFormula({ source: "abilityMod", ability: "wis" }, ctx)).toBe(0);
  });

  it("treats divisor 0 as 1 instead of dividing by zero", () => {
    expect(
      evaluateResourceFormula({ source: "characterLevel", divisor: 0 }, ctx)
    ).toBe(10);
  });
});

/**
 * computeAll().resourceMaxes — class/archetype pool maxima are DERIVED live
 * (Route A), so they track level + ability changes without a manual sync.
 */
describe("computeAll resourceMaxes (live class-pool derivation)", () => {
  function paladin(level: number, cha = 16): ReturnType<typeof createDefaultCharacter> {
    const c = createDefaultCharacter("pal", "Pal");
    c.classes = [{ className: "Paladin", level }];
    c.baseAbilities = { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha };
    return c;
  }

  it("derives paladin pools from level + Cha (smiteEvil, layOnHands)", () => {
    // Paladin 5, Cha 16 (+3): smite = 1 + floor(4/3) = 2; LoH = floor(5/2) + 3 = 5
    const r = computeAll(paladin(5)).resourceMaxes;
    expect(r.smiteEvil).toBe(2);
    expect(r.layOnHands).toBe(5);
  });

  it("auto-adjusts when class level rises (no sync needed)", () => {
    // Paladin 7, Cha 16 (+3): smite = 1 + floor(6/3) = 3; LoH = floor(7/2) + 3 = 6
    const r = computeAll(paladin(7)).resourceMaxes;
    expect(r.smiteEvil).toBe(3);
    expect(r.layOnHands).toBe(6);
  });

  it("auto-adjusts when the governing ability changes", () => {
    // Cha 20 (+5): LoH = floor(5/2) + 5 = 7
    expect(computeAll(paladin(5, 20)).resourceMaxes.layOnHands).toBe(7);
  });

  it("derives unchained-monk ki (Wis) and stunning fist (level)", () => {
    const c = createDefaultCharacter("monk", "Monk");
    c.classes = [{ className: "Monk (Unchained)", level: 4 }];
    c.baseAbilities = { str: 12, dex: 14, con: 12, int: 10, wis: 16, cha: 8 };
    const r = computeAll(c).resourceMaxes;
    expect(r.kiPool).toBe(5); // floor(4/2) + Wis 3
    expect(r.stunningFist).toBe(4); // monk level
  });

  it("lets a user formula win over the class closure", () => {
    const c = paladin(5); // class closure would give smiteEvil = 2
    const pool: ResourcePool = {
      id: "smiteEvil",
      name: "Smite",
      current: 0,
      max: 0,
      formula: { source: "characterLevel" },
    };
    c.resources = [pool];
    // characterLevel 5 overrides the class closure's 2
    expect(computeAll(c).resourceMaxes.smiteEvil).toBe(5);
  });

  it("is empty for a class that grants no pools", () => {
    const c = createDefaultCharacter("ftr", "Ftr");
    c.classes = [{ className: "Fighter", level: 4 }];
    expect(computeAll(c).resourceMaxes).toEqual({});
  });
});
