import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { render } from "preact";
import { SpellDatabaseApp } from "../components/spelldb/SpellDatabaseApp";
import { VIEW_TYPE_SPELL_DB } from "../constants";
import type MiniSheetPlugin from "../main";

/**
 * Main-pane spell database: sortable/filterable view over the SpellIndex
 * that adds spells to a character's spellbook. Utilitarian, Obsidian-native
 * styling — root class is minisheet-spelldb-root (NOT minisheet-root) so
 * the sheet skin doesn't leak in.
 */
export class SpellDatabaseView extends ItemView {
  private plugin: MiniSheetPlugin;
  private root: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MiniSheetPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_SPELL_DB;
  }

  getDisplayText(): string {
    return "Spell database";
  }

  getIcon(): string {
    return "book-open";
  }

  async onOpen(): Promise<void> {
    this.root = this.contentEl.createDiv({ cls: "minisheet-spelldb-root" });
    render(<SpellDatabaseApp plugin={this.plugin} />, this.root);
  }

  async onClose(): Promise<void> {
    if (this.root) {
      render(null, this.root);
      this.root = null;
    }
  }
}
