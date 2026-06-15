/**
 * PF1e condition/buff effects calculator — clean port of condition-buff-calculator.js.
 * Pure calculation; no Obsidian imports.
 *
 * Given active conditions and buffs, computes numeric adjustments to stats,
 * AC, attacks, saves, skills, etc., plus display notes for the UI.
 *
 * Note: the legacy `processNegativeLevels` also wrote the HP penalty directly
 * to frontmatter via Meta Bind's setMetadata. That side effect is dropped here —
 * the caller/store layer is responsible for applying `hpMaxAdjust` to HP.
 */

export interface ConditionInput {
  conditions?: string[];
  buffs?: string[];
  negativeLevels?: number;
  bofChoice?: string;
}

export interface ConditionEffects {
  meleeAtkAdjust: number;
  rangedAtkAdjust: number;
  /** Attack-bonus modifiers for extra attacks (0 = at full BAB). */
  extraAttacks: number[];
  cmb: number;
  cmd: number;
  acAdjust: number;
  touchAcAdjust: number;
  ffAcAdjust: number;
  fortAdjust: number;
  refAdjust: number;
  willAdjust: number;
  hpMaxAdjust: number;
  strAdjust: number;
  dexAdjust: number;
  conAdjust: number;
  intAdjust: number;
  wisAdjust: number;
  chaAdjust: number;
  conSkillAdjust: number;
  intSkillAdjust: number;
  wisSkillAdjust: number;
  chaSkillAdjust: number;
  skillAdjust: number;
  /** Effective-level penalty from negative levels (positive number). */
  levelAdjust: number;
  perceptionAdjust: number;
  strSkillAdjust: number;
  dexSkillAdjust: number;
  /** Speed multiplier (1 = normal, 0.5 = half, 1.5 = hasted, 0 = immobile). */
  movementAdjust: number;
  sizeAdjust: number;
  naturalArmorAdjust: number;
  damageAdjust: number;
  reachAdjust: number;
  canAct: boolean;
  canFullRound: boolean;
  canStandard: boolean;
  canMove: boolean;
  canAttack: boolean;
  canCast: boolean;
  miss50: boolean;
  helpless: boolean;
  flatFooted: boolean;
  loseDexToAC: boolean;
  conditionNotes: string;
  buffNotes: string;
}

/** Default (no conditions/buffs) effects object. */
export function createDefaultEffects(): ConditionEffects {
  return {
    meleeAtkAdjust: 0,
    rangedAtkAdjust: 0,
    extraAttacks: [],
    cmb: 0,
    cmd: 0,
    acAdjust: 0,
    touchAcAdjust: 0,
    ffAcAdjust: 0,
    fortAdjust: 0,
    refAdjust: 0,
    willAdjust: 0,
    hpMaxAdjust: 0,
    strAdjust: 0,
    dexAdjust: 0,
    conAdjust: 0,
    intAdjust: 0,
    wisAdjust: 0,
    chaAdjust: 0,
    conSkillAdjust: 0,
    intSkillAdjust: 0,
    wisSkillAdjust: 0,
    chaSkillAdjust: 0,
    skillAdjust: 0,
    levelAdjust: 0,
    perceptionAdjust: 0,
    strSkillAdjust: 0,
    dexSkillAdjust: 0,
    movementAdjust: 1.0,
    sizeAdjust: 0,
    naturalArmorAdjust: 0,
    damageAdjust: 0,
    reachAdjust: 0,
    canAct: true,
    canFullRound: true,
    canStandard: true,
    canMove: true,
    canAttack: true,
    canCast: true,
    miss50: false,
    helpless: false,
    flatFooted: false,
    loseDexToAC: false,
    conditionNotes: "",
    buffNotes: "",
  };
}

type ConditionHandler = (effects: ConditionEffects, notes: string[]) => void;
type BuffHandler = (
  effects: ConditionEffects,
  notes: string[],
  buffs: string[],
  bofChoice: string,
) => void;

/** Condition handlers — keyed by exact (lowercase) condition name, as in legacy. */
const CONDITION_EFFECTS: Record<string, ConditionHandler> = {
  prone: (effects, notes) => {
    effects.meleeAtkAdjust -= 4;
    effects.rangedAtkAdjust -= 4;
    effects.acAdjust -= 4;
    effects.touchAcAdjust -= 4;
    effects.ffAcAdjust -= 4;
    notes.push(
      "- Prone: +4 AC vs ranged attacks, -4 vs melee; can't use ranged except crossbows",
    );
  },

  blinded: (effects, notes) => {
    effects.acAdjust -= 2;
    effects.loseDexToAC = true;
    effects.meleeAtkAdjust -= 4;
    effects.rangedAtkAdjust -= 4;
    effects.strSkillAdjust -= 4;
    effects.dexSkillAdjust -= 4;
    effects.perceptionAdjust -= 4;
    effects.miss50 = true;
    effects.movementAdjust = 0.5;
    notes.push(
      "- Blinded: All sight-based checks auto-fail, 50% miss chance, half speed",
    );
  },

  dazed: (effects, notes) => {
    effects.canAct = false;
    effects.canFullRound = false;
    effects.canStandard = false;
    effects.canMove = false;
    effects.canAttack = false;
    effects.canCast = false;
    notes.push("- Dazed: Cannot take actions, no penalty to AC");
  },

  staggered: (effects, notes) => {
    effects.canFullRound = false;
    notes.push(
      "- Staggered: Can take only a single move OR standard action each round",
    );
  },

  stunned: (effects, notes) => {
    effects.canAct = false;
    effects.canFullRound = false;
    effects.canStandard = false;
    effects.canMove = false;
    effects.canAttack = false;
    effects.canCast = false;
    effects.acAdjust -= 2;
    effects.touchAcAdjust -= 2;
    effects.ffAcAdjust -= 2;
    effects.loseDexToAC = true;
    effects.flatFooted = true;
    notes.push(
      "- Stunned: Drop items, can't act, -2 AC, lose Dex to AC. Attackers get +4 to CMB",
    );
  },

  shaken: (effects, notes) => {
    effects.meleeAtkAdjust -= 2;
    effects.rangedAtkAdjust -= 2;
    effects.cmb -= 2;
    effects.fortAdjust -= 2;
    effects.refAdjust -= 2;
    effects.willAdjust -= 2;
    effects.skillAdjust -= 2;
    notes.push(
      "- Shaken: -2 penalty on attacks, saves, skills, and ability checks",
    );
  },

  paralyzed: (effects, notes) => {
    effects.canAct = false;
    effects.canFullRound = false;
    effects.canStandard = false;
    effects.canMove = false;
    effects.canAttack = false;
    effects.canCast = false;
    effects.helpless = true;
    effects.strAdjust -= 10;
    effects.dexAdjust -= 10;
    notes.push(
      "- Paralyzed: Frozen in place, helpless, cannot move, STR & DEX = 0; mental actions only",
    );
  },

  grappled: (effects, notes) => {
    effects.dexAdjust -= 4;
    effects.meleeAtkAdjust -= 2;
    effects.rangedAtkAdjust -= 2;
    effects.cmb -= 2;
    effects.cmd -= 2;
    effects.movementAdjust = 0;
    notes.push(
      "- Grappled: -2 attacks, -4 DEX, can't move, no stealth, can't cast with somatic components unless concentration check",
    );
  },

  "flat-footed": (effects, notes) => {
    effects.flatFooted = true;
    effects.loseDexToAC = true;
    notes.push(
      "- Flat-Footed: Lose DEX bonus to AC, cannot make AoO (unless Combat Reflexes)",
    );
  },

  nauseated: (effects, notes) => {
    effects.canAttack = false;
    effects.canCast = false;
    effects.canFullRound = false;
    effects.canStandard = false;
    effects.canMove = true;
    notes.push(
      "- Nauseated: Can't attack, cast, concentrate, or do anything requiring attention. Only a single move action per turn",
    );
  },

  sickened: (effects, notes) => {
    effects.meleeAtkAdjust -= 2;
    effects.rangedAtkAdjust -= 2;
    effects.fortAdjust -= 2;
    effects.refAdjust -= 2;
    effects.willAdjust -= 2;
    effects.skillAdjust -= 2;
    notes.push(
      "- Sickened: -2 penalty on attack rolls, weapon damage rolls, saving throws, skill checks, and ability checks",
    );
  },

  frightened: (effects, notes) => {
    effects.meleeAtkAdjust -= 2;
    effects.rangedAtkAdjust -= 2;
    effects.cmb -= 2;
    effects.fortAdjust -= 2;
    effects.refAdjust -= 2;
    effects.willAdjust -= 2;
    effects.skillAdjust -= 2;
    notes.push(
      "- Frightened: -2 penalty on attacks, saves, skills, and ability checks; must flee from fear source if possible",
    );
  },

  panicked: (effects, notes) => {
    effects.meleeAtkAdjust -= 2;
    effects.rangedAtkAdjust -= 2;
    effects.cmb -= 2;
    effects.fortAdjust -= 2;
    effects.refAdjust -= 2;
    effects.willAdjust -= 2;
    effects.skillAdjust -= 2;
    notes.push(
      "- Panicked: -2 penalty on attacks, saves, skills, and ability checks; drop held items, flee randomly from all dangers",
    );
  },

  deafened: (_effects, notes) => {
    notes.push(
      "- Deafened: -4 initiative checks, auto-fail Listen checks, 20% spell failure for verbal components",
    );
  },

  exhausted: (effects, notes) => {
    effects.strAdjust -= 6;
    effects.dexAdjust -= 6;
    effects.movementAdjust = 0.5;
    effects.canFullRound = false;
    notes.push(
      "- Exhausted: -6 STR and DEX, half speed, can't run or charge; 1 hour rest makes fatigued",
    );
  },

  fatigued: (effects, notes) => {
    effects.strAdjust -= 2;
    effects.dexAdjust -= 2;
    effects.canFullRound = false;
    notes.push(
      "- Fatigued: -2 STR and DEX, can't run or charge; doing fatiguing activity makes exhausted",
    );
  },

  entangled: (effects, notes) => {
    effects.meleeAtkAdjust -= 2;
    effects.rangedAtkAdjust -= 2;
    effects.dexAdjust -= 4;
    effects.movementAdjust = 0.5;
    effects.canFullRound = false;
    notes.push(
      "- Entangled: -2 attack rolls, -4 DEX, half speed, can't run/charge; concentration check DC 15+spell level to cast",
    );
  },

  helpless: (effects, notes) => {
    effects.helpless = true;
    effects.dexAdjust -= 10;
    effects.loseDexToAC = true;
    notes.push(
      "- Helpless: DEX = 0, attackers get +4 melee bonus, subject to coup de grace, rogues can sneak attack",
    );
  },

  confused: (_effects, notes) => {
    notes.push(
      "- Confused: Roll d% each turn: 01-10 attack caster, 11-20 act normal, 21-50 babble, 51-70 flee, 71-100 attack nearest creature",
    );
  },
};

/** Shared handler for "enlarged" / "enlarge person". */
function processEnlarged(effects: ConditionEffects, notes: string[]): void {
  effects.sizeAdjust += 1;
  effects.strAdjust += 2;
  effects.dexAdjust -= 2;
  effects.meleeAtkAdjust -= 1;
  effects.rangedAtkAdjust -= 1;
  effects.acAdjust -= 1;
  effects.touchAcAdjust -= 1;
  effects.ffAcAdjust -= 1;
  effects.cmb += 1;
  effects.cmd += 1;
  effects.reachAdjust += 5;
  notes.push(
    "- Enlarged: +2 STR, -2 DEX, -1 attack/AC, +1 CMB/CMD, reach +5ft, -4 Stealth, larger weapon damage",
  );
}

/**
 * Blessing of fervor — note always includes the Meta Bind choice selector;
 * mechanical effect depends on the chosen option. The Extra Attack option
 * does not stack with haste.
 *
 * Quirk preserved from legacy: "+30ft. Speed", "Stand as Swift", and "Extra
 * Attack" prepend "\n" before "Current Effect", but "+2 Atk/AC/Reflex" and
 * "Free Metamagic" do not.
 */
function processBlessingOfFervor(
  effects: ConditionEffects,
  notes: string[],
  buffs: string[],
  bofChoice: string,
): void {
  let bofNote =
    "- Blessing of Fervor:\n`INPUT\\[inlineSelect(option(+30ft. Speed), option(Stand as Swift), option(Extra Attack), option(+2 Atk/AC/Reflex), option(Free Metamagic)):bofChoice\\]`";

  const hasHaste = buffs.includes("haste") || buffs.includes("hasted");

  switch (bofChoice) {
    case "+30ft. Speed":
      effects.movementAdjust += 0.5; // Adds 30ft to base speed
      bofNote += "\nCurrent Effect: +30 feet enhancement bonus to speed";
      break;

    case "Stand as Swift":
      // No mechanical effect — special action only
      bofNote += "\nCurrent Effect: Can stand from prone as a swift action";
      break;

    case "Extra Attack":
      if (!hasHaste) {
        effects.extraAttacks.push(0);
      }
      bofNote +=
        "\nCurrent Effect: One extra attack at highest base attack bonus. Does not stack with haste.";
      break;

    case "+2 Atk/AC/Reflex":
      effects.meleeAtkAdjust += 2;
      effects.rangedAtkAdjust += 2;
      effects.acAdjust += 2;
      effects.touchAcAdjust += 2;
      effects.refAdjust += 2;
      bofNote +=
        "Current Effect: +2 competence bonus to attack rolls, AC, and Reflex saves";
      break;

    case "Free Metamagic":
      // No mechanical effect — affects spellcasting only
      bofNote +=
        "Current Effect: Apply metamagic (enlarged, extended, silent, or still) to 2nd level or lower spell for free.";
      break;

    default:
      if (bofChoice) {
        bofNote += `\n  - Current Effect: ${bofChoice} (effect not recognized)`;
      }
      break;
  }

  notes.push(bofNote);
}

/**
 * Buff handlers — RAW FIX (2026-06): only machinery that is not
 * modifier-shaped remains here (size/reach, the BoF choice, haste's speed
 * and extra attack). Plain stat buffs live in src/data/buffs.ts as typed
 * modifiers and resolve through the modifier engine in computeAll.
 */
const BUFF_EFFECTS: Record<string, BuffHandler> = {
  enlarged: (effects, notes) => processEnlarged(effects, notes),

  "enlarge person": (effects, notes) => processEnlarged(effects, notes),

  "blessing of fervor": (effects, notes, buffs, bofChoice) =>
    processBlessingOfFervor(effects, notes, buffs, bofChoice),

  haste: (effects) => {
    // The +1s are typed modifiers in the buff registry; speed and the
    // extra attack stay here. RAW FIX (2026-06): haste always grants its
    // extra attack — the legacy handlers each deferred to the other, so
    // haste + BoF "Extra Attack" produced ZERO extra attacks (captured
    // fixture); BoF's handler still skips when haste is active, so the
    // two sources correctly yield exactly one.
    effects.movementAdjust = 1.5;
    effects.extraAttacks.push(0);
  },
};

/**
 * Negative levels: -1 per level on attacks, CMB/CMD, saves, and skills,
 * -5 max HP per level, and +1 levelAdjust (effective-level penalty) per level.
 *
 * The legacy version also wrote the HP penalty straight to the character's
 * `hp` frontmatter via Meta Bind. That side effect is intentionally dropped;
 * the caller/store layer applies HP changes in the new architecture.
 */
function processNegativeLevels(
  effects: ConditionEffects,
  conditionNotes: string[],
  negativeLevels: number,
): void {
  if (negativeLevels <= 0) return;

  effects.meleeAtkAdjust -= negativeLevels;
  effects.rangedAtkAdjust -= negativeLevels;
  effects.cmb -= negativeLevels;
  effects.cmd -= negativeLevels;
  effects.fortAdjust -= negativeLevels;
  effects.refAdjust -= negativeLevels;
  effects.willAdjust -= negativeLevels;
  effects.skillAdjust -= negativeLevels;
  effects.strSkillAdjust -= negativeLevels;
  effects.dexSkillAdjust -= negativeLevels;
  effects.conSkillAdjust -= negativeLevels;
  effects.intSkillAdjust -= negativeLevels;
  effects.wisSkillAdjust -= negativeLevels;
  effects.chaSkillAdjust -= negativeLevels;

  const hpPenalty = negativeLevels * 5;
  effects.hpMaxAdjust -= hpPenalty;

  conditionNotes.push(
    `- Negative Levels (${negativeLevels}): -${negativeLevels} penalty on all d20 rolls, -${hpPenalty} HP, and -1 to effective level per negative level`,
  );
  effects.levelAdjust = negativeLevels;
}

/**
 * Calculate combined effects of active conditions, buffs, and negative levels.
 * Unrecognized condition/buff names are ignored (exact-match lookup, same as legacy).
 */
export function calculateConditionEffects(
  input: ConditionInput,
): ConditionEffects {
  const conditions = input.conditions || [];
  const buffs = input.buffs || [];
  const negativeLevels = input.negativeLevels || 0;
  const bofChoice = input.bofChoice || "";

  const effects = createDefaultEffects();
  const conditionNotes: string[] = [];
  const buffNotes: string[] = [];

  for (const condition of conditions) {
    const handler = CONDITION_EFFECTS[condition];
    if (handler) handler(effects, conditionNotes);
  }

  for (const buff of buffs) {
    const handler = BUFF_EFFECTS[buff];
    if (handler) handler(effects, buffNotes, buffs, bofChoice);
  }

  processNegativeLevels(effects, conditionNotes, negativeLevels);

  effects.conditionNotes = conditionNotes.join("\n");
  effects.buffNotes = buffNotes.join("\n");

  return effects;
}

/** All selectable condition names (the adjustments tab picker). */
export const CONDITION_NAMES = [
  "blinded",
  "confused",
  "dazed",
  "deafened",
  "entangled",
  "exhausted",
  "fatigued",
  "flat-footed",
  "frightened",
  "grappled",
  "helpless",
  "nauseated",
  "panicked",
  "paralyzed",
  "prone",
  "shaken",
  "sickened",
  "staggered",
  "stunned",
];

// (The selectable buff list moved to src/data/buffs.ts — BUFF_DEFS — when
// buffs became typed modifiers; the adjustments tab renders from there.)
