/**
 * Strike-effect registry — the one-shot attack riders for Path of War Strikes,
 * keyed by maneuver id (discipline:name slug, matching ManeuverIndex /
 * maneuverId()). The Path of War analogue of MANEUVER_EFFECTS, but Strikes
 * cannot ride the always-on buff pipeline: a Strike modifies the NEXT attack
 * only. So computeAll resolves the single armed strike (ManeuverBookState.
 * pendingStrikeId) and merges these fields into the attack hooks — the flat
 * atk/dmg adjusts, the weapon-song dmgExtra dice slot, the keen crit channel,
 * and the attack note block — NOT baseMods (see src/calc/index.ts).
 *
 * Deliberately NOT the smite damage channel: it double-counts on rays
 * (preserved legacy quirk, src/calc/attacks.ts:7).
 *
 * Values transcribed verbatim from the scraped maneuver text (Open Game
 * Content, OGL 1.0a — Path of War, (c) 2014 Dreamscarred Press). An unlisted
 * strike simply contributes nothing (its action text still renders).
 *
 * Corpus note: NO present Strike grants a flat to-hit bonus or expands its
 * threat range — those shapes live on Boosts (e.g. Scarlet Throne's Regal /
 * Noble Blade) and the crit Boosts (Thrashing Dragon's Doom Talon). The
 * `atkBonus` and `expandThreat` fields exist so the model is complete for those
 * channels (and any Expanded-class strikes that use them); they are simply
 * unused by the present seed set. Conditional riders ("if flanked", "vs
 * flat-footed") are surfaced as `riderText`, never auto-math — no evaluator
 * exists (see plan A6.3).
 */

export interface StrikeEffect {
  /** flat bonus to the attack roll (unused by present strikes — see header) */
  atkBonus?: number;
  /** flat bonus to the damage roll (rides the dmgAdjust channel) */
  dmgBonus?: number;
  /** extra damage dice appended to the damage string, e.g. "+2d6" / "+1d6 fire" */
  extraDamageDice?: string;
  /** treat the attack as keen / expanded threat (unused by present strikes) */
  expandThreat?: boolean;
  /** non-numeric rider surfaced on the attack line (saves, prone, auto-hit…) */
  riderText?: string;
  /** one-line summary for the maneuver tab */
  note?: string;
}

export const STRIKE_EFFECTS: Record<string, StrikeEffect> = {
  // Thrashing Dragon — Strike (L1): a thrown light weapon hit deals +1d6.
  "thrashing-dragon:wyrmling-s-fang": {
    extraDamageDice: "+1d6",
    note: "+1d6 damage on a successful thrown attack",
  },
  // Golden Lion — Strike (L2): +1d6 and a forced 5-ft. move that provokes.
  "golden-lion:pyrite-strike": {
    extraDamageDice: "+1d6",
    riderText:
      "Target makes a 5-ft. forced move of your choice, provoking attacks of opportunity from all but you (or just takes the damage if it cannot move).",
    note: "+1d6 damage; forced 5-ft. move",
  },
  // Black Seraph — Strike (L2): +2d6, Reflex or prone.
  "black-seraph:seraph-s-wrath": {
    extraDamageDice: "+2d6",
    riderText: "Reflex save (DC 12 + initiation modifier) or knocked prone.",
    note: "+2d6 damage; prone on failed Reflex",
  },
  // Cursed Razor — Strike (L3): +2d6 (4d6 if flanked), Reflex or prone.
  // Flank-conditional damage stays text-only (no auto-math; plan A6.3).
  "cursed-razor:dogpile-strike": {
    extraDamageDice: "+2d6",
    riderText:
      "Reflex save (DC 13 + initiation modifier) or knocked prone. If the target is flanked, this strike's extra damage is 4d6 instead.",
    note: "+2d6 (4d6 if flanked); prone on failed Reflex",
  },
  // Scarlet Throne — Strike (L6): pure rider, no numeric bonus.
  "scarlet-throne:blade-of-perfection": {
    riderText:
      "This attack automatically hits and ignores damage reduction; treat it as a natural 20 against counters that oppose an attack roll.",
    note: "Auto-hits; ignores DR",
  },
  // Scarlet Throne — Strike (L9): +100 flat damage, Will or paralysis.
  "scarlet-throne:heavenly-blade-of-the-scarlet-throne": {
    dmgBonus: 100,
    riderText:
      "Will save (DC 19 + initiation modifier) or paralyzed for 1d4 rounds.",
    note: "+100 damage; paralysis on failed Will",
  },
};

export function strikeEffect(id: string): StrikeEffect | undefined {
  return STRIKE_EFFECTS[id];
}
