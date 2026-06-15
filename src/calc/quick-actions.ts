/**
 * Quick Action resolution engine — pure TS, no obsidian imports.
 *
 * Turns QuickActionDef[] + per-action state into the channels computeAll
 * feeds to the characterization-locked calculators:
 *  - typed Modifier[] (joins the race/gear/config/buff pipeline)
 *  - conditionEffects AC adjust channels (normal/touch/ff; no CMB/CMD)
 *  - extra attacks, flurry replacement count
 *  - smite / precise-strike overrides (legacy quirk channels)
 *  - damage dice riders, keen flags, attack-string note lines, sheet notes
 *  - agile-weapon / versatile-performance behavior flags
 *
 * Formula ordering rule: QAValue formulas evaluate against ability mods
 * computed WITHOUT quick-action modifiers (race/gear/config/buffs applied).
 * No legacy toggle ever modified an ability score, so legacy parity is
 * exact; custom actions targeting abilities see the pre-action mods.
 */

import type { ClassEntry, AbilityScores } from "../types/character";
import type {
  QAValue,
  QuickActionDef,
  QuickActionEffect,
  QuickActionStateMap,
} from "../types/quick-actions";
import type { Modifier } from "./modifiers";

export interface QuickActionContext {
  classes: ClassEntry[];
  bab: number;
  totalLevel: number;
  mods: AbilityScores;
  scores: AbilityScores;
  resources: { id: string; current: number }[];
}

export interface ResolvedQuickActions {
  modifiers: Modifier[];
  /** rides conditionEffects.acAdjust / touchAcAdjust / ffAcAdjust */
  acChannels: { normal: number; touch: number; ff: number };
  /** appended after condition extraAttacks (haste first — legacy order) */
  extraAttacks: number[];
  agileWeapon: boolean;
  /** manual Weapon Finesse (the feat / a class grant): Dex-to-attack on
   *  finesse weapons. EitR makes this automatic, so it OR's with that. */
  weaponFinesse: boolean;
  versatilePerformance: boolean;
  /** flurry replaces the base attack with `attacks` swings at full bonus */
  flurry: { active: boolean; attacks: number } | null;
  smiteOverride: {
    atkBonus: number;
    dmgBonus: number;
    description: string;
  } | null;
  preciseStrikeOverride: number | null;
  /** joined dice riders per weapon bucket (legacy dmgExtra slot) */
  extraDamageDice: { melee: string; ranged: string; unarmed: string };
  keen: { melee: boolean; ranged: boolean; unarmed: boolean };
  /** lines for the in-attack-string notes block (legacy song notes) */
  attackNoteLines: string[];
  /** lines for the combat tab's notes area (joins buffNotes) */
  sheetNotes: string[];
}

function classLevel(classes: ClassEntry[], match: string): number {
  const needle = match.toLowerCase();
  return classes
    .filter((c) => c.className.toLowerCase().includes(needle))
    .reduce((sum, c) => sum + (c.level || 0), 0);
}

/** flatBonus + multiplier * floor(base / divisor) — multiplier POST-floor. */
export function evaluateQAValue(
  value: QAValue,
  ctx: QuickActionContext,
): number {
  if (typeof value === "number") return value;
  let base = 0;
  switch (value.source) {
    case "bab":
      base = ctx.bab;
      break;
    case "classLevel":
      base = value.className ? classLevel(ctx.classes, value.className) : 0;
      break;
    case "characterLevel":
      base = ctx.totalLevel;
      break;
    case "abilityMod":
      base = value.ability ? ctx.mods[value.ability] : 0;
      break;
    case "abilityScore":
      base = value.ability ? ctx.scores[value.ability] : 0;
      break;
  }
  const divisor = value.divisor || 1;
  const multiplier = value.multiplier ?? 1;
  const flat = value.flatBonus ?? 0;
  return flat + multiplier * Math.floor(base / divisor);
}

/** The effects active for one action given its state (stage + variant). */
export function activeEffects(
  def: QuickActionDef,
  state: { stage: number; variantId?: string } | undefined,
): QuickActionEffect[] {
  if (!state || state.stage <= 0 || def.stages.length === 0) return [];
  // defs can be edited while active — clamp a stale stage to the last one
  const stage = def.stages[Math.min(state.stage, def.stages.length) - 1];
  const variant = def.variants?.find((v) => v.id === state.variantId);
  return variant ? [...stage.effects, ...variant.effects] : [...stage.effects];
}

function gateOpen(def: QuickActionDef, ctx: QuickActionContext): boolean {
  if (def.requires) {
    if (
      classLevel(ctx.classes, def.requires.className) < def.requires.minLevel
    ) {
      return false;
    }
  }
  if (def.gate) {
    const pool = ctx.resources.find((r) => r.id === def.gate!.resourceId);
    if (!pool || pool.current < (def.gate.min ?? 1)) return false;
  }
  return true;
}

const DICE_BUCKETS = ["melee", "ranged", "unarmed"] as const;

export function resolveQuickActions(
  defs: QuickActionDef[],
  state: QuickActionStateMap,
  ctx: QuickActionContext,
): ResolvedQuickActions {
  const out: ResolvedQuickActions = {
    modifiers: [],
    acChannels: { normal: 0, touch: 0, ff: 0 },
    extraAttacks: [],
    agileWeapon: false,
    weaponFinesse: false,
    versatilePerformance: false,
    flurry: null,
    smiteOverride: null,
    preciseStrikeOverride: null,
    extraDamageDice: { melee: "", ranged: "", unarmed: "" },
    keen: { melee: false, ranged: false, unarmed: false },
    attackNoteLines: [],
    sheetNotes: [],
  };
  const dice = {
    melee: [] as string[],
    ranged: [] as string[],
    unarmed: [] as string[],
  };

  for (const def of defs) {
    const effects = activeEffects(def, state[def.id]);
    if (effects.length === 0) continue;
    if (!gateOpen(def, ctx)) continue; // suppressed, state preserved

    for (const effect of effects) {
      switch (effect.kind) {
        case "modifier":
          out.modifiers.push({
            target: effect.target,
            type: effect.type,
            value: evaluateQAValue(effect.value, ctx),
            source: def.name,
            ...(effect.condition ? { condition: effect.condition } : {}),
          });
          break;
        case "acChannels":
          if (effect.normal !== undefined)
            out.acChannels.normal += evaluateQAValue(effect.normal, ctx);
          if (effect.touch !== undefined)
            out.acChannels.touch += evaluateQAValue(effect.touch, ctx);
          if (effect.ff !== undefined)
            out.acChannels.ff += evaluateQAValue(effect.ff, ctx);
          break;
        case "extraAttacks": {
          const count = evaluateQAValue(effect.count, ctx);
          for (let i = 0; i < count; i++)
            out.extraAttacks.push(effect.penalty ?? 0);
          break;
        }
        case "damageDice":
          for (const bucket of DICE_BUCKETS) {
            if (effect.appliesTo === bucket || effect.appliesTo === "all") {
              dice[bucket].push(effect.dice);
            }
          }
          break;
        case "keen":
          for (const bucket of DICE_BUCKETS) {
            if (effect.appliesTo === bucket || effect.appliesTo === "all") {
              out.keen[bucket] = true;
            }
          }
          break;
        case "note":
          if (effect.placement === "attack")
            out.attackNoteLines.push(effect.text);
          else out.sheetNotes.push(effect.text);
          break;
        case "smite":
          out.smiteOverride = {
            atkBonus: evaluateQAValue(effect.attack, ctx),
            dmgBonus: evaluateQAValue(effect.damage, ctx),
            description: effect.description ?? "",
          };
          break;
        case "preciseStrike":
          out.preciseStrikeOverride =
            (out.preciseStrikeOverride ?? 0) +
            evaluateQAValue(effect.damage, ctx);
          break;
        case "flurryAttacks":
          out.flurry = {
            active: true,
            attacks: evaluateQAValue(effect.count, ctx),
          };
          break;
        case "special":
          if (effect.op === "agileWeapon") out.agileWeapon = true;
          else if (effect.op === "weaponFinesse") out.weaponFinesse = true;
          else if (effect.op === "versatilePerformance")
            out.versatilePerformance = true;
          break;
      }
    }
  }

  out.extraDamageDice = {
    melee: dice.melee.join(" "),
    ranged: dice.ranged.join(" "),
    unarmed: dice.unarmed.join(" "),
  };
  return out;
}
