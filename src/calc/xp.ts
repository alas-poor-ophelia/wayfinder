/**
 * XP tracker math — port of the legacy Datacore XpTracker.jsx (PF1e Medium
 * advancement track; the legacy array is the contract). The mismatch flag
 * is NEW UX (user-approved): the legacy tracker showed the XP-derived level
 * with no comparison against class levels.
 */

import type { ClassEntry } from "../types/character";
import { totalLevel } from "./class-stats";

/** Index 0 = level 1. Verbatim from the legacy source. */
export const XP_BREAKPOINTS: readonly number[] = [
  0, 2000, 5000, 9000, 15000, 23000, 35000, 51000, 75000, 105000, 155000,
  220000, 315000, 445000, 635000, 890000, 1300000, 1800000, 2550000, 3600000,
];

/** Legacy backward scan: highest level whose threshold ≤ xp, minimum 1. */
export function getLevelFromXP(xp: number): number {
  for (let i = XP_BREAKPOINTS.length - 1; i >= 0; i--) {
    if (xp >= XP_BREAKPOINTS[i]) return i + 1;
  }
  return 1;
}

export interface XpComputed {
  level: number;
  nextLevel: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  /** clamped [0, 100]; pinned to 100 at level 20 */
  progressPercent: number;
  classLevelTotal: number;
  /** XP-derived level differs from the class-level total (display-only hint) */
  mismatch: boolean;
}

export function computeXp(xp: number, classes: ClassEntry[]): XpComputed {
  const level = getLevelFromXP(xp);
  const nextLevel = Math.min(level + 1, 20);
  const xpForCurrentLevel = XP_BREAKPOINTS[level - 1] || 0;
  const xpForNextLevel = XP_BREAKPOINTS[nextLevel - 1] || XP_BREAKPOINTS[19];
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  // legacy divided by zero at level 20 (NaN at the exact floor); pin to 100
  const progressPercent =
    xpNeeded <= 0
      ? 100
      : Math.min(100, Math.max(0, ((xp - xpForCurrentLevel) / xpNeeded) * 100));
  const classLevelTotal = totalLevel(classes);
  return {
    level,
    nextLevel,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercent,
    classLevelTotal,
    mismatch: level !== classLevelTotal,
  };
}
