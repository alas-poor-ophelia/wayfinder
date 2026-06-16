/**
 * Hand-authored Arcanist archetype mechanics (curated set). Formulas are
 * transcribed from the scraped feature text in ../arcanist.json — each entry
 * cites the governing sentence.
 *
 * The Arcanist reshapes SPELLCASTING and swaps EXPLOITS more than it grants
 * daily pools. Both are now modeled: arcanist exploits are a build-stat COUNT
 * (computeAll's featureCounts, reduced by the level-scoped exploit refs the
 * graph carries — so Occultist/School Savant/Blood Arcanist/Eldritch Font all
 * reflect their losses with no entry here), and per-level slot reshapes ride
 * the spellcastingAdjust seam (Eldritch Font). Occultist additionally adds a
 * tracked daily ability.
 */
import type { ArchetypeMechanics } from "../../types";

export const ARCANIST_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> =
  {
    // "Planar Contact: At 7th level, an occultist can cast augury once per day
    // and contact other plane once per week ... This ability replaces the
    // arcanist exploit gained at 7th level." We track the per-day augury;
    // contact other plane (1/week) isn't a daily resource. Conjurer's Focus
    // (3rd level) spends points from the existing arcaneReservoir pool rather
    // than minting a new one, so it needs no entry here.
    occultist: {
      key: "occultist",
      classKey: "Arcanist",
      addsResources: [
        {
          id: "planarContact",
          name: "Planar Contact",
          minLevel: 7,
          max: () => 1,
          footer: "augury/day",
          describe: "augury 1/day from 7th",
        },
      ],
    },

    // "Font of Power: An eldritch font gains one additional spell slot for
    // each level of arcanist spell she can cast. However, the number of spells
    // of each level that she can prepare reduces by 1." The arcanist's "spell
    // slots" are its casts/day pool; "spells prepared" is the preparation
    // count — so +1 cast/-1 prepared per castable level. The exploit slots it
    // trades (3rd/7th/13th) and magical supremacy flow from the graph.
    "eldritch-font": {
      key: "eldritch-font",
      classKey: "Arcanist",
      spellcastingAdjust: {
        classKey: "Arcanist",
        preparedPerLevel: -1,
        castsPerLevel: 1,
      },
    },
  };
