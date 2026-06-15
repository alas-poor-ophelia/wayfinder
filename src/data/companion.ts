/**
 * Animal Companion Base Statistics (Pathfinder 1e core). Indexed by the
 * companion's effective level (the master's druid/ranger/hunter level, or
 * a manual value). The base animal's ability scores are user-entered; this
 * table supplies the level-driven progression on top:
 *   - bab: base attack bonus (overrides the no-class default)
 *   - fort/ref/will: BASE saves (own ability mods added in calculateSaves)
 *   - natArmor: natural-armor BONUS added to the animal's own
 *   - strDex: bonus added to BOTH Str and Dex scores
 *   - tricks / special: informational (shown on the sheet)
 *
 * Source: d20pfsrd Animal Companions table.
 */

export interface CompanionRow {
  /** effective companion level (1-20) */
  level: number;
  hd: number;
  bab: number;
  fort: number;
  ref: number;
  will: number;
  /** natural-armor bonus added to the base animal's natural armor */
  natArmor: number;
  /** bonus to BOTH Str and Dex */
  strDex: number;
  bonusTricks: number;
  /** abilities gained at this level (cumulative milestones), for display */
  special?: string;
}

export const COMPANION_TABLE: CompanionRow[] = [
  {
    level: 1,
    hd: 2,
    bab: 1,
    fort: 3,
    ref: 3,
    will: 0,
    natArmor: 0,
    strDex: 0,
    bonusTricks: 1,
    special: "Link, share spells",
  },
  {
    level: 2,
    hd: 3,
    bab: 2,
    fort: 3,
    ref: 3,
    will: 1,
    natArmor: 0,
    strDex: 0,
    bonusTricks: 1,
  },
  {
    level: 3,
    hd: 3,
    bab: 2,
    fort: 3,
    ref: 3,
    will: 1,
    natArmor: 2,
    strDex: 1,
    bonusTricks: 2,
    special: "Evasion",
  },
  {
    level: 4,
    hd: 4,
    bab: 3,
    fort: 4,
    ref: 4,
    will: 1,
    natArmor: 2,
    strDex: 1,
    bonusTricks: 2,
    special: "Ability score increase",
  },
  {
    level: 5,
    hd: 5,
    bab: 3,
    fort: 4,
    ref: 4,
    will: 1,
    natArmor: 2,
    strDex: 1,
    bonusTricks: 2,
  },
  {
    level: 6,
    hd: 6,
    bab: 4,
    fort: 5,
    ref: 5,
    will: 2,
    natArmor: 4,
    strDex: 2,
    bonusTricks: 3,
    special: "Devotion",
  },
  {
    level: 7,
    hd: 6,
    bab: 4,
    fort: 5,
    ref: 5,
    will: 2,
    natArmor: 4,
    strDex: 2,
    bonusTricks: 3,
  },
  {
    level: 8,
    hd: 7,
    bab: 5,
    fort: 5,
    ref: 5,
    will: 2,
    natArmor: 4,
    strDex: 2,
    bonusTricks: 3,
  },
  {
    level: 9,
    hd: 8,
    bab: 6,
    fort: 6,
    ref: 6,
    will: 2,
    natArmor: 6,
    strDex: 3,
    bonusTricks: 4,
    special: "Ability score increase, Multiattack",
  },
  {
    level: 10,
    hd: 9,
    bab: 6,
    fort: 6,
    ref: 6,
    will: 3,
    natArmor: 6,
    strDex: 3,
    bonusTricks: 4,
  },
  {
    level: 11,
    hd: 9,
    bab: 6,
    fort: 6,
    ref: 6,
    will: 3,
    natArmor: 6,
    strDex: 3,
    bonusTricks: 4,
  },
  {
    level: 12,
    hd: 10,
    bab: 7,
    fort: 7,
    ref: 7,
    will: 3,
    natArmor: 8,
    strDex: 4,
    bonusTricks: 5,
  },
  {
    level: 13,
    hd: 11,
    bab: 8,
    fort: 7,
    ref: 7,
    will: 3,
    natArmor: 8,
    strDex: 4,
    bonusTricks: 5,
  },
  {
    level: 14,
    hd: 12,
    bab: 9,
    fort: 8,
    ref: 8,
    will: 4,
    natArmor: 8,
    strDex: 4,
    bonusTricks: 5,
    special: "Ability score increase",
  },
  {
    level: 15,
    hd: 12,
    bab: 9,
    fort: 8,
    ref: 8,
    will: 4,
    natArmor: 10,
    strDex: 5,
    bonusTricks: 6,
    special: "Improved evasion",
  },
  {
    level: 16,
    hd: 13,
    bab: 9,
    fort: 8,
    ref: 8,
    will: 4,
    natArmor: 10,
    strDex: 5,
    bonusTricks: 6,
  },
  {
    level: 17,
    hd: 14,
    bab: 10,
    fort: 9,
    ref: 9,
    will: 4,
    natArmor: 10,
    strDex: 5,
    bonusTricks: 6,
  },
  {
    level: 18,
    hd: 15,
    bab: 11,
    fort: 9,
    ref: 9,
    will: 5,
    natArmor: 12,
    strDex: 6,
    bonusTricks: 7,
  },
  {
    level: 19,
    hd: 15,
    bab: 11,
    fort: 9,
    ref: 9,
    will: 5,
    natArmor: 12,
    strDex: 6,
    bonusTricks: 7,
  },
  {
    level: 20,
    hd: 16,
    bab: 12,
    fort: 10,
    ref: 10,
    will: 5,
    natArmor: 12,
    strDex: 6,
    bonusTricks: 7,
    special: "Ability score increase",
  },
];

/** The companion stat row for an effective level, clamped to 1-20. */
export function companionRow(level: number): CompanionRow {
  const L = Math.max(1, Math.min(20, Math.floor(level || 1)));
  return COMPANION_TABLE[L - 1];
}
