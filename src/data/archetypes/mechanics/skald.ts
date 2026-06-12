/**
 * Hand-authored Skald archetype mechanics (curated set). Formulas are
 * transcribed from the scraped feature text in ../skald.json — each entry
 * cites the governing sentence. Archetypes not listed here are "partial":
 * their replaces-graph still auto-suppresses via the feature map (e.g.
 * Elegist loses the ragingSong pool, Bacchanal the versatilePerformance
 * quick action, with no entries below).
 */
import type { ArchetypeMechanics } from "../../types";

export const SKALD_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> = {
  // "Weapon Song: A spell warrior gains the following raging song,
  // allowing him to grant his ally's weapons enhancement bonuses and
  // special powers ... This ability replaces the inspired rage raging
  // song." The ROUNDS pool survives (weapon song is a raging song and
  // spends the same rounds/day: 3 + Cha + 2 per level beyond 1st, from
  // src/data/classes/hybrid.ts) — it is re-added under the
  // "weaponSongRounds" id the sheet has always used (the legacy import,
  // the weaponSong quick action, and Adarin's live pool all carry it).
  "spell-warrior": {
    key: "spell-warrior",
    classKey: "Skald",
    removesResources: ["ragingSong"],
    addsResources: [
      {
        id: "weaponSongRounds",
        name: "Weapon Song",
        max: (level, mods) => Math.max(0, 3 + mods.cha + 2 * (level - 1)),
        footer: "rounds/day",
      },
    ],
    addsQuickActions: [{ id: "weaponSong" }],
  },
};
