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

/**
 * How a class regains expended maneuvers. Five of the six classes recover an
 * ability-mod count (min 2) on a class-specific trigger; only the Mystic is
 * stochastic (granted-maneuver cycling). The trigger itself is flavor/text
 * (captured in `recovery`), not calc — this drives the recovery COUNT.
 */
export type RecoveryModel =
  | { kind: "abilityMod"; stat: AbilityKey; min: number }
  | { kind: "stochastic"; grantedPerTurn: number }
  | { kind: "fixed"; count: number };

export interface PowClassMeta {
  key: string;
  name: string;
  /** initiating stat — governs save DCs and the recovery count */
  stat: AbilityKey;
  /** human-readable recovery method (shown by the readied tracker) */
  recovery: string;
  /**
   * Structured recovery — drives the recovery count in computeManeuvers.
   * Absent on books predating this field: the calc falls back to the legacy
   * max(2, initMod), preserving the three base classes byte-for-byte.
   */
  recoveryModel?: RecoveryModel;
}

/** The three core Path of War initiating classes. */
export const POW_CLASSES: Record<string, PowClassMeta> = {
  warlord: {
    key: "warlord",
    name: "Warlord",
    stat: "cha",
    recovery:
      "Gambit (swift): on a successful gambit recover Cha mod (min 2) maneuvers; otherwise a standard action recovers 1.",
    recoveryModel: { kind: "abilityMod", stat: "cha", min: 2 },
  },
  warder: {
    key: "warder",
    name: "Warder",
    stat: "int",
    recovery:
      "Defensive Focus (full-round): recover Int mod (min 2) maneuvers; or a standard action recovers 1.",
    recoveryModel: { kind: "abilityMod", stat: "int", min: 2 },
  },
  stalker: {
    key: "stalker",
    name: "Stalker",
    stat: "wis",
    recovery:
      "Full-round action: recover Wis mod (min 2) maneuvers and gain Deadly Strike; or a standard action recovers 1.",
    recoveryModel: { kind: "abilityMod", stat: "wis", min: 2 },
  },
  // Path of War: Expanded (c) 2016 Dreamscarred Press — three Expanded classes.
  //
  // Signature-mechanic dispositions (Story C3) — following the spell-parity
  // philosophy, the sheet models the maneuver MATH (IL, tier, limits, save DC,
  // recovery count); each class's non-standard FEATURE stays reference-only
  // text, as it doesn't feed the maneuver numbers:
  //   • Harbinger — "Dark Claim" marks a foe and triggers recovery when it hits
  //     0 HP (modelled as the abilityMod recovery; the Claim debuff/teleport is
  //     a class feature, reference-only).
  //   • Mystic — stochastic granted-maneuver cycling (modelled as the
  //     `stochastic` recovery kind: the tab shows "N granted/turn" + the cycling
  //     rule; the random-grant simulation and the animus pool are not modelled).
  //   • Zealot — recovers via Aid Another (modelled); the Collective / zeal
  //     resource is a class feature, reference-only.
  harbinger: {
    key: "harbinger",
    name: "Harbinger",
    stat: "int",
    recovery:
      "When a creature you have Claimed drops to 0 HP, recover Int mod (min 2) maneuvers (and recover 1 when you Claim a new foe); or a standard action recovers 1.",
    recoveryModel: { kind: "abilityMod", stat: "int", min: 2 },
  },
  mystic: {
    key: "mystic",
    name: "Mystic",
    stat: "wis",
    recovery:
      "Stochastic: a number of maneuvers are granted at a time; at the end of your turn a random withheld maneuver becomes granted. When every granted maneuver has been expended they all recover at once; or a standard action recovers 1.",
    recoveryModel: { kind: "stochastic", grantedPerTurn: 2 },
  },
  zealot: {
    key: "zealot",
    name: "Zealot",
    stat: "cha",
    recovery:
      "Aid Another (move action): recover Cha mod (min 2) maneuvers; or a standard action recovers 1.",
    recoveryModel: { kind: "abilityMod", stat: "cha", min: 2 },
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
