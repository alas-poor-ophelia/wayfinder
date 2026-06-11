import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { installBridge, removeBridge } from "./bridge/mcp-bridge";
import { PLUGIN_ID, VIEW_TYPE_MINISHEET, VIEW_TYPE_SPELL_DB } from "./constants";
import { importLegacy } from "./import/legacy-import";
import { ImportSummaryModal, NotePickModal, TextPromptModal } from "./modals";
import { RulesIndex } from "./rules/index";
import { MiniSheetSettingTab } from "./settings";
import { SpellIndex } from "./spells/index";
import { MiniSheetStore } from "./state/store";
import { SheetView } from "./views/SheetView";
import { SpellDatabaseView } from "./views/SpellDatabaseView";

export default class MiniSheetPlugin extends Plugin {
  store!: MiniSheetStore;
  rulesIndex!: RulesIndex;
  spellIndex!: SpellIndex;

  async onload(): Promise<void> {
    this.store = new MiniSheetStore(this);
    await this.store.load();

    this.rulesIndex = new RulesIndex(this);
    this.rulesIndex.init();

    this.spellIndex = new SpellIndex(this);
    this.spellIndex.init();

    this.registerView(
      VIEW_TYPE_MINISHEET,
      (leaf) => new SheetView(leaf, this)
    );

    this.registerView(
      VIEW_TYPE_SPELL_DB,
      (leaf) => new SpellDatabaseView(leaf, this)
    );

    this.addRibbonIcon("shield", "Open MiniSheet", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-sheet",
      name: "Open sheet",
      callback: () => void this.activateView(),
    });

    this.addCommand({
      id: "new-character",
      name: "New character",
      callback: () => {
        new TextPromptModal(this.app, "New character", "Name", (name) => {
          this.store.addCharacter(name);
          this.store.setConfigOpen(true);
          void this.activateView();
        }).open();
      },
    });

    this.addCommand({
      id: "configure-character",
      name: "Configure character",
      callback: () => {
        if (!this.store.getCharacter()) return;
        this.store.setConfigOpen(true);
        void this.activateView();
      },
    });

    this.addCommand({
      id: "open-spell-database",
      name: "Open spell database",
      callback: () => void this.activateSpellDbView(),
    });

    this.addCommand({
      id: "import-legacy-sheet",
      name: "Import legacy sheet",
      callback: () => {
        new NotePickModal(this.app, "Pick the old Mini Sheet note", (file) => {
          void this.importLegacySheet(file);
        }).open();
      },
    });

    this.addSettingTab(new MiniSheetSettingTab(this.app, this));

    // spell-name links in the sheet + database trigger hover-link events;
    // registering the source makes Page Preview honor them (no Ctrl needed)
    this.registerHoverLinkSource(PLUGIN_ID, {
      display: "MiniSheet",
      defaultMod: false,
    });

    installBridge(this);
  }

  onunload(): void {
    removeBridge();
    void this.store.flush();
  }

  /**
   * Import an old Meta Bind sheet (sheet note + its companion config note
   * under <folder>/components/*MiniSheetConfig.md) into plugin state.
   */
  async importLegacySheet(sheetFile: TFile): Promise<void> {
    const cache = this.app.metadataCache.getFileCache(sheetFile);
    const sheet = cache?.frontmatter
      ? (JSON.parse(JSON.stringify(cache.frontmatter)) as Record<string, unknown>)
      : null;
    if (!sheet) {
      new Notice(`No frontmatter found on ${sheetFile.path}`);
      return;
    }

    const folder = sheetFile.parent?.path ?? "";
    const configFile = this.app.vault
      .getMarkdownFiles()
      .find(
        (f) =>
          f.path.startsWith(`${folder}/components/`) &&
          f.basename.endsWith("MiniSheetConfig")
      );
    const config = configFile
      ? ((JSON.parse(
          JSON.stringify(
            this.app.metadataCache.getFileCache(configFile)?.frontmatter ?? {}
          )
        ) as Record<string, unknown>) ?? {})
      : {};

    const name = sheetFile.basename.replace(/\s*Mini Sheet$/i, "");
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const characterType = "masterLevel" in sheet || "masterLevel" in config ? "familiar" : "pc";

    // The legacy spellbook note lives elsewhere in the vault
    // (z_Components/spellbooks/<Name>SpellBook.md); match by basename.
    const spellbookFile = this.app.vault
      .getMarkdownFiles()
      .find((f) => f.basename === `${name}SpellBook`);
    const spellbook = spellbookFile
      ? (JSON.parse(
          JSON.stringify(
            this.app.metadataCache.getFileCache(spellbookFile)?.frontmatter ?? {}
          )
        ) as Record<string, unknown>)
      : undefined;

    const { record, warnings } = importLegacy({
      id,
      name,
      characterType,
      sheet,
      config,
      spellbook,
    });
    if (!configFile) {
      warnings.unshift(`No companion config note found under ${folder}/components/`);
    }
    if (!spellbookFile && characterType === "pc") {
      warnings.push(`No ${name}SpellBook note found in the vault; spellbook not imported`);
    }
    // Re-imports must not clobber fields the importer doesn't know about.
    const existing = this.store.getCharacter(id);
    if (existing) {
      if (!record.bannerImage && existing.bannerImage) {
        record.bannerImage = existing.bannerImage;
      }
      if (record.ruleLinks.length === 0 && existing.ruleLinks.length > 0) {
        record.ruleLinks = existing.ruleLinks;
      }
      if (existing.link) record.link = existing.link;
    }
    this.store.upsertCharacter(record);
    await this.store.flush();
    new ImportSummaryModal(this.app, { name, warnings }).open();
    void this.activateView();
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_MINISHEET)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_MINISHEET, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  /** Open (or reveal) the spell database in the main pane. */
  async activateSpellDbView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_SPELL_DB)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_SPELL_DB, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
}
