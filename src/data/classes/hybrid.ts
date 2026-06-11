/**
 * Advanced Class Guide hybrid classes (10). Class skills use STANDARD_SKILLS
 * spellings. Values verified against aonprd.com (ClassDisplay.aspx pages),
 * cross-checked with d20pfsrd.com where noted. OGC.
 *
 * Entries carry the published RAW values. Where the legacy CLASS_STATS
 * registry used to disagree, both registries were corrected to RAW in
 * 2026-06 (see the RAW FIX comments here and in src/calc/class-stats.ts).
 */

import type { ClassData } from "../types";
import { ALL_KNOWLEDGE } from "../types";

export const HYBRID_CLASSES: ClassData[] = [
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Arcanist
  {
    key: "Arcanist",
    name: "Arcanist",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 6,
    bab: "half",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Appraise",
      "Craft (any)",
      "Fly",
      ...ALL_KNOWLEDGE,
      "Linguistics",
      "Profession (any)",
      "Spellcraft",
      "Use Magic Device",
    ],
    casting: {
      ability: "int",
      paradigm: "hybrid",
      maxSpellLevel: 9,
      // SPELL_TABLES.arcanist holds spells PREPARED (verified vs the aonprd
      // table at L1 [4,2] and L5 [6,4,2]); casts/day live in
      // ARCANIST_CASTS_TABLE.
      tableKey: "arcanist",
    },
    resources: [
      {
        id: "arcaneReservoir",
        name: "Arcane Reservoir",
        // Daily refresh: 3 + 1/2 arcanist level (the hard cap is 3 + level,
        // but points above the refresh only come from consume spells etc.).
        max: (level) => Math.max(0, 3 + Math.floor(level / 2)),
        footer: "points/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Bloodrager
  // (spell table cross-checked at d20pfsrd.com/classes/hybrid-classes/bloodrager/)
  {
    key: "Bloodrager",
    name: "Bloodrager",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 10,
    bab: "full",
    // RAW FIX (2026-06): legacy CLASS_STATS also marked Will good; the
    // ACG/PRD table has good Fort ONLY (L1 F+2/R+0/W+0, L20 F+12/R+6/W+6).
    saves: { fort: "good", ref: "poor", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Climb",
      "Craft (any)",
      "Handle Animal",
      "Intimidate",
      "Knowledge (arcana)",
      "Perception",
      "Ride",
      "Spellcraft",
      "Survival",
      "Swim",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 4,
      // Own RAW table: matches paladin/ranger rows for L4-19 but L20 is
      // 4/4/3/2 (not 4/4/3/3).
      tableKey: "bloodrager",
    },
    resources: [
      {
        id: "bloodrage",
        name: "Bloodrage",
        // 4 + Con mod + 2 per level beyond 1st (pass unraged mods).
        max: (level, mods) => Math.max(0, 4 + mods.con + 2 * (level - 1)),
        footer: "rounds/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Brawler
  {
    key: "Brawler",
    name: "Brawler",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 10,
    bab: "full",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Climb",
      "Craft (any)",
      "Escape Artist",
      "Handle Animal",
      "Intimidate",
      "Knowledge (dungeon)",
      "Knowledge (local)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Swim",
    ],
    resources: [
      {
        id: "martialFlexibility",
        name: "Martial Flexibility",
        // 3 + 1/2 brawler level (minimum 1).
        max: (level) => Math.max(1, 3 + Math.floor(level / 2)),
        footer: "uses/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Hunter
  // (spell table cross-checked at d20pfsrd.com/classes/hybrid-classes/hunter/)
  {
    key: "Hunter",
    name: "Hunter",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 8,
    bab: "threeQuarters",
    // RAW FIX (2026-06): legacy CLASS_STATS had Fort/Will good; the ACG/PRD
    // table has good Fort AND Ref, poor Will (L1 F+2/R+2/W+0, L20 F+12/R+12/W+6).
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 6,
    classSkills: [
      "Climb",
      "Craft (any)",
      "Handle Animal",
      "Heal",
      "Intimidate",
      "Knowledge (dungeon)",
      "Knowledge (geography)",
      "Knowledge (nature)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Spellcraft",
      "Stealth",
      "Survival",
      "Swim",
    ],
    casting: {
      ability: "wis",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // Shares the six-level capped-at-5 table (RAW).
      tableKey: "hunter",
    },
    resources: [
      {
        id: "animalFocus",
        name: "Animal Focus",
        // Minutes per day equal to hunter level.
        max: (level) => Math.max(0, level),
        footer: "minutes/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Investigator
  {
    key: "Investigator",
    name: "Investigator",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "good", will: "good" },
    skillRanksPerLevel: 6,
    classSkills: [
      "Acrobatics",
      "Appraise",
      "Bluff",
      "Climb",
      "Craft (any)",
      "Diplomacy",
      "Disable Device",
      "Disguise",
      "Escape Artist",
      "Heal",
      "Intimidate",
      ...ALL_KNOWLEDGE,
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
      ability: "int",
      paradigm: "prepared",
      maxSpellLevel: 6,
      // Extracts/day use the shared six-level capped-at-5 table (RAW).
      tableKey: "investigator",
    },
    resources: [
      {
        id: "inspiration",
        name: "Inspiration",
        // 1/2 investigator level + Int modifier (minimum 1).
        max: (level, mods) => Math.max(1, Math.floor(level / 2) + mods.int),
        footer: "points/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Shaman
  {
    key: "Shaman",
    name: "Shaman",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Craft (any)",
      "Diplomacy",
      "Fly",
      "Handle Animal",
      "Heal",
      "Knowledge (nature)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Profession (any)",
      "Ride",
      "Spellcraft",
      "Survival",
    ],
    casting: {
      ability: "wis",
      paradigm: "prepared",
      maxSpellLevel: 9,
      // Standard 9-level prepared progression, identical to the witch table
      // (verified vs the aonprd shaman rows at L1/2/3/5/10/15/20).
      tableKey: "witch",
    },
    // Spirit magic slots (1/spell level/day) and spirit abilities depend on
    // the chosen spirit — not representable as a flat numeric pool here.
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Skald
  // (raging song + spell table cross-checked at d20pfsrd.com/classes/hybrid-classes/skald/)
  {
    key: "Skald",
    name: "Skald",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Appraise",
      "Bluff",
      "Climb",
      "Craft (any)",
      "Diplomacy",
      "Escape Artist",
      "Handle Animal",
      "Intimidate",
      ...ALL_KNOWLEDGE,
      "Linguistics",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Spellcraft",
      "Swim",
      "Use Magic Device",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // RAW FIX (2026-06): SPELL_TABLES.skald was a bard clone (reaching
      // 6/day); it now carries the printed ACG progression capping at
      // 5/day (L11 is 5/4/4/2, L20 is 5/5/5/5/5/5). Identical below L12,
      // so low-level skalds are unaffected.
      tableKey: "skald",
    },
    resources: [
      {
        id: "ragingSong",
        name: "Raging Song",
        // 3 + Cha mod + 2 per level beyond 1st (note: 3, not the bard's 4).
        max: (level, mods) => Math.max(0, 3 + mods.cha + 2 * (level - 1)),
        footer: "rounds/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Slayer
  {
    key: "Slayer",
    name: "Slayer",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 10,
    bab: "full",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 6,
    classSkills: [
      "Acrobatics",
      "Bluff",
      "Climb",
      "Craft (any)",
      "Disguise",
      "Heal",
      "Intimidate",
      "Knowledge (dungeon)",
      "Knowledge (geography)",
      "Knowledge (local)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Stealth",
      "Survival",
      "Swim",
    ],
    // Studied target is at-will (count of simultaneous targets, not a
    // per-day pool); no numeric daily resources worth tracking.
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Swashbuckler
  {
    key: "Swashbuckler",
    name: "Swashbuckler",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 10,
    // RAW FIX (2026-06): legacy CLASS_STATS stored 0.75; the ACG/PRD table
    // gives the swashbuckler FULL BAB (L1 +1, L20 +20/+15/+10/+5).
    bab: "full",
    saves: { fort: "poor", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Bluff",
      "Climb",
      "Craft (any)",
      "Diplomacy",
      "Escape Artist",
      "Intimidate",
      "Knowledge (local)",
      "Knowledge (nobility)",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Sleight of Hand",
      "Swim",
    ],
    resources: [
      {
        // id intentionally "panache": the sheet has a legacy top-level
        // panache field, and the store skips this pool during sync — the
        // definition documents the formula.
        id: "panache",
        name: "Panache",
        // Cha modifier (minimum 1) at the start of each day.
        max: (_level, mods) => Math.max(1, mods.cha),
        footer: "points",
      },
      {
        id: "charmedLife",
        name: "Charmed Life",
        minLevel: 2,
        // 3/day at 2nd, +1 use every 4 levels after (max 7/day at 18th).
        max: (level) => Math.max(0, 3 + Math.floor((level - 2) / 4)),
        footer: "uses/day",
      },
    ],
  },
  // https://www.aonprd.com/ClassDisplay.aspx?ItemName=Warpriest
  {
    key: "Warpriest",
    name: "Warpriest",
    category: "hybrid",
    source: "Advanced Class Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Climb",
      "Craft (any)",
      "Diplomacy",
      "Handle Animal",
      "Heal",
      "Intimidate",
      "Knowledge (engineering)",
      "Knowledge (religion)",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Spellcraft",
      "Survival",
      "Swim",
    ],
    casting: {
      ability: "wis",
      paradigm: "prepared",
      maxSpellLevel: 6,
      // Own RAW table: six-level capped-at-5 slots plus 3-5 prepared
      // orisons (L1 is 3/1, L20 is 5/5/5/5/5/5/5).
      tableKey: "warpriest",
    },
    resources: [
      {
        id: "fervor",
        name: "Fervor",
        minLevel: 2,
        // 1/2 warpriest level + Wis modifier.
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.wis),
        footer: "uses/day",
      },
      {
        id: "blessings",
        name: "Blessings",
        // 3 + 1/2 warpriest level (max 13/day at 20th).
        max: (level) => Math.max(0, 3 + Math.floor(level / 2)),
        footer: "uses/day",
      },
    ],
  },
];
