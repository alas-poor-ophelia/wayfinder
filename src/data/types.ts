/**
 * Schemas for the static PF1e rules-data registries (src/data/classes,
 * src/data/races). Pure TS data, no obsidian imports.
 *
 * Sourcing: game mechanics are Open Game Content under the OGL 1.0a
 * (see LICENSES/OGL-1.0a.txt). Values transcribed from the Pathfinder
 * Roleplaying Game Reference Document (legacy.aonprd.com) / d20pfsrd.com,
 * cross-validated against the fixture-locked CLASS_STATS registry by
 * tests/unit/data/class-data.test.ts.
 */

import type { AbilityKey, AbilityScores } from "../types/character";
import type { Modifier } from "../calc/modifiers";
import type { CasterParadigm } from "../calc/spells";

export type BabProgression = "full" | "threeQuarters" | "half";

/** Maps to the fractional rates CLASS_STATS stores (the math contract). */
export const BAB_RATE: Record<BabProgression, number> = {
  full: 1.0,
  threeQuarters: 0.75,
  half: 0.5,
};

export type SaveProgression = "good" | "poor";

export type ClassCategory =
  | "core"
  | "base"
  | "hybrid"
  | "occult"
  | "alternate"
  | "unchained";

export interface SpellcastingData {
  ability: AbilityKey;
  paradigm: CasterParadigm;
  /** highest spell level the class ever casts (9 / 6 / 4) */
  maxSpellLevel: 9 | 6 | 4;
  /**
   * Key into SPELL_TABLES when the slots-per-day progression matches an
   * existing table EXACTLY. Omitted when no matching table exists yet —
   * new table families are added to spells.ts deliberately, with tests,
   * not implied by data entries.
   */
  tableKey?: string;
}

export interface ClassResourceDef {
  /** stable pool id, e.g. "kiPool", "rageRounds" */
  id: string;
  name: string;
  /** class level at which the pool comes online (default 1) */
  minLevel?: number;
  /** pool maximum from class level + current ability mods */
  max: (level: number, mods: AbilityScores) => number;
  /** small text under the pips, e.g. "rounds/day" */
  footer?: string;
}

export interface ClassData {
  /** MUST equal the class's CLASS_STATS key, e.g. "Monk (Unchained)" */
  key: string;
  name: string;
  category: ClassCategory;
  /** book title, e.g. "Core Rulebook" */
  source: string;
  hitDie: 6 | 8 | 10 | 12;
  bab: BabProgression;
  saves: { fort: SaveProgression; ref: SaveProgression; will: SaveProgression };
  skillRanksPerLevel: 2 | 4 | 6 | 8;
  /** STANDARD_SKILLS keys only (note: "Knowledge (dungeon)", "Craft (any)") */
  classSkills: string[];
  casting?: SpellcastingData;
  resources?: ClassResourceDef[];
}

export type RaceCategory = "core" | "featured" | "uncommon";

export type Vision = "normal" | "low-light" | "darkvision60" | "darkvision120";

export type SizeCategory = "small" | "medium";

export interface RaceTrait {
  name: string;
  /** plain-language one-liner; mechanical effects live in RaceData.modifiers */
  summary: string;
}

export interface RaceData {
  /** kebab-case key, e.g. "half-orc" */
  key: string;
  name: string;
  category: RaceCategory;
  source: string;
  size: SizeCategory;
  /** base land speed in feet */
  speed: number;
  /** fixed racial ability adjustments; empty for flexible-ability races */
  abilityMods: Partial<AbilityScores>;
  /** "+2 to one ability score of the player's choice" (human, half-elf...) */
  flexibleAbility?: boolean;
  vision: Vision[];
  languages: string[];
  /**
   * Mechanical racial traits as typed modifiers. Conditional ones (e.g.
   * dwarf Hardy "vs poison") are surfaced as notes, never auto-summed.
   */
  modifiers: Modifier[];
  /** the full trait catalog, including traits not expressible as modifiers */
  traits: RaceTrait[];
}

/** The ten Knowledge entries as STANDARD_SKILLS spells them. */
export const ALL_KNOWLEDGE: string[] = [
  "Knowledge (arcana)",
  "Knowledge (dungeon)",
  "Knowledge (engineering)",
  "Knowledge (geography)",
  "Knowledge (history)",
  "Knowledge (local)",
  "Knowledge (nature)",
  "Knowledge (nobility)",
  "Knowledge (planes)",
  "Knowledge (religion)",
];
