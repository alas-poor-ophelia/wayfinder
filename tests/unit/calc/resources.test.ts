/**
 * evaluateResourceFormula — pure math:
 *   max(minimum, floor(base * multiplier / divisor) + flatBonus)
 */
import { describe, expect, it } from "vitest";
import { evaluateResourceFormula, type ResourceFormulaContext } from "../../../src/calc/resources";

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
