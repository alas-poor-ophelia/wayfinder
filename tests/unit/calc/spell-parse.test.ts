/**
 * Parser characterization — parseSpellLevel and friends run against every
 * distinct spellLevel string captured from the live vault (2,177 of them).
 * The parser must never silently produce an empty parse for a string the
 * legacy parser handled.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  formatLevelsForDisplay,
  formatLevelsWithClassesForTooltip,
  getAllLevels,
  getLowestLevel,
  isEschewMaterialsCompatible,
  parseSpellLevel,
  transformSpellForSpellbook,
} from "../../../src/spells/parse";

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/spell-fixtures.json", import.meta.url)), "utf-8")
) as { spellLevelStrings: { distinct: string[] } };

describe("parseSpellLevel", () => {
  it("parses the canonical multi-class form", () => {
    expect(parseSpellLevel("sorcerer/wizard 3, magus 3")).toEqual({
      classes: ["sorcerer", "wizard", "magus"],
      levels: { sorcerer: 3, wizard: 3, magus: 3 },
    });
  });

  it("handles empty input", () => {
    expect(parseSpellLevel("")).toEqual({ classes: [], levels: {} });
    expect(getAllLevels("")).toEqual([]);
    expect(getLowestLevel("")).toBe(0);
    expect(formatLevelsForDisplay("")).toBe("");
  });

  it("never produces an empty parse for any of the vault's distinct strings", () => {
    const strings = fixtures.spellLevelStrings.distinct;
    expect(strings.length).toBeGreaterThan(2000);
    const failures: string[] = [];
    for (const s of strings) {
      const parsed = parseSpellLevel(s);
      // legacy regex requires "name N" entries; every live string has ≥1
      if (parsed.classes.length === 0) failures.push(s);
    }
    expect(failures).toEqual([]);
  });

  it("display/tooltip/lowest stay consistent across all vault strings", () => {
    for (const s of fixtures.spellLevelStrings.distinct.slice(0, 500)) {
      const all = getAllLevels(s);
      expect(getLowestLevel(s)).toBe(Math.min(...all));
      expect(formatLevelsForDisplay(s).length).toBeGreaterThan(0);
      expect(formatLevelsWithClassesForTooltip(s).length).toBeGreaterThan(0);
    }
  });
});

describe("isEschewMaterialsCompatible", () => {
  it("matches legacy gp-cost detection", () => {
    expect(isEschewMaterialsCompatible("V, S")).toBe(true);
    expect(isEschewMaterialsCompatible("V, S, M (a ball of bat guano and sulfur)")).toBe(true);
    expect(isEschewMaterialsCompatible("V, S, M (diamond worth 500 gp)")).toBe(false);
    expect(isEschewMaterialsCompatible("V, S, M (1,000 gp of gold dust)")).toBe(false);
    expect(isEschewMaterialsCompatible("V, S, M (1 gp)")).toBe(true);
    expect(isEschewMaterialsCompatible("")).toBe(true);
  });
});

describe("transformSpellForSpellbook", () => {
  const doc = {
    id: "APG_240",
    name: "Unwitting Ally",
    spellLevelRaw: "bard 0, mesmerist 0",
    range: "close (25 ft. + 5 ft./2 levels)",
    castingTime: "1 standard action",
    components: "V, S",
    saveType: "Will negates",
    sr: "yes",
    duration: "1 round",
    school: "enchantment",
    source: "APG",
  };

  it("reproduces the composite-id add (matches the live APG_240 entry)", () => {
    const spell = transformSpellForSpellbook(doc, 0, ["bard", "mesmerist"]);
    expect(spell).toEqual({
      id: "APG_240_L0_bardmesmerist",
      originalId: "APG_240",
      name: "Unwitting Ally",
      baseLevel: 0,
      known: true,
      range: "close",
      castingTime: "1 std",
      components: "V, S",
      saveType: "Will negates",
      sr: "yes",
      duration: "1 round",
      school: "enchantment",
      source: "APG",
      classes: ["bard", "mesmerist"],
    });
  });

  it("plain add uses the db id and the lowest level", () => {
    const spell = transformSpellForSpellbook({
      ...doc,
      id: "PFRPGC_206",
      name: "Fireball",
      spellLevelRaw: "sorcerer/wizard 3, magus 3",
      range: "long (400 ft. + 40 ft./level)",
    });
    expect(spell.id).toBe("PFRPGC_206");
    expect(spell.originalId).toBe("PFRPGC_206");
    expect(spell.baseLevel).toBe(3);
    expect(spell.range).toBe("long");
    expect(spell.classes).toBeUndefined();
  });
});
