/**
 * Hand-authored Cleric archetype mechanics (curated set). Formulas are
 * transcribed from the scraped feature text in ../cleric.json — each entry
 * cites the governing sentence. The Cleric's one tracked base pool is
 * channelEnergy; archetypes that REPLACE it auto-suppress through the
 * feature-map graph, so removesResources here is only for the cases the graph
 * can't see (an ALTERED count re-expressed under the same id, or a flat "does
 * not gain channel energy" with no parsed ref). Everything else is a pure ADD.
 */
import type { ArchetypeMechanics } from "../../types";

export const CLERIC_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> = {
  // "A blossoming light's channel energy is usable a number of times per day
  // equal to 5 + her Charisma modifier. At 2nd level and every 2 levels
  // thereafter, the blossoming light gains an additional use per day." This
  // ALTERS (not replaces) channel energy, so the graph leaves the base 3+Cha
  // pool in place — remove it and re-add the boosted count under the same id.
  "blossoming-light": {
    key: "blossoming-light",
    classKey: "Cleric",
    removesResources: ["channelEnergy"],
    addsResources: [
      {
        id: "channelEnergy",
        name: "Channel Energy",
        max: (level, mods) => Math.max(0, 5 + mods.cha + Math.floor(level / 2)),
        footer: "uses/day",
        describe: "5 + Cha mod + 1 per 2 levels",
      },
    ],
  },

  // "A forgemaster may inscribe mystical runes upon a suit of armor, shield, or
  // weapon as full-round action, using this ability a number of times per day
  // equal to 3 + her Intelligence modifier." Runeforger replaces channel
  // energy (auto-suppressed by the graph) — the only Cleric pool keyed off Int.
  forgemaster: {
    key: "forgemaster",
    classKey: "Cleric",
    addsResources: [
      {
        id: "runeforger",
        name: "Runeforger",
        max: (_level, mods) => Math.max(0, 3 + mods.int),
        footer: "uses/day",
        describe: "3 + Int mod",
      },
    ],
  },

  // "A foundation of faith does not gain the channel energy ability." The
  // scraped feature parsed zero replaces-refs (it's a bare negation, not a
  // "replaces" clause), so the graph never suppresses the base pool — do it
  // here. Rooted Vitality is terrain-conditional fast healing, not modeled.
  "foundation-of-faith": {
    key: "foundation-of-faith",
    classKey: "Cleric",
    removesResources: ["channelEnergy"],
  },

  // "The sacred attendant can use this ability a number of times per day equal
  // to 3 + her Wisdom modifier." Nurture Grace is a wholly new pool; Channel
  // Beauty only ALTERS channel energy (heals Cha damage), so the base pool
  // stays. Nimble's scaling dodge AC isn't modeled (no monk-style AC flag).
  "sacred-attendant": {
    key: "sacred-attendant",
    classKey: "Cleric",
    addsResources: [
      {
        id: "nurtureGrace",
        name: "Nurture Grace",
        max: (_level, mods) => Math.max(0, 3 + mods.wis),
        footer: "uses/day",
        describe: "3 + Wis mod",
      },
    ],
  },

  // "A cardinal adds Bluff, Intimidate, Knowledge (geography), and Knowledge
  // (local) to her list of class skills." (The same feature trades spontaneous
  // casting for a 6+Int skill-rank count and 1/2 BAB — neither has a mechanics
  // field, so only the class-skill grant is modeled.)
  cardinal: {
    key: "cardinal",
    classKey: "Cleric",
    classSkills: {
      add: [
        "Bluff",
        "Intimidate",
        "Knowledge (geography)",
        "Knowledge (local)",
      ],
    },
  },

  // "Bonded Unity (Su): As a move action, a triadic priest can share one
  // teamwork feat ... The triadic priest can use this ability a number of times
  // per day equal to 3 + her Wisdom modifier." Granted by Bonded Domain at 8th.
  "triadic-priest": {
    key: "triadic-priest",
    classKey: "Cleric",
    addsResources: [
      {
        id: "bondedUnity",
        name: "Bonded Unity",
        minLevel: 8,
        max: (_level, mods) => Math.max(0, 3 + mods.wis),
        footer: "uses/day",
        describe: "3 + Wis mod",
      },
    ],
  },

  // "An Elder Mythos cultist can use this ability once per day at 5th level,
  // plus an additional time per day for every 3 cleric levels thereafter."
  // Maddening Gaze replaces only the channel-energy tier INCREASES (level-
  // scoped refs that never suppress), so the base channelEnergy pool survives.
  "elder-mythos-cultist": {
    key: "elder-mythos-cultist",
    classKey: "Cleric",
    addsResources: [
      {
        id: "maddeningGaze",
        name: "Maddening Gaze",
        minLevel: 5,
        max: (level) => Math.max(1, 1 + Math.floor((level - 5) / 3)),
        footer: "uses/day",
        describe: "1/day at 5th, +1 per 3 levels",
      },
    ],
  },

  // "He can use this ability once per day at 8th level and one additional time
  // per day for every four additional cleric levels beyond 8th." Unseen
  // Devotion applies Silent + Still Spell free, a number of times per day.
  "hidden-priest": {
    key: "hidden-priest",
    classKey: "Cleric",
    addsResources: [
      {
        id: "unseenDevotion",
        name: "Unseen Devotion",
        minLevel: 8,
        max: (level) => Math.max(1, 1 + Math.floor((level - 8) / 4)),
        footer: "uses/day",
        describe: "1/day at 8th, +1 per 4 levels",
      },
    ],
  },

  // "At 10th level, once per day, a scroll scholar can gain a +5 bonus on a
  // single attack roll, caster level check, or saving throw ... This ability
  // can be used twice per day at 15th level, and 3 times per day at 20th."
  "scroll-scholar": {
    key: "scroll-scholar",
    classKey: "Cleric",
    addsResources: [
      {
        id: "flashOfInsight",
        name: "Flash of Insight",
        minLevel: 10,
        max: (level) => (level >= 20 ? 3 : level >= 15 ? 2 : 1),
        footer: "uses/day",
        describe: "1/day (2 at 15th, 3 at 20th)",
      },
    ],
  },
};
