/**
 * CharacterBackend — pluggable persistence for the heavy, high-churn slice of
 * plugin state (the character roster + shared party inventory), so it can live
 * somewhere friendlier to Obsidian Sync than the plugin's data.json.
 *
 * The default ("plugin") mode keeps characters in data.json exactly as before
 * and never touches this backend — MiniSheetStore uses its legacy path. The two
 * vault modes route through VaultCharacterBackend:
 *
 *  - "vault-single":        all characters + party inventory in ONE vault JSON.
 *  - "vault-per-character": one vault JSON per character (id-named) plus a
 *                           separate party-inventory file. Editing one
 *                           character rewrites only that file, so two devices
 *                           editing DIFFERENT characters no longer collide.
 *
 * Sync safety (the custom-items lesson, src/state/custom-items.ts): every file
 * we own is wrapped in a tagged envelope so we never adopt or overwrite a
 * foreign JSON file; an unreadable own-file is reported, not clobbered. The
 * backend remembers the exact text it last wrote per file (`lastContent`),
 * which both (a) lets save() skip unchanged files — the per-character diff that
 * makes the Sync win real — and (b) suppresses the echo of our own writes when
 * the vault "modify" event fires. lastContent is set BEFORE the await so a
 * rapid multi-file flush can't race its own events into a reload loop.
 */
import { Notice, TFile, normalizePath, type Plugin } from "obsidian";
import type { CharacterRecord } from "../types/character";
import {
  characterStorageMode,
  type CharacterStorageMode,
} from "../types/data-file";
import type { InventoryState } from "../types/inventory";
import type { MiniSheetStore } from "./store";

/** The slice this backend owns. partyInventory is absent until first use. */
export interface CharacterPayload {
  characters: CharacterRecord[];
  partyInventory?: InventoryState;
}

export interface CharacterBackend {
  /** Read the owned slice for the CURRENT mode. null = nothing stored yet. */
  load(): Promise<CharacterPayload | null>;
  /** Persist the owned slice for the CURRENT mode (minimal writes + deletes). */
  save(payload: CharacterPayload): Promise<void>;
  /** Register vault listeners once (plugin lifetime). onExternalChange fires
   *  when an owned file changes on disk from outside our own writes. */
  init(onExternalChange: () => void): void;
}

const PARTY_KEY = "__party__";
const SINGLE_KEY = "__single__";
const PER_CHAR_PREFIX = "wayfinder-char-";
const SINGLE_NAME = "wayfinder-characters.json";
const PARTY_NAME = "wayfinder-party.json";
// Distinct from SINGLE_NAME so owns()/matchingFiles never mistake a backup for
// primary storage — the backup is a one-way snapshot, never read back as state.
const BACKUP_NAME = "wayfinder-backup.json";

type Envelope =
  | {
      wayfinder: "characters";
      characters: CharacterRecord[];
      partyInventory?: InventoryState;
    }
  | { wayfinder: "character"; character: CharacterRecord }
  | { wayfinder: "party"; partyInventory: InventoryState };

function serialize(env: Envelope): string {
  return JSON.stringify(env, null, 2) + "\n";
}

/** Parse one of our tagged envelopes; null for anything we don't own. */
function parseEnvelope(text: string): Envelope | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const tag = (raw as { wayfinder?: unknown }).wayfinder;
  if (tag === "characters" || tag === "character" || tag === "party") {
    return raw as Envelope;
  }
  return null;
}

function sanitizeId(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]+/g, "_") || "character";
}

export class VaultCharacterBackend implements CharacterBackend {
  private plugin: Plugin;
  private store: MiniSheetStore;
  /** key (char id / PARTY_KEY / SINGLE_KEY) -> exact text we last wrote/read */
  private lastContent = new Map<string, string>();
  /** key -> the vault file backing it (for in-place modify + delete) */
  private files = new Map<string, TFile>();
  private onExternalChange: (() => void) | null = null;
  /** backup bookkeeping (separate from primary storage): the file + the exact
   *  text last written, so an unchanged roster doesn't rewrite the backup. */
  private backupFile: TFile | null = null;
  private backupLastContent = "";

  constructor(plugin: Plugin, store: MiniSheetStore) {
    this.plugin = plugin;
    this.store = store;
  }

  private mode(): CharacterStorageMode {
    return characterStorageMode(this.store.data.value.settings);
  }

  private folder(): string {
    return (this.store.data.value.settings.characterStorageFolder ?? "").trim();
  }

  init(onExternalChange: () => void): void {
    this.onExternalChange = onExternalChange;
    const { vault } = this.plugin.app;
    const maybeExternal = (file: TFile): void => {
      if (this.mode() === "plugin") return;
      if (!this.owns(file)) return;
      void this.checkExternal(file);
    };
    this.plugin.registerEvent(
      vault.on("modify", (file) => {
        if (file instanceof TFile) maybeExternal(file);
      }),
    );
    this.plugin.registerEvent(
      vault.on("create", (file) => {
        // Sync may deliver an owned file after startup
        if (
          file instanceof TFile &&
          this.mode() !== "plugin" &&
          this.owns(file)
        ) {
          this.onExternalChange?.();
        }
      }),
    );
    this.plugin.registerEvent(
      vault.on("delete", (file) => {
        if (file instanceof TFile) this.forget(file);
      }),
    );
  }

  /** Does this file belong to our current mode's tracked set? */
  private owns(file: TFile): boolean {
    if ([...this.files.values()].includes(file)) return true;
    const folder = this.folder();
    if (folder && file.parent?.path !== normalizePath(folder)) return false;
    if (this.mode() === "vault-single") return file.name === SINGLE_NAME;
    return (
      file.name === PARTY_NAME ||
      (file.name.startsWith(PER_CHAR_PREFIX) && file.name.endsWith(".json"))
    );
  }

  private forget(file: TFile): void {
    for (const [key, f] of this.files) {
      if (f === file) {
        this.files.delete(key);
        this.lastContent.delete(key);
      }
    }
  }

  private async checkExternal(file: TFile): Promise<void> {
    const text = await this.plugin.app.vault.cachedRead(file);
    // echo of our own write? (lastContent holds exactly what we wrote)
    for (const v of this.lastContent.values()) if (v === text) return;
    this.onExternalChange?.();
  }

  /** All vault files that match a mode's naming, optionally scoped to a folder
   *  (empty folder = anywhere, like custom-items). Defaults to the configured
   *  folder; callers pass an explicit one to target the OLD location during a
   *  folder relocate. */
  private matchingFiles(
    mode: CharacterStorageMode,
    folder: string = this.folder(),
  ): TFile[] {
    const inFolder = (f: TFile): boolean =>
      !folder || f.parent?.path === normalizePath(folder);
    const all = this.plugin.app.vault.getFiles();
    if (mode === "vault-single") {
      return all.filter((f) => f.name === SINGLE_NAME && inFolder(f));
    }
    return all.filter(
      (f) =>
        inFolder(f) &&
        (f.name === PARTY_NAME ||
          (f.name.startsWith(PER_CHAR_PREFIX) && f.name.endsWith(".json"))),
    );
  }

  private targetPath(name: string): string {
    const folder = this.folder();
    return folder ? normalizePath(`${folder}/${name}`) : name;
  }

  private perCharName(id: string): string {
    return `${PER_CHAR_PREFIX}${sanitizeId(id)}.json`;
  }

  load(): Promise<CharacterPayload | null> {
    return this.loadFrom(this.mode());
  }

  /** Read the slice for an explicit mode (used by load() and migration). */
  async loadFrom(mode: CharacterStorageMode): Promise<CharacterPayload | null> {
    if (mode === "plugin") return null;
    this.files.clear();
    this.lastContent.clear();
    const files = this.matchingFiles(mode);
    if (files.length === 0) return null;

    if (mode === "vault-single") {
      const file = files[0]!;
      const text = await this.plugin.app.vault.cachedRead(file);
      const env = parseEnvelope(text);
      if (!env || env.wayfinder !== "characters") {
        this.reportUnreadable(file.name);
        return null;
      }
      this.files.set(SINGLE_KEY, file);
      this.lastContent.set(SINGLE_KEY, text);
      return {
        characters: env.characters,
        ...(env.partyInventory ? { partyInventory: env.partyInventory } : {}),
      };
    }

    // per-character: each file is one character; the party file is separate
    const characters: CharacterRecord[] = [];
    let partyInventory: InventoryState | undefined;
    for (const file of files) {
      const text = await this.plugin.app.vault.cachedRead(file);
      const env = parseEnvelope(text);
      if (!env) {
        this.reportUnreadable(file.name);
        continue;
      }
      if (env.wayfinder === "party") {
        partyInventory = env.partyInventory;
        this.files.set(PARTY_KEY, file);
        this.lastContent.set(PARTY_KEY, text);
      } else if (env.wayfinder === "character") {
        characters.push(env.character);
        this.files.set(env.character.id, file);
        this.lastContent.set(env.character.id, text);
      }
    }
    return { characters, ...(partyInventory ? { partyInventory } : {}) };
  }

  save(payload: CharacterPayload): Promise<void> {
    return this.saveAs(this.mode(), payload);
  }

  /** Write the slice for an explicit mode, rewriting only changed files and
   *  deleting files for characters that are gone. */
  async saveAs(
    mode: CharacterStorageMode,
    payload: CharacterPayload,
  ): Promise<void> {
    if (mode === "plugin") return;
    if (this.folder()) await this.ensureFolder(this.folder());

    if (mode === "vault-single") {
      const content = serialize({
        wayfinder: "characters",
        characters: payload.characters,
        ...(payload.partyInventory
          ? { partyInventory: payload.partyInventory }
          : {}),
      });
      await this.writeKeyed(SINGLE_KEY, this.targetPath(SINGLE_NAME), content);
      return;
    }

    // per-character: desired key -> content for every character + party
    const wanted = new Map<string, { path: string; content: string }>();
    for (const c of payload.characters) {
      wanted.set(c.id, {
        path: this.targetPath(this.perCharName(c.id)),
        content: serialize({ wayfinder: "character", character: c }),
      });
    }
    if (payload.partyInventory) {
      wanted.set(PARTY_KEY, {
        path: this.targetPath(PARTY_NAME),
        content: serialize({
          wayfinder: "party",
          partyInventory: payload.partyInventory,
        }),
      });
    }
    // deletions first: anything we track that is no longer wanted
    for (const key of [...this.lastContent.keys()]) {
      if (!wanted.has(key)) await this.deleteKeyed(key);
    }
    // writes: skip files whose content is byte-identical to last write
    for (const [key, { path, content }] of wanted) {
      await this.writeKeyed(key, path, content);
    }
  }

  /** Delete every file backing an explicit mode (used after a migration). A
   *  folder override targets the OLD location during a folder relocate. */
  async clearMode(
    mode: CharacterStorageMode,
    folder: string = this.folder(),
  ): Promise<void> {
    if (mode === "plugin") return;
    const files = this.matchingFiles(mode, folder);
    for (const file of files) {
      try {
        // trashFile (not vault.delete) honours the user's deletion preference,
        // so a mistaken migration is recoverable from the trash
        await this.plugin.app.fileManager.trashFile(file);
      } catch {
        // already gone / locked — best effort
      }
    }
    this.files.clear();
    this.lastContent.clear();
  }

  /** Write a whole-roster snapshot to a separate backup file (works in ALL
   *  storage modes). Uses the single-file "characters" envelope, so the backup
   *  is itself a valid, restoreable snapshot. Skips an unchanged roster. */
  async writeBackup(folder: string, payload: CharacterPayload): Promise<void> {
    const content = serialize({
      wayfinder: "characters",
      characters: payload.characters,
      ...(payload.partyInventory
        ? { partyInventory: payload.partyInventory }
        : {}),
    });
    const f = folder.trim();
    const path = f ? normalizePath(`${f}/${BACKUP_NAME}`) : BACKUP_NAME;
    // a folder change moves the target; drop the stale cached file first
    if (this.backupFile && this.backupFile.path !== path)
      this.backupFile = null;
    if (this.backupFile && content === this.backupLastContent) return;
    if (f) await this.ensureFolder(f);
    this.backupLastContent = content;
    const existing =
      this.backupFile ??
      (this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null);
    if (existing instanceof TFile) {
      this.backupFile = existing;
      await this.plugin.app.vault.modify(existing, content);
    } else {
      this.backupFile = await this.plugin.app.vault.create(path, content);
    }
  }

  private async writeKeyed(
    key: string,
    path: string,
    content: string,
  ): Promise<void> {
    if (this.lastContent.get(key) === content && this.files.has(key)) return;
    // set BEFORE the await so the modify event we trigger is recognised as our
    // own echo even if a sibling write's event interleaves
    this.lastContent.set(key, content);
    const existing =
      this.files.get(key) ??
      (this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null);
    if (existing instanceof TFile) {
      this.files.set(key, existing);
      await this.plugin.app.vault.modify(existing, content);
    } else {
      const created = await this.plugin.app.vault.create(path, content);
      this.files.set(key, created);
    }
  }

  private async deleteKeyed(key: string): Promise<void> {
    const file = this.files.get(key);
    this.files.delete(key);
    this.lastContent.delete(key);
    if (file) {
      try {
        await this.plugin.app.fileManager.trashFile(file);
      } catch {
        // best effort
      }
    }
  }

  private async ensureFolder(folder: string): Promise<void> {
    const path = normalizePath(folder);
    if (!this.plugin.app.vault.getAbstractFileByPath(path)) {
      try {
        await this.plugin.app.vault.createFolder(path);
      } catch {
        // race or already exists
      }
    }
  }

  private reportUnreadable(name: string): void {
    new Notice(
      `Wayfinder: "${name}" is not a readable character file; it will not be ` +
        `overwritten. Fix it or point the storage folder elsewhere.`,
    );
  }
}
