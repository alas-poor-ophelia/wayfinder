import type { TabName } from "../constants";
import type { CharacterRecord } from "./character";

export interface UiState {
  selectedTab: TabName;
  activeCharacterId: string | null;
  configOpen: boolean;
  /** main-pane spell database view state (filters persist like all UI state) */
  spellDb?: SpellDbState;
}

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
}

export const DEFAULT_DATA: MiniSheetData = {
  // v2: CharacterRecord gains optional `spellbook` (schema-forward merge in
  // store.load() needs no migration code for optional fields)
  schemaVersion: 2,
  settings: {
    rulesFolder: "Rules",
    spellsFolder: "MiniSheet/z_Components/database/spells",
  },
  ui: {
    selectedTab: "combat",
    activeCharacterId: null,
    configOpen: false,
  },
  characters: [],
};
