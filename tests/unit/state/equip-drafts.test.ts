/**
 * Draft-builder tests: catalog records → inventory drafts / weapon
 * profiles. These are the handoff shapes the Equipment DB view writes
 * through addItem/updateCharacter.
 */
import { describe, expect, it } from "vitest";
import {
  armorDraft,
  customDraft,
  magicDraft,
  weaponDraft,
  weaponProfileFor,
} from "../../../src/state/equip-drafts";
import type { CustomItemDef } from "../../../src/types/custom-items";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  MagicItemDef,
} from "../../../src/types/equipment";

const longsword: BaseWeaponDef = {
  id: "longsword",
  name: "Longsword",
  costGp: 15,
  dmgS: "1d6",
  dmgM: "1d8",
  critRange: "19-20",
  critMult: "2",
  rangeFt: null,
  weightLbs: 4,
  dmgType: "S",
  special: [],
  proficiency: "martial",
  category: "one-handed",
  source: "Core",
};

const longbow: BaseWeaponDef = {
  ...longsword,
  id: "longbow",
  name: "Longbow",
  category: "ranged",
  rangeFt: 100,
};

const chainShirt: BaseArmorDef = {
  id: "chain-shirt",
  name: "Chain shirt",
  costGp: 100,
  acBonus: 4,
  kind: "armor",
  maxDex: 4,
  acp: -2,
  asfPct: 20,
  speed30: 30,
  weightLbs: 25,
  category: "light",
  source: "Core",
};

describe("inventory drafts", () => {
  it("weapon draft carries cost/weight, no modifiers, unequipped", () => {
    expect(weaponDraft(longsword)).toMatchObject({
      name: "Longsword",
      type: "Weapon",
      value: 15,
      weight: 4,
      equipped: false,
    });
    expect(weaponDraft(longsword).modifiers).toBeUndefined();
  });

  it("armor draft emits ONE typed ac.all modifier of the base bonus", () => {
    expect(armorDraft(chainShirt).modifiers).toEqual([
      { target: "ac.all", type: "armor", value: 4, source: "Chain shirt" },
    ]);
    expect(armorDraft({ ...chainShirt, kind: "shield" }).type).toBe("Shield");
  });

  it("magic draft passes derived modifiers through; omits when empty", () => {
    const belt: MagicItemDef = {
      id: "belt",
      name: "Belt of Giant Strength (+2)",
      group: "wondrous",
      slot: "belt",
      priceGp: 4000,
      weightLbs: 1,
      casterLevel: 8,
      aura: "moderate transmutation",
      source: "Core",
      shortDesc: "",
      modifiers: [
        { target: "ability.str", type: "enhancement", value: 2, source: "Belt" },
      ],
    };
    expect(magicDraft(belt).modifiers).toHaveLength(1);
    expect(magicDraft({ ...belt, modifiers: [] }).modifiers).toBeUndefined();
  });

  it("custom draft maps kind to inventory type and keeps note", () => {
    const forged: CustomItemDef = {
      id: "ci_x",
      name: "+1 Flaming Longsword",
      kind: "weapon",
      baseId: "longsword",
      enhancement: 1,
      abilityIds: ["flaming"],
      priceGp: 8315,
      weightLbs: 4,
      modifiers: [
        { target: "attack.melee", type: "enhancement", value: 1, source: "x" },
      ],
      note: "Flaming",
      createdAt: "",
      modifiedAt: "",
    };
    expect(customDraft(forged)).toMatchObject({
      type: "Weapon",
      note: "Flaming",
      value: 8315,
    });
    expect(customDraft({ ...forged, kind: "shield" }).type).toBe("Shield");
  });
});

describe("weaponProfileFor", () => {
  it("builds a melee profile from the medium damage line", () => {
    expect(weaponProfileFor([], longsword)).toEqual({
      id: "longsword",
      name: "Longsword",
      kind: "melee",
      damageDie: "1d8",
      critRange: "19-20",
      critMult: "2",
    });
  });

  it("ranged and ammunition categories map to ranged", () => {
    expect(weaponProfileFor([], longbow)?.kind).toBe("ranged");
    expect(
      weaponProfileFor([], { ...longbow, category: "ammunition" })?.kind
    ).toBe("ranged");
  });

  it("returns null when a same-name profile exists (no duplicates)", () => {
    const existing = [weaponProfileFor([], longsword)!];
    expect(weaponProfileFor(existing, longsword)).toBeNull();
  });

  it("suffixes the id on collision; custom name overrides", () => {
    const existing = [weaponProfileFor([], longsword)!];
    const forged = weaponProfileFor(existing, longsword, "+1 Flaming Longsword");
    expect(forged).toMatchObject({
      id: "longsword-2",
      name: "+1 Flaming Longsword",
    });
  });

  it("defaults crit fields for no-crit weapons", () => {
    const net = weaponProfileFor([], {
      ...longsword,
      id: "net",
      name: "Net",
      critRange: "",
      critMult: "",
    });
    expect(net).toMatchObject({ critRange: "20", critMult: "2" });
  });
});
