import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";

function companion(level: number) {
  const c = createDefaultCharacter("comp", "Companion");
  c.characterType = "companion";
  c.companionLevel = level;
  // Base animal scores (user-entered); the table adds Str/Dex on top.
  c.baseAbilities = { str: 14, dex: 16, con: 13, int: 2, wis: 12, cha: 6 };
  return c;
}

describe("animal companion base statistics", () => {
  it("derives BAB, saves, natural armor, and Str/Dex from the table", () => {
    const r = computeAll(companion(6));
    // Level 6 row: bab 4, fort 5, ref 5, will 2, natArmor +4, Str/Dex +2.
    expect(r.bab).toBe(4);
    // Str 14+2=16 (+3), Dex 16+2=18 (+4), Con 13 (+1), Wis 12 (+1)
    expect(r.scores.str).toBe(16);
    expect(r.scores.dex).toBe(18);
    // saves = table base + the companion's OWN ability mod
    expect(r.saves).toEqual({ fort: 5 + 1, ref: 5 + 4, will: 2 + 1 });
    // AC: 10 + Dex 4 + natural armor 4 = 18 (no armor, size 0)
    expect(r.ac.normalAC).toBe(18);
  });

  it("level 1 has no natural armor or Str/Dex bonus", () => {
    const r = computeAll(companion(1));
    expect(r.bab).toBe(1);
    expect(r.scores.str).toBe(14);
    expect(r.scores.dex).toBe(16);
    expect(r.saves).toEqual({ fort: 3 + 1, ref: 3 + 3, will: 0 + 1 });
  });

  it("clamps companion level to the 1-20 table range", () => {
    expect(computeAll(companion(99)).bab).toBe(12); // level 20 row
    expect(computeAll(companion(0)).bab).toBe(1); // level 1 row
  });
});
