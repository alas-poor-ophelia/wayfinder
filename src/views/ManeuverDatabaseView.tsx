import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { render } from "preact";
import { ManeuverDatabaseApp } from "../components/maneuverdb/ManeuverDatabaseApp";
import { VIEW_TYPE_MANEUVER_DB } from "../constants";
import type MiniSheetPlugin from "../main";

/**
 * Main-pane Path of War maneuver database: sortable/filterable view over the
 * ManeuverIndex that adds maneuvers to a character's maneuverbook. Reuses the
 * spell database's neutral skin (root class minisheet-spelldb-root + the
 * .ms-spelldb* classes) — it's a generic database chrome, not the sheet skin.
 */
export class ManeuverDatabaseView extends ItemView {
  private plugin: MiniSheetPlugin;
  private root: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiniSheetPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_MANEUVER_DB;
  }

  getDisplayText(): string {
    return "Maneuver database";
  }

  getIcon(): string {
    return "swords";
  }

  async onOpen(): Promise<void> {
    this.root = this.contentEl.createDiv({ cls: "minisheet-spelldb-root" });
    render(<ManeuverDatabaseApp plugin={this.plugin} />, this.root);
  }

  async onClose(): Promise<void> {
    if (this.root) {
      render(null, this.root);
      this.root = null;
    }
  }
}
