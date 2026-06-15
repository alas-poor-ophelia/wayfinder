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
  /** familiar rule: per save, use max(own base, master's base) before adding
   *  the familiar's OWN ability mods. The familiar never inherits the master's
   *  ability mods, resistance, or divine grace. */
  masterBaseSaves?: SaveValues;
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

/** Base save bonuses from class progressions alone — no ability mods, divine
 *  grace, resistance, or conditions. Used both internally and to feed a
 *  familiar the master's base saves. */
export function classBaseSaves(
  classes: { className: string; level: number }[],
): SaveValues {
  let fort = 0;
  let ref = 0;
  let will = 0;
  for (const { className, level } of classes) {
    if (!level) continue;
    const stats = getClassStats(className);
    if (!stats) continue;
    fort += baseSave(level, stats.saves.fort);
    ref += baseSave(level, stats.saves.ref);
    will += baseSave(level, stats.saves.will);
  }
  return { fort, ref, will };
}

export function calculateSaves(input: SavesInput): SaveValues {
  const conMod = input.conMod || 0;
  const dexMod = input.dexMod || 0;
  const wisMod = input.wisMod || 0;
  const chaMod = input.chaMod || 0;
  const resistance = num(input.resistanceEnhancement);
  const ce = input.conditionEffects || {};

  const own = classBaseSaves(input.classes);
  // Divine grace only counts paladin levels whose class resolves in
  // CLASS_STATS — matches the original loop's `if (!stats) continue` guard
  // (an unrecognized paladin-named class grants neither base saves nor grace).
  const hasPaladinLevels = input.classes.some(
    (c) =>
      c.level &&
      getClassStats(c.className) &&
      c.className.toLowerCase().includes("paladin"),
  );

  // Familiar rule: per save, the better of the familiar's own base and the
  // master's base; the familiar's own ability mods are still added below.
  const m = input.masterBaseSaves;
  const baseFort = m ? Math.max(own.fort, m.fort) : own.fort;
  const baseRef = m ? Math.max(own.ref, m.ref) : own.ref;
  const baseWill = m ? Math.max(own.will, m.will) : own.will;

  const divineGrace =
    hasPaladinLevels && !input.suppressDivineGrace ? chaMod : 0;

  return {
    fort: baseFort + conMod + divineGrace + resistance + (ce.fortAdjust || 0),
    ref: baseRef + dexMod + divineGrace + resistance + (ce.refAdjust || 0),
    will: baseWill + wisMod + divineGrace + resistance + (ce.willAdjust || 0),
  };
}
