/**
 * Schemas for the static PF1e rules-data registries (src/data/classes,
 * src/data/races). Pure TS data, no obsidian imports.
 *
 * Sourcing: game mechanics are Open Game Content under the OGL 1.0a
 * (see LICENSES/OGL-1.0a.txt). Values transcribed from the Pathfinder
 * Roleplaying Game Reference Document (legacy.aonprd.com) / d20pfsrd.com,
 * cross-validated against the CLASS_STATS registry by
 * tests/unit/data/class-data.test.ts. Both registries carry published RAW
 * values; deliberate departures from the legacy data are marked RAW FIX.
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
  /** human-readable formula for the read-only config display, e.g.
   *  "⌊Paladin ÷ 2⌋ + Cha mod". The closure stays the source of truth; this
   *  is documentation surfaced next to the gold (class-derived) max. */
  describe?: string;
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
  /**
   * Quick actions this class grants, referencing ids in the quick-action
   * catalog (src/data/quick-actions.ts) — the catalog stays the single
   * source of truth for the defs; sync copies them per character.
   */
  quickActions?: { id: string; minLevel?: number }[];
}

/**
 * Hand-authored mechanical overrides for one archetype — the layer the
 * scraped graph can't carry because resource maxima are formulas. Keyed by
 * the scraped ArchetypeDef.id. An archetype with a scraped def but no
 * mechanics entry is "partial": its replaces-graph still auto-suppresses
 * pools/quick-actions via the feature map, but it grants nothing new.
 */
export interface ArchetypeMechanics {
  /** === ArchetypeDef.id, e.g. "gray-paladin" */
  key: string;
  /** === ClassData.key, e.g. "Paladin" */
  classKey: string;
  /** resource ids to suppress beyond the auto-map (use with addsResources
   *  sharing the id to express an altered formula) */
  removesResources?: string[];
  addsResources?: ClassResourceDef[];
  removesQuickActions?: string[];
  addsQuickActions?: { id: string; minLevel?: number }[];
  classSkills?: { add?: string[]; remove?: string[] };
  /** archetype trades spellcasting away entirely */
  removesSpellcasting?: boolean;
  /** divine grace comes online at this class level (Chosen One: 4);
   *  full removal comes from the replaces-graph, not this field */
  divineGraceMinLevel?: number;
  /** grants the scaling dodge AC bonus (Virtuous Bravo: Nimble) */
  grantsBravoAC?: boolean;
  /** monk AC bonus keys off CHA instead of WIS (Scaled Fist: Draconic
   *  Might rebases every Wis-driven monk calculation onto Cha) */
  scaledFistAC?: boolean;
  /** grants Weapon Finesse for free (e.g. Virtuous Bravo's Bravo's Finesse):
   *  Dex-to-attack on finesse weapons without spending the feat */
  grantsWeaponFinesse?: boolean;
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

/**
 * A variant heritage (Blood of Fiends tieflings, Blood of Angels aasimars).
 * A heritage REPLACES the base race's ability modifiers, its "Skilled"
 * skill bonuses, and its spell-like ability; everything else (size, speed,
 * vision, resistances, languages, remaining traits) is kept. Applied as a
 * pure RaceData transform — see applyHeritage() in src/data/races.
 */
export interface RaceHeritage {
  /** kebab-case key, e.g. "demon-spawn" */
  key: string;
  /** display name, e.g. "Demon-Spawn (Pitborn)" */
  name: string;
  /** the base race this heritage belongs to (RaceData.key) */
  raceKey: string;
  source: string;
  /** REPLACES the base race's abilityMods wholesale */
  abilityMods: Partial<AbilityScores>;
  /** heritage modifiers, added after replacesSources are dropped */
  modifiers: Modifier[];
  /** base-race Modifier.source values this heritage removes
   *  (e.g. "Tiefling: Skilled") */
  replacesSources: string[];
  /** replacement spell-like ability — swaps the base race's
   *  "Spell-Like Ability" trait summary */
  sla: string;
  /** extra descriptive traits beyond the SLA swap, if any */
  traits?: RaceTrait[];
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
