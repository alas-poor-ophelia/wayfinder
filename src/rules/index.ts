import { signal, type Signal } from "@preact/signals";
import type { TFile} from "obsidian";
import { type App } from "obsidian";
import type MiniSheetPlugin from "../main";
import { parseNote } from "./parse";

export type { RuleDoc } from "./model";
import type { RuleDoc } from "./model";

/**
 * Index of the rules folder: one markdown note per ability/feat/trait.
 * Title = first heading (fallback: basename); category = `category`
 * frontmatter. Bodies are cached for full-text search; the docs signal
 * re-renders the Rules tab whenever a note changes.
 */
export class RulesIndex {
  readonly docs: Signal<RuleDoc[]> = signal([]);
  private app: App;
  private plugin: MiniSheetPlugin;

  constructor(plugin: MiniSheetPlugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  folder(): string {
    return this.plugin.store.data.value.settings.rulesFolder.replace(/\/$/, "");
  }

  init(): void {
    this.plugin.app.workspace.onLayoutReady(() => void this.rebuild());
    this.plugin.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.inFolder(file.path)) void this.rebuild();
      }),
    );
    this.plugin.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.inFolder(file.path) || this.inFolder(oldPath))
          void this.rebuild();
      }),
    );
    this.plugin.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.inFolder(file.path)) void this.rebuild();
      }),
    );
  }

  private inFolder(path: string): boolean {
    return path.startsWith(`${this.folder()}/`) && path.endsWith(".md");
  }

  async rebuild(): Promise<void> {
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((f) => this.inFolder(f.path));
    const docs: RuleDoc[] = [];
    for (const file of files) {
      docs.push(await this.indexFile(file));
    }
    docs.sort((a, b) => a.title.localeCompare(b.title));
    this.docs.value = docs;
  }

  private async indexFile(file: TFile): Promise<RuleDoc> {
    const cache = this.app.metadataCache.getFileCache(file);
    const headings = cache?.headings?.map((h) => h.heading) ?? [];
    const category =
      (cache?.frontmatter?.category as string | undefined) ?? "General";
    const raw = await this.app.vault.cachedRead(file);
    // strip frontmatter from the body we render/search
    const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
    const parsed = parseNote(body, cache?.frontmatter ?? {});
    return {
      path: file.path,
      title: headings[0] ?? file.basename,
      category,
      headings,
      body,
      ...parsed,
    };
  }

  byPath(path: string): RuleDoc | undefined {
    return this.docs.value.find((d) => d.path === path);
  }
}
