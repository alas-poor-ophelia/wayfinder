/**
 * Character record schema — the plugin's clean data model.
 * Derived values (mods, BAB, AC, saves, attack strings, condition effects)
 * are NEVER stored; they're computed by src/calc/ from this record.
 */

import type { Modifier } from "../calc/modifiers";
// runtime import, but data/quick-actions only type-imports back — no cycle
import { defaultQuickActions } from "../data/quick-actions";
import type { InventoryState } from "./inventory";
import type { QuickActionDef, QuickActionStateMap } from "./quick-actions";
import type { SpellbookState } from "./spellbook";

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
  /**
   * Archetype ids from this class's scraped catalog
   * (src/data/archetypes/<class>.json). Multiple archetypes are legal;
   * the sheet merges their effects and never enforces overlap rules.
   */
  archetypeKeys?: string[];
}

/**
 * DEPRECATED (schema v6): every field except `rangedAttackStyle` migrated
 * into quickActions/quickActionState. The fields stay so pre-v6 saves
 * type-check; migrateData() zeroes them on load and computeAll only reads
 * them as a fallback for records that somehow miss the migration.
 * `rangedAttackStyle` is an attack-style selector, not a toggle — it lives on.
 */
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
  /** "Shuriken" | "Longbow" | "Ray" — legacy built-in style. No UI since
   *  ranged blocks went inventory-driven; kept as the calc fallback for
   *  records without equipped ranged weapons (and for old fixtures). */
  rangedAttackStyle: string;
  /** ranged block touch mode: shows the Ray math (ranged touch attack,
   *  bonus-only damage) instead of the equipped-weapon profile */
  rangedTouch?: boolean;
  /** melee block touch mode: same treatment as rangedTouch — touch attack,
   *  no weapon dice, 20/x2 (shocking grasp etc.) */
  meleeTouch?: boolean;
  /** single-block mode: the equipped weapon item id driving the block.
   *  Like rangedAttackStyle these are selectors, not toggles — they live on. */
  activeMeleeWeaponId?: string;
  /** absent/unknown = use rangedAttackStyle (built-in style) */
  activeRangedWeaponId?: string;
}

/** Combat-tab display preference per attack bucket: one block with a
 *  weapon selector, or a separate block per equipped weapon. */
export interface AttackBlockPrefs {
  melee: "single" | "separate";
  ranged: "single" | "separate";
}

export interface SkillEntry {
  ability: AbilityKey;
  ranks: number;
  misc: number;
  classSkill: boolean;
}

export type ResourceFormulaSource =
  | "classLevel"
  | "characterLevel"
  | "abilityMod"
  | "abilityScore";

/**
 * Structured max formula for a resource pool:
 *   max(minimum, floor(base * multiplier / divisor) + flatBonus)
 * where base is the referenced property. No expression parser by design —
 * the config editor builds these from dropdowns.
 */
export interface ResourceFormula {
  source: ResourceFormulaSource;
  /** for "classLevel": case-insensitive substring match on class names */
  className?: string;
  /** for "abilityMod" / "abilityScore" */
  ability?: AbilityKey;
  /** default 1 */
  multiplier?: number;
  /** default 1 */
  divisor?: number;
  /** default 0 */
  flatBonus?: number;
  /** default 0 */
  minimum?: number;
}

/**
 * Structured, live footer for a resource pool — composes a string like
 * "3d6 (+6 self)" from a dice count plus an optional per-die / flat bonus.
 * No expression parser by design (mirrors ResourceFormula): the config
 * editor builds it from dropdowns. When present it overrides the static
 * `footer` string and recomputes as levels/abilities change.
 *   "<dice>d<dieSize> (+<perDieBonus*dice + flatBonus> <bonusLabel>) <suffix>"
 */
export interface FooterFormula {
  /** dice count — reuses the resource-formula evaluator (e.g. ⌊paladin/2⌋) */
  dice: ResourceFormula;
  /** die size; omit to show a bare count instead of "NdX" */
  dieSize?: number;
  /** added per die, e.g. Fey Foundling's +2/die heal bonus */
  perDieBonus?: number;
  /** flat amount added to the parenthetical total */
  flatBonus?: number;
  /** label inside the parenthetical, e.g. "self" */
  bonusLabel?: string;
  /** trailing text, e.g. "healed" */
  suffix?: string;
}

export interface ResourcePool {
  id: string;
  name: string;
  current: number;
  max: number;
  /** small text under the pips, e.g. "2d6 (+4 self)" */
  footer?: string;
  /** live, structured footer — overrides `footer` when present */
  footerFormula?: FooterFormula;
  /** item-granted pools render on the Items tab; absent = "class" */
  kind?: "class" | "item";
  /** when present, max is recomputed by the store on every resource sync */
  formula?: ResourceFormula;
  /**
   * Derived pool: displays floor(source.current / divisor) and writes back
   * source.current = value * divisor. Replaces the old bidirectional
   * ResourceSyncManager (all pools derive from one source of truth).
   */
  derived?: {
    /** defaults to this character */
    sourceCharacterId?: string;
    sourceResourceId: string;
    divisor: number;
  };
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
  /** manual size modifier — the only size input for characters WITHOUT a
   *  raceKey. With a raceKey, size derives from race.size (small = +1)
   *  unless sizeModOverride is set. */
  sizeMod: number;
  /** explicit override of the race-derived size modifier (raceKey
   *  characters only; 0 is ambiguous between "medium" and "manual zero",
   *  hence a separate field rather than an in-band sentinel) */
  sizeModOverride?: number;
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

export interface CharacterLink {
  masterId: string;
  /** derive hpMax from master: floor(master hpMax / 2) */
  hpMaxFromMaster: boolean;
  /** familiar BAB mirrors the master's */
  babFromMaster: boolean;
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
  characterType: "pc" | "familiar" | "companion";
  race: string;
  /** canonical key into RACE_DATA (src/data/races). Absent = race is the
   *  free-text label only and racial data contributes nothing (legacy
   *  characters keep their racial bonuses baked into baseAbilities). */
  raceKey?: string;
  /** chosen ability for flexible "+2 to any one" races (human etc.) */
  raceAbilityChoice?: AbilityKey;
  /** variant heritage key (src/data/races/heritages.ts) — must name a
   *  heritage of the current raceKey; unknown/stale keys are ignored */
  raceHeritageKey?: string;
  bannerImage?: string;
  baseAbilities: AbilityScores;
  classes: ClassEntry[];
  /** Familiars have no classes; their BAB mirrors the master's (link wiring
   *  replaces this in the multi-character milestone). */
  babOverride?: number;
  /** Animal companions: effective companion level (master's druid/ranger/
   *  hunter level, or manual). Drives the Animal Companion Base Statistics
   *  table (src/data/companion.ts): BAB, saves, natural armor, Str/Dex. */
  companionLevel?: number;
  hp: HPState;
  ac: ACState;
  energyRes: Record<string, number>;
  initiative: InitiativeState;
  /** movement speed. "" = derive from race.speed (raceKey characters);
   *  any non-empty string is a manual override and the only path for
   *  characters without a raceKey (default "30ft"). */
  speed: string;
  toggles: CombatToggles;
  /** Quick Actions: per-character defs, array order = combat-tab order.
   *  Undefined only for pre-v6 records mid-session (computeAll falls back
   *  to `toggles`); the v6 migration and the store's schema-forward merge
   *  both seed it. */
  quickActions?: QuickActionDef[];
  /** active stage/variant per quick action id (stage 0/absent = off) */
  quickActionState?: QuickActionStateMap;
  enhancements: EnhancementState;
  adjustments: AdjustmentState;
  conditions: string[];
  /** active buff toggles: registry keys (src/data/buffs.ts) or custom ids */
  buffs: string[];
  /** user-defined buffs (config surface) — typed modifiers like gear */
  customBuffs?: { id: string; name: string; modifiers: Modifier[] }[];
  /** blessing of fervor choice, when that buff is active */
  bofChoice: string;
  /** DEPRECATED (schema v4): panache migrated into resources[] as a pool
   *  with id "panache". Optional only so pre-migration records type-check;
   *  migrateData() deletes it on load. */
  panache?: { current: number; max: number };
  /** free-text notes shown on each save's tooltip */
  saveNotes: { fort: string; ref: string; will: string };
  skills: Record<string, SkillEntry>;
  resources: ResourcePool[];
  /** DORMANT: attack profiles now derive from equipped inventory weapons
   *  (item.weapon stats). Kept so legacy imports/saves type-check; nothing
   *  reads it anymore. */
  weapons: WeaponProfile[];
  /** combat-tab attack block layout; absent = single for both */
  attackBlocks?: AttackBlockPrefs;
  /** combat-tab attack block fold state, keyed by block id (weapon item id,
   *  "melee-main", "ranged-main", "unarmed"). Persisted so the expanded /
   *  collapsed state survives tab swaps and reloads. Absent = all collapsed. */
  attackBlocksOpen?: Record<string, boolean>;
  link?: CharacterLink;
  ruleLinks: RuleLink[];
  /** Reference tab: pinned rule-note paths (ride the pinned rail). Absent =
   *  none pinned. Same optional/absent-default pattern as attackBlocksOpen. */
  referencePins?: string[];
  /** Reference tab: completed checklist items, keyed `${notePath}#${blockIdx}#${itemIdx}`.
   *  Persisted so a ticked item stays ticked across tab swaps and reloads.
   *  Absent = nothing ticked. */
  checklistState?: Record<string, boolean>;
  /** absent = non-caster (Hwayoung keeps her static SLA content) */
  spellbook?: SpellbookState;
  /** absent = no inventory subtab (Hwayoung). NOT in createDefaultCharacter:
   *  the schema-forward merge in store.load() would inject it everywhere. */
  inventory?: InventoryState;
  /** absent = XP not tracked; familiars never track. Same default hazard. */
  xp?: number;
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
    quickActions: defaultQuickActions(),
    quickActionState: {},
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
