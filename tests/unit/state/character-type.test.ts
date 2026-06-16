/**
 * setCharacterType: seeding/pruning the derived master link + companionLevel
 * when an existing sheet's type is flipped (parity with the New-sheet creator).
 */
import { describe, expect, it } from "vitest";
import type { Plugin } from "obsidian";
import { MiniSheetStore } from "../../../src/state/store";
import { createDefaultCharacter } from "../../../src/types/character";

function makeStore() {
  const plugin = {
    loadData: async () => null,
    saveData: async () => undefined,
  } as unknown as Plugin;
  return new MiniSheetStore(plugin);
}

/** A store with a PC master ("knight") and a second sheet ("pet"). */
function withPair() {
  const store = makeStore();
  store.upsertCharacter(createDefaultCharacter("knight", "Knight"));
  store.upsertCharacter(createDefaultCharacter("pet", "Pet"));
  return store;
}

describe("setCharacterType", () => {
  it("→ companion seeds level 1 and links the first other PC", () => {
    const store = withPair();
    store.setCharacterType("pet", "companion");
    const pet = store.getCharacter("pet")!;
    expect(pet.characterType).toBe("companion");
    expect(pet.companionLevel).toBe(1);
    expect(pet.link?.masterId).toBe("knight");
    expect(pet.link?.hpMaxFromMaster).toBe(false);
    expect(pet.link?.babFromMaster).toBe(false);
  });

  it("→ familiar links the first other PC without a companion level", () => {
    const store = withPair();
    store.setCharacterType("pet", "familiar");
    const pet = store.getCharacter("pet")!;
    expect(pet.characterType).toBe("familiar");
    expect(pet.link?.masterId).toBe("knight");
    expect(pet.companionLevel).toBeUndefined();
  });

  it("→ pc prunes the master link and companion level", () => {
    const store = withPair();
    store.setCharacterType("pet", "companion");
    store.setCharacterType("pet", "pc");
    const pet = store.getCharacter("pet")!;
    expect(pet.characterType).toBe("pc");
    expect(pet.link).toBeUndefined();
    expect(pet.companionLevel).toBeUndefined();
  });

  it("preserves an existing master + flags when re-flipping type", () => {
    const store = withPair();
    store.setCharacterType("pet", "familiar");
    store.updateCharacter("pet", {
      link: { masterId: "knight", hpMaxFromMaster: true, babFromMaster: true },
    });
    store.setCharacterType("pet", "companion");
    const pet = store.getCharacter("pet")!;
    expect(pet.link?.masterId).toBe("knight");
    expect(pet.link?.hpMaxFromMaster).toBe(true);
    expect(pet.link?.babFromMaster).toBe(true);
    expect(pet.companionLevel).toBe(1);
  });

  it("leaves the link unset when no other PC exists to be master", () => {
    const store = makeStore();
    store.upsertCharacter(createDefaultCharacter("solo", "Solo"));
    store.setCharacterType("solo", "familiar");
    const solo = store.getCharacter("solo")!;
    expect(solo.characterType).toBe("familiar");
    expect(solo.link).toBeUndefined();
  });
});
