/**
 * Hand-authored Monk (Unchained) archetype mechanics (curated set).
 * Formulas are transcribed from the scraped feature text in
 * ../monk-unchained.json — each entry cites the governing sentence.
 * Archetypes not listed here are "partial": their replaces-graph still
 * auto-suppresses via the feature map (e.g. Black Asp loses the
 * stunningFist pool with no entry below).
 */
import type { ArchetypeMechanics } from "../../types";

export const MONK_UNCHAINED_ARCHETYPE_MECHANICS: Record<
  string,
  ArchetypeMechanics
> = {
  // "Draconic Might: Any of the scaled fist's class abilities that make
  // calculations based on her Wisdom (including bonus feats with DCs or
  // uses per day, such as Stunning Fist, but not Wisdom-based skills or
  // Will saving throws) are instead based on her Charisma." Two modeled
  // consequences: the AC bonus stat swap (scaledFistAC — the bonus
  // calc/ac.ts used to grant every monk CHA unconditionally; relocated
  // here) and the ki pool maximum (base: floor(level/2) + Wis from 3rd,
  // src/data/classes/unchained.ts), re-added Cha-based under the same id.
  // Stunning Fist uses/day are level-only, so that pool needs no re-add.
  "scaled-fist": {
    key: "scaled-fist",
    classKey: "Monk (Unchained)",
    scaledFistAC: true,
    removesResources: ["kiPool"],
    addsResources: [
      {
        id: "kiPool",
        name: "Ki Pool",
        minLevel: 3,
        max: (level, mods) => Math.max(0, Math.floor(level / 2) + mods.cha),
        footer: "points",
      },
    ],
  },
};
