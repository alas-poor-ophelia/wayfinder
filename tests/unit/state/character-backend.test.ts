import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { MiniSheetStore } from "../../../src/state/store";
import type { MiniSheetData } from "../../../src/types/data-file";

/** In-memory stand-in for the bits of the Obsidian vault the backend touches. */
class FakeVault {
  files = new Map<string, TFile>();
  contents = new Map<string, string>();
  modifyLog: string[] = [];
  createLog: string[] = [];

  private make(path: string): TFile {
    const idx = path.lastIndexOf("/");
    const f = new TFile();
    f.path = path;
    f.name = idx >= 0 ? path.slice(idx + 1) : path;
    f.basename = f.name.replace(/\.[^.]+$/, "");
    f.parent = {
      path: idx >= 0 ? path.slice(0, idx) : "/",
    } as unknown as TFile["parent"];
    return f;
  }

  getFiles(): TFile[] {
    return [...this.files.values()];
  }
  getAbstractFileByPath(p: string): TFile | null {
    return this.files.get(p) ?? null;
  }
  cachedRead(f: TFile): Promise<string> {
    return Promise.resolve(this.contents.get(f.path) ?? "");
  }
  create(p: string, c: string): Promise<TFile> {
    const f = this.make(p);
    this.files.set(p, f);
    this.contents.set(p, c);
    this.createLog.push(p);
    return Promise.resolve(f);
  }
  modify(f: TFile, c: string): Promise<void> {
    this.contents.set(f.path, c);
    this.modifyLog.push(f.path);
    return Promise.resolve();
  }
  createFolder(): Promise<void> {
    return Promise.resolve();
  }
  trash(f: TFile): void {
    this.files.delete(f.path);
    this.contents.delete(f.path);
  }
}

/** Build a real store backed by an in-memory data.json + fake vault. */
function makeStore() {
  const vault = new FakeVault();
  const box: { json: MiniSheetData | null } = { json: null };
  const plugin = {
    loadData: () => Promise.resolve(box.json),
    saveData: (d: MiniSheetData) => {
      box.json = JSON.parse(JSON.stringify(d)) as MiniSheetData;
      return Promise.resolve();
    },
    registerEvent: () => {},
    app: {
      vault,
      fileManager: {
        trashFile: (f: TFile) => {
          vault.trash(f);
          return Promise.resolve();
        },
      },
    },
  };
  const store = new MiniSheetStore(plugin as never);
  return { store, vault, box };
}

const charFiles = (vault: FakeVault): string[] =>
  [...vault.files.keys()].filter((p) => p.includes("wayfinder-char-")).sort();

describe("character storage backends", () => {
  it("keeps characters in data.json in the default plugin mode", async () => {
    const { store, vault, box } = makeStore();
    store.addCharacter("Theron");
    await store.flush();
    expect(box.json?.characters).toHaveLength(1);
    expect(vault.files.size).toBe(0); // nothing written to the vault
  });

  it("gives new characters a unique random-suffixed id", () => {
    const { store } = makeStore();
    const a = store.addCharacter("Theron");
    const b = store.addCharacter("Theron");
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^theron-[0-9a-f]{8}$/);
  });

  it("migrates plugin -> per-character: one file each, data.json roster emptied", async () => {
    const { store, vault, box } = makeStore();
    store.addCharacter("Theron");
    store.addCharacter("Mara");
    await store.flush();

    const ok = await store.migrateStorage("plugin", "vault-per-character");
    expect(ok).toBe(true);
    expect(charFiles(vault)).toHaveLength(2);
    expect(box.json?.characters).toHaveLength(0); // stripped from data.json
    expect(box.json?.settings.characterStorage).toBe("vault-per-character");
  });

  it("rewrites only the edited character's file (minimal-diff)", async () => {
    const { store, vault } = makeStore();
    const a = store.addCharacter("Theron");
    store.addCharacter("Mara");
    await store.flush();
    await store.migrateStorage("plugin", "vault-per-character");

    vault.modifyLog.length = 0;
    vault.createLog.length = 0;
    store.setCharacterField(a.id, "name", "Theron the Bold");
    await store.flush();

    const touched = [...vault.modifyLog, ...vault.createLog];
    expect(touched).toHaveLength(1);
    expect(touched[0]).toContain(`wayfinder-char-${a.id}`);
  });

  it("trashes the file when a character is removed", async () => {
    const { store, vault } = makeStore();
    const a = store.addCharacter("Theron");
    store.addCharacter("Mara");
    await store.flush();
    await store.migrateStorage("plugin", "vault-per-character");
    expect(charFiles(vault)).toHaveLength(2);

    store.removeCharacter(a.id);
    await store.flush();
    expect(charFiles(vault)).toHaveLength(1);
    expect(charFiles(vault)[0]).not.toContain(a.id);
  });

  it("round-trips through a fresh load in per-character mode", async () => {
    const { store, vault, box } = makeStore();
    store.addCharacter("Theron");
    store.addCharacter("Mara");
    await store.flush();
    await store.migrateStorage("plugin", "vault-per-character");

    // fresh store over the SAME data.json + vault (simulates a reload)
    const plugin = {
      loadData: () => Promise.resolve(box.json),
      saveData: (d: MiniSheetData) => {
        box.json = JSON.parse(JSON.stringify(d)) as MiniSheetData;
        return Promise.resolve();
      },
      registerEvent: () => {},
      app: {
        vault,
        fileManager: { trashFile: () => Promise.resolve() },
      },
    };
    const reloaded = new MiniSheetStore(plugin as never);
    await reloaded.load();
    expect(reloaded.charactersReady.value).toBe(false); // deferred to files
    await reloaded.loadCharacters();
    expect(reloaded.charactersReady.value).toBe(true);
    expect(reloaded.data.value.characters.map((c) => c.name).sort()).toEqual([
      "Mara",
      "Theron",
    ]);
  });

  it("migrates per-character -> single -> plugin without losing the roster", async () => {
    const { store, vault, box } = makeStore();
    store.addCharacter("Theron");
    store.addCharacter("Mara");
    await store.flush();

    await store.migrateStorage("plugin", "vault-per-character");
    expect(charFiles(vault)).toHaveLength(2);

    await store.migrateStorage("vault-per-character", "vault-single");
    expect(charFiles(vault)).toHaveLength(0); // per-char files trashed
    expect(
      [...vault.files.keys()].some((p) =>
        p.endsWith("wayfinder-characters.json"),
      ),
    ).toBe(true);
    expect(store.data.value.characters).toHaveLength(2);

    await store.migrateStorage("vault-single", "plugin");
    expect(vault.files.size).toBe(0); // all vault files trashed
    expect(box.json?.characters).toHaveLength(2); // back in data.json
    expect(box.json?.settings.characterStorage).toBe("plugin");
  });

  it("never adopts a foreign JSON file matching the name pattern", async () => {
    const { store, vault } = makeStore();
    store.addCharacter("Theron");
    await store.flush();
    await store.migrateStorage("plugin", "vault-per-character");

    // a same-named-but-foreign file appears (not one of our envelopes)
    await vault.create(
      "wayfinder-char-intruder.json",
      JSON.stringify({ not: "ours" }),
    );
    await store.loadCharacters();
    // the intruder is ignored; only the real character survives
    expect(store.data.value.characters.map((c) => c.name)).toEqual(["Theron"]);
  });

  it("writes a backup snapshot on save when enabled (even in plugin mode)", async () => {
    const { store, vault } = makeStore();
    store.addCharacter("Theron");
    store.updateSettings({ characterBackup: true });
    await store.flush();

    const backup = vault.contents.get("wayfinder-backup.json");
    expect(backup).toBeDefined();
    const parsed = JSON.parse(backup!) as {
      wayfinder: string;
      characters: { name: string }[];
    };
    expect(parsed.wayfinder).toBe("characters"); // restoreable envelope
    expect(parsed.characters.map((c) => c.name)).toEqual(["Theron"]);
  });

  it("does not write a backup when the toggle is off", async () => {
    const { store, vault } = makeStore();
    store.addCharacter("Theron");
    await store.flush();
    expect(vault.contents.has("wayfinder-backup.json")).toBe(false);
  });

  it("honours the backup folder and skips an unchanged roster", async () => {
    const { store, vault } = makeStore();
    store.addCharacter("Theron");
    store.updateSettings({
      characterBackup: true,
      characterBackupFolder: "Backups",
    });
    await store.flush();
    expect(vault.contents.has("Backups/wayfinder-backup.json")).toBe(true);

    // a no-op flush must not rewrite the backup
    vault.modifyLog.length = 0;
    await store.backupNow();
    expect(vault.modifyLog).toHaveLength(0);
  });
});
