/**
 * Archetype data surface: bundled scraped catalogs (one JSON per class,
 * equipment-pattern eager imports) + the hand-authored mechanics layer +
 * resolveArchetypeEffects(), the single merge point the store and calc
 * pipeline consume.
 *
 * Merge semantics (legality is deliberately NOT enforced):
 *  - suppression = union per class entry of (graph replaces-refs resolved
 *    through CLASS_FEATURE_MECH) ∪ (mechanics.removes*). Alters-refs,
 *    level-scoped refs ("her 12th-level mercy") and unmatched refs never
 *    suppress. Suppression only filters that entry's BASE grants.
 *  - adds = concat of mechanics.adds* across all archetypes; adds are never
 *    themselves suppressed (an altered pool is expressed as remove + re-add
 *    under the same id). Consumers dedupe pool ids, first wins.
 *  - gates (divine grace, spellcasting, bravo AC) OR/max across archetypes.
 */
import type { ClassEntry } from "../../types/character";
import type { ArchetypeDef, ClassArchetypeFile } from "../../types/archetypes";
import type { ArchetypeMechanics, ClassResourceDef } from "../types";
import type { Modifier } from "../../calc/modifiers";
import { CLASS_FEATURE_MECH } from "./feature-map";
import { PALADIN_ARCHETYPE_MECHANICS } from "./mechanics/paladin";
import { MONK_ARCHETYPE_MECHANICS } from "./mechanics/monk";
import { MONK_UNCHAINED_ARCHETYPE_MECHANICS } from "./mechanics/monk-unchained";
import { SKALD_ARCHETYPE_MECHANICS } from "./mechanics/skald";
import { SWASHBUCKLER_ARCHETYPE_MECHANICS } from "./mechanics/swashbuckler";
import { SORCERER_ARCHETYPE_MECHANICS } from "./mechanics/sorcerer";
import { ARCANIST_ARCHETYPE_MECHANICS } from "./mechanics/arcanist";
import { CLERIC_ARCHETYPE_MECHANICS } from "./mechanics/cleric";
import { ORACLE_ARCHETYPE_MECHANICS } from "./mechanics/oracle";
import paladinJson from "./paladin.json";
import monkJson from "./monk.json";
import monkUnchainedJson from "./monk-unchained.json";
import skaldJson from "./skald.json";
import swashbucklerJson from "./swashbuckler.json";
import sorcererJson from "./sorcerer.json";
import arcanistJson from "./arcanist.json";
import clericJson from "./cleric.json";
import oracleJson from "./oracle.json";

const FILES: ClassArchetypeFile[] = [
  paladinJson as unknown as ClassArchetypeFile,
  monkJson as unknown as ClassArchetypeFile,
  monkUnchainedJson as unknown as ClassArchetypeFile,
  skaldJson as unknown as ClassArchetypeFile,
  swashbucklerJson as unknown as ClassArchetypeFile,
  sorcererJson as unknown as ClassArchetypeFile,
  arcanistJson as unknown as ClassArchetypeFile,
  clericJson as unknown as ClassArchetypeFile,
  oracleJson as unknown as ClassArchetypeFile,
];

const BY_CLASS = new Map<string, Map<string, ArchetypeDef>>(
  FILES.map((f) => [f.classKey, new Map(f.archetypes.map((a) => [a.id, a]))]),
);

/** Catalog for a class name, lenient like the sheet's class matching
 *  everywhere else — "Paladin (Virtuous Bravo)" resolves to the Paladin
 *  catalog (legacy class strings embed the archetype in the name). */
function catalogFor(className: string): Map<string, ArchetypeDef> | undefined {
  const direct = BY_CLASS.get(className);
  if (direct) return direct;
  const lower = className.toLowerCase();
  // Longest key wins: "Monk (Unchained) something" must resolve to the
  // unchained catalog even though it also contains "monk".
  let best: { key: string; map: Map<string, ArchetypeDef> } | undefined;
  for (const [key, map] of BY_CLASS) {
    if (
      lower.includes(key.toLowerCase()) &&
      key.length > (best?.key.length ?? 0)
    ) {
      best = { key, map };
    }
  }
  return best?.map;
}

const ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> = {
  ...PALADIN_ARCHETYPE_MECHANICS,
  ...MONK_ARCHETYPE_MECHANICS,
  ...MONK_UNCHAINED_ARCHETYPE_MECHANICS,
  ...SKALD_ARCHETYPE_MECHANICS,
  ...SWASHBUCKLER_ARCHETYPE_MECHANICS,
  ...SORCERER_ARCHETYPE_MECHANICS,
  ...ARCANIST_ARCHETYPE_MECHANICS,
  ...CLERIC_ARCHETYPE_MECHANICS,
  ...ORACLE_ARCHETYPE_MECHANICS,
};

export function listArchetypes(className: string): ArchetypeDef[] {
  return [...(catalogFor(className)?.values() ?? [])];
}

export function getArchetype(
  className: string,
  id: string,
): ArchetypeDef | undefined {
  return catalogFor(className)?.get(id);
}

export function getArchetypeMechanics(
  id: string,
): ArchetypeMechanics | undefined {
  return ARCHETYPE_MECHANICS[id];
}

/** Scraped def exists but no hand-authored mechanics — auto-suppression
 *  only. Class-scoped: "scaled-fist" is curated for Monk (Unchained) but
 *  partial when the core Monk catalog lists the same id. */
export function isPartialMechanics(id: string, classKey: string): boolean {
  return ARCHETYPE_MECHANICS[id]?.classKey !== classKey;
}

export interface AddedResource {
  /** index into the character's classes[] */
  entryIndex: number;
  /** display label, e.g. "Paladin (Stonelord)" */
  label: string;
  /** the class entry's current level (formula input) */
  level: number;
  def: ClassResourceDef;
}

export interface ArchetypeEffects {
  /** ids suppressed from each class entry's BASE grants (indexed like classes[]) */
  suppressedResources: Array<Set<string>>;
  suppressedQuickActions: Array<Set<string>>;
  addedResources: AddedResource[];
  addedQuickActions: { id: string; minLevel?: number; level: number }[];
  /** static typed modifiers archetypes contribute (e.g. Crossblooded -2 Will);
   *  computeAll folds these into the modifier stacking pass */
  addedModifiers: Modifier[];
  /** build-stat count id -> the class levels at which an archetype strips a
   *  slot (e.g. arcanistExploits -> [1,3,7]). computeAll subtracts the slots
   *  at or below the class level from the base count. */
  featureCountRemovals: Record<string, number[]>;
  /** per-spell-level spellcasting reshape (Eldritch Font), keyed to a casting
   *  class; computeAll passes it to computeSpellbook when the class matches */
  spellcastingAdjust?: {
    classKey: string;
    preparedPerLevel: number;
    castsPerLevel: number;
  };
  /**
   * Paladin class level at which divine grace (CHA to saves) comes online.
   * 0 = unmodified, Infinity = removed by an archetype.
   */
  divineGraceMinLevel: number;
  /** class keys whose spellcasting an archetype trades away */
  removedSpellcastingClassKeys: Set<string>;
  /** Virtuous Bravo Nimble: scaling dodge AC from 3rd level */
  grantsBravoAC: boolean;
  /** Scaled Fist Draconic Might: monk AC bonus keys off CHA, not WIS */
  scaledFistAC: boolean;
  /** an archetype grants Weapon Finesse for free (Virtuous Bravo) */
  grantsWeaponFinesse: boolean;
  classSkillAdds: Set<string>;
  classSkillRemoves: Set<string>;
  /** false when no entry selects any archetype (cheap short-circuit) */
  any: boolean;
}

export function resolveArchetypeEffects(
  classes: ClassEntry[],
): ArchetypeEffects {
  const effects: ArchetypeEffects = {
    suppressedResources: classes.map(() => new Set<string>()),
    suppressedQuickActions: classes.map(() => new Set<string>()),
    addedResources: [],
    addedQuickActions: [],
    addedModifiers: [],
    featureCountRemovals: {},
    divineGraceMinLevel: 0,
    removedSpellcastingClassKeys: new Set<string>(),
    grantsBravoAC: false,
    scaledFistAC: false,
    grantsWeaponFinesse: false,
    classSkillAdds: new Set<string>(),
    classSkillRemoves: new Set<string>(),
    any: false,
  };

  for (let i = 0; i < classes.length; i++) {
    const entry = classes[i]!;
    const keys = entry.archetypeKeys ?? [];
    if (keys.length === 0) continue;
    effects.any = true;
    const featureMech = CLASS_FEATURE_MECH[entry.className] ?? {};

    for (const key of keys) {
      const def = getArchetype(entry.className, key);
      if (def) {
        for (const feature of def.features) {
          for (const ref of feature.replaces) {
            const mech = featureMech[ref.feature];
            if (!mech) continue;
            // count features (arcanist exploits): the level-scoped refs
            // enumerate the slots this archetype strips; a count feature never
            // suppresses a pool, so handle it before the level-scoped skip.
            if (mech.count) {
              if (ref.levels && ref.levels.length > 0) {
                const removed = effects.featureCountRemovals[mech.count] ?? [];
                removed.push(...ref.levels);
                effects.featureCountRemovals[mech.count] = removed;
              }
              continue;
            }
            // suppression: alters-refs, level-scoped refs ("her 12th-level
            // mercy"), and unmatched refs never suppress.
            if (ref.unmatched || (ref.levels && ref.levels.length > 0))
              continue;
            if (mech.resource)
              effects.suppressedResources[i]!.add(mech.resource);
            if (mech.quickAction)
              effects.suppressedQuickActions[i]!.add(mech.quickAction);
            if (mech.gate === "divineGrace") {
              effects.divineGraceMinLevel = Number.POSITIVE_INFINITY;
            }
            if (mech.gate === "spellcasting") {
              effects.removedSpellcastingClassKeys.add(entry.className);
            }
          }
        }
      }

      const mechanics = ARCHETYPE_MECHANICS[key];
      if (!mechanics) continue;
      // Mechanics apply only when the key resolves in this entry's catalog
      // AND was authored for that exact class — "scaled-fist" exists in
      // BOTH monk catalogs, but its Cha-based ki formula is the unchained
      // one (core picks fall back to partial graph suppression).
      if (!def || mechanics.classKey !== def.classKey) continue;
      const label = `${entry.className} (${def.name})`;
      for (const id of mechanics.removesResources ?? []) {
        effects.suppressedResources[i]!.add(id);
      }
      for (const id of mechanics.removesQuickActions ?? []) {
        effects.suppressedQuickActions[i]!.add(id);
      }
      for (const resourceDef of mechanics.addsResources ?? []) {
        effects.addedResources.push({
          entryIndex: i,
          label,
          level: entry.level,
          def: resourceDef,
        });
      }
      for (const qa of mechanics.addsQuickActions ?? []) {
        effects.addedQuickActions.push({ ...qa, level: entry.level });
      }
      for (const m of mechanics.addsModifiers ?? []) {
        effects.addedModifiers.push(m);
      }
      if (mechanics.spellcastingAdjust) {
        effects.spellcastingAdjust = mechanics.spellcastingAdjust;
      }
      if (mechanics.removesSpellcasting) {
        effects.removedSpellcastingClassKeys.add(entry.className);
      }
      if (mechanics.divineGraceMinLevel) {
        effects.divineGraceMinLevel = Math.max(
          effects.divineGraceMinLevel,
          mechanics.divineGraceMinLevel,
        );
      }
      if (mechanics.grantsBravoAC) effects.grantsBravoAC = true;
      if (mechanics.scaledFistAC) effects.scaledFistAC = true;
      if (mechanics.grantsWeaponFinesse) effects.grantsWeaponFinesse = true;
      for (const s of mechanics.classSkills?.add ?? []) {
        effects.classSkillAdds.add(s);
      }
      for (const s of mechanics.classSkills?.remove ?? []) {
        effects.classSkillRemoves.add(s);
      }
    }
  }

  return effects;
}
