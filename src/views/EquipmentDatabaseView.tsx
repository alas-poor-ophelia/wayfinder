import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { render } from "preact";
import { EquipmentDatabaseApp } from "../components/equipdb/EquipmentDatabaseApp";
import { VIEW_TYPE_EQUIP_DB } from "../constants";
import type MiniSheetPlugin from "../main";

/**
 * Main-pane equipment database: sortable/filterable view over the bundled
 * catalog (weapons, armor, magic items) plus the custom-item forge, adding
 * items to any character's inventory. Utilitarian, Obsidian-native styling
 * — root class is minisheet-equipdb-root (NOT minisheet-root) so the sheet
 * skin doesn't leak in.
 */
export class EquipmentDatabaseView extends ItemView {
  private plugin: MiniSheetPlugin;
  private root: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiniSheetPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_EQUIP_DB;
  }

  getDisplayText(): string {
    return "Equipment database";
  }

  getIcon(): string {
    return "swords";
  }

  async onOpen(): Promise<void> {
    this.root = this.contentEl.createDiv({ cls: "minisheet-equipdb-root" });
    render(<EquipmentDatabaseApp plugin={this.plugin} />, this.root);
  }

  async onClose(): Promise<void> {
    if (this.root) {
      render(null, this.root);
      this.root = null;
    }
  }
}
