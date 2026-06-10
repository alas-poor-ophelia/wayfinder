import { App, Modal, Setting } from "obsidian";

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
