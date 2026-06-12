/**
 * Feature-name → mechanical-id map, per class. This is what lets a scraped
 * replaces-graph suppress the right pools/quick-actions even for archetypes
 * with no hand-authored mechanics: "This ability replaces smite evil" →
 * suppress the smiteEvil pool and quick action.
 *
 * Only features the sheet actually models get entries — replacing an aura
 * or a proficiency is a deliberate no-op. Gates flow into computeAll:
 * "divineGrace" (CHA to saves) and "spellcasting" (computed spellbook).
 *
 * Refs with levels ("her 12th-level mercy") and alters-refs never suppress.
 */
export interface FeatureMech {
  resource?: string;
  quickAction?: string;
  gate?: "divineGrace" | "spellcasting";
}

export const CLASS_FEATURE_MECH: Record<string, Record<string, FeatureMech>> = {
  Paladin: {
    "smite-evil": { resource: "smiteEvil", quickAction: "smiteEvil" },
    "lay-on-hands": { resource: "layOnHands" },
    "divine-grace": { gate: "divineGrace" },
    spells: { gate: "spellcasting" },
    // channel-positive-energy / mercy: the Paladin def has no pools for
    // these today — entries appear when the pools do.
  },
  // The class tables bake column riders into some slugs (core "Ki pool
  // (magic)", unchained "Flurry of blows (bonus attack)"); the scraper's
  // FEATURE_ALIASES resolve refs to them, so the riders appear here too.
  Monk: {
    "ki-pool-magic": { resource: "kiPool" },
    "stunning-fist": { resource: "stunningFist" },
    "flurry-of-blows": { quickAction: "flurryOfBlows" },
  },
  "Monk (Unchained)": {
    "ki-pool": { resource: "kiPool" },
    "stunning-fist": { resource: "stunningFist" },
    "flurry-of-blows-bonus-attack": { quickAction: "flurryOfBlows" },
  },
};
