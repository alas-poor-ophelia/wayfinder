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
  type KnownManeuver,
  type ManeuverBookState,
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
    // unreadying clears any expended mark on it
    expended: isReadied ? book.expended.filter((e) => e !== id) : book.expended,
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

/** Re-export for callers minting ids alongside these actions. */
export { maneuverId };
