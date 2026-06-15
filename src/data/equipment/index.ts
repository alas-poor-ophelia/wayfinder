/**
 * Bundled equipment catalog — the single import surface over the scraped
 * JSON (scripts/scrape-equipment/). Everything downstream (DB view, forge,
 * tests) goes through here so a future storage change (e.g. sidecar file)
 * touches only this module.
 */
import type { ForgeCatalog } from "../../calc/forge";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  ItemAbilityDef,
  MagicItemDef,
} from "../../types/equipment";
import armorAbilitiesJson from "./armor-abilities.json";
import armorJson from "./armor.json";
import magicItemsJson from "./magic-items.json";
import weaponAbilitiesJson from "./weapon-abilities.json";
import weaponsJson from "./weapons.json";

export const WEAPONS = weaponsJson as unknown as BaseWeaponDef[];
export const ARMOR = armorJson as unknown as BaseArmorDef[];
export const WEAPON_ABILITIES =
  weaponAbilitiesJson as unknown as ItemAbilityDef[];
export const ARMOR_ABILITIES =
  armorAbilitiesJson as unknown as ItemAbilityDef[];
export const MAGIC_ITEMS = magicItemsJson as unknown as MagicItemDef[];

export const FORGE_CATALOG: ForgeCatalog = {
  weapons: WEAPONS,
  armor: ARMOR,
  weaponAbilities: WEAPON_ABILITIES,
  armorAbilities: ARMOR_ABILITIES,
};

export function getBaseWeapon(id: string): BaseWeaponDef | undefined {
  return WEAPONS.find((w) => w.id === id);
}

export function getBaseArmor(id: string): BaseArmorDef | undefined {
  return ARMOR.find((a) => a.id === id);
}

export function getWeaponAbility(id: string): ItemAbilityDef | undefined {
  return WEAPON_ABILITIES.find((a) => a.id === id);
}

export function getArmorAbility(id: string): ItemAbilityDef | undefined {
  return ARMOR_ABILITIES.find((a) => a.id === id);
}

export function getMagicItem(id: string): MagicItemDef | undefined {
  return MAGIC_ITEMS.find((m) => m.id === id);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export const WEAPON_SOURCES = uniqueSorted(WEAPONS.map((w) => w.source));
export const ARMOR_SOURCES = uniqueSorted(ARMOR.map((a) => a.source));
export const MAGIC_SOURCES = uniqueSorted(MAGIC_ITEMS.map((m) => m.source));
export const MAGIC_SLOTS = uniqueSorted(MAGIC_ITEMS.map((m) => m.slot));
