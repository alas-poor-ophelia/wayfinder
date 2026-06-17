import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type MiniSheetPlugin from "./main";
import { isCarrelInstalled } from "./util/carrel";

export class MiniSheetSettingTab extends PluginSettingTab {
  private plugin: MiniSheetPlugin;

  constructor(app: App, plugin: MiniSheetPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Rules folder")
      .setDesc(
        "Vault folder containing rules notes (one note per ability/feat/trait). " +
          "The Rules tab indexes and searches this folder.",
      )
      .addText((text) =>
        text
          .setPlaceholder("Rules")
          .setValue(this.plugin.store.data.value.settings.rulesFolder)
          .onChange((value) => {
            this.plugin.store.updateSettings({ rulesFolder: value });
          }),
      );

    new Setting(containerEl)
      .setName("Spells folder")
      .setDesc(
        "Vault folder containing spell notes (one note per spell). " +
          "Spell name links on the spells tab resolve into this folder.",
      )
      .addText((text) =>
        text
          .setPlaceholder("Folder for spell notes")
          .setValue(this.plugin.store.data.value.settings.spellsFolder)
          .onChange((value) => {
            this.plugin.store.updateSettings({ spellsFolder: value });
            // the index only watches vault events; a folder change must
            // trigger its own rebuild
            this.plugin.spellIndex.rebuild();
          }),
      );

    new Setting(containerEl)
      .setName("Custom items file")
      .setDesc(
        "JSON file holding forged custom magic items, tracked by file name " +
          "anywhere in the vault. Created at the vault root on first save.",
      )
      .addText((text) =>
        text

          .setPlaceholder("minisheet-items.json")
          .setValue(this.plugin.store.data.value.settings.customItemsFileName)
          .onChange((value) => {
            this.plugin.store.updateSettings({ customItemsFileName: value });
            // re-locate + reload against the newly named file
            void this.plugin.customItems.load();
          }),
      );

    new Setting(containerEl)
      .setName("Elephant in the room")
      .setDesc(
        "Apply the Elephant in the Room feat-tax houserules vault-wide: " +
          "finesse weapons grant Dexterity to attack, damage, and CMB with " +
          "no feat. Off reverts to RAW (Strength-based CMB, Weapon Finesse " +
          "only via its toggle / a class grant). Defaults on.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.store.data.value.settings.houseRules
              ?.elephantInTheRoom ?? true,
          )
          .onChange((value) => {
            this.plugin.store.updateSettings({
              houseRules: {
                ...this.plugin.store.data.value.settings.houseRules,
                elephantInTheRoom: value,
              },
            });
          }),
      );

    // Shown only when the Carrel plugin is installed: route the References tab
    // through Carrel's board (themed to the sheet) instead of the barebones list.
    if (isCarrelInstalled(this.app)) {
      new Setting(containerEl)
        .setName("Carrel for references")
        .setDesc(
          "Render the References tab with the Carrel plugin's board — typed " +
            "cards, pins, and category filters, themed to the character sheet. " +
            "Off uses the built-in barebones list.",
        )
        .addToggle((toggle) =>
          toggle
            .setValue(
              this.plugin.store.data.value.settings.useCarrelReferences ??
                false,
            )
            .onChange((value) => {
              this.plugin.store.updateSettings({ useCarrelReferences: value });
            }),
        );
    }
  }
}
