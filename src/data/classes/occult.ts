/**
 * Occult Adventures classes (6). Class skills use STANDARD_SKILLS spellings.
 * Source: PRD (legacy.aonprd.com/occultAdventures/classes/*.html), OGC.
 */

import type { ClassData } from "../types";
import { ALL_KNOWLEDGE } from "../types";

export const OCCULT_CLASSES: ClassData[] = [
  // https://legacy.aonprd.com/occultAdventures/classes/kineticist.html
  // RAW FIX (2026-06): legacy CLASS_STATS had good Fort + Will; the PRD
  // gives good Fort + Ref, poor Will. Both registries now carry RAW.
  {
    key: "Kineticist",
    name: "Kineticist",
    category: "occult",
    source: "Occult Adventures",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Craft (any)",
      "Heal",
      "Intimidate",
      "Perception",
      "Profession (any)",
      "Stealth",
      "Use Magic Device",
    ],
    // Not a spellcaster — wild talents are spell-like, used at will.
    resources: [
      {
        id: "burn",
        name: "Burn",
        // Max total burn accepted per day: 3 + Con modifier.
        max: (_level, mods) => Math.max(0, 3 + mods.con),
        footer: "points/day",
      },
    ],
  },
  // https://legacy.aonprd.com/occultAdventures/classes/medium.html
  {
    key: "Medium",
    name: "Medium",
    category: "occult",
    source: "Occult Adventures",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Bluff",
      "Craft (any)",
      "Diplomacy",
      "Fly",
      "Heal",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Linguistics",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Sense Motive",
      "Spellcraft",
      "Use Magic Device",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 4,
      // TODO: no matching SPELL_TABLES entry yet — nearly the paladin
      // 4-level table, but the medium's level-20 row is 4/4/3/2 (paladin
      // is 4/4/3/3).
    },
  },
  // https://legacy.aonprd.com/occultAdventures/classes/mesmerist.html
  // RAW FIX (2026-06): legacy CLASS_STATS had Will good only; the PRD
  // gives good Ref + Will. Both registries now carry RAW.
  {
    key: "Mesmerist",
    name: "Mesmerist",
    category: "occult",
    source: "Occult Adventures",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "good", will: "good" },
    skillRanksPerLevel: 6,
    classSkills: [
      "Appraise",
      "Bluff",
      "Craft (any)",
      "Diplomacy",
      "Disguise",
      "Escape Artist",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (dungeon)",
      "Knowledge (history)",
      "Knowledge (local)",
      "Knowledge (nobility)",
      "Knowledge (religion)",
      "Linguistics",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Sense Motive",
      "Sleight of Hand",
      "Spellcraft",
      "Stealth",
      "Use Magic Device",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // TODO: no matching SPELL_TABLES entry yet — the Occult Adventures
      // 6-level progression caps at 5 slots (bard/magus tables cap at 6).
    },
    resources: [
      {
        id: "mesmeristTricks",
        name: "Mesmerist Tricks",
        // 1/2 level (minimum 1) + Cha bonus (if any).
        max: (level, mods) =>
          Math.max(1, Math.floor(level / 2)) + Math.max(0, mods.cha),
        footer: "uses/day",
      },
    ],
  },
  // https://legacy.aonprd.com/occultAdventures/classes/occultist.html
  {
    key: "Occultist",
    name: "Occultist",
    category: "occult",
    source: "Occult Adventures",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Appraise",
      "Craft (any)",
      "Diplomacy",
      "Disable Device",
      "Disguise",
      "Fly",
      "Knowledge (arcana)",
      "Knowledge (engineering)",
      "Knowledge (history)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Linguistics",
      "Perception",
      "Profession (any)",
      "Sense Motive",
      "Sleight of Hand",
      "Spellcraft",
      "Use Magic Device",
    ],
    casting: {
      ability: "int",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // TODO: no matching SPELL_TABLES entry yet — the Occult Adventures
      // 6-level progression caps at 5 slots (bard/magus tables cap at 6).
    },
    resources: [
      {
        id: "mentalFocus",
        name: "Mental Focus",
        // Level + Int modifier, refreshed daily.
        max: (level, mods) => Math.max(0, level + mods.int),
        footer: "points/day",
      },
    ],
  },
  // https://legacy.aonprd.com/occultAdventures/classes/psychic.html
  {
    key: "Psychic",
    name: "Psychic",
    category: "occult",
    source: "Occult Adventures",
    hitDie: 6,
    bab: "half",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Bluff",
      "Craft (any)",
      "Diplomacy",
      "Fly",
      "Intimidate",
      ...ALL_KNOWLEDGE,
      "Linguistics",
      "Perception",
      "Profession (any)",
      "Sense Motive",
      "Spellcraft",
    ],
    casting: {
      ability: "int",
      paradigm: "spontaneous",
      maxSpellLevel: 9,
      // TODO: no matching SPELL_TABLES entry yet — the psychic uses the
      // printed sorcerer progression (3 1st-level slots at L1, cap 6); the
      // registry's "sorcerer" table is the legacy wizard-style clone.
    },
    resources: [
      {
        id: "phrenicPool",
        name: "Phrenic Pool",
        // 1/2 level + Wis OR Cha modifier, set by the psychic's discipline;
        // Wis is used here as the common default.
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.wis),
        footer: "points",
      },
    ],
  },
  // https://legacy.aonprd.com/occultAdventures/classes/spiritualist.html
  // RAW FIX (2026-06): legacy CLASS_STATS had Will good only; the PRD
  // gives good Fort + Will. Both registries now carry RAW.
  {
    key: "Spiritualist",
    name: "Spiritualist",
    category: "occult",
    source: "Occult Adventures",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Bluff",
      "Craft (any)",
      "Fly",
      "Heal",
      "Intimidate",
      ...ALL_KNOWLEDGE,
      "Linguistics",
      "Profession (any)",
      "Sense Motive",
      "Spellcraft",
      "Use Magic Device",
    ],
    casting: {
      ability: "wis",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // TODO: no matching SPELL_TABLES entry yet — the Occult Adventures
      // 6-level progression caps at 5 slots (bard/magus tables cap at 6).
    },
  },
];
