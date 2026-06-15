/**
 * Carrying capacity / encumbrance — NEW math, not a legacy port (the old
 * sheet tracked total weight but never judged it). Pathfinder 1e Core
 * "Carrying Capacity" table, Medium bipeds; size/quadruped multipliers are
 * out of scope for now (add a sizeFactor param if ever needed).
 */

export interface CarryingCapacity {
  light: number;
  medium: number;
  heavy: number;
}

export type LoadLevel = "light" | "medium" | "heavy" | "over";

export interface EncumbranceComputed {
  capacity: CarryingCapacity;
  /** total gear weight in lbs (coins excluded, matching legacy totals) */
  carried: number;
  level: LoadLevel;
}

/** Heavy-load maxima for STR 1–29 (index 0 = STR 1). */
const HEAVY_LOAD = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230, 260,
  300, 350, 400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400,
];

export function carryingCapacity(str: number): CarryingCapacity {
  const score = Math.floor(str);
  if (score <= 0) return { light: 0, medium: 0, heavy: 0 };
  let heavy: number;
  if (score <= 29) {
    heavy = HEAVY_LOAD[score - 1];
  } else {
    // PF1e: beyond 29, use the entry for 20 + (str mod 10), ×4 per full
    // 10 points of Strength above that.
    heavy =
      HEAVY_LOAD[20 + ((score - 20) % 10) - 1] *
      Math.pow(4, Math.floor((score - 20) / 10));
  }
  // light = ⅓ heavy, medium = ⅔ heavy (floored) reproduces the official
  // table for all listed scores (e.g. STR 10 → 33/66/100).
  return {
    light: Math.floor(heavy / 3),
    medium: Math.floor((2 * heavy) / 3),
    heavy,
  };
}

export function loadLevel(carried: number, cap: CarryingCapacity): LoadLevel {
  if (carried <= cap.light) return "light";
  if (carried <= cap.medium) return "medium";
  if (carried <= cap.heavy) return "heavy";
  return "over";
}

export function computeEncumbrance(
  str: number,
  carried: number,
): EncumbranceComputed {
  const capacity = carryingCapacity(str);
  return { capacity, carried, level: loadLevel(carried, capacity) };
}
