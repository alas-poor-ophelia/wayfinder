import { ItemView, WorkspaceLeaf } from "obsidian";
import { render } from "preact";
import { PartyInventoryApp } from "../components/partyinv/PartyInventoryApp";
import { VIEW_TYPE_PARTY_INV } from "../constants";
import type MiniSheetPlugin from "../main";

/**
 * Main-pane party inventory: the shared loot pool (data.json
 * partyInventory), ported from the legacy InventoryManager-Party.jsx.
 * Root class is minisheet-partyinv-root (NOT minisheet-root) so the
 * sheet skin doesn't leak in.
 */
export class PartyInventoryView extends ItemView {
  private plugin: MiniSheetPlugin;
  private root: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiniSheetPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_PARTY_INV;
  }

  getDisplayText(): string {
    return "Party Inventory";
  }

  getIcon(): string {
    return "backpack";
  }

  async onOpen(): Promise<void> {
    this.root = this.contentEl.createDiv({ cls: "minisheet-partyinv-root" });
    render(<PartyInventoryApp plugin={this.plugin} />, this.root);
  }

  async onClose(): Promise<void> {
    if (this.root) {
      render(null, this.root);
      this.root = null;
    }
  }
}
