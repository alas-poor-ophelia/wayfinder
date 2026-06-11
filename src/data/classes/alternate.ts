/**
 * Alternate classes (3): Antipaladin (APG), Ninja and Samurai (Ultimate
 * Combat). Class skills use STANDARD_SKILLS spellings. Sources: d20pfsrd
 * alternate-class pages + PRD (legacy.aonprd.com/ultimateCombat), OGC.
 */

import type { ClassData } from "../types";

export const ALTERNATE_CLASSES: ClassData[] = [
  // https://www.d20pfsrd.com/classes/alternate-classes/antipaladin/
  {
    key: "Antipaladin",
    name: "Antipaladin",
    category: "alternate",
    source: "Advanced Player's Guide",
    hitDie: 10,
    bab: "full",
    saves: { fort: "good", ref: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: [
      "Bluff",
      "Craft (any)",
      "Disguise",
      "Handle Animal",
      "Intimidate",
      "Knowledge (religion)",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Spellcraft",
      "Stealth",
    ],
    casting: {
      ability: "cha",
      paradigm: "prepared",
      maxSpellLevel: 4,
      // Slots-per-day progression is identical to the paladin's.
      tableKey: "paladin",
    },
    resources: [
      {
        id: "touchOfCorruption",
        name: "Touch of Corruption",
        // 1/2 level + Cha, from 2nd (mirrors lay on hands).
        minLevel: 2,
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.cha),
        footer: "uses/day",
      },
      {
        id: "smiteGood",
        name: "Smite Good",
        // 1st, then 4/7/10/13/16/19 — 7/day at 19th.
        max: (level) => 1 + Math.floor((level - 1) / 3),
        footer: "uses/day",
      },
    ],
  },
  // https://legacy.aonprd.com/ultimateCombat/classes/ninja.html
  {
    key: "Ninja",
    name: "Ninja",
    category: "alternate",
    source: "Ultimate Combat",
    hitDie: 8,
    bab: "threeQuarters",
    saves: { fort: "poor", ref: "good", will: "poor" },
    skillRanksPerLevel: 8,
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
      "Knowledge (local)",
      "Knowledge (nobility)",
      "Linguistics",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Sense Motive",
      "Sleight of Hand",
      "Stealth",
      "Swim",
      "Use Magic Device",
    ],
    resources: [
      {
        id: "kiPool",
        name: "Ki Pool",
        // 1/2 level + Cha (not Wis), from 2nd.
        minLevel: 2,
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.cha),
        footer: "points",
      },
    ],
  },
  // https://legacy.aonprd.com/ultimateCombat/classes/samurai.html
  {
    key: "Samurai",
    name: "Samurai",
    category: "alternate",
    source: "Ultimate Combat",
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
        id: "resolve",
        name: "Resolve",
        // 1/day at 1st + 1 per two levels beyond 1st.
        max: (level) => 1 + Math.floor((level - 1) / 2),
        footer: "uses/day",
      },
      {
        id: "challenge",
        name: "Challenge",
        // 1/day at 1st + 1 per three levels beyond 1st (max 7 at 19th).
        max: (level) => 1 + Math.floor((level - 1) / 3),
        footer: "uses/day",
      },
    ],
  },
];
