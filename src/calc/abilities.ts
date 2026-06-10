/**
 * Ability modifiers — clean port of the Meta Bind math blocks in
 * AdarinMiniSheetAbilitiesAndClasses.md:
 *   offset = adjust + conditionAdjust - drain - damage
 *   mod    = floor(((base + offset) - 10) / 2)
 * Frontmatter often carries "" for unset values; anything non-numeric
 * counts as 0 (the old `{x} ? {x} : 0` ternary semantics).
 */

import type { AbilityKey, AbilityScores } from "../types/character";
import { ABILITY_KEYS } from "../types/character";

export interface AbilityModInput {
  base: AbilityScores;
  /** temporary adjustments (buff/spell entered by hand) */
  adjust?: Partial<Record<AbilityKey, unknown>>;
  /** condition/buff-derived adjustments (strAdjust... from condition effects) */
  conditionAdjust?: Partial<Record<AbilityKey, unknown>>;
  drain?: Partial<Record<AbilityKey, unknown>>;
  damage?: Partial<Record<AbilityKey, unknown>>;
}

/** Coerce a frontmatter-ish value ("" | null | "3" | 3) to a number, falsy → 0. */
export function num(value: unknown): number {
  if (value === null || value === undefined || value === "" || value === false) {
    return 0;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export function abilityMods(input: AbilityModInput): AbilityScores {
  const out = {} as AbilityScores;
  for (const key of ABILITY_KEYS) {
    const offset =
      num(input.adjust?.[key]) +
      num(input.conditionAdjust?.[key]) -
      num(input.drain?.[key]) -
      num(input.damage?.[key]);
    out[key] = Math.floor((input.base[key] + offset - 10) / 2);
  }
  return out;
}
