import type { App, TFile } from "obsidian";
import {
  type ButtonComponent,
  FuzzySuggestModal,
  Modal,
  Notice,
  Setting,
} from "obsidian";
import type MiniSheetPlugin from "./main";
import { importRuleFromUrl } from "./rules/import-rule";
import type { CharacterRecord } from "./types/character";

/** Pick one of the stored characters (used to switch the active sheet). */
export class CharacterPickModal extends FuzzySuggestModal<CharacterRecord> {
  private characters: CharacterRecord[];
  private onChoose: (character: CharacterRecord) => void;

  constructor(
    app: App,
    characters: CharacterRecord[],
    onChoose: (character: CharacterRecord) => void,
  ) {
    super(app);
    this.characters = characters;
    this.onChoose = onChoose;
    this.setPlaceholder("Choose a character…");
  }

  getItems(): CharacterRecord[] {
    return this.characters;
  }

  getItemText(character: CharacterRecord): string {
    const cls = character.classes
      .map((c) => `${c.className} ${c.level}`)
      .join(" / ");
    return cls ? `${character.name} — ${cls}` : character.name;
  }

  onChooseItem(character: CharacterRecord): void {
    this.onChoose(character);
  }
}

/** Pick a markdown note (used to choose the legacy sheet to import). */
export class NotePickModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile) => void;

  constructor(app: App, placeholder: string, onChoose: (file: TFile) => void) {
    super(app);
    this.setPlaceholder(placeholder);
    this.onChoose = onChoose;
  }

  getItems(): TFile[] {
    const all = this.app.vault.getMarkdownFiles();
    const sheets = all.filter((f) => f.basename.includes("Mini Sheet"));
    return sheets.length > 0 ? sheets : all;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

/** Shows the result of a legacy import. */
export class ImportSummaryModal extends Modal {
  private summary: { name: string; warnings: string[] };

  constructor(app: App, summary: { name: string; warnings: string[] }) {
    super(app);
    this.summary = summary;
  }

  onOpen(): void {
    this.titleEl.setText(`Imported: ${this.summary.name}`);
    if (this.summary.warnings.length === 0) {
      this.contentEl.createEl("p", { text: "No warnings — clean import." });
    } else {
      this.contentEl.createEl("p", {
        text: `${this.summary.warnings.length} warning(s):`,
      });
      const ul = this.contentEl.createEl("ul");
      for (const w of this.summary.warnings) {
        ul.createEl("li", { text: w });
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** Simple one-field text prompt. */
export class TextPromptModal extends Modal {
  private value = "";
  private onSubmit: (value: string) => void;
  private heading: string;
  private label: string;

  constructor(
    app: App,
    heading: string,
    label: string,
    onSubmit: (value: string) => void,
  ) {
    super(app);
    this.heading = heading;
    this.label = label;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    this.titleEl.setText(this.heading);
    new Setting(this.contentEl).setName(this.label).addText((text) => {
      text.onChange((v) => (this.value = v));
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
      window.setTimeout(() => text.inputEl.focus(), 0);
    });
    new Setting(this.contentEl).addButton((btn) =>
      btn
        .setButtonText("Create")
        .setCta()
        .onClick(() => this.submit()),
    );
  }

  private submit(): void {
    const v = this.value.trim();
    if (!v) return;
    this.close();
    this.onSubmit(v);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** P7: import a single AoN rule page into the rules folder from inside
 *  Obsidian (no CLI / Node). Fetches via requestUrl, converts with the shared
 *  scrape seam, links the new note to the active character, and reveals it. */
export class ImportRuleModal extends Modal {
  private plugin: MiniSheetPlugin;
  private url = "";
  private category = "";
  private busy = false;
  private pendingOverwrite = false;
  private statusEl!: HTMLElement;
  private importBtn!: ButtonComponent;

  constructor(plugin: MiniSheetPlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
    this.titleEl.setText("Import rule");
    const { contentEl } = this;

    contentEl.createEl("p", {
      cls: "ms-modal-hint",
      text: "Paste a rule URL from aonprd.com (or a rule name). The page is fetched, converted to a typed note in your rules folder, and linked to the active character.",
    });

    new Setting(contentEl).setName("URL or rule name").addText((t) => {
      t.setPlaceholder("Paste a URL or rule name");
      t.onChange((v) => {
        this.url = v;
        this.resetOverwrite();
      });
      t.inputEl.addClass("ms-modal-input--full");
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") void this.run();
      });
      window.setTimeout(() => t.inputEl.focus(), 0);
    });

    new Setting(contentEl)
      .setName("Category")
      .setDesc("Optional — overrides the page's breadcrumb category.")
      .addText((t) => {
        t.setPlaceholder("(From page)");
        t.onChange((v) => (this.category = v));
      });

    this.statusEl = contentEl.createEl("p", { cls: "ms-modal-status" });

    new Setting(contentEl).addButton((b) => {
      this.importBtn = b;
      b.setButtonText("Fetch & import")
        .setCta()
        .onClick(() => void this.run());
    });
  }

  private resetOverwrite(): void {
    if (!this.pendingOverwrite) return;
    this.pendingOverwrite = false;
    this.importBtn?.setButtonText("Fetch & import");
  }

  private setStatus(msg: string, kind: "info" | "error" = "info"): void {
    this.statusEl.setText(msg);
    this.statusEl.style.color =
      kind === "error" ? "var(--text-error)" : "var(--text-muted)";
  }

  private async run(): Promise<void> {
    if (this.busy) return;
    const input = this.url.trim();
    if (!input) {
      this.setStatus("Enter a URL or rule name.", "error");
      return;
    }
    this.busy = true;
    this.importBtn.setDisabled(true);
    this.setStatus("Fetching…");

    const result = await importRuleFromUrl(this.plugin, input, {
      category: this.category.trim() || undefined,
      overwrite: this.pendingOverwrite,
    });

    this.busy = false;
    this.importBtn.setDisabled(false);

    if (result.exists) {
      this.pendingOverwrite = true;
      this.importBtn.setButtonText("Overwrite existing");
      this.setStatus(
        `"${result.title}" already exists. Click again to overwrite.`,
        "error",
      );
      return;
    }
    if (!result.ok) {
      this.setStatus(result.error ?? "Import failed.", "error");
      return;
    }

    new Notice(`Imported "${result.title}"`);
    this.plugin.store.setTab("rules");
    this.plugin.openRulePath.value = result.path ?? null;
    void this.plugin.activateView();
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
