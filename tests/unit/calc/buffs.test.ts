/**
 * Buff registry through computeAll — the RAW-stacking contract that
 * replaced the legacy flat-addition buff handlers (RAW FIX 2026-06).
 * Each case documents its delta from the captured legacy behavior; the
 * 14 fixture cases excluded in conditions.test.ts are covered here.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { BUFF_DEFS, getBuffDef } from "../../../src/data/buffs";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultInventory } from "../../../src/types/inventory";

function makeChar(buffs: string[] = []) {
  const c = createDefaultCharacter("t", "T");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.buffs = buffs;
  return c;
}
const bare = computeAll(makeChar());

describe("buff registry shape", () => {
  it("covers the 14 legacy buffs and resolves the enlarge alias", () => {
    expect(BUFF_DEFS).toHaveLength(14);
    expect(getBuffDef("enlarge person")).toBe(getBuffDef("enlarged"));
  });
});

describe("stat buffs (legacy parity: same totals, now typed)", () => {
  it("bull's strength: +4 enhancement STR", () => {
    const c = computeAll(makeChar(["bull's strength"]));
    expect(c.scores.str).toBe(bare.scores.str + 4);
    expect(c.mods.str).toBe(bare.mods.str + 2);
  });

  it("barkskin: +2 normal/FF, touch unchanged (same as legacy)", () => {
    const c = computeAll(makeChar(["barkskin"]));
    expect(c.ac.normalAC).toBe(bare.ac.normalAC + 2);
    expect(c.ac.flatFootedAC).toBe(bare.ac.flatFootedAC + 2);
    expect(c.ac.touchAC).toBe(bare.ac.touchAC);
  });

  it("shield + mage armor: different types stack to +8 normal/FF (same as legacy)", () => {
    const c = computeAll(makeChar(["shield", "mage armor"]));
    expect(c.ac.normalAC).toBe(bare.ac.normalAC + 8);
    expect(c.ac.flatFootedAC).toBe(bare.ac.flatFootedAC + 8);
    expect(c.ac.touchAC).toBe(bare.ac.touchAC);
  });

  it("haste: +1 attack/AC/touch/Ref, extra attack, speed ×1.5 (same as legacy)", () => {
    const c = computeAll(makeChar(["haste"]));
    expect(c.ac.normalAC).toBe(bare.ac.normalAC + 1);
    expect(c.ac.touchAC).toBe(bare.ac.touchAC + 1);
    expect(c.ac.flatFootedAC).toBe(bare.ac.flatFootedAC); // dodge — lost FF
    expect(c.saves.ref).toBe(bare.saves.ref + 1);
    expect(c.conditionEffects.extraAttacks).toHaveLength(1);
    expect(c.movementMultiplier).toBe(1.5);
  });

  it("buff notes still surface on conditionEffects.buffNotes", () => {
    const c = computeAll(makeChar(["barkskin"]));
    expect(c.conditionEffects.buffNotes).toContain("Barkskin: +2 enhancement");
  });
});

describe("RAW deltas from legacy (documented changes)", () => {
  it("bless: +1 morale attack; saves UNCHANGED (legacy: +1 all saves, always)", () => {
    const c = computeAll(makeChar(["bless"]));
    expect(c.saves).toEqual(bare.saves); // DELTA: legacy added +1 fort/ref/will
    expect(c.modifierReport?.conditional.some((n) => n.includes("vs fear"))).toBe(true);
    // attack +1 shows in the melee string
    expect(c.attacks.melee).not.toEqual(bare.attacks.melee);
  });

  it("magic weapon vs config weapon enhancement takes the max (legacy summed)", () => {
    const withConfig = makeChar(["magic weapon"]);
    withConfig.enhancements.meleeWeapon = 1;
    const baseline = makeChar();
    baseline.enhancements.meleeWeapon = 1;
    // DELTA: legacy produced +2 (1 + 1); RAW enhancement suppresses to +1
    expect(computeAll(withConfig).attacks.melee).toEqual(
      computeAll(baseline).attacks.melee
    );
  });

  it("mage armor vs armor-typed gear takes the max (legacy summed)", () => {
    const c = makeChar(["mage armor"]);
    c.inventory = createDefaultInventory();
    c.inventory.items.push({
      id: "item_chain0001",
      name: "Chain Shirt",
      type: "Armor",
      count: 1,
      weight: 25,
      value: 100,
      containerId: null,
      note: null,
      charges: null,
      equipped: true,
      modifiers: [{ target: "ac.all", type: "armor", value: 4, source: "Chain Shirt" }],
    });
    const computed = computeAll(c);
    // DELTA: legacy stacked to +8; same-type armor bonuses suppress to +4
    expect(computed.ac.normalAC).toBe(bare.ac.normalAC + 4);
    expect(computed.modifierReport?.suppressed.length).toBe(1);
  });

  it("haste + Blessing of Fervor Extra Attack: exactly one extra attack", () => {
    // DELTA: the legacy handlers each deferred to the other — the captured
    // fixture shows ZERO extra attacks with both active. RAW: one.
    const c = makeChar(["haste", "blessing of fervor"]);
    c.bofChoice = "Extra Attack";
    expect(computeAll(c).conditionEffects.extraAttacks).toHaveLength(1);
  });
});

describe("custom buffs", () => {
  it("apply their modifiers and stack by type against registry buffs", () => {
    const c = makeChar(["bless", "warchant"]);
    c.customBuffs = [
      {
        id: "warchant",
        name: "War Chant",
        modifiers: [{ target: "attack.all", type: "morale", value: 2, source: "War Chant" }],
      },
    ];
    const blessOnly = computeAll(makeChar(["bless"]));
    const both = computeAll(c);
    // morale 2 beats bless's morale 1 — net +1 over bless alone
    expect(both.attacks.melee).not.toEqual(blessOnly.attacks.melee);
    expect(both.modifierReport?.suppressed.some((n) => n.includes("Bless"))).toBe(true);
  });

  it("unknown buff keys are ignored (legacy behavior preserved)", () => {
    expect(computeAll(makeChar(["no such buff"])).ac).toEqual(bare.ac);
  });
});
