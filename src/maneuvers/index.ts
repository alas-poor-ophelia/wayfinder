import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { App, TFile } from "obsidian";
import type MiniSheetPlugin from "../main";
import {
  maneuverId,
  type ManeuverLevel,
  type ManeuverType,
} from "../types/maneuverbook";

export interface ManeuverDoc {
  path: string;
  id: string;
  name: string;
  discipline: string;
  level: ManeuverLevel;
  type: ManeuverType;
  action: string;
  range: string;
  target: string;
  duration: string;
  save: string;
  prerequisites: string;
  skill: string;
  source: string;
  // body intentionally NOT cached — read lazily on open, like SpellIndex
}

function fmStr(fm: Record<string, unknown> | undefined, key: string): string {
  const v = fm?.[key];
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

const TYPES: ManeuverType[] = ["Strike", "Boost", "Counter", "Stance"];

function asType(raw: string): ManeuverType | null {
  return TYPES.find((t) => t.toLowerCase() === raw.toLowerCase()) ?? null;
}

function asLevel(raw: unknown): ManeuverLevel | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 9 ? (n as ManeuverLevel) : null;
}

/**
 * Index of the Path of War maneuvers folder (one note per maneuver). A clone of
 * SpellIndex: frontmatter-only via metadataCache (no body reads), debounced
 * rebuild because bulk syncs fire one metadata event per file. A note is a
 * maneuver iff its frontmatter carries `discipline`, a 1–9 `level`, and a valid
 * `type` — everything else in the folder is skipped.
 */
export class ManeuverIndex {
  readonly docs: Signal<ManeuverDoc[]> = signal([]);
  readonly lastRebuildMs: Signal<number> = signal(0);
  readonly byName: Map<string, ManeuverDoc> = new Map();
  readonly byId: Map<string, ManeuverDoc> = new Map();
  readonly allDisciplines: ReadonlySignal<string[]>;
  readonly allSources: ReadonlySignal<string[]>;

  private app: App;
  private plugin: MiniSheetPlugin;
  private rebuildTimer: number | null = null;

  constructor(plugin: MiniSheetPlugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.allDisciplines = computed(() => {
      const set = new Set<string>();
      for (const doc of this.docs.value)
        if (doc.discipline) set.add(doc.discipline);
      return [...set].sort();
    });
    this.allSources = computed(() => {
      const set = new Set<string>();
      for (const doc of this.docs.value) if (doc.source) set.add(doc.source);
      return [...set].sort();
    });
  }

  folder(): string {
    return this.plugin.store.data.value.settings.maneuversFolder.replace(
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
    const docs: ManeuverDoc[] = [];
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

  private indexFile(file: TFile): ManeuverDoc | null {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const discipline = fmStr(fm, "discipline");
    const level = asLevel(fm?.level);
    const type = asType(fmStr(fm, "type"));
    if (!discipline || level === null || type === null) return null;
    const name = fmStr(fm, "name") || file.basename;
    return {
      path: file.path,
      id: maneuverId(discipline, name),
      name,
      discipline,
      level,
      type,
      action: fmStr(fm, "action"),
      range: fmStr(fm, "range"),
      target: fmStr(fm, "target"),
      duration: fmStr(fm, "duration"),
      save: fmStr(fm, "save"),
      prerequisites: fmStr(fm, "prerequisites"),
      skill: fmStr(fm, "skill"),
      source: fmStr(fm, "source"),
    };
  }
}
