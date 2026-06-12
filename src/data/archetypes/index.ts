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
import { CLASS_FEATURE_MECH } from "./feature-map";
import { PALADIN_ARCHETYPE_MECHANICS } from "./mechanics/paladin";
import { MONK_ARCHETYPE_MECHANICS } from "./mechanics/monk";
import { MONK_UNCHAINED_ARCHETYPE_MECHANICS } from "./mechanics/monk-unchained";
import { SKALD_ARCHETYPE_MECHANICS } from "./mechanics/skald";
import paladinJson from "./paladin.json";
import monkJson from "./monk.json";
import monkUnchainedJson from "./monk-unchained.json";
import skaldJson from "./skald.json";

const FILES: ClassArchetypeFile[] = [
  paladinJson as unknown as ClassArchetypeFile,
  monkJson as unknown as ClassArchetypeFile,
  monkUnchainedJson as unknown as ClassArchetypeFile,
  skaldJson as unknown as ClassArchetypeFile,
];

const BY_CLASS = new Map<string, Map<string, ArchetypeDef>>(
  FILES.map((f) => [f.classKey, new Map(f.archetypes.map((a) => [a.id, a]))])
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
    if (lower.includes(key.toLowerCase()) && key.length > (best?.key.length ?? 0)) {
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
};

export function listArchetypes(className: string): ArchetypeDef[] {
  return [...(catalogFor(className)?.values() ?? [])];
}

export function getArchetype(
  className: string,
  id: string
): ArchetypeDef | undefined {
  return catalogFor(className)?.get(id);
}

export function getArchetypeMechanics(
  id: string
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
  classSkillAdds: Set<string>;
  classSkillRemoves: Set<string>;
  /** false when no entry selects any archetype (cheap short-circuit) */
  any: boolean;
}

export function resolveArchetypeEffects(classes: ClassEntry[]): ArchetypeEffects {
  const effects: ArchetypeEffects = {
    suppressedResources: classes.map(() => new Set<string>()),
    suppressedQuickActions: classes.map(() => new Set<string>()),
    addedResources: [],
    addedQuickActions: [],
    divineGraceMinLevel: 0,
    removedSpellcastingClassKeys: new Set<string>(),
    grantsBravoAC: false,
    scaledFistAC: false,
    classSkillAdds: new Set<string>(),
    classSkillRemoves: new Set<string>(),
    any: false,
  };

  for (let i = 0; i < classes.length; i++) {
    const entry = classes[i];
    const keys = entry.archetypeKeys ?? [];
    if (keys.length === 0) continue;
    effects.any = true;
    const featureMech = CLASS_FEATURE_MECH[entry.className] ?? {};

    for (const key of keys) {
      const def = getArchetype(entry.className, key);
      if (def) {
        for (const feature of def.features) {
          for (const ref of feature.replaces) {
            if (ref.unmatched || (ref.levels && ref.levels.length > 0)) continue;
            const mech = featureMech[ref.feature];
            if (!mech) continue;
            if (mech.resource) effects.suppressedResources[i].add(mech.resource);
            if (mech.quickAction)
              effects.suppressedQuickActions[i].add(mech.quickAction);
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
        effects.suppressedResources[i].add(id);
      }
      for (const id of mechanics.removesQuickActions ?? []) {
        effects.suppressedQuickActions[i].add(id);
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
      if (mechanics.removesSpellcasting) {
        effects.removedSpellcastingClassKeys.add(entry.className);
      }
      if (mechanics.divineGraceMinLevel) {
        effects.divineGraceMinLevel = Math.max(
          effects.divineGraceMinLevel,
          mechanics.divineGraceMinLevel
        );
      }
      if (mechanics.grantsBravoAC) effects.grantsBravoAC = true;
      if (mechanics.scaledFistAC) effects.scaledFistAC = true;
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
