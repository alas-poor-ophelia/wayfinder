import type { App } from "obsidian";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import type MiniSheetPlugin from "./main";
import { characterStorageMode, pathOfWarEnabled } from "./types/data-file";
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

    // Only relevant when Path of War is enabled — keep it out of the way otherwise.
    if (pathOfWarEnabled(this.plugin.store.data.value.settings)) {
      new Setting(containerEl)
        .setName("Maneuvers folder")
        .setDesc(
          "Vault folder containing Path of War maneuver notes (one note per " +
            "maneuver). Maneuver name links on the maneuvers tab resolve into " +
            "this folder.",
        )
        .addText((text) =>
          text
            .setPlaceholder("Folder for maneuver notes")
            .setValue(this.plugin.store.data.value.settings.maneuversFolder)
            .onChange((value) => {
              this.plugin.store.updateSettings({ maneuversFolder: value });
              this.plugin.maneuverIndex.rebuild();
            }),
        );
    }

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

    const storageMode = characterStorageMode(
      this.plugin.store.data.value.settings,
    );

    new Setting(containerEl)
      .setName("Character storage")
      .setDesc(
        "Where character data is saved. Plugin data (the default) keeps it in " +
          "the plugin's data.json. The vault options store it as JSON file(s) " +
          "in your vault so Obsidian Sync treats it like notes — only " +
          "per-character files reduce sync conflicts (each character edit " +
          "rewrites just its own file); a single file syncs no better than the " +
          "default. Switching modes moves your existing characters.",
      )
      .addDropdown((dd) => {
        dd.addOption("plugin", "Plugin data (default)");
        dd.addOption("vault-single", "Single vault file (no sync benefit)");
        dd.addOption("vault-per-character", "One vault file per character");
        dd.setValue(storageMode);
        dd.onChange((value) => {
          const next = value as ReturnType<typeof characterStorageMode>;
          void (async () => {
            const ok = await this.plugin.store.migrateStorage(
              storageMode,
              next,
            );
            if (ok) {
              new Notice(`Wayfinder: character storage set to "${next}".`);
            } else {
              new Notice(
                "Wayfinder: could not verify the new storage location; " +
                  "kept the previous one.",
              );
            }
            this.display();
          })();
        });
      });

    if (storageMode !== "plugin") {
      new Setting(containerEl)
        .setName("Character storage folder")
        .setDesc(
          "Vault folder for the character file(s). Leave empty to keep them at " +
            "the vault root (located by name anywhere, like the custom items " +
            "file). Changing this moves the existing file(s).",
        )
        .addText((text) =>
          text
            .setPlaceholder("(Vault root)")
            .setValue(
              this.plugin.store.data.value.settings.characterStorageFolder ??
                "",
            )
            .onChange((value) => {
              void (async () => {
                const ok = await this.plugin.store.relocateStorage(value);
                if (!ok) {
                  new Notice(
                    "Wayfinder: could not verify the new folder; old files " +
                      "left in place.",
                  );
                }
              })();
            }),
        );
    }

    const backupOn =
      this.plugin.store.data.value.settings.characterBackup ?? false;

    new Setting(containerEl)
      .setName("Back up characters")
      .setDesc(
        "Off by default. When on, every save also writes a whole-roster " +
          "snapshot to a separate file (wayfinder-backup.json) — a recovery " +
          "copy independent of the primary storage above, in any mode.",
      )
      .addToggle((toggle) =>
        toggle.setValue(backupOn).onChange((value) => {
          this.plugin.store.updateSettings({ characterBackup: value });
          // write the first snapshot immediately so enabling it is visible
          if (value) void this.plugin.store.backupNow();
          this.display();
        }),
      );

    if (backupOn) {
      new Setting(containerEl)
        .setName("Backup folder")
        .setDesc("Vault folder for the backup file. Leave empty for the root.")
        .addText((text) =>
          text
            .setPlaceholder("(Vault root)")
            .setValue(
              this.plugin.store.data.value.settings.characterBackupFolder ?? "",
            )
            .onChange((value) => {
              this.plugin.store.updateSettings({
                characterBackupFolder: value,
              });
              void this.plugin.store.backupNow();
            }),
        );
    }

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

    new Setting(containerEl)
      .setName("Path of War")
      .setDesc(
        "Enable Path of War (3rd-party) martial maneuvers: the Maneuvers " +
          "tab, the maneuver database, and the combat-config maneuvers " +
          "section. Off by default; turning it off only hides these surfaces " +
          "and leaves any maneuver data intact.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.store.data.value.settings.pathOfWar ?? false)
          .onChange((value) => {
            this.plugin.store.updateSettings({ pathOfWar: value });
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
