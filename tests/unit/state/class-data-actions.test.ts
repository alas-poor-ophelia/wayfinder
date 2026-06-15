/**
 * Store actions over the class/race registries: setRace, applyClassSkills
 * ("(any)" group matching), and syncClassResources (upsert semantics).
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

function withCharacter() {
  const store = makeStore();
  const c = createDefaultCharacter("hero", "Hero");
  c.classes = [{ className: "Monk", level: 6 }];
  c.baseAbilities = { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 };
  c.skills = {
    Acrobatics: { ability: "dex", ranks: 3, misc: 0, classSkill: false },
    "Perform (Sing)": { ability: "cha", ranks: 1, misc: 0, classSkill: false },
    Disguise: { ability: "cha", ranks: 1, misc: 0, classSkill: true },
    Heal: { ability: "wis", ranks: 0, misc: 0, classSkill: false },
  };
  store.upsertCharacter(c);
  return store;
}

describe("setRace", () => {
  it("sets key + display label, and clears on (custom)", () => {
    const store = withCharacter();
    store.setRace("hero", "half-orc");
    let hero = store.getCharacter("hero")!;
    expect(hero.raceKey).toBe("half-orc");
    expect(hero.race).toBe("Half-Orc");
    store.setRace("hero", null);
    hero = store.getCharacter("hero")!;
    expect(hero.raceKey).toBeUndefined();
    expect(hero.race).toBe("Half-Orc"); // label survives as free text
  });

  it("drops a flexible-ability choice when the new race is fixed", () => {
    const store = withCharacter();
    store.setRace("hero", "human");
    store.setCharacterField("hero", "raceAbilityChoice", "str");
    store.setRace("hero", "dwarf");
    expect(store.getCharacter("hero")!.raceAbilityChoice).toBeUndefined();
  });
});

describe("applyClassSkills", () => {
  it("flags class skills including (any) groups, never unflags", () => {
    const store = withCharacter();
    store.applyClassSkills("hero");
    const skills = store.getCharacter("hero")!.skills;
    expect(skills["Acrobatics"].classSkill).toBe(true); // monk class skill
    expect(skills["Perform (Sing)"].classSkill).toBe(true); // via "Perform (any)"
    expect(skills["Disguise"].classSkill).toBe(true); // kept (was true already)
    expect(skills["Heal"].classSkill).toBe(false); // not a monk skill
  });
});

describe("syncClassResources", () => {
  it("creates pools full, then reclamps on resync without losing spend", () => {
    const store = withCharacter();
    store.syncClassResources("hero");
    let pools = store.getCharacter("hero")!.resources;
    const ki = pools.find((p) => p.id === "kiPool")!;
    expect(ki.max).toBe(6); // floor(6/2) + 3 wis
    expect(ki.current).toBe(6);

    // spend two points, level up, resync: max grows, current preserved
    store.setCharacterField("hero", "resources", [
      ...pools.map((p) => (p.id === "kiPool" ? { ...p, current: 4 } : p)),
    ]);
    store.setCharacterField("hero", "classes", [
      { className: "Monk", level: 8 },
    ]);
    store.syncClassResources("hero");
    pools = store.getCharacter("hero")!.resources;
    expect(pools.find((p) => p.id === "kiPool")).toMatchObject({
      max: 7,
      current: 4,
    });
  });

  it("leaves unknown pools untouched", () => {
    const store = withCharacter();
    store.setCharacterField("hero", "resources", [
      { id: "custom", name: "Custom", current: 2, max: 3 },
    ]);
    store.syncClassResources("hero");
    const custom = store
      .getCharacter("hero")!
      .resources.find((p) => p.id === "custom");
    expect(custom).toMatchObject({ current: 2, max: 3 });
  });
});
