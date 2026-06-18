/**
 * Active maneuver-effect registry — the modifier-bearing subset of Path of War
 * stances and boosts, keyed by maneuver id (discipline:name slug, matching
 * ManeuverIndex / maneuverId()). Only maneuvers with a clean, unconditional,
 * self-applicable numeric bonus live here; the rest (auras, counters,
 * conditional/"vs fear"/"against AoO"/IL-scaled effects) stay informational.
 *
 * computeAll folds the ACTIVE stance's and active boosts' modifiers into the
 * same typed-stacking pipeline as buffs (so a dodge stance stacks with Haste's
 * dodge, an insight stance suppresses a weaker insight source, etc.).
 *
 * Values transcribed from the scraped maneuver text (Open Game Content, OGL
 * 1.0a — Path of War, (c) 2014 Dreamscarred Press). Extend as effects are
 * verified; an unlisted maneuver simply contributes no modifier.
 */
import type { Modifier } from "../calc/modifiers";

export interface ManeuverEffect {
  modifiers: Modifier[];
  /** one-line summary for the maneuver tab */
  note?: string;
}

export const MANEUVER_EFFECTS: Record<string, ManeuverEffect> = {
  // Golden Lion — Boost: all allies (incl. the initiator) +2 morale atk/dmg
  "golden-lion:encouraging-roar": {
    modifiers: [
      {
        target: "attack.all",
        type: "morale",
        value: 2,
        source: "Encouraging Roar",
      },
      {
        target: "damage.all",
        type: "morale",
        value: 2,
        source: "Encouraging Roar",
      },
    ],
    note: "+2 morale to attack and damage (1 round)",
  },
  // Primal Fury — Stance: +2 dodge AC
  "primal-fury:skirmisher-s-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Skirmisher's Stance",
      },
    ],
    note: "+2 dodge to AC",
  },
  // Mithral Current — Stance: +4 dodge AC
  "mithral-current:flowing-water-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 4,
        source: "Flowing Water Stance",
      },
    ],
    note: "+4 dodge to AC",
  },
  // Iron Tortoise — Stance: +2 dodge AC and CMD
  "iron-tortoise:mithral-tortoise-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Mithral Tortoise Stance",
      },
      {
        target: "cmd",
        type: "dodge",
        value: 2,
        source: "Mithral Tortoise Stance",
      },
    ],
    note: "+2 dodge to AC and CMD",
  },
  // Thrashing Dragon — Stance: +2 dodge AC, +2 morale Will
  "thrashing-dragon:inner-sphere-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Inner Sphere Stance",
      },
      {
        target: "save.will",
        type: "morale",
        value: 2,
        source: "Inner Sphere Stance",
      },
    ],
    note: "+2 dodge to AC, +2 morale to Will saves",
  },
  // Silver Crane — Stance: +2 insight AC and Reflex
  "silver-crane:silver-crane-waltz": {
    modifiers: [
      {
        target: "ac.all",
        type: "insight",
        value: 2,
        source: "Silver Crane Waltz",
      },
      {
        target: "save.ref",
        type: "insight",
        value: 2,
        source: "Silver Crane Waltz",
      },
    ],
    note: "+2 insight to AC and Reflex saves",
  },
};

export function maneuverEffect(id: string): ManeuverEffect | undefined {
  return MANEUVER_EFFECTS[id];
}
