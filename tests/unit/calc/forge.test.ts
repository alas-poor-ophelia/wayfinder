/**
 * Forge calc tests — OGL pricing, the +10 effective-bonus cap, and folded
 * modifier emission. All gp expectations hand-derived twice from the Core
 * Rulebook formulas (weapon: base + 300 + eb²×2000; armor: base + 150 +
 * eb²×1000), with base costs from the committed catalog JSON.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { forgeItem, type ForgeCatalog } from "../../../src/calc/forge";
import armorJson from "../../../src/data/equipment/armor.json";
import weaponsJson from "../../../src/data/equipment/weapons.json";
import { createDefaultCharacter } from "../../../src/types/character";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  ItemAbilityDef,
} from "../../../src/types/equipment";
import { createDefaultInventory } from "../../../src/types/inventory";

const FLAMING: ItemAbilityDef = {
  id: "flaming",
  name: "Flaming",
  appliesTo: "weapon",
  bonusEquivalent: 1,
  flatPriceGp: null,
  casterLevel: 10,
  aura: "moderate evocation",
  shortDesc: "sheathed in fire that deals an extra 1d6 points of fire damage",
  source: "Ultimate Equipment",
};
const KEEN: ItemAbilityDef = {
  ...FLAMING,
  id: "keen",
  name: "Keen",
  appliesTo: "melee",
  shortDesc: "doubles the threat range of the weapon",
};
const DISTANCE: ItemAbilityDef = {
  ...FLAMING,
  id: "distance",
  name: "Distance",
  appliesTo: "ranged",
  shortDesc: "doubles the range increment",
};
const HUGE_POWER: ItemAbilityDef = {
  ...FLAMING,
  id: "huge-power",
  name: "Huge Power",
  bonusEquivalent: 6,
};
const GLAMERED: ItemAbilityDef = {
  id: "glamered",
  name: "Glamered",
  appliesTo: "armor",
  bonusEquivalent: null,
  flatPriceGp: 2700,
  casterLevel: 10,
  aura: "moderate illusion",
  shortDesc: "appears to be a normal set of clothing",
  source: "Ultimate Equipment",
};
const FORTIFICATION: ItemAbilityDef = {
  ...GLAMERED,
  id: "light-fortification",
  name: "Light Fortification",
  appliesTo: "armor-or-shield",
  bonusEquivalent: 1,
  flatPriceGp: null,
};

const catalog: ForgeCatalog = {
  weapons: weaponsJson as unknown as BaseWeaponDef[],
  armor: armorJson as unknown as BaseArmorDef[],
  weaponAbilities: [FLAMING, KEEN, DISTANCE, HUGE_POWER],
  armorAbilities: [GLAMERED, FORTIFICATION],
};

describe("forgeItem pricing", () => {
  it("+1 longsword = 15 + 300 + 2,000 = 2,315 gp", () => {
    const r = forgeItem(
      { kind: "weapon", baseId: "longsword", enhancement: 1, abilityIds: [] },
      catalog,
    );
    expect(r.valid).toBe(true);
    expect(r.priceGp).toBe(2315);
    expect(r.name).toBe("+1 Longsword");
  });

  it("+1 Flaming longsword (eb 2) = 15 + 300 + 8,000 = 8,315 gp", () => {
    const r = forgeItem(
      {
        kind: "weapon",
        baseId: "longsword",
        enhancement: 1,
        abilityIds: ["flaming"],
      },
      catalog,
    );
    expect(r.valid).toBe(true);
    expect(r.totalBonusEquivalent).toBe(2);
    expect(r.priceGp).toBe(8315);
    expect(r.name).toBe("+1 Flaming Longsword");
  });

  it("+3 full plate = 1,500 + 150 + 9,000 = 10,650 gp", () => {
    const r = forgeItem(
      { kind: "armor", baseId: "full-plate", enhancement: 3, abilityIds: [] },
      catalog,
    );
    expect(r.valid).toBe(true);
    expect(r.priceGp).toBe(10650);
  });

  it("flat-gp ability adds linearly: +1 Glamered chain shirt = 100 + 150 + 1,000 + 2,700 = 3,950 gp", () => {
    const r = forgeItem(
      {
        kind: "armor",
        baseId: "chain-shirt",
        enhancement: 1,
        abilityIds: ["glamered"],
      },
      catalog,
    );
    expect(r.valid).toBe(true);
    expect(r.totalBonusEquivalent).toBe(1); // flat abilities add no equivalence
    expect(r.priceGp).toBe(3950);
  });
});

describe("forgeItem validation", () => {
  it("enforces the +10 effective-bonus cap (+5 enh + 6 equiv = 11)", () => {
    const r = forgeItem(
      {
        kind: "weapon",
        baseId: "longsword",
        enhancement: 5,
        abilityIds: ["huge-power"],
      },
      catalog,
    );
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/\+11 exceeds the \+10 cap/);
  });

  it("rejects enhancement outside +1..+5", () => {
    for (const enhancement of [0, 6, 2.5]) {
      const r = forgeItem(
        { kind: "weapon", baseId: "longsword", enhancement, abilityIds: [] },
        catalog,
      );
      expect(r.valid).toBe(false);
    }
  });

  it("rejects melee-only abilities on ranged weapons and vice versa", () => {
    const keenBow = forgeItem(
      {
        kind: "weapon",
        baseId: "longbow",
        enhancement: 1,
        abilityIds: ["keen"],
      },
      catalog,
    );
    expect(keenBow.valid).toBe(false);
    const distanceSword = forgeItem(
      {
        kind: "weapon",
        baseId: "longsword",
        enhancement: 1,
        abilityIds: ["distance"],
      },
      catalog,
    );
    expect(distanceSword.valid).toBe(false);
  });

  it("rejects duplicates, unknown abilities, and kind mismatches", () => {
    const dup = forgeItem(
      {
        kind: "weapon",
        baseId: "longsword",
        enhancement: 1,
        abilityIds: ["flaming", "flaming"],
      },
      catalog,
    );
    expect(dup.valid).toBe(false);
    const unknown = forgeItem(
      {
        kind: "weapon",
        baseId: "longsword",
        enhancement: 1,
        abilityIds: ["nope"],
      },
      catalog,
    );
    expect(unknown.valid).toBe(false);
    const notShield = forgeItem(
      { kind: "shield", baseId: "chain-shirt", enhancement: 1, abilityIds: [] },
      catalog,
    );
    expect(notShield.valid).toBe(false);
  });

  it("armor-or-shield abilities fit both armor and shields", () => {
    const onArmor = forgeItem(
      {
        kind: "armor",
        baseId: "chain-shirt",
        enhancement: 1,
        abilityIds: ["light-fortification"],
      },
      catalog,
    );
    expect(onArmor.valid).toBe(true);
    const onShield = forgeItem(
      {
        kind: "shield",
        baseId: "heavy-steel-shield",
        enhancement: 1,
        abilityIds: ["light-fortification"],
      },
      catalog,
    );
    expect(onShield.valid).toBe(true);
  });
});

describe("forgeItem modifier emission", () => {
  it("+1 melee weapon emits ONE attack.melee enhancement modifier", () => {
    const r = forgeItem(
      {
        kind: "weapon",
        baseId: "longsword",
        enhancement: 1,
        abilityIds: ["flaming"],
      },
      catalog,
    );
    expect(r.modifiers).toEqual([
      {
        target: "attack.melee",
        type: "enhancement",
        value: 1,
        source: "+1 Flaming Longsword",
      },
    ]);
    expect(r.noteLines[0]).toMatch(/^Flaming: /);
  });

  it("+1 ranged weapon targets attack.ranged", () => {
    const r = forgeItem(
      { kind: "weapon", baseId: "longbow", enhancement: 1, abilityIds: [] },
      catalog,
    );
    expect(r.modifiers[0]).toMatchObject({ target: "attack.ranged" });
  });

  it("+1 chain shirt folds into ONE {ac.all, armor, 5} modifier", () => {
    const r = forgeItem(
      { kind: "armor", baseId: "chain-shirt", enhancement: 1, abilityIds: [] },
      catalog,
    );
    expect(r.modifiers).toEqual([
      { target: "ac.all", type: "armor", value: 5, source: "+1 Chain shirt" },
    ]);
  });

  it("+2 heavy steel shield folds into ONE {ac.all, shield, 4} modifier", () => {
    const r = forgeItem(
      {
        kind: "shield",
        baseId: "heavy-steel-shield",
        enhancement: 2,
        abilityIds: [],
      },
      catalog,
    );
    expect(r.modifiers).toEqual([
      {
        target: "ac.all",
        type: "shield",
        value: 4,
        source: "+2 Heavy steel shield",
      },
    ]);
  });
});

describe("forged item through computeAll", () => {
  it("equipped forged +1 chain shirt raises normal AC by exactly 5", () => {
    const forged = forgeItem(
      { kind: "armor", baseId: "chain-shirt", enhancement: 1, abilityIds: [] },
      catalog,
    );
    const mk = (equipped: boolean) => {
      const c = createDefaultCharacter("t", "T");
      c.classes = [{ className: "Fighter", level: 4 }];
      c.inventory = createDefaultInventory();
      c.inventory.items.push({
        id: "item_forged0001",
        name: forged.name,
        type: "Armor",
        count: 1,
        weight: forged.weightLbs,
        value: forged.priceGp,
        containerId: null,
        note: null,
        charges: null,
        equipped,
        modifiers: forged.modifiers,
      });
      return computeAll(c);
    };
    const bare = mk(false);
    const armored = mk(true);
    expect(armored.ac.normalAC).toBe(bare.ac.normalAC + 5);
    expect(armored.ac.touchAC).toBe(bare.ac.touchAC); // armor lost on touch
    expect(armored.ac.flatFootedAC).toBe(bare.ac.flatFootedAC + 5);
  });
});
