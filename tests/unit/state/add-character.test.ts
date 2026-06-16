/**
 * addCharacter seeds a new sheet with only the truly-default quick actions
 * (not the legacy full grab-bag), with Power Attack gated on Elephant in the
 * Room. Existing characters are untouched — the trim lives on the create path.
 */
import { describe, expect, it } from "vitest";
import type { Plugin } from "obsidian";
import { MiniSheetStore } from "../../../src/state/store";

function makeStore() {
  const plugin = {
    loadData: async () => null,
    saveData: async () => undefined,
  } as unknown as Plugin;
  return new MiniSheetStore(plugin);
}

describe("addCharacter quick-action seed", () => {
  it("seeds the default actions + Power Attack under EitR (default on)", () => {
    const store = makeStore();
    const rec = store.addCharacter("Hero");
    expect(rec.quickActions!.map((q) => q.id)).toEqual([
      "powerAttack",
      "fightingDefensively",
      "charge",
      "flank",
    ]);
  });

  it("drops Power Attack when Elephant in the Room is disabled", () => {
    const store = makeStore();
    store.updateSettings({ houseRules: { elephantInTheRoom: false } });
    const rec = store.addCharacter("Hero");
    expect(rec.quickActions!.map((q) => q.id)).toEqual([
      "fightingDefensively",
      "charge",
      "flank",
    ]);
  });

  it("never seeds class-specific legacy actions onto a new sheet", () => {
    const store = makeStore();
    const ids = new Set(store.addCharacter("Hero").quickActions!.map((q) => q.id));
    expect(ids.has("smiteEvil")).toBe(false);
    expect(ids.has("flurryOfBlows")).toBe(false);
    expect(ids.has("weaponSong")).toBe(false);
  });
});
