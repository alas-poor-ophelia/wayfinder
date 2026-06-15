/**
 * Variant heritage catalog contract. Counts, key uniqueness, and the
 * replacesSources↔base-race link (a heritage that names a base modifier
 * source that doesn't exist would silently fail to replace it).
 */
import { describe, expect, it } from "vitest";
import {
  AASIMAR_HERITAGES,
  applyHeritage,
  getRaceData,
  listHeritages,
  TIEFLING_HERITAGES,
} from "../../../src/data/races";
import { STANDARD_SKILLS } from "../../../src/calc/skills";

describe("heritage catalog coverage", () => {
  it("has 10 tiefling and 6 aasimar heritages", () => {
    expect(TIEFLING_HERITAGES.length).toBe(10);
    expect(AASIMAR_HERITAGES.length).toBe(6);
  });

  it("listHeritages resolves by race key, empty for races without", () => {
    expect(listHeritages("tiefling").length).toBe(10);
    expect(listHeritages("aasimar").length).toBe(6);
    expect(listHeritages("human")).toEqual([]);
  });
});

describe("heritage shape", () => {
  const all = [...TIEFLING_HERITAGES, ...AASIMAR_HERITAGES];

  it("keys are unique within each race", () => {
    for (const list of [TIEFLING_HERITAGES, AASIMAR_HERITAGES]) {
      const keys = list.map((h) => h.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  for (const h of all) {
    it(`${h.key} is well-formed and replaces a real base modifier`, () => {
      expect(h.key).toBe(h.key.toLowerCase());
      const base = getRaceData(h.raceKey);
      expect(base).not.toBeNull();
      expect(h.sla.length).toBeGreaterThan(0);
      // every replacesSources entry must match a real base-race modifier
      const baseSources = new Set(base!.modifiers.map((m) => m.source));
      for (const src of h.replacesSources) {
        expect(baseSources.has(src)).toBe(true);
      }
      // ability mods: tieflings are two +2 and one -2; aasimars two +2
      const vals = Object.values(h.abilityMods);
      const plus = vals.filter((v) => v === 2).length;
      const minus = vals.filter((v) => v === -2).length;
      expect(plus).toBe(2);
      expect(minus).toBe(h.raceKey === "tiefling" ? 1 : 0);
      // skill modifiers target real skills (group bonuses ride as conditional)
      for (const m of h.modifiers) {
        expect(m.type).toBe("racial");
        expect(m.value).toBe(2);
        if (m.target.startsWith("skill.") && !m.condition) {
          expect(
            STANDARD_SKILLS[m.target.slice("skill.".length)],
          ).toBeDefined();
        }
      }
    });
  }
});

describe("applyHeritage", () => {
  it("Pitborn swaps tiefling's ability mods and Skilled bonuses", () => {
    const base = getRaceData("tiefling")!;
    const eff = applyHeritage(base, "demon-spawn");
    expect(eff.abilityMods).toEqual({ str: 2, cha: 2, int: -2 });
    const sources = eff.modifiers.map((m) => m.source);
    expect(sources).not.toContain("Tiefling: Skilled");
    expect(sources).toContain("Tiefling (Pitborn): Skilled");
    // resistances (not replaced) survive
    expect(
      eff.modifiers.some((m) => m.source === "Tiefling: Fiendish Resistance"),
    ).toBe(true);
    // SLA trait swapped
    const sla = eff.traits.find((t) => t.name === "Spell-Like Ability");
    expect(sla!.summary).toContain("Shatter");
  });

  it("unknown or absent heritage key returns the base race unchanged", () => {
    const base = getRaceData("tiefling")!;
    expect(applyHeritage(base, undefined)).toBe(base);
    expect(applyHeritage(base, "no-such-heritage")).toBe(base);
  });
});
