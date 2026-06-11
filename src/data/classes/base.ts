/**
 * Base classes (12): APG / UM / UC / UI / UW plus the uncommon Omdura and
 * Vampire Hunter. Class skills use STANDARD_SKILLS spellings. All values
 * verified against d20pfsrd.com / aonprd.com (URLs cited per entry); OGC.
 *
 * Casting tableKey is set ONLY where the slots-per-day progression is
 * row-for-row identical to an existing SPELL_TABLES entry. The
 * alchemist/inquisitor/omdura 6-level table (caps at 5 slots; e.g. L11 =
 * 5/4/4/2) is NOT the magus/bard table (L11 = 5/5/4/2, caps at 6), so those
 * entries omit tableKey.
 */

import type { ClassData } from "../types";
import { ALL_KNOWLEDGE } from "../types";

export const BASE_CLASSES: ClassData[] = [
  // Source: https://www.d20pfsrd.com/classes/base-classes/alchemist/
  {
    key: "Alchemist",
    name: "Alchemist",
    category: "base",
    source: "Advanced Player's Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Appraise",
      "Craft (any)",
      "Disable Device",
      "Fly",
      "Heal",
      "Knowledge (arcana)",
      "Knowledge (nature)",
      "Perception",
      "Profession (any)",
      "Sleight of Hand",
      "Spellcraft",
      "Survival",
      "Use Magic Device",
    ],
    casting: {
      ability: "int",
      paradigm: "prepared",
      maxSpellLevel: 6,
      // TODO: no matching SPELL_TABLES entry yet — the extracts/day table
      // caps at 5 per level (L11 = 5/4/4/2), unlike magus/bard (L11 = 5/5/4/2).
    },
    resources: [
      {
        id: "bombs",
        name: "Bombs",
        // "a number of bombs each day equal to his class level + his
        // Intelligence modifier" (d20pfsrd alchemist page)
        max: (level, mods) => Math.max(0, level + mods.int),
        footer: "bombs/day",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/cavalier/
  {
    key: "Cavalier",
    name: "Cavalier",
    category: "base",
    source: "Advanced Player's Guide",
    hitDie: 10,
    bab: "full",
    saves: { fort: "good", ref: "poor", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Bluff",
      "Climb",
      "Craft (any)",
      "Diplomacy",
      "Handle Animal",
      "Intimidate",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Swim",
    ],
    resources: [
      {
        id: "challenge",
        name: "Challenge",
        // 1/day at 1st, +1 at 4th and every 3 levels after (7th, 10th...,
        // 7/day at 19th) — d20pfsrd cavalier page.
        max: (level) => Math.max(1, 1 + Math.floor((level - 1) / 3)),
        footer: "uses/day",
      },
    ],
  },
  // Source: https://legacy.aonprd.com/ultimateCombat/classes/gunslinger.html
  {
    key: "Gunslinger",
    name: "Gunslinger",
    category: "base",
    source: "Ultimate Combat",
    hitDie: 10,
    bab: "full",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Bluff",
      "Climb",
      "Craft (any)",
      "Handle Animal",
      "Heal",
      "Intimidate",
      "Knowledge (engineering)",
      "Knowledge (local)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Sleight of Hand",
      "Survival",
      "Swim",
    ],
    resources: [
      {
        id: "grit",
        name: "Grit",
        // "grit points equal to her Wisdom modifier (minimum 1)" (PRD)
        max: (_level, mods) => Math.max(1, mods.wis),
        footer: "points",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/inquisitor/
  {
    key: "Inquisitor",
    name: "Inquisitor",
    category: "base",
    source: "Advanced Player's Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 6,
    classSkills: [
      "Bluff",
      "Climb",
      "Craft (any)",
      "Diplomacy",
      "Disguise",
      "Heal",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (dungeon)",
      "Knowledge (nature)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Spellcraft",
      "Stealth",
      "Survival",
      "Swim",
    ],
    casting: {
      ability: "wis",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // TODO: no matching SPELL_TABLES entry yet — inquisitor shares the
      // alchemist-style 6-level table (caps at 5), not the bard/magus one.
    },
    resources: [
      {
        id: "judgment",
        name: "Judgment",
        // 1/day at 1st, +1 at 4th and every 3 levels thereafter (7/day at
        // 19th) — d20pfsrd inquisitor page.
        max: (level) => Math.max(1, 1 + Math.floor((level - 1) / 3)),
        footer: "uses/day",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/magus/
  {
    key: "Magus",
    name: "Magus",
    category: "base",
    source: "Ultimate Magic",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Climb",
      "Craft (any)",
      "Fly",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (dungeon)",
      "Knowledge (planes)",
      "Profession (any)",
      "Ride",
      "Spellcraft",
      "Swim",
      "Use Magic Device",
    ],
    casting: {
      ability: "int",
      paradigm: "prepared",
      maxSpellLevel: 6,
      tableKey: "magus",
    },
    resources: [
      {
        id: "arcanePool",
        name: "Arcane Pool",
        // "equal to 1/2 his magus level (minimum 1) + his Intelligence
        // modifier" (d20pfsrd magus page); outer guard keeps it >= 0.
        max: (level, mods) =>
          Math.max(0, Math.max(1, Math.floor(level / 2)) + mods.int),
        footer: "points",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/omdura/
  {
    key: "Omdura",
    name: "Omdura",
    category: "base",
    source: "Niobe: She is Life",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Appraise",
      "Bluff",
      "Craft (any)",
      "Diplomacy",
      "Heal",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (nobility)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Linguistics",
      "Perception",
      "Profession (any)",
      "Sense Motive",
      "Spellcraft",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      // TODO: no matching SPELL_TABLES entry yet — omdura uses the
      // alchemist/inquisitor 6-level table (caps at 5 slots per level).
    },
    resources: [
      {
        id: "invocation",
        name: "Invocation",
        // "a number of minutes per day equal to her omdura level"
        // (d20pfsrd omdura page)
        max: (level) => Math.max(0, level),
        footer: "minutes/day",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/oracle/
  {
    key: "Oracle",
    name: "Oracle",
    category: "base",
    source: "Advanced Player's Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 4,
    // Mysteries add more class skills; this is the universal list.
    classSkills: [
      "Craft (any)",
      "Diplomacy",
      "Heal",
      "Knowledge (history)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Profession (any)",
      "Sense Motive",
      "Spellcraft",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 9,
      tableKey: "oracle",
    },
  },
  // Source: https://aonprd.com/ClassDisplay.aspx?ItemName=Shifter and
  // https://www.d20pfsrd.com/classes/base-classes/shifter/
  // DISCREPANCY (double-checked, both sources): published shifter is d10
  // with FULL BAB; the fixture-locked CLASS_STATS has d8 / 0.75. Per the
  // registry contract, CLASS_STATS wins here — entry matches CLASS_STATS.
  {
    key: "Shifter",
    name: "Shifter",
    category: "base",
    source: "Ultimate Wilderness",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Climb",
      "Craft (any)",
      "Fly",
      "Handle Animal",
      "Knowledge (nature)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Stealth",
      "Survival",
      "Swim",
    ],
    resources: [
      {
        id: "shifterAspect",
        name: "Shifter Aspect",
        // minor form: "a number of minutes per day equal to 3 + her shifter
        // level" (d20pfsrd shifter page)
        max: (level) => Math.max(0, 3 + level),
        footer: "minutes/day",
      },
      {
        id: "wildShape",
        name: "Wild Shape",
        minLevel: 4,
        // "a number of hours each day equal to her shifter level + her
        // Wisdom modifier" (d20pfsrd shifter page)
        max: (level, mods) => Math.max(0, level + mods.wis),
        footer: "hours/day",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/summoner/
  {
    key: "Summoner",
    name: "Summoner",
    category: "base",
    source: "Advanced Player's Guide",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Craft (any)",
      "Fly",
      "Handle Animal",
      ...ALL_KNOWLEDGE,
      "Linguistics",
      "Profession (any)",
      "Ride",
      "Spellcraft",
      "Use Magic Device",
    ],
    casting: {
      ability: "cha",
      paradigm: "spontaneous",
      maxSpellLevel: 6,
      tableKey: "summoner",
    },
    resources: [
      {
        id: "summonMonster",
        name: "Summon Monster",
        // SLA "a number of times per day equal to 3 + his Charisma
        // modifier" (d20pfsrd summoner page)
        max: (_level, mods) => Math.max(0, 3 + mods.cha),
        footer: "uses/day",
      },
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/vampire-hunter/
  {
    key: "Vampire Hunter",
    name: "Vampire Hunter",
    category: "base",
    source: "Inner Sea Intrigue",
    hitDie: 8,
    bab: "full",
    saves: { fort: "poor", ref: "good", will: "good" },
    skillRanksPerLevel: 6,
    classSkills: [
      "Bluff",
      "Climb",
      "Craft (any)",
      "Handle Animal",
      "Heal",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (geography)",
      "Knowledge (local)",
      "Knowledge (religion)",
      "Perception",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Spellcraft",
      "Stealth",
      "Survival",
      "Swim",
    ],
    casting: {
      ability: "wis",
      paradigm: "spontaneous",
      maxSpellLevel: 4,
      // TODO: no matching SPELL_TABLES entry yet — casting starts at 4th
      // with 0 base 1st-level slots (L4 = 0, L5 = 1...), unlike the legacy
      // paladin/ranger table (L4 = 1).
    },
  },
  // Source: https://aonprd.com/ClassDisplay.aspx?ItemName=Vigilante and
  // https://www.d20pfsrd.com/classes/base-classes/vigilante/
  // DISCREPANCY (double-checked, both sources): published vigilante has
  // good Ref AND Will saves; the fixture-locked CLASS_STATS has Will poor.
  // Per the registry contract, CLASS_STATS wins — entry matches CLASS_STATS.
  {
    key: "Vigilante",
    name: "Vigilante",
    category: "base",
    source: "Ultimate Intrigue",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "good", will: "poor" },
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
      "Intimidate",
      "Knowledge (dungeon)",
      "Knowledge (engineering)",
      "Knowledge (local)",
      "Knowledge (nobility)",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Sleight of Hand",
      "Stealth",
      "Survival",
      "Swim",
      "Use Magic Device",
    ],
  },
  // Source: https://www.d20pfsrd.com/classes/base-classes/witch/
  {
    key: "Witch",
    name: "Witch",
    category: "base",
    source: "Advanced Player's Guide",
    hitDie: 6,
    bab: "half",
    saves: { fort: "poor", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Craft (any)",
      "Fly",
      "Heal",
      "Intimidate",
      "Knowledge (arcana)",
      "Knowledge (history)",
      "Knowledge (nature)",
      "Knowledge (planes)",
      "Profession (any)",
      "Spellcraft",
      "Use Magic Device",
    ],
    casting: {
      ability: "int",
      paradigm: "prepared",
      maxSpellLevel: 9,
      tableKey: "witch",
    },
  },
];
