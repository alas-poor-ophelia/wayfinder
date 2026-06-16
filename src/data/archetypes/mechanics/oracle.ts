/**
 * Hand-authored Oracle archetype mechanics (curated set). The base Oracle
 * tracks NO daily pools (mysteries/revelations/curse aren't modeled), so every
 * entry here is a pure ADD — a new pool with an explicit formula, or a class-
 * skill grant. Archetypes whose only daily abilities are mandatory REVELATIONS
 * (black-blooded-oracle, community-guardian, hermit, seer, …) are deliberately
 * omitted: the sheet doesn't model revelation slots, so there is no hook.
 * Formulas are transcribed from ../oracle.json with the governing sentence.
 */
import type { ArchetypeMechanics } from "../../types";

export const ORACLE_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> = {
  // "The number of points in the shigenjo's ki pool is equal to 1/3 her oracle
  // level + her Charisma modifier." (id "kiPool" so it reads like other ki
  // pools; cross-class ki stacking is a multiclass edge case the resource
  // model doesn't sum — fine for a single-class oracle.) Also: "A shigenjo
  // adds Survival to her list of class skills in place of Diplomacy."
  shigenjo: {
    key: "shigenjo",
    classKey: "Oracle",
    addsResources: [
      {
        id: "kiPool",
        name: "Ki Pool",
        minLevel: 7,
        max: (level, mods) => Math.max(0, Math.floor(level / 3) + mods.cha),
        footer: "ki points",
        describe: "⌊level ÷ 3⌋ + Cha mod",
      },
    ],
    classSkills: { add: ["Survival"], remove: ["Diplomacy"] },
  },

  // "She can use this ability a number of times per day equal to 3 + 1/2 her
  // oracle level." Martial Flexibility (the Brawler ability), level-only.
  warsighted: {
    key: "warsighted",
    classKey: "Oracle",
    addsResources: [
      {
        id: "martialFlexibility",
        name: "Martial Flexibility",
        max: (level) => Math.max(0, 3 + Math.floor(level / 2)),
        footer: "uses/day",
        describe: "3 + ⌊level ÷ 2⌋",
      },
    ],
  },

  // "She can use this ability a number of times per day equal to 1 + her
  // Charisma modifier." Healer's Way (a lay-on-hands analogue) replaces the
  // 1st-level revelation — pure add, nothing tracked to suppress.
  "pei-zin-practitioner": {
    key: "pei-zin-practitioner",
    classKey: "Oracle",
    addsResources: [
      {
        id: "healersWay",
        name: "Healer's Way",
        max: (_level, mods) => Math.max(0, 1 + mods.cha),
        footer: "uses/day",
        describe: "1 + Cha mod",
      },
    ],
  },

  // "At 5th level, a purifier may channel holy power to harm evil outsiders ...
  // She may use this ability a number of times per day equal to 1 + her
  // Charisma modifier." Holy Terror (9th) and Celestial Master (13th) expand
  // what the pool does without adding uses, so one pool covers all three.
  purifier: {
    key: "purifier",
    classKey: "Oracle",
    addsResources: [
      {
        id: "sacredScourge",
        name: "Sacred Scourge",
        minLevel: 5,
        max: (_level, mods) => Math.max(0, 1 + mods.cha),
        footer: "uses/day",
        describe: "1 + Cha mod",
      },
    ],
  },

  // "It is usable a total number of rounds per day equal to her level + her
  // Charisma modifier (minimum 1)." Inspiring Song is the bardic-performance
  // analogue (rounds/day). Also: "An ocean's echo adds Bluff, Intimidate,
  // Knowledge (nature), and Perform to her list of class skills" — concrete
  // grants (the mystery skills they nominally replace aren't tracked anyway).
  "ocean-s-echo": {
    key: "ocean-s-echo",
    classKey: "Oracle",
    addsResources: [
      {
        id: "inspiringSong",
        name: "Inspiring Song",
        max: (level, mods) => Math.max(1, level + mods.cha),
        footer: "rounds/day",
        describe: "level + Cha mod",
      },
    ],
    classSkills: {
      add: ["Bluff", "Intimidate", "Knowledge (nature)", "Perform (any)"],
    },
  },

  // "A stargazer adds Knowledge (nature), Perception, and Survival to her list
  // of class skills." Concrete class-skill grants (the mystery skills they
  // replace aren't modeled). Stargazer's other features are forced revelations.
  stargazer: {
    key: "stargazer",
    classKey: "Oracle",
    classSkills: {
      add: ["Knowledge (nature)", "Perception", "Survival"],
    },
  },
};
