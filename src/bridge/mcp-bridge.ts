import { computeAll } from "../calc";
import type { TabName } from "../constants";
import type { CharacterRecord } from "../types/character";
import type { MiniSheetData } from "../types/data-file";
import type MiniSheetPlugin from "../main";

/**
 * window.__minisheet — the surface the MCP server drives via `ob eval`.
 * `buildStamp` changes every build so the reload tool can prove the
 * running code actually changed (reload-success-but-stale-code is a
 * known failure mode).
 */
export interface MiniSheetBridge {
  version: string;
  buildStamp: string;
  getState(): MiniSheetData;
  setTab(tab: TabName | number): void;
  listCharacters(): { id: string; name: string }[];
  getCharacter(id?: string): CharacterRecord | null;
  setCharacterField(id: string, dotPath: string, value: unknown): void;
  newCharacter(name: string): string;
  setActiveCharacter(id: string): void;
  setConfigOpen(open: boolean): void;
  /** Calc outputs for a character — wired up in the calc-port milestone. */
  getComputed(id?: string): unknown;
  openSheet(): Promise<void>;
}

declare global {
  interface Window {
    __minisheet?: MiniSheetBridge;
  }
}

export function installBridge(plugin: MiniSheetPlugin): void {
  const store = plugin.store;
  window.__minisheet = {
    version: plugin.manifest.version,
    buildStamp: __BUILD_STAMP__,
    getState: () => JSON.parse(JSON.stringify(store.data.value)),
    setTab: (tab) => store.setTab(tab),
    listCharacters: () =>
      store.data.value.characters.map((c) => ({ id: c.id, name: c.name })),
    getCharacter: (id) => store.getCharacter(id),
    setCharacterField: (id, dotPath, value) =>
      store.setCharacterField(id, dotPath, value),
    newCharacter: (name) => store.addCharacter(name).id,
    setActiveCharacter: (id) => store.setActiveCharacter(id),
    setConfigOpen: (open) => store.setConfigOpen(open),
    getComputed: (id) => {
      const record = store.getCharacter(id);
      if (!record) return null;
      const master = record.link ? store.getCharacter(record.link.masterId) : null;
      return computeAll(record, master);
    },
    openSheet: () => plugin.activateView(),
  };
}

export function removeBridge(): void {
  delete window.__minisheet;
}
