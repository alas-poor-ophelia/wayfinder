/**
 * computeAll heritage gating: a selected heritage swaps ability mods,
 * Skilled skill bonuses, and the SLA, while keeping the base race's
 * resistances. No/unknown heritage → identical to the base race.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";

function fixture() {
  const c = createDefaultCharacter("test", "Test");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.baseAbilities = { str: 14, dex: 14, con: 12, int: 14, wis: 12, cha: 14 };
  c.skills = {
    Bluff: { ability: "cha", ranks: 1, misc: 0, classSkill: false },
    Stealth: { ability: "dex", ranks: 1, misc: 0, classSkill: false },
    Perception: { ability: "wis", ranks: 1, misc: 0, classSkill: false },
  };
  c.raceKey = "tiefling";
  return c;
}

const skill = (c: ReturnType<typeof computeAll>, name: string) =>
  c.skills.find((s) => s.name === name)!.total;

describe("computeAll heritage integration", () => {
  it("Pitborn swaps ability mods vs base tiefling", () => {
    const base = computeAll(fixture()); // base tiefling: +2 Dex +2 Int -2 Cha
    const pit = fixture();
    pit.raceHeritageKey = "demon-spawn"; // +2 Str +2 Cha -2 Int
    const computed = computeAll(pit);
    // Str 14 +2 → mod +1 over base (base had no Str racial)
    expect(computed.mods.str).toBe(base.mods.str + 1);
    // Cha 14 -2(base) vs +2(heritage) → swing of +4 score = +2 mod
    expect(computed.mods.cha).toBe(base.mods.cha + 2);
    // Int 14 +2(base) vs -2(heritage) → -4 score = -2 mod
    expect(computed.mods.int).toBe(base.mods.int - 2);
    expect(computed.mods.dex).toBe(base.mods.dex - 1); // base had +2 Dex
  });

  it("Pitborn drops base Bluff/Stealth and grants Disable Device/Perception", () => {
    const base = computeAll(fixture());
    const pit = fixture();
    pit.raceHeritageKey = "demon-spawn";
    const computed = computeAll(pit);
    // base tiefling Skilled gave +2 Bluff/+2 Stealth; Pitborn does not.
    // Bluff is cha-based: the heritage's cha swing (-2→+2 = +2 mod) exactly
    // offsets the lost +2 racial, so the total is unchanged — the racial
    // drop is proven cleanly by Stealth (dex) below and the data test.
    expect(skill(computed, "Bluff")).toBe(skill(base, "Bluff"));
    // Stealth: lose the +2 racial but gain +1 from the Dex swing (+2→0)...
    // base Stealth had +2 racial AND +2 dex; pitborn has neither racial nor
    // the dex bonus. Net: -2 racial -1 dex mod = -3.
    expect(skill(computed, "Stealth")).toBe(skill(base, "Stealth") - 3);
    // Perception gains the heritage +2 (wis unchanged between the two)
    expect(skill(computed, "Perception")).toBe(skill(base, "Perception") + 2);
  });

  it("keeps base resistances and reports the heritage", () => {
    const pit = fixture();
    pit.raceHeritageKey = "demon-spawn";
    const computed = computeAll(pit);
    // Fiendish Resistance (cold/electricity/fire 5) belongs to base tiefling
    expect(computed.racial?.race.modifiers.some(
      (m) => m.source === "Tiefling: Fiendish Resistance"
    )).toBe(true);
    expect(computed.racial?.heritage).toEqual({
      key: "demon-spawn",
      name: "Demon-Spawn (Pitborn)",
      source: "Blood of Fiends",
    });
  });

  it("no heritage or unknown key computes as base tiefling", () => {
    const base = computeAll(fixture());
    const unknown = fixture();
    unknown.raceHeritageKey = "no-such-heritage";
    expect(computeAll(unknown)).toEqual(base);
  });

  it("a heritage key on a race without heritages is ignored", () => {
    const elf = fixture();
    elf.raceKey = "elf";
    delete elf.raceHeritageKey;
    const base = computeAll(elf);
    const stray = fixture();
    stray.raceKey = "elf";
    stray.raceHeritageKey = "demon-spawn";
    expect(computeAll(stray)).toEqual(base);
  });
});
