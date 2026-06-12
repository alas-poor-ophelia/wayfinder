/**
 * computeAll archetype gates: divine grace suppression/delay, spellcasting
 * removal, and the Virtuous Bravo AC relocation (with the archetype
 * selected, AC returns exactly to the pre-relocation values).
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultSpellbook } from "../../../src/types/spellbook";

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
    expect(computed.ac.flatFootedAC).toBe(computeAll(paladin(7)).ac.flatFootedAC);
  });
});
