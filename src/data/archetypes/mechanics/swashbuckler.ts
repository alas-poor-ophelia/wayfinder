/**
 * Hand-authored Swashbuckler archetype mechanics (curated set). Formulas are
 * transcribed from the scraped feature text in ../swashbuckler.json — each
 * entry cites the governing sentence. Archetypes not listed here are
 * "partial": their replaces-graph still auto-suppresses the panache /
 * charmed-life pools via the feature map (e.g. Noble Fencer loses charmed
 * life to Aristocratic Discipline, with no entries below — its Social Panache
 * deed and conditional Will bonus aren't pool-modeled).
 */
import type { ArchetypeMechanics } from "../../types";

export const SWASHBUCKLER_ARCHETYPE_MECHANICS: Record<
  string,
  ArchetypeMechanics
> = {
  // "Inspired Panache: Each day, an inspired blade gains a number of panache
  // points equal to her Charisma modifier (minimum 1) and Intelligence
  // modifier (minimum 1), instead of just her Charisma modifier ... This
  // ability alters the panache class feature." The alters-ref never
  // auto-suppresses, so the base panache pool is removed and re-added under
  // the same id with the Cha+Int formula.
  // "Inspired Finesse: At 1st level, an inspired blade gains the benefits of
  // Weapon Finesse with the rapier ... and gains Weapon Focus (rapier) as a
  // bonus feat. This ability replaces swashbuckler finesse."
  "inspired-blade": {
    key: "inspired-blade",
    classKey: "Swashbuckler",
    grantsWeaponFinesse: true,
    removesResources: ["panache"],
    addsResources: [
      {
        id: "panache",
        name: "Panache",
        max: (_level, mods) => Math.max(1, mods.cha) + Math.max(1, mods.int),
        footer: "points",
        describe: "Cha mod (min 1) + Int mod (min 1)",
      },
    ],
  },

  // "Class Skills: A daring infiltrator gains Disguise and Stealth as class
  // skills, but does not gain Diplomacy, Perform, and Profession as class
  // skills." Quick-Tongued (replaces charmed life) auto-suppresses the
  // charmedLife pool through the feature map — its scaling Bluff bonus is a
  // conditional skill rider, surfaced via the scraped feature text, not summed.
  "daring-infiltrator": {
    key: "daring-infiltrator",
    classKey: "Swashbuckler",
    classSkills: {
      add: ["Disguise", "Stealth"],
      remove: ["Diplomacy", "Perform (any)", "Profession (any)"],
    },
  },

  // "Affection of Elysium: At 4th level and every 4 levels thereafter, an
  // azatariel selects a mercy ... An azatariel can use this ability a number
  // of times per day equal to half her swashbuckler level plus her Charisma
  // modifier. This replaces the swashbuckler's bonus feats." Elysian
  // Conviction (replaces charmed life) auto-suppresses charmedLife via the
  // graph; the new mercy pool comes online at 4th.
  azatariel: {
    key: "azatariel",
    classKey: "Swashbuckler",
    addsResources: [
      {
        id: "affectionOfElysium",
        name: "Affection of Elysium",
        minLevel: 4,
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.cha),
        footer: "uses/day",
        describe: "⌊Swashbuckler ÷ 2⌋ + Cha mod",
      },
    ],
  },

  // "Two-Weapon Finesse: A picaroon gains the benefits of the Weapon Finesse
  // feat with light or one-handed piercing melee weapons ... This ability
  // replaces swashbuckler finesse." Its panache alter only changes the regain
  // trigger (no formula change), so the base pool is left intact.
  picaroon: {
    key: "picaroon",
    classKey: "Swashbuckler",
    grantsWeaponFinesse: true,
  },
};
