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
  /** a build-stat COUNT this feature feeds (e.g. "arcanistExploits"), not a
   *  daily pool. Level-scoped replaces-refs to such a feature ("the exploit
   *  gained at 1st, 3rd, and 7th") enumerate the removed slots, reducing the
   *  computed count — see resolveArchetypeEffects / computeAll's featureCounts. */
  count?: string;
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
  Skald: {
    "raging-song": { resource: "ragingSong" },
    "versatile-performance": { quickAction: "versatilePerformance" },
    spells: { gate: "spellcasting" },
    // spell-kenning / inspired rage / rage powers: not modeled — refs to
    // them are deliberate no-ops (inspired rage is a song TYPE inside the
    // raging-song pool, not the pool itself).
  },
  Swashbuckler: {
    // panache is only ever ALTERED by archetypes (regain conditions), never
    // replaced — the entry is here for completeness/symmetry. charmed-life is
    // genuinely traded away by several archetypes (Daring Infiltrator's
    // Quick-Tongued, Azatariel's Elysian Conviction, Noble Fencer's
    // Aristocratic Discipline) and auto-suppresses through this map.
    panache: { resource: "panache" },
    "charmed-life": { resource: "charmedLife" },
    // deeds / nimble / swashbuckler finesse / weapon training: not modeled as
    // pools — precise strike is a deed (granted as the preciseStrike QA at
    // minLevel 3), not a base-table feature, so its refs stay unmatched.
  },
  Sorcerer: {
    spells: { gate: "spellcasting" },
    // bloodline powers / arcana / bonus spells / Eschew Materials: not modeled
    // (the sheet doesn't track bloodline selection), so refs to them are
    // deliberate no-ops. Archetypes still ADD pools/skills via mechanics.
  },
  Cleric: {
    // The class table tiers the slug by dice (channel-energy-1d6 … 10d6); the
    // sheet tracks ONE channelEnergy pool, so the scraper's channel-energy
    // alias resolves generic "channel energy" refs to the 1st-level tier. A
    // tier-specific ref ("the increase to channel energy gained at 3rd level")
    // carries a level qualifier and never suppresses — the pool survives.
    "channel-energy-1d6": { resource: "channelEnergy" },
    spells: { gate: "spellcasting" },
    // domains / orisons / aura: not modeled as pools — refs are no-ops.
  },
  Oracle: {
    // Oracle tracks no daily pools (mysteries/revelations/curse aren't modeled
    // as selectable pools) — its only modeled feature is spontaneous casting.
    // Archetype refs to "mystery bonus spells", revelations, and the curse are
    // deliberate no-ops; revelation replaces are all level-scoped regardless.
    spells: { gate: "spellcasting" },
  },
  Arcanist: {
    "arcane-reservoir": { resource: "arcaneReservoir" },
    spells: { gate: "spellcasting" },
    // arcanist exploits are a known-COUNT, not a daily pool: level-scoped refs
    // ("the exploit gained at 1st, 3rd, 7th") enumerate the slots an archetype
    // strips, reducing the computed arcanistExploits count. consume-spells /
    // magical-supremacy remain unmodeled no-ops.
    "arcanist-exploit": { count: "arcanistExploits" },
  },
};
