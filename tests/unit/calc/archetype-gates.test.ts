/**
 * computeAll archetype gates: divine grace suppression/delay, spellcasting
 * removal, and the Virtuous Bravo AC relocation (with the archetype
 * selected, AC returns exactly to the pre-relocation values).
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultSpellbook } from "../../../src/types/spellbook";

function arcanist(level: number, ...archetypeKeys: string[]) {
  const c = createDefaultCharacter("a", "A");
  c.classes = [
    {
      className: "Arcanist",
      level,
      ...(archetypeKeys.length ? { archetypeKeys } : {}),
    },
  ];
  c.baseAbilities = { str: 10, dex: 12, con: 14, int: 18, wis: 10, cha: 10 };
  return c;
}

function paladin(level: number, ...archetypeKeys: string[]) {
  const c = createDefaultCharacter("p", "P");
  c.classes = [
    {
      className: "Paladin",
      level,
      ...(archetypeKeys.length ? { archetypeKeys } : {}),
    },
  ];
  c.baseAbilities = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 16 };
  return c;
}

describe("divine grace gate", () => {
  it("gray paladin loses CHA to saves; plain paladin keeps it", () => {
    const plain = computeAll(paladin(5));
    const gray = computeAll(paladin(5, "gray-paladin"));
    // cha mod is +3
    expect(gray.saves.fort).toBe(plain.saves.fort - 3);
    expect(gray.saves.ref).toBe(plain.saves.ref - 3);
    expect(gray.saves.will).toBe(plain.saves.will - 3);
  });

  it("chosen one: divine grace offline below 4th, online at 4th", () => {
    const low = computeAll(paladin(3, "chosen-one"));
    const lowPlain = computeAll(paladin(3));
    expect(low.saves.will).toBe(lowPlain.saves.will - 3);

    const high = computeAll(paladin(4, "chosen-one"));
    const highPlain = computeAll(paladin(4));
    expect(high.saves.will).toBe(highPlain.saves.will);
  });

  it("multiclass keeps the suppression (paladin levels drive the gate)", () => {
    const c = paladin(5, "stonelord");
    c.classes.push({ className: "Fighter", level: 2 });
    const plain = paladin(5);
    plain.classes.push({ className: "Fighter", level: 2 });
    expect(computeAll(c).saves.fort).toBe(computeAll(plain).saves.fort - 3);
  });
});

describe("spellcasting removal gate", () => {
  it("warrior of the holy light: computed spellbook gone, persisted state untouched", () => {
    const c = paladin(7, "warrior-of-the-holy-light");
    c.spellbook = createDefaultSpellbook("paladin", "cha");
    const computed = computeAll(c);
    expect(computed.spellbook).toBeUndefined();
    expect(c.spellbook).toBeDefined(); // math-only; unchecking restores

    const plain = paladin(7);
    plain.spellbook = createDefaultSpellbook("paladin", "cha");
    expect(computeAll(plain).spellbook).toBeDefined();
  });

  it("removal only hits the matching casting class", () => {
    const c = paladin(7, "stonelord");
    c.classes.push({ className: "Cleric", level: 3 });
    c.spellbook = createDefaultSpellbook("cleric", "wis");
    expect(computeAll(c).spellbook).toBeDefined();
  });
});

function monk(level: number, ...archetypeKeys: string[]) {
  const c = createDefaultCharacter("m", "M");
  c.classes = [
    {
      className: "Monk (Unchained)",
      level,
      ...(archetypeKeys.length ? { archetypeKeys } : {}),
    },
  ];
  // wis +3, cha +4 — distinct mods so the AC stat source is unambiguous
  c.baseAbilities = { str: 14, dex: 14, con: 12, int: 10, wis: 16, cha: 18 };
  return c;
}

describe("scaled fist AC relocation", () => {
  it("plain monk now adds WIS (RAW), not CHA", () => {
    const computed = computeAll(monk(5));
    // 10 base + 2 dex + 3 wis + 1 scaling (4th+)
    expect(computed.ac.normalAC).toBe(16);
  });

  it("with the archetype, AC matches the old unconditional CHA values exactly", () => {
    const computed = computeAll(monk(5, "scaled-fist"));
    // 10 base + 2 dex + 4 cha + 1 scaling
    expect(computed.ac.normalAC).toBe(17);
    expect(computed.ac.touchAC).toBe(17);
    // flat-footed loses dex but keeps the monk bonus
    expect(computed.ac.flatFootedAC).toBe(15);
  });

  it("negative WIS adds nothing on the RAW path", () => {
    const c = monk(2);
    c.baseAbilities = { ...c.baseAbilities, wis: 8 };
    // 10 base + 2 dex + max(0, -1) + no scaling below 4th
    expect(computeAll(c).ac.normalAC).toBe(12);
  });
});

describe("arcanist exploits-known count", () => {
  it("plain arcanist: exploits gained at odd levels (ceil(level/2))", () => {
    expect(computeAll(arcanist(1)).featureCounts.arcanistExploits).toBe(1);
    expect(computeAll(arcanist(7)).featureCounts.arcanistExploits).toBe(4);
    expect(computeAll(arcanist(20)).featureCounts.arcanistExploits).toBe(10);
  });

  it("archetypes strip the slots ≤ current level from the count", () => {
    // L7 base = 4. occultist removes [1,7]→2 left; school-savant [1,3,7]→1;
    // blood-arcanist [1,3] of [1,3,9,15] (9/15 > 7)→2; eldritch-font [3,7]→2.
    expect(
      computeAll(arcanist(7, "occultist")).featureCounts.arcanistExploits,
    ).toBe(2);
    expect(
      computeAll(arcanist(7, "school-savant")).featureCounts.arcanistExploits,
    ).toBe(1);
    expect(
      computeAll(arcanist(7, "blood-arcanist")).featureCounts.arcanistExploits,
    ).toBe(2);
    expect(
      computeAll(arcanist(7, "eldritch-font")).featureCounts.arcanistExploits,
    ).toBe(2);
  });

  it("non-arcanists have an empty featureCounts map", () => {
    expect(computeAll(paladin(7)).featureCounts).toEqual({});
  });
});

describe("eldritch font spellcasting reshape", () => {
  it("+1 cast/day and -1 prepared on each castable level, untouched elsewhere", () => {
    const plain = arcanist(7);
    plain.spellbook = createDefaultSpellbook("arcanist", "int");
    const ef = arcanist(7, "eldritch-font");
    ef.spellbook = createDefaultSpellbook("arcanist", "int");
    const p = computeAll(plain).spellbook!;
    const e = computeAll(ef).spellbook!;

    // level 1 is castable at arcanist 7 → reshaped
    expect(p.levels[1].maxSlots).toBeGreaterThan(0);
    expect(e.levels[1].maxSlots).toBe(p.levels[1].maxSlots - 1);
    expect(e.levels[1].arcanistCasts).toBe(
      (p.levels[1].arcanistCasts ?? 0) + 1,
    );

    // a level the arcanist can't cast at 7 (6th) stays untouched (no opening)
    expect(p.levels[6].maxSlots).toBe(0);
    expect(e.levels[6].maxSlots).toBe(0);
    expect(e.levels[6].arcanistCasts ?? 0).toBe(p.levels[6].arcanistCasts ?? 0);
  });

  it("adjust only fires for the matching casting class", () => {
    // an eldritch-font arcanist multiclassed with a cleric spellbook: the
    // cleric book is untouched (classKey gate)
    const c = arcanist(7, "eldritch-font");
    c.classes.push({ className: "Cleric", level: 5 });
    c.spellbook = createDefaultSpellbook("cleric", "wis");
    const plain = arcanist(7);
    plain.classes.push({ className: "Cleric", level: 5 });
    plain.spellbook = createDefaultSpellbook("cleric", "wis");
    expect(computeAll(c).spellbook!.levels[1].maxSlots).toBe(
      computeAll(plain).spellbook!.levels[1].maxSlots,
    );
  });
});

describe("virtuous bravo AC relocation", () => {
  it("plain paladin no longer gets the Nimble dodge bonus", () => {
    const computed = computeAll(paladin(7));
    // 10 base + 1 dex; the old unconditional code added +2 at level 7
    expect(computed.ac.normalAC).toBe(11);
  });

  it("with the archetype, AC matches the old unconditional values exactly", () => {
    const computed = computeAll(paladin(7, "virtuous-bravo"));
    expect(computed.ac.normalAC).toBe(13);
    expect(computed.ac.touchAC).toBe(13);
    // flat-footed never included the dodge bonus
    expect(computed.ac.flatFootedAC).toBe(
      computeAll(paladin(7)).ac.flatFootedAC,
    );
  });
});
