/**
 * CustomItemsStore — persistence for user-forged magic items, mirroring
 * MiniSheetStore's debounce/external-change discipline against a SEPARATE
 * vault JSON file (settings.customItemsFileName, located by NAME anywhere
 * in the vault; created lazily at the vault root on first save).
 *
 * Sync safety (the 2026-06-11 iPad-clobber lesson): any external change to
 * the file — Obsidian Sync, another device, a hand edit — drops the pending
 * local debounce and adopts the file content. A file that fails to parse is
 * NEVER overwritten (status "error" blocks saves until it's fixed/renamed).
 */
import { signal, type Signal } from "@preact/signals";
import { Notice, TFile } from "obsidian";
import {
  DEFAULT_CUSTOM_ITEMS_FILENAME,
  parseCustomItemsFile,
  renamedFileName,
  serializeCustomItemsFile,
  type CustomItemDef,
} from "../types/custom-items";
import type MiniSheetPlugin from "../main";

const SAVE_DEBOUNCE_MS = 500;

export type CustomItemsStatus = "ready" | "missing" | "error";

export class CustomItemsStore {
  readonly items: Signal<CustomItemDef[]> = signal([]);
  /** "missing" = no file yet (created on first save); "error" = unparseable */
  readonly status: Signal<CustomItemsStatus> = signal("missing");
  private plugin: MiniSheetPlugin;
  private file: TFile | null = null;
  private saveTimer: number | null = null;
  private dirty = false;
  private lastSavedContent = "";

  constructor(plugin: MiniSheetPlugin) {
    this.plugin = plugin;
  }

  fileName(): string {
    return (
      this.plugin.store.data.value.settings.customItemsFileName ||
      DEFAULT_CUSTOM_ITEMS_FILENAME
    );
  }

  /** Register vault listeners (call once from plugin onload). */
  init(): void {
    const { vault } = this.plugin.app;
    this.plugin.registerEvent(
      vault.on("modify", (file) => {
        if (file instanceof TFile && file === this.file) {
          void this.handleExternalModify(file);
        }
      }),
    );
    this.plugin.registerEvent(
      vault.on("rename", (file, oldPath) => {
        if (!(file instanceof TFile)) return;
        if (file === this.file) {
          const newName = renamedFileName(oldPath, file.path);
          if (newName) {
            // basename changed — follow it so the setting keeps tracking
            this.plugin.store.updateSettings({ customItemsFileName: newName });
          }
          // path-only move needs nothing: we hold the TFile reference
        } else if (!this.file && file.name === this.fileName()) {
          void this.load(); // something was renamed INTO our tracked name
        }
      }),
    );
    this.plugin.registerEvent(
      vault.on("delete", (file) => {
        if (file === this.file) {
          // keep in-memory items; the next flush recreates the file
          this.file = null;
          this.lastSavedContent = "";
          if (this.status.value === "error") this.status.value = "missing";
        }
      }),
    );
    this.plugin.registerEvent(
      vault.on("create", (file) => {
        if (
          this.file === null &&
          file instanceof TFile &&
          file.name === this.fileName()
        ) {
          void this.load(); // sync delivered the file after startup
        }
      }),
    );
  }

  /** Find the tracked file BY NAME anywhere in the vault. */
  private locate(): TFile | null {
    const name = this.fileName();
    this.file =
      this.plugin.app.vault.getFiles().find((f) => f.name === name) ?? null;
    return this.file;
  }

  /** (Re)load from the vault file. Re-entrant: drops any pending save so a
   *  stale debounce can't clobber the newer external truth. */
  async load(): Promise<void> {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.dirty = false;
    const file = this.locate();
    if (!file) {
      this.items.value = [];
      this.lastSavedContent = "";
      this.status.value = "missing";
      return;
    }
    const text = await this.plugin.app.vault.cachedRead(file);
    this.adopt(text);
  }

  private adopt(text: string): void {
    const parsed = parseCustomItemsFile(text);
    if (!parsed) {
      this.status.value = "error";
      new Notice(
        `MiniSheet: "${this.fileName()}" is not a readable custom-items file; ` +
          `it will not be overwritten. Fix it or point the setting elsewhere.`,
      );
      return;
    }
    this.items.value = parsed.items;
    this.lastSavedContent = text;
    this.status.value = "ready";
  }

  private async handleExternalModify(file: TFile): Promise<void> {
    const text = await this.plugin.app.vault.cachedRead(file);
    if (text === this.lastSavedContent) return; // echo of our own write
    // external truth wins: drop the pending local save before adopting
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.dirty = false;
    this.adopt(text);
  }

  /** Replace the item list and persist (debounced). Refused while the
   *  tracked file is unparseable — we never overwrite what we can't read. */
  setItems(next: CustomItemDef[]): void {
    if (this.status.value === "error") {
      throw new Error(
        `custom items file "${this.fileName()}" is unreadable; refusing to overwrite`,
      );
    }
    this.items.value = next;
    this.dirty = true;
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(
      () => void this.flush(),
      SAVE_DEBOUNCE_MS,
    );
  }

  upsertItem(item: CustomItemDef): void {
    const idx = this.items.value.findIndex((i) => i.id === item.id);
    const next = [...this.items.value];
    if (idx === -1) next.push(item);
    else next[idx] = item;
    this.setItems(next);
  }

  removeItem(id: string): void {
    this.setItems(this.items.value.filter((i) => i.id !== id));
  }

  /** Write pending changes immediately; creates the file at the vault root
   *  when none exists yet (vaults that never forge stay clean). */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.dirty || this.status.value === "error") return;
    this.dirty = false;
    const content = serializeCustomItemsFile(this.items.value);
    const file = this.file ?? this.locate();
    if (file) {
      await this.plugin.app.vault.modify(file, content);
    } else {
      this.file = await this.plugin.app.vault.create(this.fileName(), content);
    }
    this.lastSavedContent = content;
    this.status.value = "ready";
  }
}
