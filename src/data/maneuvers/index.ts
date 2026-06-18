/**
 * Bundled Path of War mechanics the calc needs at runtime: the per-class
 * maneuver progression (scraped → progression.json) and the initiating-class
 * metadata (stat + recovery method, hand-authored — not in the table).
 *
 * Sourcing: game mechanics are Open Game Content under the OGL 1.0a
 * (LICENSES/OGL-1.0a.txt). Values from Path of War, (c) 2014 Dreamscarred
 * Press, via d20pfsrd.com. The downloadable maneuver NOTES are separate
 * (the wayfinder-rules repo / the maneuvers folder); these are the numbers.
 */
import type { AbilityKey } from "../../types/character";
import progressionJson from "./progression.json";

export interface ClassProgression {
  /** maneuvers known at character level N (index N-1), levels 1–20 */
  known: number[];
  readied: number[];
  stances: number[];
}

const PROGRESSION = progressionJson as unknown as Record<
  string,
  ClassProgression
>;

export interface PowClassMeta {
  key: string;
  name: string;
  /** initiating stat — governs save DCs and the recovery count */
  stat: AbilityKey;
  /** human-readable recovery method (shown by the readied tracker) */
  recovery: string;
}

/** The three core Path of War initiating classes. */
export const POW_CLASSES: Record<string, PowClassMeta> = {
  warlord: {
    key: "warlord",
    name: "Warlord",
    stat: "cha",
    recovery:
      "Gambit (swift): on a successful gambit recover Cha mod (min 2) maneuvers; otherwise a standard action recovers 1.",
  },
  warder: {
    key: "warder",
    name: "Warder",
    stat: "int",
    recovery:
      "Defensive Focus (full-round): recover Int mod (min 2) maneuvers; or a standard action recovers 1.",
  },
  stalker: {
    key: "stalker",
    name: "Stalker",
    stat: "wis",
    recovery:
      "Full-round action: recover Wis mod (min 2) maneuvers and gain Deadly Strike; or a standard action recovers 1.",
  },
};

export function powClass(key: string): PowClassMeta | undefined {
  return POW_CLASSES[key.toLowerCase()];
}

/** Maneuver/stance limits for an initiating class at a character level (1–20). */
export function maneuverLimits(
  classKey: string,
  level: number,
): { known: number; readied: number; stances: number } {
  const prog = PROGRESSION[classKey.toLowerCase()];
  const i = Math.max(0, Math.min(19, Math.floor(level) - 1));
  return {
    known: prog?.known[i] ?? 0,
    readied: prog?.readied[i] ?? 0,
    stances: prog?.stances[i] ?? 0,
  };
}
