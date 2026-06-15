import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { render } from "preact";
import { ConfigApp } from "../components/config/ConfigApp";
import { VIEW_TYPE_CONFIG } from "../constants";
import type MiniSheetPlugin from "../main";

/**
 * Main-pane character configuration: the ConfigSurface that used to render
 * as a sidebar overlay, given a full tab. Root class is
 * minisheet-config-root (NOT minisheet-root) so the sheet skin doesn't
 * leak in; the ms-config component styles are unscoped and apply as-is.
 */
export class ConfigView extends ItemView {
  private plugin: MiniSheetPlugin;
  private root: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiniSheetPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CONFIG;
  }

  getDisplayText(): string {
    return "Character configuration";
  }

  getIcon(): string {
    return "settings";
  }

  async onOpen(): Promise<void> {
    this.root = this.contentEl.createDiv({ cls: "minisheet-config-root" });
    render(
      <ConfigApp plugin={this.plugin} onClose={() => this.leaf.detach()} />,
      this.root,
    );
  }

  async onClose(): Promise<void> {
    if (this.root) {
      render(null, this.root);
      this.root = null;
    }
  }
}
