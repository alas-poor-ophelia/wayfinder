import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { App, TFile } from "obsidian";
import type MiniSheetPlugin from "../main";
import { parseSpellLevel, type ParsedSpellLevel } from "./parse";

export interface SpellDoc {
  path: string;
  id: string;
  name: string;
  spellLevelRaw: string;
  parsed: ParsedSpellLevel;
  school: string;
  source: string;
  range: string;
  castingTime: string;
  components: string;
  targets: string;
  duration: string;
  saveType: string;
  sr: string;
  // body intentionally NOT cached — ~2,800 notes; read lazily on open
}

function fmStr(fm: Record<string, unknown> | undefined, key: string): string {
  const v = fm?.[key];
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/**
 * Index of the spells folder (one note per spell, ~2,800 of them).
 * Clone of RulesIndex with one critical divergence: frontmatter-only via
 * metadataCache — no body reads — and a debounced rebuild because bulk
 * file syncs fire metadata events per file.
 */
export class SpellIndex {
  readonly docs: Signal<SpellDoc[]> = signal([]);
  readonly lastRebuildMs: Signal<number> = signal(0);
  readonly byName: Map<string, SpellDoc> = new Map();
  readonly byId: Map<string, SpellDoc> = new Map();
  readonly allClasses: ReadonlySignal<string[]>;
  readonly allSchools: ReadonlySignal<string[]>;
  readonly allSources: ReadonlySignal<string[]>;

  private app: App;
  private plugin: MiniSheetPlugin;
  private rebuildTimer: number | null = null;

  constructor(plugin: MiniSheetPlugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.allClasses = computed(() => {
      const set = new Set<string>();
      for (const doc of this.docs.value) {
        for (const cls of doc.parsed.classes) set.add(cls);
      }
      return [...set].sort();
    });
    this.allSchools = computed(() => {
      const set = new Set<string>();
      for (const doc of this.docs.value) {
        if (doc.school) set.add(doc.school.toLowerCase());
      }
      return [...set].sort();
    });
    this.allSources = computed(() => {
      const set = new Set<string>();
      for (const doc of this.docs.value) {
        if (doc.source) set.add(doc.source);
      }
      return [...set].sort();
    });
  }

  folder(): string {
    return this.plugin.store.data.value.settings.spellsFolder.replace(
      /\/$/,
      "",
    );
  }

  init(): void {
    this.plugin.app.workspace.onLayoutReady(() => this.rebuild());
    this.plugin.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.inFolder(file.path)) this.scheduleRebuild();
      }),
    );
    this.plugin.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.inFolder(file.path) || this.inFolder(oldPath))
          this.scheduleRebuild();
      }),
    );
    this.plugin.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.inFolder(file.path)) this.scheduleRebuild();
      }),
    );
  }

  private inFolder(path: string): boolean {
    return path.startsWith(`${this.folder()}/`) && path.endsWith(".md");
  }

  /** Bulk syncs fire one metadata event per file — coalesce. */
  private scheduleRebuild(): void {
    if (this.rebuildTimer) window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), 200);
  }

  rebuild(): void {
    const start = performance.now();
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((f) => this.inFolder(f.path));
    const docs: SpellDoc[] = [];
    this.byName.clear();
    this.byId.clear();
    for (const file of files) {
      const doc = this.indexFile(file);
      if (!doc) continue;
      docs.push(doc);
      this.byName.set(doc.name.toLowerCase(), doc);
      this.byId.set(doc.id, doc);
    }
    docs.sort((a, b) => a.name.localeCompare(b.name));
    this.docs.value = docs;
    this.lastRebuildMs.value = Math.round(performance.now() - start);
  }

  private indexFile(file: TFile): SpellDoc | null {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    // skip non-spell files (the folder also holds ALL_SPELLS.json etc.)
    if (!fm || fm.id === undefined || fm.spellLevel === undefined) return null;
    const spellLevelRaw = fmStr(fm, "spellLevel");
    return {
      path: file.path,
      id: String(fm.id),
      name: fmStr(fm, "name") || file.basename,
      spellLevelRaw,
      parsed: parseSpellLevel(spellLevelRaw),
      school: fmStr(fm, "school"),
      source: fmStr(fm, "source"),
      range: fmStr(fm, "range"),
      castingTime: fmStr(fm, "castingTime"),
      components: fmStr(fm, "components"),
      targets: fmStr(fm, "targets"),
      duration: fmStr(fm, "duration"),
      saveType: fmStr(fm, "saveType"),
      sr: fmStr(fm, "sr"),
    };
  }
}
