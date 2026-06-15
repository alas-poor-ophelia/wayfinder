/**
 * Spell math — ported from the legacy spellbook calculators
 * (z_Components/scripts/spellbook/utils/spell-slots-lookup.js,
 * spell-calculations.js, metamagic-utils.js, caster-configs.js).
 * Pure TS: no obsidian imports. Characterization fixtures captured from the
 * live legacy code are the contract (tests/unit/calc/spells.test.ts).
 */

import { METAMAGIC_FEATS, metamagicPickerString } from "../data/feats";
import type { AbilityScores } from "../types/character";
import type { ClassEntry } from "../types/character";
import type { SpellbookState } from "../types/spellbook";
import { getSpellLevelKey, SPELL_LEVELS } from "../types/spellbook";

export type CasterParadigm = "prepared" | "spontaneous" | "hybrid";

export interface CasterConfig {
  type: CasterParadigm;
  usesSpellbook: boolean;
  spontaneousCasting: boolean;
  domainSlots?: boolean;
  usesPatrons?: boolean;
}

/**
 * From caster-configs.js — the registry the legacy renderer factory used.
 * (spell-slots-lookup.js carries a second, stale casterTypes map without
 * skald; this one is the authority.) Unknown classes fall back to wizard,
 * matching legacy getCasterConfig.
 */
export const CASTER_CONFIGS: Record<string, CasterConfig> = {
  wizard: { type: "prepared", usesSpellbook: true, spontaneousCasting: false },
  cleric: {
    type: "prepared",
    usesSpellbook: false,
    spontaneousCasting: true,
    domainSlots: true,
  },
  druid: { type: "prepared", usesSpellbook: false, spontaneousCasting: true },
  paladin: {
    type: "prepared",
    usesSpellbook: false,
    spontaneousCasting: false,
  },
  ranger: { type: "prepared", usesSpellbook: false, spontaneousCasting: false },
  sorcerer: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  bard: { type: "spontaneous", usesSpellbook: false, spontaneousCasting: true },
  oracle: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  skald: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  arcanist: { type: "hybrid", usesSpellbook: true, spontaneousCasting: true },
  witch: {
    type: "prepared",
    usesSpellbook: true,
    spontaneousCasting: false,
    usesPatrons: true,
  },
  summoner: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  magus: { type: "prepared", usesSpellbook: true, spontaneousCasting: false },
  alchemist: {
    type: "prepared",
    usesSpellbook: false,
    spontaneousCasting: false,
  },
  bloodrager: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  // RAW expansion (2026-06): every CLASS_DATA casting class gets an entry
  // so none silently falls back to the wizard config (paradigm match is
  // pinned by tests/unit/calc/spell-tables.test.ts).
  antipaladin: {
    type: "prepared",
    usesSpellbook: false,
    spontaneousCasting: false,
  },
  inquisitor: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  investigator: {
    type: "prepared",
    usesSpellbook: false,
    spontaneousCasting: false,
  },
  hunter: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  medium: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  mesmerist: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  occultist: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  omdura: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  psychic: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  spiritualist: {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  warpriest: {
    type: "prepared",
    usesSpellbook: false,
    spontaneousCasting: false,
  },
  shaman: { type: "prepared", usesSpellbook: false, spontaneousCasting: false },
  "vampire hunter": {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
  "summoner (unchained)": {
    type: "spontaneous",
    usesSpellbook: false,
    spontaneousCasting: true,
  },
};

export function getCasterConfig(castingClass: unknown): CasterConfig {
  if (!castingClass || typeof castingClass !== "string") {
    return CASTER_CONFIGS.wizard;
  }
  return CASTER_CONFIGS[castingClass.toLowerCase()] ?? CASTER_CONFIGS.wizard;
}

/**
 * RAW tables added 2026-06 (PRD-transcribed; anchor rows pinned by
 * tests/unit/calc/spell-tables.test.ts). The shared six-level progression
 * caps at 5/day — printed identically for alchemist, inquisitor,
 * investigator, hunter, mesmerist, occultist, spiritualist, skald, omdura,
 * and Summoner (Unchained). Cantrips/knacks/orisons are unlimited for
 * these classes (column 0 null); the warpriest's prepared-orison counts
 * get their own table.
 */
const SIX_LEVEL_CAPPED5: (number | null)[][] = [
  [null, 1, null, null, null, null, null],
  [null, 2, null, null, null, null, null],
  [null, 3, null, null, null, null, null],
  [null, 3, 1, null, null, null, null],
  [null, 4, 2, null, null, null, null],
  [null, 4, 3, null, null, null, null],
  [null, 4, 3, 1, null, null, null],
  [null, 4, 4, 2, null, null, null],
  [null, 5, 4, 3, null, null, null],
  [null, 5, 4, 3, 1, null, null],
  [null, 5, 4, 4, 2, null, null],
  [null, 5, 5, 4, 3, null, null],
  [null, 5, 5, 4, 3, 1, null],
  [null, 5, 5, 4, 4, 2, null],
  [null, 5, 5, 5, 4, 3, null],
  [null, 5, 5, 5, 4, 3, 1],
  [null, 5, 5, 5, 4, 4, 2],
  [null, 5, 5, 5, 5, 4, 3],
  [null, 5, 5, 5, 5, 5, 4],
  [null, 5, 5, 5, 5, 5, 5],
];

/**
 * Bloodrager and medium print the same 4-level table: onset at L4, ending
 * 4/4/3/2 at L20 (the paladin/ranger table ends 4/4/3/3).
 */
const FOUR_LEVEL_ONSET4: (number | null)[][] = [
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, 1, null, null, null],
  [null, 1, null, null, null],
  [null, 1, null, null, null],
  [null, 1, 1, null, null],
  [null, 1, 1, null, null],
  [null, 2, 1, null, null],
  [null, 2, 1, 1, null],
  [null, 2, 1, 1, null],
  [null, 2, 2, 1, null],
  [null, 3, 2, 1, 1],
  [null, 3, 2, 1, 1],
  [null, 3, 2, 2, 1],
  [null, 3, 3, 2, 1],
  [null, 4, 3, 2, 1],
  [null, 4, 3, 2, 2],
  [null, 4, 3, 3, 2],
  [null, 4, 4, 3, 2],
];

/**
 * Spell progression tables, [classLevel-1][spellLevel] = base slots.
 * null = spell level not available at that class level; 0 = printed zero
 * (slot level open, casting-stat bonus slots apply). Row widths vary by
 * class exactly as in the legacy file (half casters carry 5 columns).
 */
export const SPELL_TABLES: Record<string, (number | null)[][]> = {
  wizard: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 2, 1, null, null, null, null, null, null, null],
    [4, 3, 2, null, null, null, null, null, null, null],
    [4, 3, 2, 1, null, null, null, null, null, null],
    [4, 3, 3, 2, null, null, null, null, null, null],
    [4, 4, 3, 2, 1, null, null, null, null, null],
    [4, 4, 3, 3, 2, null, null, null, null, null],
    [4, 4, 4, 3, 2, 1, null, null, null, null],
    [4, 4, 4, 3, 3, 2, null, null, null, null],
    [4, 4, 4, 4, 3, 2, 1, null, null, null],
    [4, 4, 4, 4, 3, 3, 2, null, null, null],
    [4, 4, 4, 4, 4, 3, 2, 1, null, null],
    [4, 4, 4, 4, 4, 3, 3, 2, null, null],
    [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
    [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
  cleric: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 2, 1, null, null, null, null, null, null, null],
    [4, 3, 2, null, null, null, null, null, null, null],
    [4, 3, 2, 1, null, null, null, null, null, null],
    [4, 3, 3, 2, null, null, null, null, null, null],
    [4, 4, 3, 2, 1, null, null, null, null, null],
    [4, 4, 3, 3, 2, null, null, null, null, null],
    [4, 4, 4, 3, 2, 1, null, null, null, null],
    [4, 4, 4, 3, 3, 2, null, null, null, null],
    [4, 4, 4, 4, 3, 2, 1, null, null, null],
    [4, 4, 4, 4, 3, 3, 2, null, null, null],
    [4, 4, 4, 4, 4, 3, 2, 1, null, null],
    [4, 4, 4, 4, 4, 3, 3, 2, null, null],
    [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
    [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
  druid: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 2, 1, null, null, null, null, null, null, null],
    [4, 3, 2, null, null, null, null, null, null, null],
    [4, 3, 2, 1, null, null, null, null, null, null],
    [4, 3, 3, 2, null, null, null, null, null, null],
    [4, 4, 3, 2, 1, null, null, null, null, null],
    [4, 4, 3, 3, 2, null, null, null, null, null],
    [4, 4, 4, 3, 2, 1, null, null, null, null],
    [4, 4, 4, 3, 3, 2, null, null, null, null],
    [4, 4, 4, 4, 3, 2, 1, null, null, null],
    [4, 4, 4, 4, 3, 3, 2, null, null, null],
    [4, 4, 4, 4, 4, 3, 2, 1, null, null],
    [4, 4, 4, 4, 4, 3, 3, 2, null, null],
    [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
    [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
  witch: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 2, 1, null, null, null, null, null, null, null],
    [4, 3, 2, null, null, null, null, null, null, null],
    [4, 3, 2, 1, null, null, null, null, null, null],
    [4, 3, 3, 2, null, null, null, null, null, null],
    [4, 4, 3, 2, 1, null, null, null, null, null],
    [4, 4, 3, 3, 2, null, null, null, null, null],
    [4, 4, 4, 3, 2, 1, null, null, null, null],
    [4, 4, 4, 3, 3, 2, null, null, null, null],
    [4, 4, 4, 4, 3, 2, 1, null, null, null],
    [4, 4, 4, 4, 3, 3, 2, null, null, null],
    [4, 4, 4, 4, 4, 3, 2, 1, null, null],
    [4, 4, 4, 4, 4, 3, 3, 2, null, null],
    [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
    [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
  sorcerer: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 2, 1, null, null, null, null, null, null, null],
    [4, 3, 2, null, null, null, null, null, null, null],
    [4, 3, 2, 1, null, null, null, null, null, null],
    [4, 3, 3, 2, null, null, null, null, null, null],
    [4, 4, 3, 2, 1, null, null, null, null, null],
    [4, 4, 3, 3, 2, null, null, null, null, null],
    [4, 4, 4, 3, 2, 1, null, null, null, null],
    [4, 4, 4, 3, 3, 2, null, null, null, null],
    [4, 4, 4, 4, 3, 2, 1, null, null, null],
    [4, 4, 4, 4, 3, 3, 2, null, null, null],
    [4, 4, 4, 4, 4, 3, 2, 1, null, null],
    [4, 4, 4, 4, 4, 3, 3, 2, null, null],
    [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
    [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
  oracle: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 2, 1, null, null, null, null, null, null, null],
    [4, 3, 2, null, null, null, null, null, null, null],
    [4, 3, 2, 1, null, null, null, null, null, null],
    [4, 3, 3, 2, null, null, null, null, null, null],
    [4, 4, 3, 2, 1, null, null, null, null, null],
    [4, 4, 3, 3, 2, null, null, null, null, null],
    [4, 4, 4, 3, 2, 1, null, null, null, null],
    [4, 4, 4, 3, 3, 2, null, null, null, null],
    [4, 4, 4, 4, 3, 2, 1, null, null, null],
    [4, 4, 4, 4, 3, 3, 2, null, null, null],
    [4, 4, 4, 4, 4, 3, 2, 1, null, null],
    [4, 4, 4, 4, 4, 3, 3, 2, null, null],
    [4, 4, 4, 4, 4, 4, 3, 2, 1, null],
    [4, 4, 4, 4, 4, 4, 3, 3, 2, null],
    [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
    [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
  arcanist: [
    [4, 2, null, null, null, null, null, null, null, null],
    [5, 2, null, null, null, null, null, null, null, null],
    [5, 3, null, null, null, null, null, null, null, null],
    [6, 3, 1, null, null, null, null, null, null, null],
    [6, 4, 2, null, null, null, null, null, null, null],
    [7, 4, 2, 1, null, null, null, null, null, null],
    [7, 5, 3, 2, null, null, null, null, null, null],
    [8, 5, 3, 2, 1, null, null, null, null, null],
    [8, 5, 4, 3, 2, null, null, null, null, null],
    [9, 5, 4, 3, 2, 1, null, null, null, null],
    [9, 5, 5, 4, 3, 2, null, null, null, null],
    [9, 5, 5, 4, 3, 2, 1, null, null, null],
    [9, 5, 5, 4, 4, 3, 2, null, null, null],
    [9, 5, 5, 4, 4, 3, 2, 1, null, null],
    [9, 5, 5, 4, 4, 4, 3, 2, null, null],
    [9, 5, 5, 4, 4, 4, 3, 2, 1, null],
    [9, 5, 5, 4, 4, 4, 3, 3, 2, null],
    [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
    [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
    [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
  ],
  summoner: [
    [3, 1, null, null, null, null, null, null, null, null],
    [4, 2, null, null, null, null, null, null, null, null],
    [4, 3, null, null, null, null, null, null, null, null],
    [4, 3, 1, null, null, null, null, null, null, null],
    [4, 4, 2, null, null, null, null, null, null, null],
    [5, 4, 3, null, null, null, null, null, null, null],
    [5, 5, 3, 1, null, null, null, null, null, null],
    [6, 5, 4, 2, null, null, null, null, null, null],
    [6, 6, 4, 3, null, null, null, null, null, null],
    [6, 6, 5, 3, 1, null, null, null, null, null],
    [6, 6, 6, 4, 2, null, null, null, null, null],
    [6, 6, 6, 4, 3, null, null, null, null, null],
    [6, 6, 6, 5, 3, 1, null, null, null, null],
    [6, 6, 6, 6, 4, 2, null, null, null, null],
    [6, 6, 6, 6, 4, 3, null, null, null, null],
    [6, 6, 6, 6, 5, 3, 1, null, null, null],
    [6, 6, 6, 6, 6, 4, 2, null, null, null],
    [6, 6, 6, 6, 6, 4, 3, null, null, null],
    [6, 6, 6, 6, 6, 5, 3, 1, null, null],
    [6, 6, 6, 6, 6, 6, 4, 2, null, null],
  ],
  bard: [
    [null, 1, null, null, null, null, null, null, null, null],
    [null, 2, null, null, null, null, null, null, null, null],
    [null, 3, null, null, null, null, null, null, null, null],
    [null, 3, 1, null, null, null, null, null, null, null],
    [null, 4, 2, null, null, null, null, null, null, null],
    [null, 4, 3, null, null, null, null, null, null, null],
    [null, 4, 3, 1, null, null, null, null, null, null],
    [null, 4, 4, 2, null, null, null, null, null, null],
    [null, 5, 4, 3, null, null, null, null, null, null],
    [null, 5, 4, 3, 1, null, null, null, null, null],
    [null, 5, 5, 4, 2, null, null, null, null, null],
    [null, 6, 5, 4, 3, null, null, null, null, null],
    [null, 6, 5, 4, 3, 1, null, null, null, null],
    [null, 6, 6, 5, 4, 2, null, null, null, null],
    [null, 6, 6, 5, 4, 3, null, null, null, null],
    [null, 6, 6, 5, 4, 3, 1, null, null, null],
    [null, 6, 6, 6, 5, 4, 2, null, null, null],
    [null, 6, 6, 6, 5, 4, 3, null, null, null],
    [null, 6, 6, 6, 5, 5, 4, null, null, null],
    [null, 6, 6, 6, 6, 5, 5, null, null, null],
  ],
  // RAW FIX (2026-06): the legacy table was a bard clone reaching 6/day;
  // the printed ACG skald table is the six-level capped-at-5 progression.
  // Rows L1-L11 are identical to the bard's, so low-level skalds (Adarin)
  // see no change; the null-base bonus-slot quirk lives in getSpellSlots
  // and is unaffected.
  skald: SIX_LEVEL_CAPPED5,
  paladin: [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, 1, null, null, null],
    [null, 1, null, null, null],
    [null, 1, null, null, null],
    [null, 1, 1, null, null],
    [null, 1, 1, null, null],
    [null, 2, 1, null, null],
    [null, 2, 1, 1, null],
    [null, 2, 1, 1, null],
    [null, 2, 2, 1, null],
    [null, 3, 2, 1, 1],
    [null, 3, 2, 1, 1],
    [null, 3, 2, 2, 1],
    [null, 3, 3, 2, 1],
    [null, 4, 3, 2, 1],
    [null, 4, 3, 2, 2],
    [null, 4, 3, 3, 2],
    [null, 4, 4, 3, 3],
  ],
  ranger: [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, 1, null, null, null],
    [null, 1, null, null, null],
    [null, 1, null, null, null],
    [null, 1, 1, null, null],
    [null, 1, 1, null, null],
    [null, 2, 1, null, null],
    [null, 2, 1, 1, null],
    [null, 2, 1, 1, null],
    [null, 2, 2, 1, null],
    [null, 3, 2, 1, 1],
    [null, 3, 2, 1, 1],
    [null, 3, 2, 2, 1],
    [null, 3, 3, 2, 1],
    [null, 4, 3, 2, 1],
    [null, 4, 3, 2, 2],
    [null, 4, 3, 3, 2],
    [null, 4, 4, 3, 3],
  ],
  magus: [
    [null, 1, null, null, null, null, null],
    [null, 2, null, null, null, null, null],
    [null, 3, null, null, null, null, null],
    [null, 3, 1, null, null, null, null],
    [null, 4, 2, null, null, null, null],
    [null, 4, 3, null, null, null, null],
    [null, 4, 3, 1, null, null, null],
    [null, 4, 4, 2, null, null, null],
    [null, 5, 4, 3, null, null, null],
    [null, 5, 4, 3, 1, null, null],
    [null, 5, 5, 4, 2, null, null],
    [null, 6, 5, 4, 3, null, null],
    [null, 6, 5, 4, 3, 1, null],
    [null, 6, 6, 5, 4, 2, null],
    [null, 6, 6, 5, 4, 3, null],
    [null, 6, 6, 5, 4, 3, 1],
    [null, 6, 6, 6, 5, 4, 2],
    [null, 6, 6, 6, 5, 4, 3],
    [null, 6, 6, 6, 5, 5, 4],
    [null, 6, 6, 6, 6, 5, 5],
  ],
  // --- RAW tables added 2026-06 (see SIX_LEVEL_CAPPED5 above) ---
  alchemist: SIX_LEVEL_CAPPED5,
  inquisitor: SIX_LEVEL_CAPPED5,
  investigator: SIX_LEVEL_CAPPED5,
  hunter: SIX_LEVEL_CAPPED5,
  mesmerist: SIX_LEVEL_CAPPED5,
  occultist: SIX_LEVEL_CAPPED5,
  spiritualist: SIX_LEVEL_CAPPED5,
  omdura: SIX_LEVEL_CAPPED5,
  "summoner (unchained)": SIX_LEVEL_CAPPED5,
  // Warpriest: same slot columns as SIX_LEVEL_CAPPED5, but orisons are
  // PREPARED (3 at L1, 4 at L2-5, 5 from L6) — cast freely, never expended.
  warpriest: [
    [3, 1, null, null, null, null, null],
    [4, 2, null, null, null, null, null],
    [4, 3, null, null, null, null, null],
    [4, 3, 1, null, null, null, null],
    [4, 4, 2, null, null, null, null],
    [5, 4, 3, null, null, null, null],
    [5, 4, 3, 1, null, null, null],
    [5, 4, 4, 2, null, null, null],
    [5, 5, 4, 3, null, null, null],
    [5, 5, 4, 3, 1, null, null],
    [5, 5, 4, 4, 2, null, null],
    [5, 5, 5, 4, 3, null, null],
    [5, 5, 5, 4, 3, 1, null],
    [5, 5, 5, 4, 4, 2, null],
    [5, 5, 5, 5, 4, 3, null],
    [5, 5, 5, 5, 4, 3, 1],
    [5, 5, 5, 5, 4, 4, 2],
    [5, 5, 5, 5, 5, 4, 3],
    [5, 5, 5, 5, 5, 5, 4],
    [5, 5, 5, 5, 5, 5, 5],
  ],
  bloodrager: FOUR_LEVEL_ONSET4,
  medium: FOUR_LEVEL_ONSET4,
  // Vampire hunter: printed ZEROS at each onset level (L4 1st, L7 2nd,
  // L10 3rd, L13 4th) — slot level open, Wisdom bonus slots apply; ends
  // 4/4/3/3 at L20 unlike bloodrager/medium.
  "vampire hunter": [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, 0, null, null, null],
    [null, 1, null, null, null],
    [null, 1, null, null, null],
    [null, 1, 0, null, null],
    [null, 1, 1, null, null],
    [null, 2, 1, null, null],
    [null, 2, 1, 0, null],
    [null, 2, 1, 1, null],
    [null, 2, 2, 1, null],
    [null, 3, 2, 1, 0],
    [null, 3, 2, 1, 1],
    [null, 3, 2, 2, 1],
    [null, 3, 3, 2, 1],
    [null, 4, 3, 2, 1],
    [null, 4, 3, 2, 2],
    [null, 4, 3, 3, 2],
    [null, 4, 4, 3, 3],
  ],
  // Psychic: the printed spontaneous 9-level progression (3 first-level
  // slots at L1, caps at 6). The legacy "sorcerer" table is a wizard-style
  // clone kept for fixture parity; the psychic carries the true numbers.
  psychic: [
    [null, 3, null, null, null, null, null, null, null, null],
    [null, 4, null, null, null, null, null, null, null, null],
    [null, 5, null, null, null, null, null, null, null, null],
    [null, 6, 3, null, null, null, null, null, null, null],
    [null, 6, 4, null, null, null, null, null, null, null],
    [null, 6, 5, 3, null, null, null, null, null, null],
    [null, 6, 6, 4, null, null, null, null, null, null],
    [null, 6, 6, 5, 3, null, null, null, null, null],
    [null, 6, 6, 6, 4, null, null, null, null, null],
    [null, 6, 6, 6, 5, 3, null, null, null, null],
    [null, 6, 6, 6, 6, 4, null, null, null, null],
    [null, 6, 6, 6, 6, 5, 3, null, null, null],
    [null, 6, 6, 6, 6, 6, 4, null, null, null],
    [null, 6, 6, 6, 6, 6, 5, 3, null, null],
    [null, 6, 6, 6, 6, 6, 6, 4, null, null],
    [null, 6, 6, 6, 6, 6, 6, 5, 3, null],
    [null, 6, 6, 6, 6, 6, 6, 6, 4, null],
    [null, 6, 6, 6, 6, 6, 6, 6, 5, 3],
    [null, 6, 6, 6, 6, 6, 6, 6, 6, 4],
    [null, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  ],
};

// Classes whose printed slots match an existing table (their CLASS_DATA
// tableKeys already say so) get name-keyed aliases so the live spellbook
// path — which resolves by class name — finds them too.
SPELL_TABLES["antipaladin"] = SPELL_TABLES.paladin;
SPELL_TABLES["shaman"] = SPELL_TABLES.witch;

/** Arcanist casts/day (separate from preparation slots). */
export const ARCANIST_CASTS_TABLE: (number | null)[][] = [
  [null, 1, null, null, null, null, null, null, null, null],
  [null, 2, null, null, null, null, null, null, null, null],
  [null, 2, 1, null, null, null, null, null, null, null],
  [null, 3, 2, null, null, null, null, null, null, null],
  [null, 3, 2, 1, null, null, null, null, null, null],
  [null, 3, 3, 2, null, null, null, null, null, null],
  [null, 4, 3, 2, 1, null, null, null, null, null],
  [null, 4, 3, 3, 2, null, null, null, null, null],
  [null, 4, 4, 3, 2, 1, null, null, null, null],
  [null, 4, 4, 3, 3, 2, null, null, null, null],
  [null, 4, 4, 4, 3, 2, 1, null, null, null],
  [null, 4, 4, 4, 3, 3, 2, null, null, null],
  [null, 4, 4, 4, 4, 3, 2, 1, null, null],
  [null, 4, 4, 4, 4, 3, 3, 2, null, null],
  [null, 4, 4, 4, 4, 4, 3, 2, 1, null],
  [null, 4, 4, 4, 4, 4, 3, 3, 2, null],
  [null, 4, 4, 4, 4, 4, 4, 3, 2, 1],
  [null, 4, 4, 4, 4, 4, 4, 3, 3, 2],
  [null, 4, 4, 4, 4, 4, 4, 4, 3, 3],
  [null, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

/**
 * Bonus spells per day by casting stat modifier (no bonus for cantrips).
 * Legacy table stops at +17; higher modifiers get 0 bonus (quirk preserved).
 */
export const BONUS_SPELLS_TABLE: Record<number, number[]> = {
  0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  1: [1, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [1, 1, 0, 0, 0, 0, 0, 0, 0],
  3: [1, 1, 1, 0, 0, 0, 0, 0, 0],
  4: [1, 1, 1, 1, 0, 0, 0, 0, 0],
  5: [2, 1, 1, 1, 1, 0, 0, 0, 0],
  6: [2, 2, 1, 1, 1, 1, 0, 0, 0],
  7: [2, 2, 2, 1, 1, 1, 1, 0, 0],
  8: [2, 2, 2, 2, 1, 1, 1, 1, 0],
  9: [3, 2, 2, 2, 2, 1, 1, 1, 1],
  10: [3, 3, 2, 2, 2, 2, 1, 1, 1],
  11: [3, 3, 3, 2, 2, 2, 2, 1, 1],
  12: [3, 3, 3, 3, 2, 2, 2, 2, 1],
  13: [4, 3, 3, 3, 3, 2, 2, 2, 2],
  14: [4, 4, 3, 3, 3, 3, 2, 2, 2],
  15: [4, 4, 4, 3, 3, 3, 3, 2, 2],
  16: [4, 4, 4, 4, 3, 3, 3, 3, 2],
  17: [5, 4, 4, 4, 4, 3, 3, 3, 3],
};

export const CLASS_ALIASES: Record<string, string> = {
  wiz: "wizard",
  sorc: "sorcerer",
  cler: "cleric",
  clr: "cleric",
  brd: "bard",
  pal: "paladin",
  rng: "ranger",
  rgr: "ranger",
  drd: "druid",
  orc: "oracle",
  arc: "arcanist",
  sum: "summoner",
  smn: "summoner",
  mag: "magus",
};

export function normalizeClassName(className: string): string {
  const lower = className.toLowerCase();
  return CLASS_ALIASES[lower] ?? lower;
}

export function isValidCasterClass(className: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    SPELL_TABLES,
    normalizeClassName(className),
  );
}

export function getBonusSpells(
  castingStatModifier: number,
  spellLevel: number,
): number {
  if (spellLevel === 0) return 0;
  if (castingStatModifier < 1) return 0;
  if (!BONUS_SPELLS_TABLE[castingStatModifier]) return 0;
  return BONUS_SPELLS_TABLE[castingStatModifier][spellLevel - 1] || 0;
}

/** Base slots by spell level for a class/level. Throws on unknown class
 *  or out-of-range level, exactly like the legacy lookup. */
export function getSpellsPerLevelTable(
  className: string,
  classLevel: number,
): Record<number, number> {
  const normalized = normalizeClassName(className);
  const table = SPELL_TABLES[normalized];
  if (!table) {
    throw new Error(
      `Unknown caster class: ${className}. Supported classes: ${Object.keys(SPELL_TABLES).join(", ")}`,
    );
  }
  if (classLevel < 1 || classLevel > 20) {
    throw new Error("Class level must be between 1 and 20");
  }
  const progression = table[classLevel - 1];
  const out: Record<number, number> = {};
  for (let spellLevel = 0; spellLevel < progression.length; spellLevel++) {
    const count = progression[spellLevel];
    if (count !== null) out[spellLevel] = count;
  }
  return out;
}

/**
 * Total slots (base + stat bonus) for one spell level.
 * Quirk preserved from legacy: bonus slots apply even when the base is null
 * (not yet castable by class level) — e.g. skald CL2 with CHA +5 gets one
 * level-2 slot purely from the stat bonus. This is why Adarin's Misdirection
 * is castable on the live sheet; PF RAW disagrees, the old sheet wins.
 */
export function getSpellSlots(
  className: string,
  classLevel: number,
  spellLevel: number,
  castingStatModifier = 0,
): number {
  const perLevel = getSpellsPerLevelTable(className, classLevel);
  const baseSlots = perLevel[spellLevel] || 0;
  return baseSlots + getBonusSpells(castingStatModifier, spellLevel);
}

/** Arcanist casts/day; any other class falls through to getSpellSlots. */
export function getArcanistCasts(
  className: string,
  classLevel: number,
  spellLevel: number,
  castingStatModifier = 0,
): number {
  if (normalizeClassName(className) !== "arcanist") {
    return getSpellSlots(
      className,
      classLevel,
      spellLevel,
      castingStatModifier,
    );
  }
  if (classLevel < 1 || classLevel > 20) {
    throw new Error("Class level must be between 1 and 20");
  }
  const baseCasts = ARCANIST_CASTS_TABLE[classLevel - 1][spellLevel] || 0;
  return baseCasts + getBonusSpells(castingStatModifier, spellLevel);
}

export function calculateSpellDC(
  spellLevel: number,
  castingStatBonus: number,
): number {
  return 10 + spellLevel + castingStatBonus;
}

/**
 * Metamagic options + slot adjustments, derived from the bundled feat catalog
 * (scraped from aonprd). The picker strings are built to match the legacy five
 * byte-for-byte ("Still Spell (+1 level)", …) so existing data and the calc
 * characterization tests keep working; variable-adjustment feats contribute 0
 * to slot math (their increase is player-determined and not modeled yet).
 */
export const METAMAGIC_OPTIONS: string[] = METAMAGIC_FEATS.map(
  metamagicPickerString,
);

export const METAMAGIC_ADJUSTMENTS: Record<string, number> = Object.fromEntries(
  METAMAGIC_FEATS.map((f) => [
    metamagicPickerString(f),
    f.adj === "var" ? 0 : f.adj,
  ]),
);

export function getMetamagicLevelAdjustment(metamagic: string): number {
  return METAMAGIC_ADJUSTMENTS[metamagic] || 0;
}

export function totalMetamagicAdjustment(metamagics: string[]): number {
  return metamagics.reduce(
    (total, metamagic) => total + getMetamagicLevelAdjustment(metamagic),
    0,
  );
}

export function calculateSpellRange(
  rangeType: string,
  casterLevel: number,
): string {
  if (!rangeType) return "";
  const type = rangeType.toLowerCase();
  if (type === "close") {
    return `${25 + Math.floor(casterLevel / 2) * 5} ft.`;
  } else if (type === "medium") {
    return `${100 + casterLevel * 10} ft.`;
  } else if (type === "long") {
    return `${400 + casterLevel * 40} ft.`;
  } else if (type === "personal") {
    return "Personal";
  } else if (type === "touch") {
    return "Touch";
  } else if (type === "unlimited" || type === "unlimited range") {
    return "Unlimited";
  }
  return rangeType;
}

/** Save-type abbreviation: F / R / W / first letter / "" for none. */
export function getSpellSaveType(spell: {
  saveType?: string;
  save?: string;
}): string {
  if (spell.saveType && spell.saveType.toLowerCase() === "none") return "";
  if (spell.saveType) {
    const saveType = spell.saveType.toLowerCase();
    if (saveType.startsWith("f")) return "F";
    if (saveType.startsWith("r")) return "R";
    if (saveType.startsWith("w")) return "W";
    return spell.saveType.substring(0, 1).toUpperCase();
  }
  if (spell.save) {
    const save = spell.save.toLowerCase();
    if (save.includes("fort")) return "F";
    if (save.includes("ref")) return "R";
    if (save.includes("will")) return "W";
    if (save.includes("none")) return "";
  }
  return "";
}

// ---------------------------------------------------------------------------
// computeSpellbook — derived per-level view of a character's SpellbookState
// ---------------------------------------------------------------------------

export interface SpellLevelComputed {
  /** preparation slots for prepared/hybrid; casts for spontaneous */
  maxSlots: number;
  /** stored remaining, with null (never initialized) rendered as max */
  remaining: number;
  dc: number;
  /** arcanist only: casts/day pool (separate from preparation slots) */
  arcanistCasts?: number;
  /** arcanist only: stored casts remaining (null → max) */
  castsRemaining?: number;
}

export interface SpellbookComputed {
  casterLevel: number;
  castingStatBonus: number;
  paradigm: CasterParadigm;
  /** indexed by spell level 0–9 */
  levels: SpellLevelComputed[];
}

export interface SpellbookComputeInput {
  spellbook: SpellbookState;
  classes: ClassEntry[];
  mods: AbilityScores;
}

/** Does a class name match a spellbook's casting class? The ONE lenient
 *  substring rule the sheet uses everywhere a casting class meets a class
 *  list — archetype spellcasting-removal must use this too, or aliased
 *  names silently slip the gate. Empty casting class (slot-only books from
 *  the v5 migration) matches nothing. */
export function castingClassMatches(
  castingClass: string,
  className: string,
): boolean {
  const needle = normalizeClassName(castingClass);
  if (!needle) return false;
  return className.toLowerCase().includes(needle);
}

/** Sum of levels for class entries matching the casting class (lenient
 *  substring match, mirroring how the sheet matches class names; an empty
 *  casting class deliberately keeps its legacy match-everything behavior). */
function matchingClassLevel(
  classes: ClassEntry[],
  castingClass: string,
): number {
  const needle = normalizeClassName(castingClass);
  return classes
    .filter((c) => c.className.toLowerCase().includes(needle))
    .reduce((sum, c) => sum + (c.level || 0), 0);
}

export function resolveCasterLevel(
  spellbook: SpellbookState,
  classes: ClassEntry[],
): number {
  if (spellbook.casterLevelOverride !== undefined) {
    return spellbook.casterLevelOverride;
  }
  // legacy getCasterLevel defaulted to 1 when nothing was bound
  return matchingClassLevel(classes, spellbook.castingClass) || 1;
}

export function computeSpellbook(
  input: SpellbookComputeInput,
): SpellbookComputed {
  const { spellbook, classes, mods } = input;
  const casterLevel = resolveCasterLevel(spellbook, classes);
  const castingStatBonus = mods[spellbook.castingStat] ?? 0;
  const paradigm = getCasterConfig(spellbook.castingClass).type;
  const valid = isValidCasterClass(spellbook.castingClass);
  const clampedLevel = Math.min(Math.max(casterLevel, 1), 20);

  const levels: SpellLevelComputed[] = SPELL_LEVELS.map((level) => {
    let maxSlots = 0;
    let arcanistCasts: number | undefined;
    if (valid) {
      // legacy getAvailableSpellSlots: arcanist preparations ignore the stat
      // bonus (raw == comparison, before alias normalization — preserved)
      if (spellbook.castingClass === "arcanist") {
        maxSlots = getSpellSlots(
          spellbook.castingClass,
          clampedLevel,
          level,
          0,
        );
        arcanistCasts = getArcanistCasts(
          spellbook.castingClass,
          clampedLevel,
          level,
          castingStatBonus,
        );
      } else {
        maxSlots =
          getSpellSlots(
            spellbook.castingClass,
            clampedLevel,
            level,
            castingStatBonus,
          ) || 0;
      }
    }
    // manual override (schema v5) replaces the computed table max — this
    // is where the old spellSlotsL* resource pools live now
    const override = spellbook.slotOverrides?.[getSpellLevelKey(level)];
    if (override !== undefined) maxSlots = override;
    const levelState = spellbook.levels[getSpellLevelKey(level)];
    const stored = levelState?.remaining;
    const remaining =
      stored === null || stored === undefined ? maxSlots : stored;
    const storedCasts = levelState?.castsRemaining;
    return {
      maxSlots,
      remaining,
      dc: calculateSpellDC(level, castingStatBonus),
      ...(arcanistCasts !== undefined
        ? {
            arcanistCasts,
            castsRemaining:
              storedCasts === null || storedCasts === undefined
                ? arcanistCasts
                : storedCasts,
          }
        : {}),
    };
  });

  return { casterLevel, castingStatBonus, paradigm, levels };
}
