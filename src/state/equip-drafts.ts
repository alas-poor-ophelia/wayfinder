/**
 * Pure builders that turn equipment-catalog records into inventory item
 * drafts and weapon profiles — the handoff layer between the Equipment
 * Database view and the existing addItem/updateCharacter write paths.
 * No obsidian imports; unit-tested in tests/unit/state/equip-drafts.test.ts.
 */
import type { WeaponProfile } from "../types/character";
import type { CustomItemDef } from "../types/custom-items";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  MagicItemDef,
} from "../types/equipment";
import type { InventoryItem } from "../types/inventory";

export function weaponDraft(w: BaseWeaponDef): Omit<InventoryItem, "id"> {
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

export function customDraft(c: CustomItemDef): Omit<InventoryItem, "id"> {
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
  };
}

/**
 * A WeaponProfile for a catalog weapon, or null when a same-name profile
 * already exists (re-adds must not duplicate). `name` overrides the catalog
 * name for forged items ("+1 Flaming Longsword" on a longsword base).
 * Pure: the caller appends it via updateCharacter.
 */
export function weaponProfileFor(
  existing: WeaponProfile[],
  w: BaseWeaponDef,
  name = w.name
): WeaponProfile | null {
  if (existing.some((p) => p.name === name)) return null;
  let id = w.id;
  let n = 2;
  while (existing.some((p) => p.id === id)) id = `${w.id}-${n++}`;
  return {
    id,
    name,
    kind: w.category === "ranged" || w.category === "ammunition" ? "ranged" : "melee",
    damageDie: w.dmgM,
    critRange: w.critRange || "20",
    critMult: w.critMult || "2",
  };
}
