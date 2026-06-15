/**
 * The PF1e race data registry. Races are opt-in: a character without
 * `raceKey` is untouched by everything here (the legacy free-text `race`
 * field remains the display label either way).
 */

import type { AbilityKey, AbilityScores } from "../../types/character";
import type { RaceData } from "../types";
import { CORE_RACES } from "./core";
import { FEATURED_RACES } from "./featured";
import { UNCOMMON_RACES } from "./uncommon";

export {
  AASIMAR_HERITAGES,
  applyHeritage,
  getHeritage,
  HERITAGES_BY_RACE,
  listHeritages,
  TIEFLING_HERITAGES,
} from "./heritages";

const ALL_RACES: RaceData[] = [
  ...CORE_RACES,
  ...FEATURED_RACES,
  ...UNCOMMON_RACES,
];

export const RACE_DATA: Record<string, RaceData> = Object.fromEntries(
  ALL_RACES.map((r) => [r.key, r]),
);

export const RACE_KEYS = Object.keys(RACE_DATA).sort();

export function getRaceData(key: string): RaceData | null {
  return RACE_DATA[key] ?? null;
}

/** Case-insensitive name → race, for matching legacy free-text race strings. */
export function findRaceByName(name: string): RaceData | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  return ALL_RACES.find((r) => r.name.toLowerCase() === needle) ?? null;
}

/**
 * Racial ability adjustments. Flexible races ("+2 to any one") apply the
 * chosen ability, or nothing until a choice is made.
 */
export function racialAbilityMods(
  race: RaceData,
  choice?: AbilityKey,
): Partial<AbilityScores> {
  if (race.flexibleAbility) {
    return choice ? { [choice]: 2 } : {};
  }
  return race.abilityMods;
}
