/**
 * Hand-authored Paladin archetype mechanics (curated set). Formulas are
 * transcribed from the scraped feature text in ../paladin.json — each entry
 * cites the governing sentence. Archetypes not listed here are "partial":
 * their replaces-graph still auto-suppresses via the feature map.
 */
import type { ArchetypeMechanics } from "../../types";

/** Base smite uses/day: 1 at 1st, +1 at 4th and every 3 levels after. */
const baseSmiteUses = (level: number): number => 1 + Math.floor((level - 1) / 3);

export const PALADIN_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> = {
  // "Panache and Deeds ... gains the swashbuckler's panache class feature
  // along with ... precise strike ... This ability replaces the paladin's
  // spellcasting." (spellcasting removal also flows from the graph.)
  // "Nimble: At 3rd level ... +1 dodge bonus to AC ... increases by 1 for
  // every 4 paladin levels beyond 3rd" — the bonus calc/ac.ts used to grant
  // every paladin unconditionally; grantsBravoAC relocates it here.
  "virtuous-bravo": {
    key: "virtuous-bravo",
    classKey: "Paladin",
    grantsBravoAC: true,
    // Bravo's Finesse: the archetype grants Weapon Finesse as a bonus feat.
    grantsWeaponFinesse: true,
    addsResources: [
      {
        // id intentionally "panache": same pool the schema-v4 migration and
        // the Swashbuckler class def use, so an existing pool just gains a
        // synced max (duplicate adds dedupe by id, first wins).
        id: "panache",
        name: "Panache",
        minLevel: 4,
        // Swashbuckler panache: Cha modifier (minimum 1) per day.
        max: (_level, mods) => Math.max(1, mods.cha),
        footer: "points",
      },
    ],
    addsQuickActions: [{ id: "preciseStrike", minLevel: 4 }],
  },

  // "Weakened Grace: She gains her first use of smite evil at 2nd level,
  // instead of 1st, though she still gains further uses ... at the rate
  // listed ... She never gains the aura of good or divine grace class
  // features." Divine-grace removal flows from the graph; the smite pool is
  // re-added with a delayed start (alters-refs never suppress, so the base
  // pool is removed here explicitly and replaced under the same id).
  // "Class Skills: A gray paladin adds Bluff, Disguise, and Intimidate."
  "gray-paladin": {
    key: "gray-paladin",
    classKey: "Paladin",
    removesResources: ["smiteEvil"],
    addsResources: [
      {
        id: "smiteEvil",
        name: "Smite Evil",
        minLevel: 2,
        max: baseSmiteUses,
        footer: "uses/day",
      },
    ],
    classSkills: { add: ["Bluff", "Disguise", "Intimidate"] },
  },

  // "Stonestrike: Once per day per paladin level ... This ability replaces
  // smite evil." (pool+QA suppression flows from the graph.)
  // "Defensive Stance: ... A stonelord does not gain any spells or
  // spellcasting abilities" — prose form the graph can't see; hand-set.
  // Heartstone replaces divine grace (graph-driven gate).
  stonelord: {
    key: "stonelord",
    classKey: "Paladin",
    removesSpellcasting: true,
    addsResources: [
      {
        id: "stonestrike",
        name: "Stonestrike",
        max: (level) => level,
        footer: "uses/day",
      },
    ],
  },

  // "Delayed Grace: She receives the smite evil ability at 2nd level and
  // the divine grace ability at 4th level. This does not affect the rate at
  // which she gains additional uses per day of smite evil." Both are
  // alters-refs (no auto-suppression): smite is re-added delayed, divine
  // grace gets a min-level gate. Bondless (replaces divine bond) and Lay on
  // Paws (alters lay on hands) need no math here.
  "chosen-one": {
    key: "chosen-one",
    classKey: "Paladin",
    divineGraceMinLevel: 4,
    removesResources: ["smiteEvil"],
    addsResources: [
      {
        id: "smiteEvil",
        name: "Smite Evil",
        minLevel: 2,
        max: baseSmiteUses,
        footer: "uses/day",
      },
    ],
  },

  // "Power of Faith: At 4th level ... replaces the paladin's spells class
  // feature ... gains one additional use of her lay on hands ability per
  // day ... and one additional use ... for every four levels she attains
  // beyond 4th." Lay on hands is re-added with the augmented formula
  // (base: floor(level/2) + Cha mod, from src/data/classes/core.ts).
  "warrior-of-the-holy-light": {
    key: "warrior-of-the-holy-light",
    classKey: "Paladin",
    removesResources: ["layOnHands"],
    addsResources: [
      {
        id: "layOnHands",
        name: "Lay on Hands",
        minLevel: 2,
        max: (level, mods) =>
          Math.max(0, Math.floor(level / 2) + mods.cha) +
          (level >= 4 ? 1 + Math.floor((level - 4) / 4) : 0),
        footer: "uses/day",
      },
    ],
  },
};
