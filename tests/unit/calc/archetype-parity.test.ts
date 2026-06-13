/**
 * Parity guard for the archetype feature: characters with NO archetypes
 * selected must produce byte-identical computeAll output as the system
 * evolves. History: snapshots were first captured before any wiring; the
 * TWO sanctioned regenerations were the hardcoded-archetype relocations:
 *  1. Virtuous Bravo AC (calc/ac.ts granted the Nimble dodge bonus to
 *     every paladin — diff reviewed: normalAC/touchAC/cmd −bravo bonus
 *     on the two paladin fixtures, nothing else).
 *  2. Scaled Fist AC (calc/ac.ts keyed the monk AC bonus off CHA for
 *     every monk — diff reviewed: the plain-monk fixture's AC/cmd move
 *     from the CHA-based to the RAW WIS-based bonus, nothing else).
 *  3. computed.speed added (race speed/size wiring) — diff reviewed:
 *     every fixture gains the additive `speed` object; no existing key
 *     changed (no raceKey on these fixtures, so speed derives from the
 *     manual "30ft" string exactly as InitSpeed rendered before).
 * From here on these are frozen again.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultSpellbook } from "../../../src/types/spellbook";

function paladin7() {
  const c = createDefaultCharacter("pal7", "Parity Paladin");
  c.classes = [{ className: "Paladin", level: 7 }];
  c.baseAbilities = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 16 };
  c.skills = {
    Diplomacy: { ability: "cha", ranks: 5, misc: 0, classSkill: true },
    Perception: { ability: "wis", ranks: 3, misc: 0, classSkill: false },
  };
  c.spellbook = createDefaultSpellbook("paladin", "cha");
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
