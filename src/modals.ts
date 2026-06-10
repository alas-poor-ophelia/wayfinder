import { App, FuzzySuggestModal, Modal, Setting, TFile } from "obsidian";

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
    onSubmit: (value: string) => void
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
        .onClick(() => this.submit())
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
