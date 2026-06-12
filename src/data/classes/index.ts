/**
 * The PF1e class data registry. Layered ON TOP of CLASS_STATS
 * (src/calc/class-stats.ts) — that registry stays the math contract for
 * BAB/saves; this one adds class skills, skill ranks, casting metadata,
 * and resource-pool formulas. Consistency between the two is enforced by
 * tests/unit/data/class-data.test.ts. Both carry published RAW values
 * (legacy departures corrected 2026-06, marked RAW FIX).
 */

import type { AbilityScores, ClassEntry } from "../../types/character";
import type { ClassData } from "../types";
import { resolveArchetypeEffects } from "../archetypes";
import { CORE_CLASSES } from "./core";
import { BASE_CLASSES } from "./base";
import { HYBRID_CLASSES } from "./hybrid";
import { OCCULT_CLASSES } from "./occult";
import { ALTERNATE_CLASSES } from "./alternate";
import { UNCHAINED_CLASSES } from "./unchained";

const ALL_CLASS_DATA: ClassData[] = [
  ...CORE_CLASSES,
  ...BASE_CLASSES,
  ...HYBRID_CLASSES,
  ...OCCULT_CLASSES,
  ...ALTERNATE_CLASSES,
  ...UNCHAINED_CLASSES,
];

export const CLASS_DATA: Record<string, ClassData> = Object.fromEntries(
  ALL_CLASS_DATA.map((c) => [c.key, c])
);

export const CLASS_DATA_NAMES = Object.keys(CLASS_DATA).sort();

export function getClassData(key: string): ClassData | null {
  return CLASS_DATA[key] ?? null;
}

/** Union of class skills across a character's classes (with archetype
 *  adds applied, then removes — removes win over base grants). */
export function unionClassSkills(classes: ClassEntry[]): Set<string> {
  const fx = resolveArchetypeEffects(classes);
  const skills = new Set<string>();
  for (const { className, level } of classes) {
    if (!level) continue;
    const data = getClassData(className);
    if (!data) continue;
    for (const s of data.classSkills) skills.add(s);
  }
  for (const s of fx.classSkillAdds) skills.add(s);
  for (const s of fx.classSkillRemoves) skills.delete(s);
  return skills;
}

export interface SuggestedPool {
  id: string;
  name: string;
  max: number;
  footer?: string;
  className: string;
}

/**
 * Resource pools a character's classes grant at their current levels,
 * with maxima computed from class level + current ability mods.
 */
export function classResources(
  classes: ClassEntry[],
  mods: AbilityScores
): SuggestedPool[] {
  const fx = resolveArchetypeEffects(classes);
  const pools: SuggestedPool[] = [];
  for (let i = 0; i < classes.length; i++) {
    const { className, level } = classes[i];
    if (!level) continue;
    const data = getClassData(className);
    if (!data?.resources) continue;
    for (const def of data.resources) {
      if (fx.suppressedResources[i].has(def.id)) continue;
      if (level < (def.minLevel ?? 1)) continue;
      pools.push({
        id: def.id,
        name: def.name,
        max: def.max(level, mods),
        ...(def.footer ? { footer: def.footer } : {}),
        className,
      });
    }
  }
  // Archetype-granted pools append after base grants; an altered pool is a
  // remove + re-add under the same id. Dedupe by id, first wins (a real
  // Swashbuckler's panache beats Virtuous Bravo's duplicate grant).
  const seen = new Set(pools.map((p) => p.id));
  for (const add of fx.addedResources) {
    if (add.level < (add.def.minLevel ?? 1)) continue;
    if (seen.has(add.def.id)) continue;
    seen.add(add.def.id);
    pools.push({
      id: add.def.id,
      name: add.def.name,
      max: add.def.max(add.level, mods),
      ...(add.def.footer ? { footer: add.def.footer } : {}),
      className: add.label,
    });
  }
  return pools;
}

/**
 * Quick-action catalog ids a character's classes grant at their current
 * levels (deduped; e.g. Monk + Monk (Unchained) both grant flurry once).
 */
export function classQuickActionIds(classes: ClassEntry[]): string[] {
  const fx = resolveArchetypeEffects(classes);
  const ids = new Set<string>();
  for (let i = 0; i < classes.length; i++) {
    const { className, level } = classes[i];
    if (!level) continue;
    const data = getClassData(className);
    for (const qa of data?.quickActions ?? []) {
      if (fx.suppressedQuickActions[i].has(qa.id)) continue;
      if (level >= (qa.minLevel ?? 1)) ids.add(qa.id);
    }
  }
  for (const qa of fx.addedQuickActions) {
    if (qa.level >= (qa.minLevel ?? 1)) ids.add(qa.id);
  }
  return [...ids];
}
