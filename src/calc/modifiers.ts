/**
 * Typed modifier engine — the foundation for racial traits, class features,
 * and future rules expansion (gear/buffs can migrate onto it incrementally).
 * Pure TS: no obsidian imports.
 *
 * PF1e stacking rules implemented here:
 *  - Bonuses of the same type do NOT stack — the largest applies — EXCEPT
 *    dodge, circumstance, and untyped bonuses, which always stack.
 *  - Penalties always stack (the same-source exclusion is the caller's
 *    responsibility; sources are distinct by construction in our data).
 *  - Modifiers with a `condition` are NEVER auto-summed; they're returned
 *    separately so the UI can surface them as situational notes.
 */

import type { AbilityKey } from "../types/character";

export const BONUS_TYPES = [
  "alchemical",
  "armor",
  "circumstance",
  "competence",
  "deflection",
  "dodge",
  "enhancement",
  "inherent",
  "insight",
  "luck",
  "morale",
  "natural",
  "profane",
  "racial",
  "resistance",
  "sacred",
  "shield",
  "size",
  "trait",
  "untyped",
] as const;

export type BonusType = (typeof BONUS_TYPES)[number];

/**
 * Dotted target paths. The `.all` suffix is a group target: a modifier on
 * "save.all" applies to every save query ("save.fort" etc.). Skill targets
 * use the STANDARD_SKILLS display names ("skill.Perception").
 */
export type ModifierTarget =
  | `ability.${AbilityKey}`
  | `save.${"fort" | "ref" | "will" | "all"}`
  | `skill.${string}`
  | `attack.${"melee" | "ranged" | "unarmed" | "all"}`
  | `ac.${"natural" | "all"}`
  | "initiative"
  | "cmb"
  | "cmd"
  | "speed"
  | "hp"
  | "sr"
  | "casterLevel"
  | `energyRes.${string}`;

export interface Modifier {
  target: ModifierTarget;
  type: BonusType;
  value: number;
  /** where it came from, e.g. "Dwarf: Hardy" or "Cloak of Resistance" */
  source: string;
  /** situational rider, e.g. "vs poison, spells, and spell-like abilities" */
  condition?: string;
}

/** Bonus types that stack with themselves. */
const SELF_STACKING: ReadonlySet<BonusType> = new Set([
  "dodge",
  "circumstance",
  "untyped",
]);

export interface ResolvedModifiers {
  /** sum of all applied (unconditional) modifiers */
  total: number;
  applied: Modifier[];
  /** same-type bonuses beaten by a larger bonus of that type */
  suppressed: Modifier[];
  /** situational modifiers relevant to the target — never in `total` */
  conditional: Modifier[];
}

function targetMatches(modTarget: string, query: string): boolean {
  if (modTarget === query) return true;
  const dot = query.lastIndexOf(".");
  return dot > 0 && modTarget === `${query.slice(0, dot)}.all`;
}

/** All modifiers relevant to a target query (group targets included). */
export function modifiersFor(mods: Modifier[], target: string): Modifier[] {
  return mods.filter((m) => targetMatches(m.target, target));
}

export function resolveModifiers(
  mods: Modifier[],
  target: string
): ResolvedModifiers {
  const relevant = modifiersFor(mods, target);
  const conditional = relevant.filter((m) => m.condition);
  const active = relevant.filter((m) => !m.condition);

  const applied: Modifier[] = [];
  const suppressed: Modifier[] = [];
  const bestByType = new Map<BonusType, Modifier>();

  for (const m of active) {
    // Penalties and self-stacking bonus types always apply.
    if (m.value < 0 || SELF_STACKING.has(m.type)) {
      applied.push(m);
      continue;
    }
    const best = bestByType.get(m.type);
    if (!best) {
      bestByType.set(m.type, m);
    } else if (m.value > best.value) {
      suppressed.push(best);
      bestByType.set(m.type, m);
    } else {
      suppressed.push(m);
    }
  }
  applied.push(...bestByType.values());

  return {
    total: applied.reduce((sum, m) => sum + m.value, 0),
    applied,
    suppressed,
    conditional,
  };
}

/** "+2 racial bonus vs poison (Dwarf: Hardy)" */
export function describeModifier(m: Modifier): string {
  const sign = m.value >= 0 ? "+" : "";
  const kind = m.value >= 0 ? "bonus" : "penalty";
  const type = m.type === "untyped" ? "" : `${m.type} `;
  const condition = m.condition ? ` ${m.condition}` : "";
  return `${sign}${m.value} ${type}${kind}${condition} (${m.source})`;
}

/** Display notes for every conditional modifier in a set, deduped, stable order. */
export function conditionalNotes(mods: Modifier[]): string[] {
  return [...new Set(mods.filter((m) => m.condition).map(describeModifier))];
}
