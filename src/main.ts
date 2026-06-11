import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { installBridge, removeBridge } from "./bridge/mcp-bridge";
import { num } from "./calc/abilities";
import {
  PLUGIN_ID,
  VIEW_TYPE_CONFIG,
  VIEW_TYPE_MINISHEET,
  VIEW_TYPE_PARTY_INV,
  VIEW_TYPE_SPELL_DB,
} from "./constants";
import { importLegacy, importLegacyInventory } from "./import/legacy-import";
import { ImportSummaryModal, NotePickModal, TextPromptModal } from "./modals";
import { RulesIndex } from "./rules/index";
import { MiniSheetSettingTab } from "./settings";
import { SpellIndex } from "./spells/index";
import { MiniSheetStore } from "./state/store";
import { ConfigView } from "./views/ConfigView";
import { PartyInventoryView } from "./views/PartyInventoryView";
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

    this.registerView(
      VIEW_TYPE_PARTY_INV,
      (leaf) => new PartyInventoryView(leaf, this)
    );

    this.registerView(
      VIEW_TYPE_CONFIG,
      (leaf) => new ConfigView(leaf, this)
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
          void this.activateConfigView();
        }).open();
      },
    });

    this.addCommand({
      id: "configure-character",
      name: "Configure character",
      callback: () => {
        if (!this.store.getCharacter()) return;
        void this.activateConfigView();
      },
    });

    this.addCommand({
      id: "open-spell-database",
      name: "Open spell database",
      callback: () => void this.activateSpellDbView(),
    });

    this.addCommand({
      id: "open-party-inventory",
      name: "Open party inventory",
      callback: () => void this.activatePartyInvView(),
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

    this.addCommand({
      id: "import-party-inventory",
      name: "Import legacy party inventory",
      callback: () => {
        new NotePickModal(
          this.app,
          "Pick the note holding the party inventory frontmatter",
          (file) => void this.importInventoryNote(file, "party")
        ).open();
      },
    });

    this.addCommand({
      id: "import-character-inventory",
      name: "Import legacy inventory (active character)",
      callback: () => {
        if (!this.store.getCharacter()) {
          new Notice("No active character to import into");
          return;
        }
        new NotePickModal(
          this.app,
          "Pick the note holding the inventory frontmatter",
          (file) => void this.importInventoryNote(file, "character")
        ).open();
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
    // The legacy inventory UI binds the CONFIG note's frontmatter, so pick
    // inventory up from there when present (empty stays absent — the
    // inventory subtab only renders for characters that have one).
    if (configFile && Array.isArray(config.inventory) && config.inventory.length > 0) {
      const inv = importLegacyInventory(config, { scope: "character" });
      record.inventory = inv.inventory;
      warnings.push(...inv.warnings.map((w) => `inventory: ${w}`));
    }
    // The legacy XP tracker binds the CONFIG note's `xp` key. Zero means
    // the tracker was never used (legacy initialXP) — skip it, like empty
    // inventories; "Track XP" on the Adjust tab opts back in.
    if (configFile && characterType === "pc" && num(config.xp) > 0) {
      record.xp = num(config.xp);
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
      if (!record.inventory && existing.inventory) {
        record.inventory = existing.inventory;
      }
      if (record.xp === undefined && existing.xp !== undefined) {
        record.xp = existing.xp;
      }
    }
    this.store.upsertCharacter(record);
    await this.store.flush();
    new ImportSummaryModal(this.app, { name, warnings }).open();
    void this.activateView();
  }

  /** Import legacy inventory/currency frontmatter into the party pool or
   *  the active character (one-time migration; data lives in data.json). */
  async importInventoryNote(file: TFile, scope: "party" | "character"): Promise<void> {
    const cache = this.app.metadataCache.getFileCache(file);
    const raw = cache?.frontmatter
      ? (JSON.parse(JSON.stringify(cache.frontmatter)) as Record<string, unknown>)
      : null;
    if (!raw) {
      new Notice(`No frontmatter found on ${file.path}`);
      return;
    }
    const { inventory, warnings } = importLegacyInventory(raw, {
      scope: scope === "party" ? "party" : "character",
    });
    let name: string;
    if (scope === "party") {
      this.store.setPartyInventory(inventory);
      name = "Party inventory";
    } else {
      const character = this.store.getCharacter();
      if (!character) {
        new Notice("No active character to import into");
        return;
      }
      this.store.setCharacterField(character.id, "inventory", inventory);
      name = `${character.name} inventory`;
    }
    await this.store.flush();
    new ImportSummaryModal(this.app, { name, warnings }).open();
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

  /** Open (or reveal) the party inventory in the main pane. */
  async activatePartyInvView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_PARTY_INV)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_PARTY_INV, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  /** Open (or reveal) the character configuration in the main pane. */
  async activateConfigView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_CONFIG)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_CONFIG, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
}
