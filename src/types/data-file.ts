import type { TabName } from "../constants";
import type { CharacterRecord } from "./character";
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
  filtersOpen: boolean;
}

export const DEFAULT_SPELL_DB: SpellDbState = {
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
  filtersOpen: false,
};

export interface MiniSheetSettings {
  rulesFolder: string;
  /** vault folder holding the spell notes (one markdown note per spell) */
  spellsFolder: string;
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
  schemaVersion: 5,
  settings: {
    rulesFolder: "Rules",
    spellsFolder: "MiniSheet/z_Components/database/spells",
  },
  ui: {
    selectedTab: "combat",
    activeCharacterId: null,
  },
  characters: [],
};
