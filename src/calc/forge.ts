/**
 * Magic item forge — pure RAW math for custom magic weapons and armor:
 * base item + enhancement (+1..+5) + special abilities, with OGL pricing
 * and the +10 effective-bonus cap.
 *
 * Pricing (Core Rulebook magic item creation):
 *   weapon:       base + 300 (masterwork) + (effective bonus)² × 2,000 + Σ flat-gp
 *   armor/shield: base + 150 (masterwork) + (effective bonus)² × 1,000 + Σ flat-gp
 * The forge always implies masterwork; effective bonus = enhancement +
 * Σ ability bonus equivalents (flat-gp abilities add cost, not equivalence).
 *
 * Modifier emission (see plan: typed bonuses resolve max-per-type, so
 * base + enhancement MUST fold into ONE modifier per item):
 *   weapon: ONE attack.melee/ranged enhancement modifier — damage follows
 *           automatically via splitEnhancement/weapon-enhancement wiring.
 *   armor:  ONE folded {ac.all, armor|shield, acBonus + enhancement}.
 * Text-only abilities (Flaming, Keen...) emit no modifiers — they ride
 * noteLines; Bane-style ability modifiers pass through re-sourced.
 */
import type {
  BaseArmorDef,
  BaseWeaponDef,
  ItemAbilityDef,
} from "../types/equipment";
import type { Modifier } from "./modifiers";

export const MAX_ENHANCEMENT = 5;
export const MAX_EFFECTIVE_BONUS = 10;
const MASTERWORK_WEAPON_GP = 300;
const MASTERWORK_ARMOR_GP = 150;

export interface ForgeCatalog {
  weapons: BaseWeaponDef[];
  armor: BaseArmorDef[];
  weaponAbilities: ItemAbilityDef[];
  armorAbilities: ItemAbilityDef[];
}

export interface ForgeSelection {
  kind: "weapon" | "armor" | "shield";
  baseId: string;
  enhancement: number;
  abilityIds: string[];
}

export interface ForgeResult {
  valid: boolean;
  errors: string[];
  totalBonusEquivalent: number;
  priceGp: number;
  weightLbs: number;
  name: string;
  modifiers: Modifier[];
  /** one line per ability ("Flaming: ...1d6 fire...") for the item note */
  noteLines: string[];
}

/** Which ability appliesTo values fit a given base item. */
export function abilityFits(
  ability: ItemAbilityDef,
  kind: ForgeSelection["kind"],
  weapon?: BaseWeaponDef,
): boolean {
  if (kind === "weapon") {
    if (ability.appliesTo === "weapon") return true;
    const side =
      weapon &&
      (weapon.category === "ranged" || weapon.category === "ammunition")
        ? "ranged"
        : "melee";
    return ability.appliesTo === side;
  }
  if (ability.appliesTo === "armor-or-shield") return true;
  return ability.appliesTo === kind;
}

export function forgeItem(
  sel: ForgeSelection,
  catalog: ForgeCatalog,
): ForgeResult {
  const errors: string[] = [];

  const weapon =
    sel.kind === "weapon"
      ? catalog.weapons.find((w) => w.id === sel.baseId)
      : undefined;
  const armor =
    sel.kind !== "weapon"
      ? catalog.armor.find((a) => a.id === sel.baseId)
      : undefined;
  if (sel.kind === "weapon" && !weapon) {
    errors.push(`unknown base weapon "${sel.baseId}"`);
  }
  if (sel.kind !== "weapon" && !armor) {
    errors.push(`unknown base armor "${sel.baseId}"`);
  }
  if (armor && sel.kind === "shield" && armor.kind !== "shield") {
    errors.push(`"${armor.name}" is not a shield`);
  }
  if (armor && sel.kind === "armor" && armor.kind !== "armor") {
    errors.push(`"${armor.name}" is not armor`);
  }

  if (
    !Number.isInteger(sel.enhancement) ||
    sel.enhancement < 1 ||
    sel.enhancement > MAX_ENHANCEMENT
  ) {
    errors.push(`enhancement must be +1 to +${MAX_ENHANCEMENT}`);
  }

  const abilityPool =
    sel.kind === "weapon" ? catalog.weaponAbilities : catalog.armorAbilities;
  const abilities: ItemAbilityDef[] = [];
  for (const id of sel.abilityIds) {
    const ability = abilityPool.find((a) => a.id === id);
    if (!ability) {
      errors.push(`unknown ability "${id}"`);
      continue;
    }
    if (abilities.some((a) => a.id === id)) {
      errors.push(`duplicate ability "${ability.name}"`);
      continue;
    }
    if (!abilityFits(ability, sel.kind, weapon)) {
      errors.push(`"${ability.name}" does not apply to this ${sel.kind}`);
      continue;
    }
    abilities.push(ability);
  }

  const totalBonusEquivalent =
    sel.enhancement +
    abilities.reduce((sum, a) => sum + (a.bonusEquivalent ?? 0), 0);
  if (totalBonusEquivalent > MAX_EFFECTIVE_BONUS) {
    errors.push(
      `total effective bonus +${totalBonusEquivalent} exceeds the +${MAX_EFFECTIVE_BONUS} cap`,
    );
  }

  const base = weapon ?? armor;
  const flatGp = abilities.reduce((sum, a) => sum + (a.flatPriceGp ?? 0), 0);
  const eb = totalBonusEquivalent;
  const priceGp = base
    ? sel.kind === "weapon"
      ? base.costGp + MASTERWORK_WEAPON_GP + eb * eb * 2000 + flatGp
      : base.costGp + MASTERWORK_ARMOR_GP + eb * eb * 1000 + flatGp
    : 0;

  const name = base
    ? `+${sel.enhancement} ${abilities.map((a) => a.name).join(" ")}${
        abilities.length ? " " : ""
      }${base.name}`
    : "";

  const modifiers: Modifier[] = [];
  if (base && errors.length === 0) {
    if (weapon) {
      const target =
        weapon.category === "ranged" || weapon.category === "ammunition"
          ? "attack.ranged"
          : "attack.melee";
      modifiers.push({
        target,
        type: "enhancement",
        value: sel.enhancement,
        source: name,
      });
    } else if (armor) {
      modifiers.push({
        target: "ac.all",
        type: armor.kind,
        value: armor.acBonus + sel.enhancement,
        source: name,
      });
    }
    for (const ability of abilities) {
      for (const m of ability.modifiers ?? []) {
        modifiers.push({ ...m, source: name });
      }
    }
  }

  const noteLines = abilities.map((a) =>
    a.shortDesc ? `${a.name}: ${a.shortDesc}` : a.name,
  );

  return {
    valid: errors.length === 0,
    errors,
    totalBonusEquivalent,
    priceGp,
    weightLbs: base?.weightLbs ?? 0,
    name,
    modifiers,
    noteLines,
  };
}
