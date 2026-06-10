import { signal, type Signal } from "@preact/signals";
import type { Plugin } from "obsidian";
import { TABS, type TabName } from "../constants";
import {
  DEFAULT_DATA,
  type CharacterStub,
  type MiniSheetData,
} from "../types/data-file";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Single source of truth for all plugin state, backed by data.json.
 * Components read `store.data.value` (signals make them reactive);
 * all writes go through the mutation methods so persistence is automatic.
 */
export class MiniSheetStore {
  readonly data: Signal<MiniSheetData>;
  private plugin: Plugin;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.data = signal(DEFAULT_DATA);
  }

  async load(): Promise<void> {
    const raw = (await this.plugin.loadData()) as Partial<MiniSheetData> | null;
    if (raw) {
      this.data.value = {
        ...DEFAULT_DATA,
        ...raw,
        settings: { ...DEFAULT_DATA.settings, ...raw.settings },
        ui: { ...DEFAULT_DATA.ui, ...raw.ui },
        characters: raw.characters ?? [],
      };
    }
  }

  /** Replace the whole data object and persist (debounced). */
  private commit(next: MiniSheetData): void {
    this.data.value = next;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Write pending changes to data.json immediately. */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    await this.plugin.saveData(this.data.value);
  }

  setTab(tab: TabName | number): void {
    const name = typeof tab === "number" ? TABS[tab] : tab;
    if (!name || !TABS.includes(name)) {
      throw new Error(`Unknown tab: ${String(tab)} (valid: ${TABS.join(", ")})`);
    }
    this.commit({
      ...this.data.value,
      ui: { ...this.data.value.ui, selectedTab: name },
    });
  }

  setActiveCharacter(id: string | null): void {
    this.commit({
      ...this.data.value,
      ui: { ...this.data.value.ui, activeCharacterId: id },
    });
  }

  setConfigOpen(open: boolean): void {
    this.commit({
      ...this.data.value,
      ui: { ...this.data.value.ui, configOpen: open },
    });
  }

  updateSettings(patch: Partial<MiniSheetData["settings"]>): void {
    this.commit({
      ...this.data.value,
      settings: { ...this.data.value.settings, ...patch },
    });
  }

  getCharacter(id?: string): CharacterStub | null {
    const d = this.data.value;
    const target = id ?? d.ui.activeCharacterId;
    return d.characters.find((c) => c.id === target) ?? null;
  }

  /** Set a (possibly nested, dot-separated) field on a character record. */
  setCharacterField(id: string, dotPath: string, value: unknown): void {
    const d = this.data.value;
    const idx = d.characters.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`No character with id "${id}"`);
    const record = structuredClone(d.characters[idx]);
    const keys = dotPath.split(".");
    let cursor: Record<string, unknown> = record;
    for (const key of keys.slice(0, -1)) {
      const next = cursor[key];
      if (typeof next !== "object" || next === null) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]] = value;
    const characters = [...d.characters];
    characters[idx] = record;
    this.commit({ ...d, characters });
  }
}
