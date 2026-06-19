/**
 * Path of War maneuver computation. Pure TS (no obsidian imports), called from
 * computeAll. Derives the numbers the maneuver tab needs — none are stored:
 *
 *  - Initiator Level (IL): initiating-class levels + ⌊½ other levels⌋. Governs
 *    the highest maneuver TIER accessible (IL 1–2 → tier 1, every +2 → +1 tier,
 *    IL 17+ → tier 9).
 *  - Initiating CLASS level: indexes the known/readied/stances-known limits
 *    (the scraped class progression table) — distinct from IL.
 *  - Recovery count: ability mod (min 2), per the class recovery method.
 *
 * Stance/boost MODIFIERS are emitted elsewhere (the stance/boost registries
 * fold into computeAll's buff/Quick-Action pipelines); this module only does
 * the roster math.
 */
import type { AbilityScores, CharacterRecord } from "../types/character";
import type { ManeuverType } from "../types/maneuverbook";
import { maneuverLimits, powClass } from "../data/maneuvers";

export interface ManeuverComputed {
  /** the maneuverbook's initiating class key, e.g. "warlord" */
  initiatingClass: string;
  /** display name, e.g. "Warlord" */
  className: string;
  initiatorLevel: number;
  /** summed level of class entries matching the initiating class */
  classLevel: number;
  /** highest maneuver tier accessible (1–9; 0 when classLevel is 0) */
  maxManeuverLevel: number;
  /** initiating ability modifier (DC = 10 + maneuver tier + this) */
  initMod: number;
  limits: { known: number; readied: number; stances: number };
  counts: { known: number; readied: number; stances: number; expended: number };
  /** maneuvers regained by the class recovery action (ability mod, min 2) */
  recoveryCount: number;
  recoveryMethod: string;
}

function tierFromInitiatorLevel(il: number): number {
  if (il < 1) return 0;
  return Math.min(9, Math.ceil(il / 2));
}

/**
 * Initiator Level from levels alone (initiating-class levels + ⌊½ others⌋,
 * or the explicit override). Pure of ability mods, so computeAll can resolve
 * IL-scaled stance/boost effects at the modifier-fold point — which runs
 * before ability mods are known. Returns null when there is no maneuverbook.
 */
export function initiatorLevelOf(character: CharacterRecord): number | null {
  const book = character.maneuverbook;
  if (!book) return null;
  const initiatingKey = book.initiatingClass.toLowerCase();
  const totalLevel = character.classes.reduce((s, c) => s + c.level, 0);
  const classLevel = character.classes
    .filter((c) => c.className.toLowerCase().includes(initiatingKey))
    .reduce((s, c) => s + c.level, 0);
  const otherLevel = totalLevel - classLevel;
  return book.initiatorLevelOverride ?? classLevel + Math.floor(otherLevel / 2);
}

/**
 * Compute the maneuver block, or null when the character has no maneuverbook.
 * `abilityMods` is the effective per-ability modifier map (computeAll already
 * resolved it), so the recovery count and save DCs track buffs/items.
 */
export function computeManeuvers(
  character: CharacterRecord,
  abilityMods: AbilityScores,
): ManeuverComputed | null {
  const book = character.maneuverbook;
  if (!book) return null;

  const meta = powClass(book.initiatingClass);
  const initiatingKey = book.initiatingClass.toLowerCase();

  const classLevel = character.classes
    .filter((c) => c.className.toLowerCase().includes(initiatingKey))
    .reduce((s, c) => s + c.level, 0);

  const initiatorLevel = initiatorLevelOf(character) ?? 0;

  const initMod = abilityMods[book.initiatingStat] ?? 0;

  const countByType = (t: ManeuverType) =>
    book.maneuvers.filter((m) => m.type === t).length;
  const knownCount = book.maneuvers.length - countByType("Stance"); // stances counted separately

  return {
    initiatingClass: initiatingKey,
    className: meta?.name ?? book.initiatingClass,
    initiatorLevel,
    classLevel,
    maxManeuverLevel: tierFromInitiatorLevel(initiatorLevel),
    initMod,
    limits: maneuverLimits(initiatingKey, classLevel),
    counts: {
      known: knownCount,
      readied: book.readied.length,
      stances: countByType("Stance"),
      expended: book.expended.length,
    },
    recoveryCount: Math.max(2, initMod),
    recoveryMethod: meta?.recovery ?? "",
  };
}
