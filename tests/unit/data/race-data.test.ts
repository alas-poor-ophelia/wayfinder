/**
 * Race data registry contract. Core-race spot checks are hand-verified
 * against the PRD; the shape block guards generated entries.
 */
import { describe, expect, it } from "vitest";
import {
  findRaceByName,
  getRaceData,
  RACE_DATA,
  racialAbilityMods,
} from "../../../src/data/races";
import { resolveModifiers } from "../../../src/calc/modifiers";
import { STANDARD_SKILLS } from "../../../src/calc/skills";

const races = Object.values(RACE_DATA);

describe("RACE_DATA coverage", () => {
  it("has the full scoped roster (7 core, 16 featured, 14 uncommon)", () => {
    const count = (cat: string) =>
      races.filter((r) => r.category === cat).length;
    expect(count("core")).toBe(7);
    expect(count("featured")).toBe(16);
    expect(count("uncommon")).toBe(14);
  });
});

describe("RACE_DATA shape", () => {
  for (const race of races) {
    it(`${race.key} is well-formed`, () => {
      expect(race.key).toBe(race.key.toLowerCase());
      expect(race.speed).toBeGreaterThan(0);
      expect(race.vision.length).toBeGreaterThan(0);
      expect(race.languages.length).toBeGreaterThan(0);
      if (race.flexibleAbility) {
        expect(Object.keys(race.abilityMods)).toEqual([]);
      }
      for (const v of Object.values(race.abilityMods)) {
        expect([-4, -2, 2, 4]).toContain(v);
      }
      const badSkillTargets = race.modifiers
        .filter((m) => m.target.startsWith("skill."))
        .map((m) => m.target.slice("skill.".length))
        .filter((s) => !STANDARD_SKILLS[s]);
      expect(badSkillTargets).toEqual([]);
    });
  }
});

describe("core race spot-checks (PRD-verified)", () => {
  it("dwarf: +2 Con +2 Wis -2 Cha, 20 ft, darkvision", () => {
    const dwarf = getRaceData("dwarf")!;
    expect(dwarf.abilityMods).toEqual({ con: 2, wis: 2, cha: -2 });
    expect(dwarf.speed).toBe(20);
    expect(dwarf.vision).toContain("darkvision60");
    // Hardy is situational: never auto-summed
    const saves = resolveModifiers(dwarf.modifiers, "save.will");
    expect(saves.total).toBe(0);
    expect(saves.conditional.length).toBeGreaterThan(0);
  });

  it("elf: Keen Senses applies to Perception unconditionally", () => {
    const elf = getRaceData("elf")!;
    expect(elf.abilityMods).toEqual({ dex: 2, int: 2, con: -2 });
    expect(resolveModifiers(elf.modifiers, "skill.Perception").total).toBe(2);
  });

  it("halfling: Luck applies to every save; Fearless stays conditional", () => {
    const halfling = getRaceData("halfling")!;
    expect(halfling.size).toBe("small");
    const fort = resolveModifiers(halfling.modifiers, "save.fort");
    expect(fort.total).toBe(1);
    expect(fort.conditional).toHaveLength(1);
  });

  it("flexible races apply the chosen ability only", () => {
    const human = getRaceData("human")!;
    expect(racialAbilityMods(human)).toEqual({});
    expect(racialAbilityMods(human, "str")).toEqual({ str: 2 });
    const dwarf = getRaceData("dwarf")!;
    expect(racialAbilityMods(dwarf, "str")).toEqual({
      con: 2,
      wis: 2,
      cha: -2,
    });
  });

  it("finds races by legacy free-text name, case-insensitively", () => {
    expect(findRaceByName("half-elf")?.key).toBe("half-elf");
    expect(findRaceByName("  HUMAN ")?.key).toBe("human");
    expect(findRaceByName("warforged")).toBeNull();
  });
});
