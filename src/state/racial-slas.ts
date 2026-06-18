/**
 * Racial spell-like ability seeding. Builds the character's innate "racial"
 * spellbook (castingClass "") from the unconditional SLAs granted by their
 * race/heritage, so the abilities show on the sheet even for non-casters.
 *
 * Pure + obsidian-free (testable): the spell index is passed in as a minimal
 * name→doc resolver. The driver (an effect in main.ts) owns timing — it only
 * reconciles once the SpellIndex has actually built, since an SLA can only be
 * seeded when its spell exists as a vault note (id chain SlaEntry → KnownSpell
 * → SpellDoc). Conditional/level-gated SLAs are never listed in slaSpells, so
 * they are never seeded; they stay documented in the trait summary.
 */
import type { SpellDoc } from "../spells";
import { transformSpellForSpellbook } from "../spells/parse";
import { applyHeritage, getRaceData } from "../data/races";
import type { CharacterRecord } from "../types/character";
import type { RacialSla } from "../data/types";
import {
  createDefaultSpellbook,
  type KnownSpell,
  type SlaEntry,
  type SpellbookState,
} from "../types/spellbook";

/** Anything exposing the SpellIndex's case-folded name map. */
export interface SpellResolver {
  byName: Map<string, SpellDoc>;
}

export interface RacialSlaResult {
  /** the innate book to store, or undefined when there are no seedable SLAs */
  book: SpellbookState | undefined;
  /** SLA spell names not found in the index (missing vault notes) */
  unresolved: string[];
}

/** Build the innate book from a resolved slaSpells list. Preserves the
 *  daily-use count of any SLA already present (same spell id, same max). */
export function computeRacialSpellbook(
  slaSpells: RacialSla[] | undefined,
  resolver: SpellResolver,
  existing: SpellbookState | undefined,
): RacialSlaResult {
  if (!slaSpells || slaSpells.length === 0) {
    return { book: undefined, unresolved: [] };
  }
  const spells: KnownSpell[] = [];
  const slas: SlaEntry[] = [];
  const unresolved: string[] = [];
  for (const { name, perDay } of slaSpells) {
    const doc = resolver.byName.get(name.toLowerCase());
    if (!doc) {
      unresolved.push(name);
      continue;
    }
    const known: KnownSpell = {
      ...transformSpellForSpellbook(doc),
      known: false,
    };
    if (!spells.some((s) => s.id === known.id)) spells.push(known);
    const prior = existing?.slas.find((s) => s.spellId === known.id);
    const castsRemaining =
      prior && prior.casts === perDay ? prior.castsRemaining : perDay;
    slas.push({ spellId: known.id, casts: perDay, castsRemaining });
  }
  if (slas.length === 0) return { book: undefined, unresolved };
  const book = createDefaultSpellbook("", "cha");
  book.spells = spells;
  book.slas = slas;
  return { book, unresolved };
}

/** Resolve a character's effective racial SLAs (heritage overrides base) and
 *  build the innate book. */
export function ensureRacialSpellbook(
  character: CharacterRecord,
  resolver: SpellResolver,
): RacialSlaResult {
  const race = character.raceKey ? getRaceData(character.raceKey) : null;
  const effective = race
    ? applyHeritage(race, character.raceHeritageKey)
    : null;
  return computeRacialSpellbook(
    effective?.slaSpells,
    resolver,
    character.racialSpellbook,
  );
}

/** True when two innate books carry the same spells + SLA entries (incl.
 *  remaining uses) — the churn guard so the effect only writes on real
 *  changes. Both books are seeder-produced, so a structural compare suffices. */
export function racialBooksEqual(
  a: SpellbookState | undefined,
  b: SpellbookState | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    JSON.stringify(a.spells) === JSON.stringify(b.spells) &&
    JSON.stringify(a.slas) === JSON.stringify(b.slas)
  );
}
