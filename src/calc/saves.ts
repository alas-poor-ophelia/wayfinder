/**
 * Fort/Ref/Will saves — clean port of the inline meta-bind-js-view block
 * in MiniSheetSaves.md. Save progressions come from CLASS_STATS (the old
 * sheet stored the same data as `classStats` frontmatter).
 *
 * Good save: 2 + floor(level / 2); poor save: floor(level / 3).
 * Divine Grace: +CHA to all saves if any paladin class has levels —
 * unless an archetype suppresses it (computeAll resolves the flag from
 * the archetype effects; this module stays a pure leaf).
 */

import { getClassStats } from "./class-stats";
import { num } from "./abilities";

export interface SavesConditionEffects {
  fortAdjust?: number;
  refAdjust?: number;
  willAdjust?: number;
}

export interface SavesInput {
  classes: { className: string; level: number }[];
  conMod?: number;
  dexMod?: number;
  wisMod?: number;
  chaMod?: number;
  resistanceEnhancement?: unknown;
  conditionEffects?: SavesConditionEffects;
  /** archetype gate: divine grace removed (Gray Paladin, Stonelord) or not
   *  yet online (Chosen One below 4th) */
  suppressDivineGrace?: boolean;
}

export interface SaveValues {
  fort: number;
  ref: number;
  will: number;
}

function baseSave(level: number, isGood: boolean): number {
  if (level === 0) return 0;
  return isGood ? 2 + Math.floor(level / 2) : Math.floor(level / 3);
}

export function calculateSaves(input: SavesInput): SaveValues {
  const conMod = input.conMod || 0;
  const dexMod = input.dexMod || 0;
  const wisMod = input.wisMod || 0;
  const chaMod = input.chaMod || 0;
  const resistance = num(input.resistanceEnhancement);
  const ce = input.conditionEffects || {};

  let baseFort = 0;
  let baseRef = 0;
  let baseWill = 0;
  let hasPaladinLevels = false;

  for (const { className, level } of input.classes) {
    if (!level) continue;
    const stats = getClassStats(className);
    if (!stats) continue;
    if (className.toLowerCase().includes("paladin")) hasPaladinLevels = true;
    baseFort += baseSave(level, stats.saves.fort);
    baseRef += baseSave(level, stats.saves.ref);
    baseWill += baseSave(level, stats.saves.will);
  }

  const divineGrace =
    hasPaladinLevels && !input.suppressDivineGrace ? chaMod : 0;

  return {
    fort: baseFort + conMod + divineGrace + resistance + (ce.fortAdjust || 0),
    ref: baseRef + dexMod + divineGrace + resistance + (ce.refAdjust || 0),
    will: baseWill + wisMod + divineGrace + resistance + (ce.willAdjust || 0),
  };
}
