import { App, PluginSettingTab, Setting } from "obsidian";
import type MiniSheetPlugin from "./main";

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
          "The Rules tab indexes and searches this folder."
      )
      .addText((text) =>
        text
          .setPlaceholder("Rules")
          .setValue(this.plugin.store.data.value.settings.rulesFolder)
          .onChange((value) => {
            this.plugin.store.updateSettings({ rulesFolder: value });
          })
      );
  }
}
