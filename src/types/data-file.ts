import type { TabName } from "../constants";
import type { CharacterRecord } from "./character";

export interface UiState {
  selectedTab: TabName;
  activeCharacterId: string | null;
  configOpen: boolean;
}

export interface MiniSheetSettings {
  rulesFolder: string;
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
  },
  ui: {
    selectedTab: "combat",
    activeCharacterId: null,
    configOpen: false,
  },
  characters: [],
};
