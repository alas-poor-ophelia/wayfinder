/**
 * computeAll racial gating: no raceKey → output identical to pre-race
 * behavior; raceKey set → racial ability mods, unconditional modifiers,
 * and situational notes flow through.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";

function fixture() {
  const c = createDefaultCharacter("test", "Test");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.baseAbilities = { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 8 };
  c.skills = {
    Perception: { ability: "wis", ranks: 2, misc: 0, classSkill: false },
  };
  return c;
}

describe("computeAll racial integration", () => {
  it("no raceKey: race string alone changes nothing", () => {
    const plain = computeAll(fixture());
    const labeled = fixture();
    labeled.race = "Elf"; // legacy free-text label
    const withLabel = computeAll(labeled);
    expect(withLabel).toEqual(plain);
    expect(withLabel.racial).toBeUndefined();
  });

  it("elf raceKey: ability mods, Keen Senses, and notes apply", () => {
    const base = computeAll(fixture());
    const elf = fixture();
    elf.raceKey = "elf";
    const computed = computeAll(elf);
    // +2 Dex / +2 Int / -2 Con on 14/10/12 → mods +1/+1/-1
    expect(computed.mods.dex).toBe(base.mods.dex + 1);
    expect(computed.mods.int).toBe(base.mods.int + 1);
    expect(computed.mods.con).toBe(base.mods.con - 1);
    // Keen Senses: +2 on Perception beyond the wis-mod ripple (wis unchanged)
    const perception = (c: typeof computed) =>
      c.skills.find((s) => s.name === "Perception")!.total;
    expect(perception(computed)).toBe(perception(base) + 2);
    // Reflex picks up the dex ripple but no flat racial bonus
    expect(computed.saves.ref).toBe(base.saves.ref + 1);
    expect(computed.racial?.race.key).toBe("elf");
    expect(computed.racial?.notes.length).toBeGreaterThan(0);
  });

  it("halfling raceKey: Halfling Luck lands on every save", () => {
    const halfling = fixture();
    halfling.raceKey = "halfling";
    halfling.baseAbilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const computed = computeAll(halfling);
    // Fort: base 4 (fighter 4 good) + con 0 + luck 1
    expect(computed.saves.fort).toBe(5);
    // Will: base 1 + wis 0 + luck 1
    expect(computed.saves.will).toBe(2);
  });

  it("flexible races contribute nothing until an ability is chosen", () => {
    const human = fixture();
    human.raceKey = "human";
    const unchosen = computeAll(human);
    expect(unchosen.mods).toEqual(computeAll(fixture()).mods);
    human.raceAbilityChoice = "str";
    expect(computeAll(human).mods.str).toBe(unchosen.mods.str + 1);
  });
});
