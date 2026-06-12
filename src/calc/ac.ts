/**
 * AC / CMB / CMD — clean port of ACDisplayCalculator.calculateACValues
 * (ac-renderer.js). Pure data in/out; rendering lives in components.
 */

export interface ACConditionEffects {
  loseDexToAC?: boolean;
  flatFooted?: boolean;
  acAdjust?: number;
  touchAcAdjust?: number;
  ffAcAdjust?: number;
  cmb?: number;
  cmd?: number;
}

export interface ACInput {
  dexMod?: number;
  chaMod?: number;
  strMod?: number;
  wisMod?: number;
  sizeMod?: number;
  weaponSong?: string;
  naturalAC?: unknown;
  deflectionAC?: unknown;
  dodgeAC?: unknown;
  monkLevel?: unknown;
  /** true when a Scaled Fist archetype keys the monk AC bonus off CHA
   *  instead of WIS (the legacy sheet hardcoded CHA for every monk) */
  scaledFist?: boolean;
  /** paladin level when Virtuous Bravo is selected, 0/absent otherwise */
  bravoLevel?: unknown;
  hasted?: boolean;
  charging?: boolean;
  fightingDefensively?: boolean;
  craneStyle?: boolean;
  acAdjust?: unknown;
  bab?: number;
  conditionEffects?: ACConditionEffects;
}

export interface ACValues {
  normalAC: number;
  touchAC: number;
  flatFootedAC: number;
  cmb: number;
  cmd: number;
}

export function calculateACValues(input: ACInput): ACValues {
  let dexMod = input.dexMod || 0;
  const chaMod = input.chaMod || 0;
  const strMod = input.strMod || 0;
  const sizeMod = input.sizeMod || 0;
  const ce = input.conditionEffects || {};

  const weaponSongBonus = input.weaponSong === "Defending" ? 1 : 0;
  const baseAC = 10 + sizeMod + weaponSongBonus;
  const naturalAC = Number(input.naturalAC) || 0;
  const deflectionAC = Number(input.deflectionAC) || 0;
  const dodgeAC = Number(input.dodgeAC) || 0;

  // Monk AC bonus: WIS to AC (+1 at level 4, +1 per 4 after). Scaled Fist
  // (Draconic Might) keys it off CHA instead — the legacy renderer
  // hardcoded the CHA form for every monk (its only monk WAS a scaled
  // fist); relocated behind the archetype. Two preserved quirks: the
  // legacy CHA path adds the raw modifier even when negative, and the
  // bonus ignores armor/encumbrance (never modeled). The RAW-only WIS
  // path adds the bonus "if any" — never negative.
  const monkLvl = Number(input.monkLevel) || 0;
  const monkACStat = input.scaledFist
    ? chaMod
    : Math.max(0, Number(input.wisMod) || 0);
  let monkACBonus = monkLvl > 0 ? monkACStat : 0;
  if (monkLvl >= 4) {
    monkACBonus += 1 + Math.floor((monkLvl - 4) / 4);
  }

  // Virtuous Bravo "Nimble": dodge bonus at level 3, +1 per 4 after.
  // bravoLevel is the paladin level WHEN the archetype is selected, 0
  // otherwise — this used to be unconditional paladinLevel (the archetype
  // masquerading as base-class math); relocated behind the archetype.
  const bravoLvl = Number(input.bravoLevel) || 0;
  let bravoACBonus = 0;
  if (bravoLvl >= 3) {
    bravoACBonus += Math.floor((bravoLvl - 3) / 4) + 1;
  }

  const hastedACBonus = input.hasted ? 1 : 0;
  const chargingACPenalty = input.charging ? -2 : 0;

  // Fighting defensively: +2, +1 with Crane Style, +1 for 3+ Acrobatics
  // ranks (hardcoded assumption carried over from the old sheet).
  let fightingDefensivelyBonus = 0;
  if (input.fightingDefensively) {
    fightingDefensivelyBonus = 2;
    if (input.craneStyle) fightingDefensivelyBonus += 1;
    fightingDefensivelyBonus += 1;
  }

  const loseDexToAC = ce.loseDexToAC || ce.flatFooted || false;
  if (loseDexToAC) dexMod = 0;

  const userAcAdjust = Number(input.acAdjust) || 0;
  const normalAcAdjust = userAcAdjust + chargingACPenalty + (Number(ce.acAdjust) || 0);
  const touchAcAdjust = userAcAdjust + chargingACPenalty + (Number(ce.touchAcAdjust) || 0);
  const ffAcAdjust = userAcAdjust + chargingACPenalty + (Number(ce.ffAcAdjust) || 0);

  const normalAC =
    baseAC + dexMod + naturalAC + deflectionAC + monkACBonus + bravoACBonus +
    fightingDefensivelyBonus + dodgeAC + hastedACBonus + normalAcAdjust;
  const touchAC =
    baseAC + dexMod + deflectionAC + monkACBonus + bravoACBonus +
    fightingDefensivelyBonus + dodgeAC + hastedACBonus + touchAcAdjust;
  const flatFootedAC = baseAC + naturalAC + deflectionAC + monkACBonus + ffAcAdjust;

  const bab = input.bab || 0;
  const cmb = bab + dexMod + sizeMod + (ce.cmb || 0);
  const cmd =
    10 + bab + strMod + dexMod + sizeMod + deflectionAC + monkACBonus +
    bravoACBonus + dodgeAC + (ce.cmd || 0);

  return { normalAC, touchAC, flatFootedAC, cmb, cmd };
}
