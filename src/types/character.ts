/**
 * Core character data types for MiniSheet.
 * These mirror the frontmatter structure of character sheet notes.
 */

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface AbilityModifiers {
  strMod: number;
  dexMod: number;
  conMod: number;
  intMod: number;
  wisMod: number;
  chaMod: number;
}

export interface ClassLevel {
  name: string;
  level: number;
  hitDie: number;
  /** "good" or "poor" for each save */
  fortSave: "good" | "poor";
  refSave: "good" | "poor";
  willSave: "good" | "poor";
  bab: "full" | "three-quarter" | "half";
}

export interface ACComponents {
  naturalAC: number;
  dodgeAC: number;
  deflectionAC: number;
  sizeMod: number;
  acAdjust: number;
  showCMBCMD: boolean;
}

export interface HPState {
  hp: number;
  hpMax: number;
  tempHp: number;
  hpEditable: boolean;
  hpMod: number;
}

export interface SaveValues {
  fort: { value: number; notes: string };
  ref: { value: number; notes: string };
  will: { value: number; notes: string };
}

export interface ResourcePool {
  name: string;
  current: number;
  max: number;
  label?: string;
  footer?: string;
}

export interface CombatToggles {
  powerAttack: boolean;
  fightingDefensively: boolean;
  craneStyle: boolean;
  flurryOfBlows: boolean;
  weaponSong: string; // "Off" | "Inspire" | "Defending" etc.
  smite: boolean;
  smiteDouble: boolean;
  preciseStrike: boolean;
  preciseStrikeDouble: boolean;
}

export interface ConditionEffects {
  acAdjust: number;
  fortAdjust: number;
  refAdjust: number;
  willAdjust: number;
  hpMaxAdjust: number;
  naturalArmorAdjust: number;
  conditionNotes: string[];
  buffNotes: string[];
}

/** Tab indices matching minisheet_set_tab mapping */
export type TabName = "combat" | "skills" | "spells" | "reference" | "adjustments" | "settings";
export const TAB_INDEX: Record<TabName, number> = {
  combat: 1,
  skills: 2,
  spells: 3,
  reference: 4,
  adjustments: 5,
  settings: 6,
};

/**
 * Full character frontmatter shape.
 * Properties are read from the active note's frontmatter via dc.useCurrentFile().
 */
export interface Character {
  // Identity
  name: string;
  characterType: "pc" | "familiar";

  // Navigation
  selectedTab: number;

  // Ability scores
  abilities: AbilityScores;
  modifiers: AbilityModifiers;

  // Health
  hp: number;
  hpMax: number;
  tempHp: number;
  hpEditable: boolean;
  hpMod: number;

  // AC
  naturalAC: number;
  dodgeAC: number;
  deflectionAC: number;
  sizeMod: number;
  acAdjust: number;
  showCMBCMD: boolean;

  // Combat
  bab: number;
  initiative: number;
  speed: string;
  combatToggles: CombatToggles;

  // Saves
  resistanceBonus: number;

  // Status
  conditions: string[];
  buffs: string[];
  negativeLevels: number;
  conditionEffects: ConditionEffects;

  // Classes
  classes: ClassLevel[];
  totalLevel: number;

  // Resources
  resources: ResourcePool[];

  // Skills (keyed by skill name)
  skills: Record<string, { ranks: number; misc: number; classSkill: boolean }>;
}
