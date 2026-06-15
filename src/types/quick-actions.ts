/**
 * Quick Actions — user-customizable combat-tab toggles.
 *
 * A QuickActionDef is pure data: icon, stages (multi-state cycling like
 * Smite Evil), optional variants (a dropdown like Weapon Song), and a list
 * of effects per stage/variant. Effects resolve through the pure engine in
 * src/calc/quick-actions.ts into typed modifiers + the legacy calc channels.
 *
 * The shipped default catalog (src/data/quick-actions.ts) reproduces every
 * legacy CombatToggles behavior byte-for-byte — quirks included.
 */

import type { BonusType, ModifierTarget } from "../calc/modifiers";
import type { AbilityKey } from "./character";

export type QuickActionFormulaSource =
  | "bab"
  | "classLevel"
  | "characterLevel"
  | "abilityMod"
  | "abilityScore";

/**
 * Structured value formula: flatBonus + multiplier * floor(base / divisor).
 * NOTE: the multiplier applies AFTER the floor — deliberately different from
 * ResourceFormula (floor(base*mult/div)) because legacy power attack damage
 * is `2 + floor(bab/4) * 2`, a post-floor multiply. No expression parser by
 * design; the builder UI assembles these from dropdowns.
 */
export interface QuickActionFormula {
  source: QuickActionFormulaSource;
  /** for "classLevel": case-insensitive substring match on class names */
  className?: string;
  /** for "abilityMod" / "abilityScore" */
  ability?: AbilityKey;
  /** default 1 */
  divisor?: number;
  /** default 1, applied after the floor */
  multiplier?: number;
  /** default 0 */
  flatBonus?: number;
}

/** A static number or a formula evaluated against the character. */
export type QAValue = number | QuickActionFormula;

export type QuickActionEffect =
  /** generic typed modifier — same stacking pipeline as buffs/gear */
  | {
      kind: "modifier";
      target: ModifierTarget;
      type: BonusType;
      value: QAValue;
      condition?: string;
    }
  /**
   * AC adjustments that bypass typed stacking AND CMB/CMD — these ride the
   * conditionEffects acAdjust/touchAcAdjust/ffAcAdjust channels, matching
   * legacy charge (-2 all three), fighting defensively (+normal/touch only)
   * and the Defending weapon song (+1 all three, no CMD).
   */
  | { kind: "acChannels"; normal?: QAValue; touch?: QAValue; ff?: QAValue }
  /** haste-style extra attacks at (full bonus - penalty); penalty 0 = full */
  | { kind: "extraAttacks"; count: QAValue; penalty?: number }
  /** dice rider appended in the legacy dmgExtra slot, e.g. "+1d6 fire" */
  | {
      kind: "damageDice";
      dice: string;
      appliesTo: "melee" | "ranged" | "unarmed" | "all";
    }
  /** doubles the threat range (legacy Keen crit math) */
  | { kind: "keen"; appliesTo: "melee" | "ranged" | "unarmed" | "all" }
  /**
   * Display note. placement "attack" appends to the melee/ranged attack
   * strings (legacy weapon-song notes block); "sheet" (default) shows with
   * the combat tab's buff notes.
   */
  | { kind: "note"; text: string; placement?: "attack" | "sheet" }
  /**
   * The legacy smite channel: attack + damage bonus on every weapon, the
   * inline description string, and the ray double-count quirk downstream.
   */
  | { kind: "smite"; attack: QAValue; damage: QAValue; description?: string }
  /** precise-strike channel: melee + unarmed (+ Shuriken-only ranged) */
  | { kind: "preciseStrike"; damage: QAValue }
  /** flurry: REPLACES the single base attack with `count` at full bonus */
  | { kind: "flurryAttacks"; count: QAValue }
  /** irreducible legacy behaviors, also available to custom actions */
  | {
      kind: "special";
      op: "agileWeapon" | "versatilePerformance" | "weaponFinesse";
    };

export interface QuickActionStage {
  /** optional label, e.g. "vs Outsider" (shown in tooltips) */
  name?: string;
  /** icon registry id; overrides the def icon while this stage is active */
  icon?: string;
  /** legacy .is-double styling: pulse glow */
  emphasized?: boolean;
  effects: QuickActionEffect[];
}

export interface QuickActionVariant {
  id: string;
  name: string;
  icon?: string;
  effects: QuickActionEffect[];
}

export interface QuickActionDef {
  /** catalog id ("powerAttack") or user id ("qa-<base36>") */
  id: string;
  name: string;
  /** icon registry id (src/data/icons/registry.ts) */
  icon: string;
  /** at least one; tap cycles off -> stages[0] -> ... -> off */
  stages: QuickActionStage[];
  /**
   * When present, tapping opens a menu ("Off" + variants) instead of
   * cycling. Active effects = stage.effects + selected variant.effects.
   */
  variants?: QuickActionVariant[];
  /**
   * Effects are suppressed while the pool's current < min (default 1).
   * The toggle state itself is preserved — legacy precise-strike behavior
   * when panache hits 0.
   */
  gate?: { resourceId: string; min?: number };
  /** effects suppressed unless total matching class level >= minLevel */
  requires?: { className: string; minLevel: number };
  /** toggling on/off also adds/removes this buff key in character.buffs */
  linkedBuff?: string;
  /** hide the combat-tab button; an active state still applies its effects */
  hidden?: boolean;
  /** provenance for class-data sync upserts, e.g. "Monk" */
  classKey?: string;
}

/** stage 0 = off; variantId persists across off/on cycles */
export interface QuickActionState {
  stage: number;
  variantId?: string;
}

export type QuickActionStateMap = Record<string, QuickActionState>;
