/**
 * Maneuver-book mutations. Mirrors spellbook-actions.ts: each takes
 * (store, character, …), clones the maneuverbook subtree, mutates the clone,
 * and writes it back via store.setCharacterField(id, "maneuverbook", next),
 * which debounce-persists. No getters, no in-place mutation.
 */
import type { MiniSheetStore } from "./store";
import type { CharacterRecord } from "../types/character";
import {
  createDefaultManeuverBook,
  maneuverId,
  newManeuverLoadoutId,
  type KnownManeuver,
  type ManeuverBookState,
  type ManeuverLoadout,
} from "../types/maneuverbook";
import type { ManeuverDoc } from "../maneuvers/index";
import { powClass } from "../data/maneuvers";

function write(
  store: MiniSheetStore,
  character: CharacterRecord,
  next: ManeuverBookState,
): void {
  store.setCharacterField(character.id, "maneuverbook", next);
}

/**
 * Make the character a Path of War initiator of `classKey` (creating the book
 * with that class's initiating stat), or remove the book when classKey is "".
 * Re-pointing an existing book keeps the roster but updates class/stat.
 */
export function setInitiatingClass(
  store: MiniSheetStore,
  character: CharacterRecord,
  classKey: string,
): void {
  if (!classKey) {
    store.setCharacterField(character.id, "maneuverbook", undefined);
    return;
  }
  const meta = powClass(classKey);
  const stat = meta?.stat ?? "cha";
  const existing = character.maneuverbook;
  if (!existing) {
    write(store, character, createDefaultManeuverBook(classKey, stat));
    return;
  }
  write(store, character, {
    ...existing,
    initiatingClass: classKey,
    initiatingStat: stat,
  });
}

function requireBook(character: CharacterRecord): ManeuverBookState {
  if (!character.maneuverbook) {
    throw new Error("character has no maneuverbook");
  }
  return character.maneuverbook;
}

/** Add a maneuver from the database (a ManeuverDoc) to the known roster. */
export function addManeuverToRoster(
  store: MiniSheetStore,
  character: CharacterRecord,
  doc: ManeuverDoc,
): void {
  const book = requireBook(character);
  if (book.maneuvers.some((m) => m.id === doc.id)) return;
  const known: KnownManeuver = {
    id: doc.id,
    name: doc.name,
    discipline: doc.discipline,
    level: doc.level,
    type: doc.type,
    action: doc.action,
    range: doc.range,
    target: doc.target,
    duration: doc.duration,
    save: doc.save,
    prerequisites: doc.prerequisites,
    skill: doc.skill,
    source: doc.source,
  };
  write(store, character, {
    ...book,
    maneuvers: [...book.maneuvers, known],
  });
}

/** Remove a maneuver from the roster (and any readied/expended/active state). */
export function removeManeuver(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const book = requireBook(character);
  write(store, character, {
    ...book,
    maneuvers: book.maneuvers.filter((m) => m.id !== id),
    readied: book.readied.filter((r) => r !== id),
    expended: book.expended.filter((e) => e !== id),
    activeBoosts: (book.activeBoosts ?? []).filter((b) => b !== id),
    activeStanceId: book.activeStanceId === id ? undefined : book.activeStanceId,
  });
}

/** Ready/unready a non-stance maneuver (stances are never readied). */
export function toggleReadied(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const book = requireBook(character);
  const isReadied = book.readied.includes(id);
  write(store, character, {
    ...book,
    readied: isReadied
      ? book.readied.filter((r) => r !== id)
      : [...book.readied, id],
    // unreadying clears any expended/active mark on it
    expended: isReadied ? book.expended.filter((e) => e !== id) : book.expended,
    activeBoosts: isReadied
      ? (book.activeBoosts ?? []).filter((b) => b !== id)
      : book.activeBoosts,
  });
}

/** Toggle a readied Boost as "in effect" this round (its modifiers apply). */
export function toggleActiveBoost(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const book = requireBook(character);
  if (!book.readied.includes(id)) return;
  const active = book.activeBoosts ?? [];
  write(store, character, {
    ...book,
    activeBoosts: active.includes(id)
      ? active.filter((b) => b !== id)
      : [...active, id],
  });
}

/** Mark/unmark a readied maneuver as expended (spent until recovered). */
export function toggleExpended(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const book = requireBook(character);
  if (!book.readied.includes(id)) return;
  const isExpended = book.expended.includes(id);
  write(store, character, {
    ...book,
    expended: isExpended
      ? book.expended.filter((e) => e !== id)
      : [...book.expended, id],
  });
}

/** Recover all expended maneuvers (the end-of-encounter / full recovery). */
export function recoverAll(
  store: MiniSheetStore,
  character: CharacterRecord,
): void {
  const book = requireBook(character);
  if (!book.expended.length) return;
  write(store, character, { ...book, expended: [] });
}

/** Set (or clear, with undefined) the one active stance. */
export function setActiveStance(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string | undefined,
): void {
  const book = requireBook(character);
  write(store, character, { ...book, activeStanceId: id });
}

/* ----------------------------- loadouts ----------------------------- */

/** Snapshot the current readied set + active stance as a new named loadout,
 *  and mark it applied. Returns the new loadout id. */
export function snapshotReadiedAsLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  name: string,
): string {
  const book = requireBook(character);
  const id = newManeuverLoadoutId();
  const loadout: ManeuverLoadout = {
    id,
    name: name.trim() || `Loadout ${(book.loadouts?.length ?? 0) + 1}`,
    icon: "",
    color: "",
    desc: "",
    readied: [...book.readied],
    stanceId: book.activeStanceId,
  };
  write(store, character, {
    ...book,
    loadouts: [...(book.loadouts ?? []), loadout],
    appliedLoadoutId: id,
  });
  return id;
}

/** Apply a loadout: replace readied (filtered to still-known maneuvers) and the
 *  active stance, and clear expended (a fresh readying). */
export function applyManeuverLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const book = requireBook(character);
  const loadout = (book.loadouts ?? []).find((l) => l.id === id);
  if (!loadout) return;
  const known = new Set(book.maneuvers.map((m) => m.id));
  write(store, character, {
    ...book,
    readied: loadout.readied.filter((r) => known.has(r)),
    activeStanceId:
      loadout.stanceId && known.has(loadout.stanceId)
        ? loadout.stanceId
        : undefined,
    expended: [],
    activeBoosts: [],
    appliedLoadoutId: id,
  });
}

export function renameManeuverLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
  name: string,
): void {
  const book = requireBook(character);
  write(store, character, {
    ...book,
    loadouts: (book.loadouts ?? []).map((l) =>
      l.id === id ? { ...l, name } : l,
    ),
  });
}

export function deleteManeuverLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const book = requireBook(character);
  write(store, character, {
    ...book,
    loadouts: (book.loadouts ?? []).filter((l) => l.id !== id),
    appliedLoadoutId:
      book.appliedLoadoutId === id ? undefined : book.appliedLoadoutId,
  });
}

/** Re-export for callers minting ids alongside these actions. */
export { maneuverId };
