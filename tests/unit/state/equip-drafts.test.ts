/**
 * Draft-builder tests: catalog records → inventory drafts. These are the
 * handoff shapes the Equipment DB view and the editor autocomplete write
 * through addItem. Weapon drafts carry stamped attack stats — an equipped
 * weapon item IS an attack profile.
 */
import { describe, expect, it } from "vitest";
import {
  armorDraft,
  customDraft,
  magicDraft,
  weaponDraft,
  weaponStatsFor,
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

  it("weapon draft stamps attack stats from the medium damage line", () => {
    expect(weaponDraft(longsword).weapon).toEqual({
      kind: "melee",
      damageDie: "1d8",
      critRange: "19-20",
      critMult: "2",
    });
    expect(weaponDraft(longbow).weapon?.kind).toBe("ranged");
  });

  it("ammunition and no-damage entries get no attack stats", () => {
    expect(weaponStatsFor({ ...longbow, category: "ammunition" })).toBeUndefined();
    expect(weaponStatsFor({ ...longsword, dmgM: "" })).toBeUndefined();
  });

  it("crit fields default for no-crit weapons", () => {
    expect(
      weaponStatsFor({ ...longsword, critRange: "", critMult: "" })
    ).toMatchObject({ critRange: "20", critMult: "2" });
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

  it("custom weapon draft stamps attack stats from its base weapon", () => {
    const forged: CustomItemDef = {
      id: "ci_x",
      name: "+1 Flaming Longsword",
      kind: "weapon",
      baseId: "longsword",
      enhancement: 1,
      abilityIds: ["flaming"],
      priceGp: 8315,
      weightLbs: 4,
      modifiers: [],
      note: "",
      createdAt: "",
      modifiedAt: "",
    };
    expect(customDraft(forged, longsword).weapon).toEqual({
      kind: "melee",
      damageDie: "1d8",
      critRange: "19-20",
      critMult: "2",
    });
    // no base resolved (stale baseId) → no stats, still a valid item
    expect(customDraft(forged).weapon).toBeUndefined();
    // armor customs never get attack stats even when a base is passed
    expect(customDraft({ ...forged, kind: "armor" }, longsword).weapon).toBeUndefined();
  });
});
