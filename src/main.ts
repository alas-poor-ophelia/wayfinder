import { Plugin, WorkspaceLeaf } from "obsidian";
import { installBridge, removeBridge } from "./bridge/mcp-bridge";
import { VIEW_TYPE_MINISHEET } from "./constants";
import { TextPromptModal } from "./modals";
import { MiniSheetSettingTab } from "./settings";
import { MiniSheetStore } from "./state/store";
import { SheetView } from "./views/SheetView";

export default class MiniSheetPlugin extends Plugin {
  store!: MiniSheetStore;

  async onload(): Promise<void> {
    this.store = new MiniSheetStore(this);
    await this.store.load();

    this.registerView(
      VIEW_TYPE_MINISHEET,
      (leaf) => new SheetView(leaf, this)
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

    this.addSettingTab(new MiniSheetSettingTab(this.app, this));

    installBridge(this);
  }

  onunload(): void {
    removeBridge();
    void this.store.flush();
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
}
