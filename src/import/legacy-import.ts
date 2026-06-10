/**
 * Legacy import — converts the old Meta Bind sheet's frontmatter (sheet
 * note + config note) into a CharacterRecord. Lenient by design: the old
 * data carries empty strings, string numbers, missing tuple elements, and
 * fields that disagree between the two notes. Conflicts are resolved
 * toward the value the user most likely intends (the config note's class
 * levels match the character's XP; the sheet's were stale) and every
 * resolution is surfaced as a warning.
 */

import { num } from "../calc/abilities";
import type {
  AbilityKey,
  CharacterRecord,
  ClassEntry,
  ResourcePool,
  SkillEntry,
} from "../types/character";
import { createDefaultCharacter } from "../types/character";

export interface LegacyImportInput {
  id: string;
  name: string;
  characterType: "pc" | "familiar";
  sheet: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface LegacyImportResult {
  record: CharacterRecord;
  warnings: string[];
}

/** "paladin (unchained)" -> "paladinunchained", matching the old safe-name scheme. */
function safeName(className: string): string {
  return className.toLowerCase().replace(/\s+/g, "").replace(/[()]/g, "");
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** Old select values occasionally hold the whole option list ("A|B|C"). */
function selectValue(value: unknown, fallback: string, warnings: string[], field: string): string {
  const s = str(value, fallback);
  if (s.includes("|")) {
    const first = s.split("|")[0];
    warnings.push(`${field} held an option list ("${s}"); took "${first}"`);
    return first;
  }
  return s;
}

function importSkills(
  raw: unknown,
  warnings: string[]
): Record<string, SkillEntry> {
  const out: Record<string, SkillEntry> = {};
  if (!raw || typeof raw !== "object") {
    warnings.push("No skills found on the sheet note");
    return out;
  }
  for (const [name, tuple] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(tuple) || tuple.length < 3) {
      warnings.push(`Skill "${name}" has an unrecognized shape; skipped`);
      continue;
    }
    const [ability, ranks, a, b] = tuple as unknown[];
    // 4-element form: [ability, ranks, otherBonus, isClassSkill];
    // 3-element form drops otherBonus.
    const hasOther = typeof a === "number";
    out[name] = {
      ability: String(ability).toLowerCase() as AbilityKey,
      ranks: num(ranks),
      misc: hasOther ? num(a) : 0,
      classSkill: bool(hasOther ? b : a),
    };
  }
  return out;
}

interface PoolSpec {
  id: string;
  name: string;
  currentKeys: string[];
  maxKeys: string[];
  footer?: (sheet: Record<string, unknown>, config: Record<string, unknown>) => string | undefined;
}

const POOL_SPECS: PoolSpec[] = [
  {
    id: "layOnHands",
    name: "Lay on Hands",
    currentKeys: ["layOnHandsCurrent"],
    maxKeys: ["layOnHandsMax"],
    footer: (s, c) => {
      const n = num(c.lohAmount ?? s.lohAmount);
      return n ? `${n}d6 (+4 self)` : undefined;
    },
  },
  {
    id: "channelEnergy",
    name: "Channel Energy",
    currentKeys: ["channelEnergyCurrent"],
    maxKeys: ["channelEnergyMax"],
    footer: (s, c) => {
      const n = num(c.ceAmount ?? s.ceAmount);
      return n ? `${n}d6 (+4 self)` : undefined;
    },
  },
  {
    id: "smiteEvil",
    name: "Smite Evil",
    currentKeys: ["smiteEvilCurrent"],
    maxKeys: ["smiteEvilMax"],
  },
  {
    id: "weaponSongRounds",
    name: "Weapon Song",
    currentKeys: ["weaponSongRoundsCurrent"],
    maxKeys: ["weaponSongRoundsMax"],
  },
  {
    id: "plumeOfPanache",
    name: "Plume of Panache",
    currentKeys: ["plumeofPanacheCurrent", "plumeOfPanacheCurrent"],
    maxKeys: ["plumeOfPanacheMax"],
  },
  {
    id: "quickrunners",
    name: "Quickrunner's Shirt",
    currentKeys: ["quickrunnersCurrent"],
    maxKeys: ["quickrunnersMax"],
  },
  {
    id: "layOnPaws",
    name: "Lay on Paws",
    currentKeys: ["layOnPawsCurrent"],
    maxKeys: ["layOnPawsMax"],
  },
];

/**
 * Resolve a numeric field that may exist on both notes. The config note
 * wins (its values matched the rendered display); disagreement warns.
 */
function dual(
  field: string,
  sheet: Record<string, unknown>,
  config: Record<string, unknown>,
  warnings: string[]
): number | undefined {
  const inConfig = field in config && config[field] !== "" && config[field] != null;
  const inSheet = field in sheet && sheet[field] !== "" && sheet[field] != null;
  if (!inConfig && !inSheet) return undefined;
  const cv = inConfig ? num(config[field]) : undefined;
  const sv = inSheet ? num(sheet[field]) : undefined;
  if (cv !== undefined && sv !== undefined && cv !== sv) {
    warnings.push(`${field}: config note says ${cv}, sheet note says ${sv}; used ${cv}`);
  }
  return cv ?? sv;
}

export function importLegacy(input: LegacyImportInput): LegacyImportResult {
  const { sheet, config } = input;
  const warnings: string[] = [];
  const record = createDefaultCharacter(input.id, input.name);
  record.characterType = input.characterType;

  // --- identity ---
  const race = config.race as Record<string, unknown> | undefined;
  record.race = str(config.raceChoice, str(race?.type as string));
  const baseSpeed = str(race?.base_speed as string, "30");
  record.speed = `${baseSpeed}ft`;
  if (typeof sheet.banner === "string") record.bannerImage = sheet.banner;

  // --- abilities ---
  record.baseAbilities = {
    str: num(sheet.str),
    dex: num(sheet.dex),
    con: num(sheet.con),
    int: num(sheet.int),
    wis: num(sheet.wis),
    cha: num(sheet.cha),
  };

  // --- classes: names from config.classes, levels from `${safeName}Level`.
  // Both notes carry level keys and historically disagree; the config note
  // matches the character's XP, so it wins (warned).
  const classes: ClassEntry[] = [];
  const classNames = Array.isArray(config.classes) ? (config.classes as string[]) : [];
  for (const className of classNames) {
    const key = `${safeName(className)}Level`;
    const level = dual(key, sheet, config, warnings);
    classes.push({ className, level: level ?? 0 });
  }
  record.classes = classes;
  if (classNames.length === 0 && input.characterType === "familiar") {
    const bab = dual("bab", sheet, config, warnings);
    if (bab !== undefined) {
      record.babOverride = bab;
      warnings.push(`No classes; babOverride set to ${bab} (master-synced value)`);
    }
  }

  // --- hp ---
  record.hp = {
    current: num(sheet.hp),
    max: num(sheet.hpMax),
    temp: num(sheet.tmpHp),
  };

  // --- ac ---
  record.ac = {
    natural: num(sheet.naturalAC),
    dodge: num(sheet.dodgeAC),
    deflection: num(sheet.deflectionAC),
    sizeMod: num(sheet.sizeMod),
    showCMBCMD: bool(sheet.showCMBCMD),
  };

  // --- energy resistance ---
  if (sheet.energyRes && typeof sheet.energyRes === "object") {
    for (const [kind, value] of Object.entries(sheet.energyRes as Record<string, unknown>)) {
      record.energyRes[kind] = num(value);
    }
  }

  // --- initiative ---
  record.initiative = {
    miscBonus: num(sheet.initOther),
    familiarBonus: num(sheet.initFamilarBonus),
  };

  // --- toggles ---
  record.toggles = {
    powerAttack: bool(sheet.powerAttack),
    fightingDefensively: bool(sheet.fightingDefensively),
    craneStyle: bool(sheet.craneStyle),
    agileWeapon: bool(sheet.agileWeapon),
    flurryOfBlows: bool(sheet.flurryOfBlows),
    flanking: bool(sheet.flanking),
    charging: bool(sheet.charging),
    smiteEvil: bool(sheet.smiteEvil),
    smiteEvilOutsider: bool(sheet.smiteEvilOutsider),
    preciseStrike: bool(sheet.preciseStrike),
    doublePreciseStrike: bool(sheet.doublePreciseStrike),
    versatilePerformance: bool(sheet.versatilePerformance),
    weaponSong: selectValue(sheet.weaponSong, "Off", warnings, "weaponSong"),
    rangedAttackStyle: selectValue(sheet.rangedAttackStyle, "Longbow", warnings, "rangedAttackStyle"),
  };

  // --- enhancements ---
  record.enhancements = {
    meleeWeapon: num(sheet.meleeWeaponEnhancement),
    rangedWeapon: num(sheet.rangedWeaponEnhancement),
    resistance: num(sheet.resistanceEnhancement),
  };

  // --- adjustments ---
  record.adjustments = {
    atk: num(sheet.atkAdjust),
    dmg: num(sheet.dmgAdjust),
    rangedAtk: num(sheet.rangedAtkAdjust),
    rangedDmg: num(sheet.rangedDmgAdjust),
    unarmedAtk: num(sheet.unarmedAtkAdjust),
    unarmedDmg: num(sheet.unarmedDmgAdjust),
    ac: num(sheet.acAdjust),
    init: num(sheet.initAdjust),
    skill: num(sheet.skillAdjust),
    ability: {
      str: num(sheet.strAdjust), dex: num(sheet.dexAdjust), con: num(sheet.conAdjust),
      int: num(sheet.intAdjust), wis: num(sheet.wisAdjust), cha: num(sheet.chaAdjust),
    },
    drain: {
      str: num(sheet.strDrain), dex: num(sheet.dexDrain), con: num(sheet.conDrain),
    },
    damage: {
      str: num(sheet.strDamage), dex: num(sheet.dexDamage),
    },
    negativeLevels: num(sheet.negativeLevels),
  };

  // --- save notes (hardcoded text in the old MiniSheetSaves block) ---
  if (input.characterType === "pc") {
    record.saveNotes = {
      fort: "- +2 against death effects",
      ref: "- +2 against death effects\n- Evasion",
      will: "- +2 against death effects",
    };
  }

  // --- conditions / buffs ---
  record.conditions = Array.isArray(sheet.conditions) ? (sheet.conditions as string[]) : [];
  record.buffs = Array.isArray(sheet.buffs) ? (sheet.buffs as string[]) : [];
  record.bofChoice = str(sheet.bofChoice);

  // --- panache (split across notes with disagreeing values) ---
  const panacheCurrent = dual("panacheCurrent", sheet, config, warnings);
  const panachePoints = dual("panachePoints", sheet, config, warnings);
  const panacheMax = dual("panacheMax", sheet, config, warnings);
  record.panache = {
    current: panacheCurrent ?? panachePoints ?? 0,
    max: panacheMax ?? 0,
  };
  if (panacheCurrent !== undefined && panachePoints !== undefined && panacheCurrent !== panachePoints) {
    warnings.push(
      `panacheCurrent (${panacheCurrent}) and panachePoints (${panachePoints}) disagree; used ${panacheCurrent}`
    );
  }

  // --- skills ---
  record.skills = importSkills(sheet.skills, warnings);

  // --- resources ---
  const resources: ResourcePool[] = [];
  for (const spec of POOL_SPECS) {
    let current: number | undefined;
    for (const key of spec.currentKeys) {
      current = current ?? dual(key, sheet, config, warnings);
    }
    let max: number | undefined;
    for (const key of spec.maxKeys) {
      max = max ?? dual(key, sheet, config, warnings);
    }
    if (max === undefined && current === undefined) continue;
    resources.push({
      id: spec.id,
      name: spec.name,
      current: current ?? 0,
      max: max ?? 0,
      footer: spec.footer?.(sheet, config),
    });
  }
  record.resources = resources;

  // --- spell slots (minimal: the old spellbook computed maxima; only
  // current counts live in frontmatter, so max defaults to current) ---
  for (const [key, value] of Object.entries(sheet)) {
    const m = key.match(/^level(\d+)SpellSlotsCurrent$/);
    if (!m) continue;
    const lvl = Number(m[1]);
    const current = num(value);
    resources.push({
      id: `spellSlotsL${lvl}`,
      name: `Level ${lvl} Slots`,
      current,
      max: Math.max(current, 1),
    });
    warnings.push(
      `Spell slot max for level ${lvl} is not stored in frontmatter; defaulted to ${Math.max(current, 1)} — adjust in config`
    );
  }

  // --- weapons ---
  record.weapons = [
    {
      id: "melee",
      name: input.characterType === "familiar" ? "Bite" : "Waveblade",
      kind: "melee",
      damageDie: "1d6",
      critRange: "18-20",
      critMult: "2",
    },
  ];

  return { record, warnings };
}
