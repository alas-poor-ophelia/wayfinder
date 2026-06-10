import { ItemView, WorkspaceLeaf } from "obsidian";
import { render } from "preact";
import { App } from "../components/App";
import { VIEW_TYPE_MINISHEET } from "../constants";
import type MiniSheetPlugin from "../main";

export class SheetView extends ItemView {
  private plugin: MiniSheetPlugin;
  private root: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiniSheetPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_MINISHEET;
  }

  getDisplayText(): string {
    return this.plugin.store.getCharacter()?.name ?? "MiniSheet";
  }

  getIcon(): string {
    return "shield";
  }

  async onOpen(): Promise<void> {
    this.root = this.contentEl.createDiv({ cls: "minisheet-root" });
    render(
      <App store={this.plugin.store} version={this.plugin.manifest.version} />,
      this.root
    );
  }

  async onClose(): Promise<void> {
    if (this.root) {
      render(null, this.root);
      this.root = null;
    }
  }
}
