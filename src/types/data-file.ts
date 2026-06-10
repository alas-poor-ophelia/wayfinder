import type { TabName } from "../constants";

/**
 * Root shape of the plugin's data.json.
 * `characters` records get their full schema in the state-core milestone;
 * until then the store treats them as opaque objects with id/name.
 */
export interface CharacterStub {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface UiState {
  selectedTab: TabName;
  activeCharacterId: string | null;
  configOpen: boolean;
}

export interface MiniSheetSettings {
  rulesFolder: string;
}

export interface MiniSheetData {
  schemaVersion: number;
  settings: MiniSheetSettings;
  ui: UiState;
  characters: CharacterStub[];
}

export const DEFAULT_DATA: MiniSheetData = {
  schemaVersion: 1,
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
