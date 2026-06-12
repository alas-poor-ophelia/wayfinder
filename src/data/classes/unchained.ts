/**
 * Pathfinder Unchained classes (4). Class skills use STANDARD_SKILLS
 * spellings. Source: PRD (legacy.aonprd.com/unchained/classes/*.html), OGC.
 */

import type { ClassData } from "../types";
import { ALL_KNOWLEDGE } from "../types";

export const UNCHAINED_CLASSES: ClassData[] = [
  // https://legacy.aonprd.com/unchained/classes/barbarian.html
  {
    key: "Barbarian (Unchained)",
    name: "Barbarian (Unchained)",
    category: "unchained",
    source: "Pathfinder Unchained",
    hitDie: 12,
    bab: "full",
    saves: { fort: "good", ref: "poor", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Climb",
      "Craft (any)",
      "Handle Animal",
      "Intimidate",
      "Knowledge (nature)",
      "Perception",
      "Ride",
      "Survival",
      "Swim",
    ],
    resources: [
      {
        id: "rageRounds",
        name: "Rage",
        // 4 + Con mod + 2 per level beyond 1st (unchained rage no longer
        // changes Con, so current mods are safe to pass).
        max: (level, mods) => Math.max(0, 4 + mods.con + 2 * (level - 1)),
        footer: "rounds/day",
      },
    ],
  },
  // https://legacy.aonprd.com/unchained/classes/monk.html
  // Deliberately differs from the core monk: d10, full BAB, good Fort/Ref
  // only (poor Will) — CLASS_STATS already reflects this.
  {
    key: "Monk (Unchained)",
    name: "Monk (Unchained)",
    category: "unchained",
    source: "Pathfinder Unchained",
    hitDie: 10,
    bab: "full",
    saves: { fort: "good", ref: "good", will: "poor" },
    skillRanksPerLevel: 4,
    classSkills: [
      "Acrobatics",
      "Climb",
      "Craft (any)",
      "Escape Artist",
      "Intimidate",
      "Knowledge (history)",
      "Knowledge (religion)",
      "Perception",
      "Perform (any)",
      "Profession (any)",
      "Ride",
      "Sense Motive",
      "Stealth",
      "Swim",
    ],
    resources: [
      {
        id: "kiPool",
        name: "Ki Pool",
        // 1/2 level + Wis; comes online at 3rd (core monk waits until 4th).
        minLevel: 3,
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.wis),
        footer: "points",
      },
      {
        id: "stunningFist",
        name: "Stunning Fist",
        max: (level) => level,
        footer: "uses/day",
      },
    ],
    quickActions: [{ id: "flurryOfBlows" }],
  },
  // https://legacy.aonprd.com/unchained/classes/rogue.html
  {
    key: "Rogue (Unchained)",
    name: "Rogue (Unchained)",
    category: "unchained",
    source: "Pathfinder Unchained",
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
      "Knowledge (dungeon)",
      "Knowledge (local)",
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
  },
  // https://legacy.aonprd.com/unchained/classes/summoner.html
  {
    key: "Summoner (Unchained)",
    name: "Summoner (Unchained)",
    category: "unchained",
    source: "Pathfinder Unchained",
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
      // Shares the six-level capped-at-5 table (RAW); the registry's
      // "summoner" table stays the legacy APG variant.
      tableKey: "summoner (unchained)",
    },
    resources: [
      {
        id: "summonMonster",
        name: "Summon Monster",
        // 3 + Cha modifier uses/day (spell level scales, count does not).
        max: (_level, mods) => Math.max(0, 3 + mods.cha),
        footer: "uses/day",
      },
    ],
  },
];
