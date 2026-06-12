/**
 * Hand-authored Monk (core) archetype mechanics (curated set). Formulas
 * are transcribed from the scraped feature text in ../monk.json — each
 * entry cites the governing sentence. Archetypes not listed here are
 * "partial": their replaces-graph still auto-suppresses via the feature
 * map (e.g. Master of Many Styles loses the flurryOfBlows quick action
 * with no entry below).
 */
import type { ArchetypeMechanics } from "../../types";

export const MONK_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> = {
  // "Panache: At 1st level, a kata master gains the swashbuckler's panache
  // class ability. At the start of each day, a kata master gains a number
  // of panache points equal to her Charisma bonus (minimum 1)." The pool
  // id is intentionally "panache" — the same id the Swashbuckler class def
  // and Virtuous Bravo use, so cross-class duplicates dedupe (first grant
  // wins). Stunning Fist suppression flows from the graph ("This ability
  // replaces stunning fist.").
  "kata-master": {
    key: "kata-master",
    classKey: "Monk",
    addsResources: [
      {
        id: "panache",
        name: "Panache",
        max: (_level, mods) => Math.max(1, mods.cha),
        footer: "points",
      },
    ],
  },
};
