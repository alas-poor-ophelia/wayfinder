import { describe, expect, it } from "vitest";
import { abilityMods } from "../../../src/calc/abilities";
import fixtures from "../fixtures/captured-fixtures.json";

describe("abilityMods (characterization vs old Meta Bind math blocks)", () => {
  it("reproduces Adarin's stored config mods from sheet base scores", () => {
    const sheet = fixtures.frontmatter.adarinSheet as Record<string, unknown>;
    const config = fixtures.frontmatter.adarinConfig as Record<string, unknown>;
    const ce = (sheet.conditionEffects ?? {}) as Record<string, number>;

    const mods = abilityMods({
      base: {
        str: Number(sheet.str),
        dex: Number(sheet.dex),
        con: Number(sheet.con),
        int: Number(sheet.int),
        wis: Number(sheet.wis),
        cha: Number(sheet.cha),
      },
      adjust: {
        str: sheet.strAdjust,
        dex: sheet.dexAdjust,
        con: sheet.conAdjust,
        int: sheet.intAdjust,
        wis: sheet.wisAdjust,
        cha: sheet.chaAdjust,
      },
      conditionAdjust: {
        str: ce.strAdjust,
        dex: ce.dexAdjust,
        con: ce.conAdjust,
        int: ce.intAdjust,
        wis: ce.wisAdjust,
        cha: ce.chaAdjust,
      },
      drain: { str: sheet.strDrain, dex: sheet.dexDrain, con: sheet.conDrain },
      damage: { str: sheet.strDamage, dex: sheet.dexDamage },
    });

    expect(mods.str).toBe(config.strMod);
    expect(mods.dex).toBe(config.dexMod);
    expect(mods.con).toBe(config.conMod);
    expect(mods.int).toBe(config.intMod);
    expect(mods.wis).toBe(config.wisMod);
    expect(mods.cha).toBe(config.chaMod);
  });

  it("handles drain/damage/adjust and empty-string frontmatter values", () => {
    const mods = abilityMods({
      base: { str: 14, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
      adjust: { str: 4 }, // 18 -> +4
      drain: { dex: 2 }, // 12 -> +1
      damage: { con: "3" }, // 11 -> +0
      conditionAdjust: { int: "" }, // "" -> 0 -> 10 -> +0
    });
    expect(mods).toEqual({ str: 4, dex: 1, con: 0, int: 0, wis: 0, cha: 0 });
  });
});
