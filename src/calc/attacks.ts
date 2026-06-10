/**
 * PF1e attack string calculator — clean port of attack-calculator.js
 * (AttackCalculator.calculateAttackStrings). Pure function, no Obsidian imports.
 *
 * IMPORTANT: This is a characterization port. Every quirk of the legacy
 * implementation is preserved byte-for-byte, including:
 * - The condition attack adjust is DOUBLE-COUNTED: createWeaponAttack receives
 *   both `conditionAttackBonus` and `conditionAdjust`, set to the same value
 *   at every call site, and adds both into the attack bonus.
 * - Smite evil damage is double-counted again in the ray-only bonus total.
 * - Negative damage bonuses render as "1d6+-1" (template `+${bonus}`).
 * - Unarmed attacks include precise strike damage; ranged only for Shuriken.
 */

/** Condition/buff effects, as produced by the condition calculator. */
export interface ConditionEffects {
  meleeAtkAdjust?: number;
  rangedAtkAdjust?: number;
  strAdjust?: number;
  dexAdjust?: number;
  damageAdjust?: number;
  sizeAdjust?: number;
  /** Attack-penalty entries; each adds one extra attack at (base - penalty). */
  extraAttacks?: number[];
  /** The condition calculator emits many more fields; they are ignored here. */
  [key: string]: unknown;
}

/**
 * Input mirroring the legacy boundData fields. Fields run through parseInt in
 * the legacy code (levels, adjusts, enhancements, panache) accept strings,
 * since frontmatter can carry them as strings.
 */
export interface AttackInput {
  strMod?: number;
  dexMod?: number;
  chaMod?: number;
  bab?: number;
  paladinLevel?: number | string;
  monkLevel?: number | string;
  atkAdjust?: number | string;
  dmgAdjust?: number | string;
  rangedAtkAdjust?: number | string;
  rangedDmgAdjust?: number | string;
  unarmedAtkAdjust?: number | string;
  unarmedDmgAdjust?: number | string;
  meleeWeaponEnhancement?: number | string;
  rangedWeaponEnhancement?: number | string;
  smiteEvil?: boolean;
  smiteEvilOutsider?: boolean;
  charging?: boolean;
  flurryOfBlows?: boolean;
  fightingDefensively?: boolean;
  craneStyle?: boolean;
  powerAttack?: boolean;
  agileWeapon?: boolean;
  preciseStrike?: boolean;
  doublePreciseStrike?: boolean;
  flanking?: boolean;
  /** Present in frontmatter; not used by the attack calculation itself. */
  hasted?: boolean;
  rangedAttackStyle?: string;
  weaponSong?: string;
  panachePoints?: number | string;
  conditionEffects?: ConditionEffects;
}

export interface AttackStrings {
  melee: string; // legacy key: "waveblade"
  ranged: string;
  unarmed: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

interface RangedWeapon {
  name: string;
  damageDie: string;
  critRange: string;
  critMult: string;
  damageStat: number | "str";
  touchAttack: boolean;
}

const WEAPON_DATABASE: Record<string, RangedWeapon> = {
  Ray: { name: "Ray", damageDie: "", critRange: "20", critMult: "2", damageStat: 0, touchAttack: true },
  Shuriken: { name: "Shuriken", damageDie: "1d2", critRange: "20", critMult: "2", damageStat: "str", touchAttack: false },
  Longbow: { name: "Longbow", damageDie: "1d8", critRange: "20", critMult: "3", damageStat: 0, touchAttack: false },
};

interface SongValues {
  atkBonus: number;
  dmgBonus: number;
  dmgExtra: string;
  isCrit: boolean;
}

interface WeaponSongEffect {
  melee: SongValues;
  ranged: SongValues;
  notes: string[];
}

const NO_SONG: SongValues = { atkBonus: 0, dmgBonus: 0, dmgExtra: "", isCrit: false };

const WEAPON_SONG_EFFECTS: Record<string, WeaponSongEffect> = {
  Enhancement: {
    melee: { atkBonus: 1, dmgBonus: 1, dmgExtra: "", isCrit: false },
    ranged: { atkBonus: 1, dmgBonus: 1, dmgExtra: "", isCrit: false },
    notes: [],
  },
  Defending: {
    melee: NO_SONG,
    ranged: NO_SONG,
    notes: ["**Defending:** You can use the enhancement bonus as a bonus to your AC. Designate when the song begins."],
  },
  Distance: {
    melee: NO_SONG,
    ranged: NO_SONG,
    notes: ["**Distance:** Doubles the range increment of your ranged weapon."],
  },
  Flaming: {
    melee: { atkBonus: 0, dmgBonus: 0, dmgExtra: "+1d6 fire", isCrit: false },
    ranged: { atkBonus: 0, dmgBonus: 0, dmgExtra: "+1d6 fire", isCrit: false },
    notes: [],
  },
  Frost: {
    melee: { atkBonus: 0, dmgBonus: 0, dmgExtra: "+1d6 cold", isCrit: false },
    ranged: { atkBonus: 0, dmgBonus: 0, dmgExtra: "+1d6 cold", isCrit: false },
    notes: [],
  },
  "Ghost Touch": {
    melee: NO_SONG,
    ranged: NO_SONG,
    notes: ["**Ghost Touch:** Your weapon can strike incorporeal creatures without miss chance and deals full damage to them."],
  },
  Keen: {
    melee: { atkBonus: 0, dmgBonus: 0, dmgExtra: "", isCrit: true },
    ranged: { atkBonus: 0, dmgBonus: 0, dmgExtra: "", isCrit: true },
    notes: [],
  },
  "Mighty Cleaving": {
    melee: NO_SONG,
    ranged: NO_SONG,
    notes: ["**Mighty Cleaving:** If you hit your target, you can make an additional attack against another opponent within reach at the same attack bonus."],
  },
  Returning: {
    melee: NO_SONG,
    ranged: NO_SONG,
    notes: ["**Returning:** A thrown weapon returns to your hand immediately after it is thrown, allowing you to make a full attack with it."],
  },
  Shock: {
    melee: { atkBonus: 0, dmgBonus: 0, dmgExtra: "+1d6 electricity", isCrit: false },
    ranged: { atkBonus: 0, dmgBonus: 0, dmgExtra: "+1d6 electricity", isCrit: false },
    notes: [],
  },
  Seeking: {
    melee: NO_SONG,
    ranged: NO_SONG,
    notes: ["**Seeking:** Negates the miss chance for concealment (not total concealment) for ranged attacks."],
  },
};

/** Damage die step-ups per point of size increase (enlarge person etc.). */
const SIZE_LOOKUP: Record<string, string[]> = {
  "1d2": ["1d3", "1d4", "1d6"],
  "1d3": ["1d4", "1d6", "1d8"],
  "1d4": ["1d6", "1d8", "2d6"],
  "1d6": ["1d8", "2d6", "3d6"],
  "1d8": ["2d6", "3d6", "4d6"],
  "2d6": ["3d6", "4d6", "6d6"],
  "2d8": ["3d8", "4d8", "6d8"],
  "3d6": ["4d6", "6d6", "8d6"],
  "3d8": ["4d8", "6d8", "8d8"],
  "4d6": ["6d6", "8d6", "12d6"],
  "4d8": ["6d8", "8d8", "12d8"],
};

// ---------------------------------------------------------------------------
// Helpers (each mirrors a legacy method)
// ---------------------------------------------------------------------------

/** parseInt-with-fallback, matching the legacy `parseInt(x) || 0` semantics. */
function toInt(value: unknown): number {
  return parseInt(String(value)) || 0;
}

function getEnlargedDamageDie(originalDie: string, sizeAdjust: number): string {
  if (sizeAdjust <= 0) return originalDie;
  const adjustments = SIZE_LOOKUP[originalDie];
  if (!adjustments) return originalDie;
  const index = Math.min(sizeAdjust - 1, adjustments.length - 1);
  return adjustments[index];
}

function getRangedWeaponProperties(
  attackStyle: string,
  adjustedStats: { str: number }
): RangedWeapon & { damageStat: number } {
  const weapon = WEAPON_DATABASE[attackStyle] || WEAPON_DATABASE.Longbow;
  // Handle damage stat reference
  const damageStat = weapon.damageStat === "str" ? adjustedStats.str : weapon.damageStat;
  return { ...weapon, damageStat };
}

interface PowerAttackValues {
  penalty: number;
  bonus: number;
}

function getPowerAttackValues(bab: number, hasPowerAttack: boolean): PowerAttackValues {
  if (!hasPowerAttack) return { penalty: 0, bonus: 0 };
  const penalty = -1 - Math.floor(bab / 4);
  const bonus = 2 + Math.floor(bab / 4) * 2;
  return { penalty, bonus };
}

function getDefensivePenalty(isDefending: boolean, hasCraneStyle: boolean): number {
  return isDefending ? (hasCraneStyle ? -2 : -4) : 0;
}

interface SmiteEvilValues {
  atkBonus: number;
  dmgBonus: number;
  description: string;
}

function getSmiteEvilValues(
  isSmiteEvil: boolean,
  isOutsider: boolean,
  paladinLvl: number,
  chaMod: number
): SmiteEvilValues {
  if (!isSmiteEvil || paladinLvl <= 0) return { atkBonus: 0, dmgBonus: 0, description: "" };
  return {
    atkBonus: chaMod,
    dmgBonus: isOutsider ? paladinLvl * 2 : paladinLvl,
    description: isOutsider ? " (2x vs outsider)" : "",
  };
}

function getPreciseStrikeDamage(
  hasPreciseStrike: boolean,
  hasDoublePrecise: boolean,
  paladinLvl: number,
  panachePoints: number | string
): number {
  if (!hasPreciseStrike || toInt(panachePoints) <= 0) return 0;
  let damage = paladinLvl;
  if (hasDoublePrecise) damage *= 2;
  return damage;
}

/** Monk unarmed damage die progression. */
function getMonkUnarmedDie(monkLvl: number): string {
  if (monkLvl <= 0) return "1d3";
  if (monkLvl >= 12) return "2d8";
  if (monkLvl >= 8) return "2d6";
  if (monkLvl >= 4) return "1d8";
  return "1d6";
}

function formatAttackBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

/**
 * All attacks for the full-attack action: extra attacks (haste etc.) first,
 * then base (doubled/tripled by flurry), then iteratives at -5 steps.
 */
function calculateAttacks(
  baseAttackBonus: number,
  hasFlurry: boolean,
  monkLvl: number,
  bab: number,
  extraAttacks: number[] = [],
  canFlurry = true
): number[] {
  const attacks: number[] = [];

  // Extra attacks from spells/abilities (like haste, blessing of fervor)
  extraAttacks.forEach((penalty) => {
    attacks.push(baseAttackBonus - penalty);
  });

  if (hasFlurry && monkLvl > 0 && canFlurry) {
    attacks.push(baseAttackBonus, baseAttackBonus);
    if (monkLvl >= 11) attacks.push(baseAttackBonus);
  } else {
    attacks.push(baseAttackBonus);
  }

  // Iterative attacks
  for (let i = 6; i <= bab; i += 5) {
    attacks.push(baseAttackBonus - (i - 1));
  }

  return attacks;
}

interface FormattedAttackStrings {
  standard: string;
  full: string;
}

function formatAttackStrings(
  standardBonus: number,
  damageString: string,
  critInfo: string,
  attacks: number[],
  touchAttack = false
): FormattedAttackStrings {
  const touchText = touchAttack ? " (touch)" : "";
  const damageText = damageString ? ` (${damageString})` : "";
  const standard = `${formatAttackBonus(standardBonus)}${touchText}${damageText}${critInfo}`;
  const fullAttackString = attacks.map((bonus) => formatAttackBonus(bonus)).join("/");
  const full = `${fullAttackString}${touchText}${damageText}${critInfo}`;
  return { standard, full };
}

function processWeaponSong(weaponSong: string): WeaponSongEffect {
  if (weaponSong === "Off" || !WEAPON_SONG_EFFECTS[weaponSong]) {
    return { notes: [], melee: NO_SONG, ranged: NO_SONG };
  }
  return WEAPON_SONG_EFFECTS[weaponSong];
}

interface WeaponAttackParams {
  baseAttackBonus: number;
  attackStat: number;
  damageStat: number;
  damageDie: string;
  critRange: string;
  critMultiplier: string;
  powerAttackValues: PowerAttackValues;
  defensivePenalty: number;
  smiteEvilValues: SmiteEvilValues;
  preciseStrikeDamage: number;
  enhancementBonus: number;
  atkAdjust: number;
  dmgAdjust: number;
  chargeBonus: number;
  flankingBonus: number;
  /** QUIRK: both of these carry the same condition adjust — both are added. */
  conditionAttackBonus: number;
  conditionAdjust: number;
  conditionDamageBonus: number;
  weaponSongValues: SongValues;
}

interface WeaponAttack {
  attackBonus: number;
  damageString: string;
  critInfo: string;
}

function createWeaponAttack(params: WeaponAttackParams): WeaponAttack {
  // NOTE: conditionAttackBonus and conditionAdjust are the same value at every
  // call site — the legacy code double-counts it, and so do we.
  const attackBonus =
    params.baseAttackBonus + params.attackStat + params.powerAttackValues.penalty +
    params.defensivePenalty + params.enhancementBonus + params.conditionAttackBonus +
    params.atkAdjust + params.smiteEvilValues.atkBonus + params.chargeBonus + params.flankingBonus +
    params.conditionAdjust + params.weaponSongValues.atkBonus;

  const damageBonus =
    params.damageStat + params.powerAttackValues.bonus + params.preciseStrikeDamage +
    params.enhancementBonus + params.dmgAdjust + params.smiteEvilValues.dmgBonus +
    params.weaponSongValues.dmgBonus + params.conditionDamageBonus;

  // Create damage string
  let damageString: string;
  if (params.damageDie === "") {
    // For rays, show only bonus damage if any exists.
    // QUIRK: smite damage is added a second time on top of damageBonus here.
    const totalBonus = damageBonus + (params.smiteEvilValues.dmgBonus > 0 ? params.smiteEvilValues.dmgBonus : 0);
    const hasAnyDamage = totalBonus > 0 || params.smiteEvilValues.description || params.weaponSongValues.dmgExtra;
    damageString = hasAnyDamage
      ? (totalBonus > 0
          ? `+${totalBonus}${params.smiteEvilValues.description}${params.weaponSongValues.dmgExtra ? " " + params.weaponSongValues.dmgExtra : ""}`
          : `${params.smiteEvilValues.description}${params.weaponSongValues.dmgExtra ? params.weaponSongValues.dmgExtra : ""}`)
      : "";
  } else {
    damageString = `${params.damageDie}+${damageBonus}${params.smiteEvilValues.description}${params.weaponSongValues.dmgExtra ? " " + params.weaponSongValues.dmgExtra : ""}`;
  }

  // Calculate crit range with keen effects
  let critInfo: string;
  if (params.weaponSongValues.isCrit) {
    // Keen doubles the threat range
    const rangeParts = params.critRange.split("-");
    if (rangeParts.length === 2) {
      // Range like "19-20" becomes "17-20"
      const baseRange = parseInt(rangeParts[0]);
      const topRange = parseInt(rangeParts[1]);
      const threatRange = topRange - baseRange + 1; // e.g., 20-19+1 = 2
      const newBaseRange = topRange - threatRange * 2 + 1; // e.g., 20-(2*2)+1 = 17
      critInfo = ` (${newBaseRange}-${topRange}/x${params.critMultiplier})`;
    } else {
      // Range like "20" becomes "19-20"
      const baseRange = parseInt(rangeParts[0]);
      critInfo = ` (${baseRange - 1}-${baseRange}/x${params.critMultiplier})`;
    }
  } else {
    critInfo = ` (${params.critRange}/x${params.critMultiplier})`;
  }

  return { attackBonus, damageString, critInfo };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Calculate melee (legacy "waveblade"), ranged, and unarmed attack strings.
 * Faithful port of AttackCalculator.performCalculation (memoization dropped —
 * this is a pure function).
 */
export function calculateAttackStrings(input: AttackInput): AttackStrings {
  // parseInputs equivalent — preserve the legacy defaulting exactly.
  const stats = {
    str: input.strMod || 0,
    dex: input.dexMod || 0,
    cha: input.chaMod || 0,
    bab: input.bab || 0,
  };

  const levels = {
    paladin: toInt(input.paladinLevel),
    monk: toInt(input.monkLevel),
  };

  const adjustments = {
    atk: toInt(input.atkAdjust),
    dmg: toInt(input.dmgAdjust),
    rangedAtk: toInt(input.rangedAtkAdjust),
    rangedDmg: toInt(input.rangedDmgAdjust),
    unarmedAtk: toInt(input.unarmedAtkAdjust),
    unarmedDmg: toInt(input.unarmedDmgAdjust),
  };

  const enhancements = {
    melee: toInt(input.meleeWeaponEnhancement),
    ranged: toInt(input.rangedWeaponEnhancement),
  };

  const flags = {
    smiteEvil: input.smiteEvil || false,
    smiteEvilOutsider: input.smiteEvilOutsider || false,
    charging: input.charging || false,
    flurry: input.flurryOfBlows || false,
    defending: input.fightingDefensively || false,
    craneStyle: input.craneStyle || false,
    powerAttack: input.powerAttack || false,
    agileWeapon: input.agileWeapon || false,
    preciseStrike: input.preciseStrike || false,
    doublePrecise: input.doublePreciseStrike || false,
    flanking: input.flanking || false,
  };

  const options = {
    rangedStyle: input.rangedAttackStyle || "Longbow",
    weaponSong: input.weaponSong || "Off",
    panachePoints: input.panachePoints || 0,
  };

  const conditionEffects: ConditionEffects = input.conditionEffects || {
    meleeAtkAdjust: 0,
    rangedAtkAdjust: 0,
    strAdjust: 0,
    dexAdjust: 0,
    damageAdjust: 0,
    sizeAdjust: 0,
    extraAttacks: [],
  };

  const sizeAdjust = conditionEffects.sizeAdjust || 0;

  // Calculate common values
  const { notes: weaponSongNotes, melee: meleeSong, ranged: rangedSong } = processWeaponSong(options.weaponSong);
  const powerAttackValues = getPowerAttackValues(stats.bab, flags.powerAttack);
  const defensivePenalty = getDefensivePenalty(flags.defending, flags.craneStyle);
  const smiteEvilValues = getSmiteEvilValues(flags.smiteEvil, flags.smiteEvilOutsider, levels.paladin, stats.cha);
  const preciseStrikeDamage = getPreciseStrikeDamage(flags.preciseStrike, flags.doublePrecise, levels.paladin, options.panachePoints);
  const chargeBonus = flags.charging ? 2 : 0;
  const flankingBonus = flags.flanking ? 2 : 0;

  const baseParams = {
    baseAttackBonus: stats.bab,
    powerAttackValues,
    defensivePenalty,
    smiteEvilValues,
    preciseStrikeDamage,
  };

  // MELEE ATTACK (legacy: WAVEBLADE)
  const meleeAttackStat = flags.agileWeapon && stats.dex > stats.str ? stats.dex : stats.str;
  const meleeDamageStat = flags.agileWeapon && stats.dex > stats.str ? stats.dex : stats.str;

  const meleeAttack = createWeaponAttack({
    ...baseParams,
    damageDie: getEnlargedDamageDie("1d6", sizeAdjust),
    critRange: "18-20",
    critMultiplier: "2",
    attackStat: meleeAttackStat,
    damageStat: meleeDamageStat,
    enhancementBonus: enhancements.melee,
    atkAdjust: adjustments.atk,
    dmgAdjust: adjustments.dmg,
    chargeBonus,
    flankingBonus,
    conditionAdjust: conditionEffects.meleeAtkAdjust || 0,
    conditionAttackBonus: conditionEffects.meleeAtkAdjust || 0,
    conditionDamageBonus: conditionEffects.damageAdjust || 0,
    weaponSongValues: meleeSong,
  });

  const meleeAttacks = calculateAttacks(
    meleeAttack.attackBonus,
    flags.flurry,
    levels.monk,
    stats.bab,
    conditionEffects.extraAttacks || [],
    true
  );
  const meleeAttackStrings = formatAttackStrings(meleeAttack.attackBonus, meleeAttack.damageString, meleeAttack.critInfo, meleeAttacks);

  // RANGED ATTACK
  const rangedWeaponProps = getRangedWeaponProperties(options.rangedStyle, stats);
  const canUseFlurryForRanged = options.rangedStyle === "Shuriken";

  const rangedAttack = createWeaponAttack({
    ...baseParams,
    damageDie: getEnlargedDamageDie(rangedWeaponProps.damageDie, sizeAdjust),
    critRange: rangedWeaponProps.critRange,
    critMultiplier: rangedWeaponProps.critMult,
    attackStat: stats.dex,
    damageStat: rangedWeaponProps.damageStat,
    enhancementBonus: enhancements.ranged,
    atkAdjust: adjustments.rangedAtk,
    dmgAdjust: adjustments.rangedDmg,
    chargeBonus: 0,
    flankingBonus: 0,
    conditionAdjust: conditionEffects.rangedAtkAdjust || 0,
    conditionAttackBonus: conditionEffects.rangedAtkAdjust || 0,
    conditionDamageBonus: conditionEffects.damageAdjust || 0,
    preciseStrikeDamage: canUseFlurryForRanged ? preciseStrikeDamage : 0,
    weaponSongValues: rangedSong,
  });

  const rangedAttacks = calculateAttacks(
    rangedAttack.attackBonus,
    flags.flurry && canUseFlurryForRanged,
    canUseFlurryForRanged ? levels.monk : 0,
    stats.bab,
    conditionEffects.extraAttacks || [],
    canUseFlurryForRanged
  );
  const rangedAttackStrings = formatAttackStrings(
    rangedAttack.attackBonus,
    rangedAttack.damageString,
    rangedAttack.critInfo,
    rangedAttacks,
    rangedWeaponProps.touchAttack
  );

  // UNARMED ATTACK
  const unarmedAttack = createWeaponAttack({
    ...baseParams,
    damageDie: getEnlargedDamageDie(getMonkUnarmedDie(levels.monk), sizeAdjust),
    critRange: "20",
    critMultiplier: "2",
    attackStat: stats.dex,
    damageStat: stats.str,
    enhancementBonus: 0,
    atkAdjust: adjustments.unarmedAtk,
    dmgAdjust: adjustments.unarmedDmg,
    chargeBonus,
    flankingBonus,
    conditionAdjust: conditionEffects.meleeAtkAdjust || 0,
    conditionAttackBonus: conditionEffects.meleeAtkAdjust || 0,
    conditionDamageBonus: conditionEffects.damageAdjust || 0,
    weaponSongValues: NO_SONG,
  });

  const unarmedAttacks = calculateAttacks(
    unarmedAttack.attackBonus,
    flags.flurry,
    levels.monk,
    stats.bab,
    conditionEffects.extraAttacks || []
  );
  const unarmedAttackStrings = formatAttackStrings(unarmedAttack.attackBonus, unarmedAttack.damageString, unarmedAttack.critInfo, unarmedAttacks);

  // Format output
  const weaponSongNotesText =
    weaponSongNotes.length > 0 && options.weaponSong !== "Off"
      ? "\n\n**Weapon Song Effects:**\n" + weaponSongNotes.join("\n")
      : "";

  const formatWeaponOutput = (attackStrings: FormattedAttackStrings): string =>
    `**Standard Attack:** ${attackStrings.standard}\n**Full Attack:** ${attackStrings.full}`;

  return {
    melee: formatWeaponOutput(meleeAttackStrings) + weaponSongNotesText,
    ranged: formatWeaponOutput(rangedAttackStrings) + weaponSongNotesText,
    unarmed: formatWeaponOutput(unarmedAttackStrings),
  };
}
