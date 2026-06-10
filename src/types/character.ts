/**
 * Character record schema — the plugin's clean data model.
 * Derived values (mods, BAB, AC, saves, attack strings, condition effects)
 * are NEVER stored; they're computed by src/calc/ from this record.
 */

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type AbilityKey = keyof AbilityScores;

export const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export interface ClassEntry {
  className: string; // key into CLASS_STATS
  level: number;
}

export interface CombatToggles {
  powerAttack: boolean;
  fightingDefensively: boolean;
  craneStyle: boolean;
  agileWeapon: boolean;
  flurryOfBlows: boolean;
  flanking: boolean;
  charging: boolean;
  smiteEvil: boolean;
  smiteEvilOutsider: boolean;
  preciseStrike: boolean;
  doublePreciseStrike: boolean;
  versatilePerformance: boolean;
  /** "Off" | "Enhancement" | "Defending" | "Flaming" | ... */
  weaponSong: string;
  /** "Shuriken" | "Longbow" | "Ray" */
  rangedAttackStyle: string;
}

export interface SkillEntry {
  ability: AbilityKey;
  ranks: number;
  misc: number;
  classSkill: boolean;
}

export interface ResourcePool {
  id: string;
  name: string;
  current: number;
  max: number;
  /** small text under the pips, e.g. "2d6 (+4 self)" */
  footer?: string;
}

export interface WeaponProfile {
  id: string;
  name: string;
  kind: "melee" | "ranged" | "unarmed";
  damageDie: string; // "" for rays (bonus damage only)
  critRange: string; // "20" | "18-20" ...
  critMult: string; // "2" | "3" ...
}

export interface HPState {
  current: number;
  max: number;
  temp: number;
}

export interface ACState {
  natural: number;
  dodge: number;
  deflection: number;
  sizeMod: number;
  showCMBCMD: boolean;
}

export interface AdjustmentState {
  atk: number;
  dmg: number;
  rangedAtk: number;
  rangedDmg: number;
  unarmedAtk: number;
  unarmedDmg: number;
  ac: number;
  init: number;
  skill: number;
  /** temporary increases/decreases to ability scores */
  ability: Partial<AbilityScores>;
  /** permanent drain */
  drain: Partial<AbilityScores>;
  /** temporary ability damage */
  damage: Partial<AbilityScores>;
  negativeLevels: number;
}

export interface EnhancementState {
  meleeWeapon: number;
  rangedWeapon: number;
  /** resistance bonus to saves (cloak of resistance etc.) */
  resistance: number;
}

export interface SharedResourceLink {
  /** resource id on this (linked) character */
  linkedResourceId: string;
  /** resource id on the master character */
  masterResourceId: string;
  /** units of master pool consumed per linked-pool unit ratio (master:linked) */
  masterUnits: number;
  linkedUnits: number;
}

export interface CharacterLink {
  masterId: string;
  /** derive hpMax from master (floor(master hpMax / 2) in the old sheet) */
  hpMaxFromMaster: boolean;
  sharedResources: SharedResourceLink[];
}

export interface RuleLink {
  /** vault path of the rules note */
  path: string;
  category?: string;
}

export interface InitiativeState {
  miscBonus: number;
  familiarBonus: number;
}

export interface CharacterRecord {
  id: string;
  name: string;
  characterType: "pc" | "familiar";
  race: string;
  bannerImage?: string;
  baseAbilities: AbilityScores;
  classes: ClassEntry[];
  /** Familiars have no classes; their BAB mirrors the master's (link wiring
   *  replaces this in the multi-character milestone). */
  babOverride?: number;
  hp: HPState;
  ac: ACState;
  energyRes: Record<string, number>;
  initiative: InitiativeState;
  speed: string;
  toggles: CombatToggles;
  enhancements: EnhancementState;
  adjustments: AdjustmentState;
  conditions: string[];
  buffs: string[];
  /** blessing of fervor choice, when that buff is active */
  bofChoice: string;
  panache: { current: number; max: number };
  /** free-text notes shown on each save's tooltip */
  saveNotes: { fort: string; ref: string; will: string };
  skills: Record<string, SkillEntry>;
  resources: ResourcePool[];
  weapons: WeaponProfile[];
  link?: CharacterLink;
  ruleLinks: RuleLink[];
}

export function defaultToggles(): CombatToggles {
  return {
    powerAttack: false,
    fightingDefensively: false,
    craneStyle: false,
    agileWeapon: false,
    flurryOfBlows: false,
    flanking: false,
    charging: false,
    smiteEvil: false,
    smiteEvilOutsider: false,
    preciseStrike: false,
    doublePreciseStrike: false,
    versatilePerformance: false,
    weaponSong: "Off",
    rangedAttackStyle: "Longbow",
  };
}

export function createDefaultCharacter(id: string, name: string): CharacterRecord {
  return {
    id,
    name,
    characterType: "pc",
    race: "",
    baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    classes: [],
    hp: { current: 0, max: 0, temp: 0 },
    ac: { natural: 0, dodge: 0, deflection: 0, sizeMod: 0, showCMBCMD: false },
    energyRes: {},
    initiative: { miscBonus: 0, familiarBonus: 0 },
    speed: "30ft",
    toggles: defaultToggles(),
    enhancements: { meleeWeapon: 0, rangedWeapon: 0, resistance: 0 },
    adjustments: {
      atk: 0,
      dmg: 0,
      rangedAtk: 0,
      rangedDmg: 0,
      unarmedAtk: 0,
      unarmedDmg: 0,
      ac: 0,
      init: 0,
      skill: 0,
      ability: {},
      drain: {},
      damage: {},
      negativeLevels: 0,
    },
    conditions: [],
    buffs: [],
    bofChoice: "",
    panache: { current: 0, max: 0 },
    saveNotes: { fort: "", ref: "", will: "" },
    skills: {},
    resources: [],
    weapons: [
      {
        id: "melee",
        name: "Melee",
        kind: "melee",
        damageDie: "1d6",
        critRange: "20",
        critMult: "2",
      },
    ],
    ruleLinks: [],
  };
}
