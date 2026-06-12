/**
 * Parity guard for the archetype feature: characters with NO archetypes
 * selected must produce byte-identical computeAll output before and after
 * the archetype system is wired in. Snapshots were captured BEFORE any
 * wiring landed; the ONE sanctioned change is the Virtuous Bravo AC
 * relocation (calc/ac.ts used to grant the Nimble dodge bonus to every
 * paladin unconditionally) — when that step lands, the paladin snapshots
 * are consciously regenerated and the diff reviewed.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";

function paladin7() {
  const c = createDefaultCharacter("pal7", "Parity Paladin");
  c.classes = [{ className: "Paladin", level: 7 }];
  c.baseAbilities = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 16 };
  c.skills = {
    Diplomacy: { ability: "cha", ranks: 5, misc: 0, classSkill: true },
    Perception: { ability: "wis", ranks: 3, misc: 0, classSkill: false },
  };
  c.spellbook = {
    castingClass: "paladin",
    castingStat: "cha",
    spells: [],
    levels: {},
  };
  return c;
}

function paladinFighter() {
  const c = createDefaultCharacter("palftr", "Parity Multiclass");
  c.classes = [
    { className: "Paladin", level: 4 },
    { className: "Fighter", level: 3 },
  ];
  c.baseAbilities = { str: 18, dex: 13, con: 14, int: 8, wis: 12, cha: 14 };
  return c;
}

function unchainedMonk() {
  const c = createDefaultCharacter("monk5", "Parity Monk");
  c.classes = [{ className: "Monk (Unchained)", level: 5 }];
  c.baseAbilities = { str: 14, dex: 16, con: 12, int: 10, wis: 16, cha: 8 };
  return c;
}

function fighter4() {
  const c = createDefaultCharacter("ftr4", "Parity Fighter");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.baseAbilities = { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 8 };
  return c;
}

describe("archetype parity guard: no-archetype output is frozen", () => {
  it("Paladin 7 (caster, CHA saves, AC path)", () => {
    expect(computeAll(paladin7())).toMatchSnapshot();
  });

  it("Paladin 4 / Fighter 3 multiclass", () => {
    expect(computeAll(paladinFighter())).toMatchSnapshot();
  });

  it("Monk (Unchained) 5", () => {
    expect(computeAll(unchainedMonk())).toMatchSnapshot();
  });

  it("Fighter 4", () => {
    expect(computeAll(fighter4())).toMatchSnapshot();
  });

  it("empty archetypeKeys array behaves exactly like no field", () => {
    const plain = computeAll(paladin7());
    const withEmpty = paladin7();
    withEmpty.classes = [{ className: "Paladin", level: 7, archetypeKeys: [] }];
    expect(computeAll(withEmpty)).toEqual(plain);
  });
});
