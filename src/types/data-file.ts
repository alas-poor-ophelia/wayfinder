import type { TabName } from "../constants";
import type { CharacterRecord } from "./character";
import { DEFAULT_CUSTOM_ITEMS_FILENAME } from "./custom-items";
import type { InventoryState } from "./inventory";

export interface UiState {
  selectedTab: TabName;
  activeCharacterId: string | null;
  /** main-pane spell database view state (filters persist like all UI state) */
  spellDb?: SpellDbState;
  /** combat tab subtab (GEAR shows for every character; empty inventories
   *  default in memory and are stored only once mutated) */
  combatSub?: "main" | "inventory";
  /** main-pane party inventory view state (persists like spellDb) */
  partyInv?: PartyInvState;
  /** main-pane equipment database view state (persists like spellDb) */
  equipDb?: EquipDbState;
}

export interface PartyInvState {
  search: string;
  type: string;
  containerFilter: string;
  owner: string;
  sortKey: "name" | "count" | "weight" | "value" | "type";
  sortDir: "asc" | "desc";
  currencyOpen: boolean;
  controlsOpen: boolean;
}

export const DEFAULT_PARTY_INV: PartyInvState = {
  search: "",
  type: "",
  containerFilter: "",
  owner: "",
  sortKey: "name",
  sortDir: "asc",
  currencyOpen: true,
  controlsOpen: true,
};

export interface SpellDbState {
  /** which section of the pane is showing (database / loadouts / metamagic) */
  section: "database" | "loadouts" | "metamagic";
  search: string;
  classes: string[];
  levels: number[];
  school: string;
  componentsFilter: string;
  source: string;
  sr: "" | "yes" | "no";
  eschewOnly: boolean;
  knownOnly: boolean;
  sortKey: string;
  sortDir: "asc" | "desc";
  page: number;
  targetCharacterId: string | null;
  /**
   * When set, the Database "Add to" target is this loadout (of the target
   * character) instead of the spellbook; +Add appends to the loadout. null =
   * add to the spellbook. Cleared when the loadout is deleted.
   */
  addLoadoutId: string | null;
  filtersOpen: boolean;
}

export const DEFAULT_SPELL_DB: SpellDbState = {
  section: "database",
  search: "",
  classes: [],
  levels: [],
  school: "",
  componentsFilter: "",
  source: "",
  sr: "",
  eschewOnly: false,
  knownOnly: false,
  sortKey: "name",
  sortDir: "asc",
  page: 0,
  targetCharacterId: null,
  addLoadoutId: null,
  filtersOpen: true,
};

export interface EquipDbState {
  section: "weapons" | "armor" | "magic" | "custom" | "forge";
  search: string;
  /** weapons: simple|martial|exotic|ammo ("" = all) */
  proficiency: string;
  /** weapons/armor category value ("" = all) */
  category: string;
  /** magic: wondrous|ring|rod ("" = all) */
  group: string;
  /** magic: body slot ("" = all) */
  slot: string;
  source: string;
  priceMin: number | null;
  priceMax: number | null;
  /** magic: only items whose bonuses were auto-derived */
  stattedOnly: boolean;
  sortKey: string;
  sortDir: "asc" | "desc";
  page: number;
  targetCharacterId: string | null;
  filtersOpen: boolean;
}

export const DEFAULT_EQUIP_DB: EquipDbState = {
  section: "weapons",
  search: "",
  proficiency: "",
  category: "",
  group: "",
  slot: "",
  source: "",
  priceMin: null,
  priceMax: null,
  stattedOnly: false,
  sortKey: "name",
  sortDir: "asc",
  page: 0,
  targetCharacterId: null,
  filtersOpen: false,
};

export interface MiniSheetSettings {
  rulesFolder: string;
  /** vault folder holding the spell notes (one markdown note per spell) */
  spellsFolder: string;
  /** vault folder holding the Path of War maneuver notes (one note per
   *  maneuver), downloadable from the wayfinder-rules repo like the spells */
  maneuversFolder: string;
  /** custom-items JSON file, tracked by NAME anywhere in the vault
   *  (created at the vault root on first save) */
  customItemsFileName: string;
  /** table houserules toggled vault-wide. Read with a default (see
   *  eitrEnabled() in src/calc) so absence means the established default. */
  houseRules?: HouseRules;
  /** Use the Carrel plugin's references board for the References tab instead of
   *  the built-in barebones list. Only honored when Carrel is installed. */
  useCarrelReferences?: boolean;
  /** Where character data is persisted. Absent = "plugin" (the default and
   *  pre-feature behaviour: characters live in the plugin's data.json).
   *  - "vault-single": all characters in ONE vault JSON file.
   *  - "vault-per-character": one vault JSON file per character (+ a separate
   *    party-inventory file). Smaller per-edit diffs = fewer Obsidian Sync
   *    conflicts when different devices edit different characters.
   *  Switching modes migrates existing characters to the new location (see
   *  MiniSheetStore.migrateStorage). Read with characterStorageMode(). */
  characterStorage?: CharacterStorageMode;
  /** Vault folder for the character file(s). Empty = located by name anywhere
   *  in the vault and created at the vault root (same as customItemsFileName).
   *  Only meaningful in the two vault storage modes. */
  characterStorageFolder?: string;
  /** Off by default. When on, every save also writes a whole-roster snapshot to
   *  a separate vault file (wayfinder-backup.json) — a disaster-recovery copy
   *  independent of the primary storage, in ALL modes. Best-effort: a backup
   *  failure never blocks the real save. */
  characterBackup?: boolean;
  /** Vault folder for the backup file. Empty = vault root. */
  characterBackupFolder?: string;
}

export type CharacterStorageMode =
  | "plugin"
  | "vault-single"
  | "vault-per-character";

/** Read the character-storage mode with the established default ("plugin").
 *  Absence — older data.json — means the pre-feature behaviour where all
 *  character data lives in the plugin's data.json. */
export function characterStorageMode(
  settings: Pick<MiniSheetSettings, "characterStorage">,
): CharacterStorageMode {
  return settings.characterStorage ?? "plugin";
}

/** Whether the off-by-default character backup is enabled. */
export function characterBackupEnabled(
  settings: Pick<MiniSheetSettings, "characterBackup">,
): boolean {
  return settings.characterBackup ?? false;
}

/** Vault-wide houserule switches. Currently the only entry is the
 *  "Elephant in the Room" feat-tax rules (free merged Power Attack/Deadly
 *  Aim, finesse weapons grant Dex to attack/damage/CMB). Defaults ON. */
export interface HouseRules {
  elephantInTheRoom?: boolean;
}

/** Read the Elephant in the Room houserule with the established default (ON).
 *  Absence — older data.json, settings not yet migrated — means the default,
 *  which keeps the legacy Dex-to-CMB behaviour every captured sheet has. */
export function eitrEnabled(
  settings: Pick<MiniSheetSettings, "houseRules">,
): boolean {
  return settings.houseRules?.elephantInTheRoom ?? true;
}

/** Root shape of the plugin's data.json. */
export interface MiniSheetData {
  schemaVersion: number;
  settings: MiniSheetSettings;
  ui: UiState;
  characters: CharacterRecord[];
  /** shared party loot; absent until first import/use */
  partyInventory?: InventoryState;
}

export const DEFAULT_DATA: MiniSheetData = {
  // v2: CharacterRecord gains optional `spellbook` (schema-forward merge in
  // store.load() needs no migration code for optional fields)
  // v3: optional CharacterRecord.inventory + MiniSheetData.partyInventory
  // v4: ResourcePool gains kind/formula; top-level panache field becomes a
  // resources[] pool (real migration — see src/state/migrations.ts)
  // v5: spellSlotsL* resource pools migrate into the spellbook
  // (SpellbookState.slotOverrides; slot-only books use castingClass "")
  // v6: CombatToggles (minus rangedAttackStyle) convert into per-character
  // quickActions/quickActionState (real migration — src/state/migrations.ts)
  // v7: Weapon Song "Enhancement" repaired from untyped to enhancement-typed
  // (RAW stacking with weapon enhancement; user-edited variants untouched)
  // v8: ClassEntry gains optional archetypeKeys (schema-forward merge, no
  // migration code — same pattern as v2/v3)
  // v9: monk AC bonus relocated behind the Scaled Fist archetype; leveled
  // monk entries without archetypeKeys get ["scaled-fist"] stamped so
  // existing characters keep their CHA-based AC (real migration —
  // src/state/migrations.ts)
  // v10: skalds with a weapon-song pool/quick-action get ["spell-warrior"]
  // stamped (weapon song is that archetype's raging song), so resource
  // sync re-keys the pool instead of granting ragingSong (real migration)
  // v11: racial speed/size become derived-with-override — speed matching
  // the race's "<N>ft" converts to the "" sentinel, a differing sizeMod is
  // stamped into ac.sizeModOverride; no-raceKey characters untouched (real
  // migration). CharacterRecord.raceHeritageKey is schema-forward (like v8).
  // v12: MiniSheetSettings.houseRules.elephantInTheRoom (schema-forward, like
  // v8 — optional with a read-time default of ON; see eitrEnabled()). No
  // migration code: absent houseRules already means "the established default".
  // v13: CharacterRecord gains optional referencePins + checklistState for the
  // redesigned Reference tab (schema-forward, like v2/v3/v8 — optional with
  // absent-default; callers coalesce with ?? []/?? {}). No migration code.
  // v14: SpellbookState gains optional loadouts[] + appliedLoadoutId for the
  // Spell Database's Loadouts tab (schema-forward, like v8/v12/v13 — optional
  // with read-time `?? []`; legacy loadouts lived in vault YAML, nothing to
  // import). No migration code.
  // v15: CharacterRecord gains optional maneuverbook (Path of War) and
  // MiniSheetSettings gains maneuversFolder (schema-forward, like v8/v13/v14 —
  // optional/defaulted; the merge in store.load() fills the folder default).
  // No migration code.
  schemaVersion: 15,
  settings: {
    rulesFolder: "Rules",
    spellsFolder: "MiniSheet/z_Components/database/spells",
    maneuversFolder: "MiniSheet/z_Components/database/maneuvers",
    customItemsFileName: DEFAULT_CUSTOM_ITEMS_FILENAME,
    houseRules: { elephantInTheRoom: true },
  },
  ui: {
    selectedTab: "combat",
    activeCharacterId: null,
  },
  characters: [],
};
