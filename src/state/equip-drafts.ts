/**
 * Pure builders that turn equipment-catalog records into inventory item
 * drafts — the handoff layer between the Equipment Database view / editor
 * autocomplete and the existing addItem write path.
 * No obsidian imports; unit-tested in tests/unit/state/equip-drafts.test.ts.
 */
import type { CustomItemDef } from "../types/custom-items";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  MagicItemDef,
} from "../types/equipment";
import type { InventoryItem, ItemWeaponStats } from "../types/inventory";

/** Attack stats stamped onto weapon items (equipped item = attack profile).
 *  Ammunition gets none — arrows aren't an attack block. */
export function weaponStatsFor(w: BaseWeaponDef): ItemWeaponStats | undefined {
  if (!w.dmgM || w.category === "ammunition") return undefined;
  const ranged = w.category === "ranged";
  // 10 ft range increment = thrown at hand (shuriken, chakram): Str to
  // damage, like the legacy built-in Shuriken entry. Projectile weapons
  // (bows, crossbows) have longer increments and stay at flat 0.
  const thrown = ranged && w.rangeFt !== null && w.rangeFt <= 10;
  const monk = w.special.includes("monk");
  return {
    kind: ranged ? "ranged" : "melee",
    damageDie: w.dmgM,
    critRange: w.critRange || "20",
    critMult: w.critMult || "2",
    ...(thrown ? { damageStat: "str" as const } : {}),
    ...(ranged && monk ? { flurry: true } : {}),
  };
}

export function weaponDraft(w: BaseWeaponDef): Omit<InventoryItem, "id"> {
  const stats = weaponStatsFor(w);
  return {
    name: w.name,
    type: "Weapon",
    count: 1,
    weight: w.weightLbs,
    value: w.costGp,
    containerId: null,
    note: null,
    charges: null,
    equipped: false,
    ...(stats ? { weapon: stats } : {}),
  };
}

export function armorDraft(a: BaseArmorDef): Omit<InventoryItem, "id"> {
  return {
    name: a.name,
    type: a.kind === "shield" ? "Shield" : "Armor",
    count: 1,
    weight: a.weightLbs,
    value: a.costGp,
    containerId: null,
    note: null,
    charges: null,
    equipped: false,
    modifiers: [
      { target: "ac.all", type: a.kind, value: a.acBonus, source: a.name },
    ],
  };
}

export function magicDraft(m: MagicItemDef): Omit<InventoryItem, "id"> {
  return {
    name: m.name,
    type: "Magic Item",
    count: 1,
    weight: m.weightLbs,
    value: m.priceGp,
    containerId: null,
    note: null,
    charges: null,
    equipped: false,
    ...(m.modifiers.length ? { modifiers: m.modifiers } : {}),
  };
}

/** `base` is the forge weapon behind a custom weapon (c.baseId) — its dice
 *  carry over so the equipped custom item drives an attack block. */
export function customDraft(
  c: CustomItemDef,
  base?: BaseWeaponDef
): Omit<InventoryItem, "id"> {
  const stats = c.kind === "weapon" && base ? weaponStatsFor(base) : undefined;
  return {
    name: c.name,
    type: c.kind === "weapon" ? "Weapon" : c.kind === "shield" ? "Shield" : "Armor",
    count: 1,
    weight: c.weightLbs,
    value: c.priceGp,
    containerId: null,
    note: c.note || null,
    charges: null,
    equipped: false,
    modifiers: c.modifiers,
    ...(stats ? { weapon: stats } : {}),
  };
}
