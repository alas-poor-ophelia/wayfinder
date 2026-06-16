import { describe, expect, it } from "vitest";
import { calculateSkills } from "../../../src/calc/skills";
import type { AbilityKey, SkillEntry } from "../../../src/types/character";
import fixtures from "../fixtures/captured-fixtures.json";

/** Old frontmatter tuple [ability, ranks, otherBonus?, isClassSkill] - SkillEntry. */
function fromTuple(tuple: unknown[]): SkillEntry {
  const [ability, ranks, a, b] = tuple;
  // Some sheet entries drop the otherBonus element ([ability, ranks, classSkill]).
  const hasOther = typeof a === "number";
  return {
    ability: String(ability).toLowerCase() as AbilityKey,
    ranks: Number(ranks) || 0,
    misc: hasOther ? a : 0,
    classSkill: Boolean(hasOther ? b : a),
  };
}

describe("calculateSkills (characterization vs old sheet's displayed totals)", () => {
  const inputs = fixtures.skillsFixture.inputs;
  const expected = fixtures.skillsFixture.expectedTotals as Record<
    string,
    number
  >;

  const skills: Record<string, SkillEntry> = {};
  for (const [name, tuple] of Object.entries(inputs.skills)) {
    skills[name] = fromTuple(tuple as unknown[]);
  }

  const rows = calculateSkills({
    skills,
    abilityMods: {
      str: inputs.mods.str,
      dex: inputs.mods.dex,
      con: inputs.mods.con,
      int: inputs.mods.int,
      wis: inputs.mods.wis,
      cha: inputs.mods.cha,
    },
    globalSkillAdjust: Number(inputs.skillAdjust) || 0,
    skaldLevel: 3,
    versatilePerformance: Boolean(inputs.versatilePerformance),
  });

  for (const [name, total] of Object.entries(expected)) {
    it(`${name} = ${total >= 0 ? "+" : ""}${total}`, () => {
      const row = rows.find((r) => r.name === name);
      expect(row, `skill row ${name} missing`).toBeDefined();
      expect(row!.total).toBe(total);
    });
  }

  it("Bluff and Sense Motive use Perform (Sing)", () => {
    expect(rows.find((r) => r.name === "Bluff")!.usesPerform).toBe(true);
    expect(rows.find((r) => r.name === "Sense Motive")!.usesPerform).toBe(true);
    expect(rows.find((r) => r.name === "Acrobatics")!.usesPerform).toBe(false);
  });
});
