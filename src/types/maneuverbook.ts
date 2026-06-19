/**
 * Maneuver-book state schema — the Path of War analogue of SpellbookState.
 * Derived values (Initiator Level, max maneuver level, known/readied/stance
 * counts, save DCs, the recovery-pool maximum) are NEVER stored; they are
 * computed in src/calc/maneuvers.ts. The roster mirrors KnownSpell's
 * denormalised-snapshot approach: display fields are captured at add-time so a
 * row renders even if the vault note moves, and the ManeuverIndex re-links by
 * name for the note link.
 *
 * Maneuvers are "part spell, part quick action, part buff": the roster
 * (known/readied/loadouts) lives here, but the modifier-bearing subset routes
 * through the existing pipelines — stances emit buff-style modifiers and boosts
 * emit Quick Action effects (see src/data/stances.ts and the boost catalog).
 */

import type { AbilityKey } from "./character";

/** The four maneuver categories. Stances persist; the rest expend on use. */
export type ManeuverType = "Strike" | "Boost" | "Counter" | "Stance";

/** Maneuver tiers run 1–9, like spell levels (there is no tier 0). */
export type ManeuverLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * A maneuver (or stance) the character knows. Both kinds live in the same
 * roster; `type` discriminates. Stances are never readied/expended — every
 * known stance is available and at most one is active (`activeStanceId`).
 */
export interface KnownManeuver {
  /** stable id minted from discipline+name at add-time, e.g. "golden-lion:demoralizing-roar" */
  id: string;
  name: string;
  discipline: string;
  level: ManeuverLevel;
  type: ManeuverType;
  /** denormalised display snapshot (see file header) */
  action: string;
  range: string;
  target: string;
  duration: string;
  save: string;
  prerequisites: string;
  /** the discipline's associated skill (carried for the +2 discipline-weapon note) */
  skill: string;
  source: string;
}

/**
 * A named readied set the initiator swaps between (the Path of War parallel to
 * a spellbook Loadout). `readied` are non-stance maneuver ids; `stanceId` is
 * the stance made active when the loadout is applied (optional).
 */
export interface ManeuverLoadout {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  readied: string[];
  stanceId?: string;
}

export function newManeuverLoadoutId(): string {
  let suffix = "";
  while (suffix.length < 9) {
    suffix += Math.random().toString(36).slice(2);
  }
  return `ml_${suffix.slice(0, 9)}`;
}

export interface ManeuverBookState {
  /** key into the Path of War class table, e.g. "warlord" | "warder" | "stalker" */
  initiatingClass: string;
  /** governs save DCs and the recovery-pool size (Cha/Int/Wis) */
  initiatingStat: AbilityKey;
  /**
   * Optional override; default = summed level of class entries matching
   * initiatingClass, plus half of all other levels (the multiclass Initiator
   * Level rule), capped at character level. Computed in calc unless set.
   */
  initiatorLevelOverride?: number;
  /** the full roster of known maneuvers AND stances (type discriminates) */
  maneuvers: KnownManeuver[];
  /** ids of the non-stance maneuvers currently readied (a subset of `maneuvers`) */
  readied: string[];
  /** ids of readied maneuvers currently expended (spent until recovered) */
  expended: string[];
  /** ids of Boost maneuvers currently "in effect" this round (their registered
   *  modifiers apply while active). Absent on older books — read `?? []`. */
  activeBoosts?: string[];
  /** the one stance currently active (a `maneuvers` id with type Stance) */
  activeStanceId?: string;
  /**
   * The single armed Strike whose one-shot rider applies to the next attack
   * (a `maneuvers` id with type Strike, parallel to `activeStanceId`). Cleared
   * when the strike is expended/recovered. Absent on older books — read as
   * undefined. (schema v16; see src/data/strike-effects.ts) */
  pendingStrikeId?: string;
  /** persisted collapse state of the tab's sections */
  sectionCollapsed: Record<string, boolean>;
  /** named readied sets; absent on books predating this feature — read `?? []` */
  loadouts?: ManeuverLoadout[];
  /** which loadout is currently "applied" (drives the Active marker) */
  appliedLoadoutId?: string;
}

export function createDefaultManeuverBook(
  initiatingClass: string,
  initiatingStat: AbilityKey,
): ManeuverBookState {
  return {
    initiatingClass,
    initiatingStat,
    maneuvers: [],
    readied: [],
    expended: [],
    activeBoosts: [],
    sectionCollapsed: {},
    loadouts: [],
  };
}

/** Stable maneuver id from its discipline + name (matches the note dataset). */
export function maneuverId(discipline: string, name: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${slug(discipline)}:${slug(name)}`;
}
