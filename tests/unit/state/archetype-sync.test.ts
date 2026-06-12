/**
 * Archetype-aware sync semantics: suppressed pools/quick-actions are pruned
 * on sync (with user-formula and item-pool immunity), altered pools survive
 * under the same id with the archetype formula, and unchecking an archetype
 * restores everything via one more sync.
 */
import { describe, expect, it } from "vitest";
import type { Plugin } from "obsidian";
import { MiniSheetStore } from "../../../src/state/store";
import { createDefaultCharacter } from "../../../src/types/character";

function makeStore(level = 5, ...archetypeKeys: string[]) {
  const plugin = {
    loadData: async () => null,
    saveData: async () => undefined,
  } as unknown as Plugin;
  const store = new MiniSheetStore(plugin);
  const c = createDefaultCharacter("pal", "Pal");
  c.classes = [
    {
      className: "Paladin",
      level,
      ...(archetypeKeys.length ? { archetypeKeys } : {}),
    },
  ];
  c.baseAbilities = { str: 14, dex: 10, con: 12, int: 10, wis: 10, cha: 16 };
  // start from a blank action list — createDefaultCharacter seeds the
  // legacy default set (which already includes smiteEvil/preciseStrike)
  c.quickActions = [];
  store.upsertCharacter(c);
  return store;
}

function setArchetypes(store: MiniSheetStore, keys: string[] | undefined) {
  const record = store.getCharacter("pal")!;
  const { archetypeKeys: _drop, ...rest } = record.classes[0];
  store.setCharacterField("pal", "classes", [
    { ...rest, ...(keys ? { archetypeKeys: keys } : {}) },
  ]);
}

const poolIds = (store: MiniSheetStore) =>
  store.getCharacter("pal")!.resources.map((r) => r.id);

describe("syncClassResources with archetypes", () => {
  it("stonelord prunes the previously-synced smite pool and grants stonestrike", () => {
    const store = makeStore();
    store.syncClassResources("pal");
    expect(poolIds(store)).toContain("smiteEvil");

    setArchetypes(store, ["stonelord"]);
    store.syncClassResources("pal");
    expect(poolIds(store)).not.toContain("smiteEvil");
    expect(poolIds(store)).toContain("layOnHands");
    const stonestrike = store
      .getCharacter("pal")!
      .resources.find((r) => r.id === "stonestrike");
    expect(stonestrike?.max).toBe(5); // once per day per paladin level
  });

  it("altered pools keep their id and spend: gray paladin's delayed smite", () => {
    const store = makeStore();
    store.syncClassResources("pal");
    // spend a use, then take the archetype
    const spent = store
      .getCharacter("pal")!
      .resources.map((r) => (r.id === "smiteEvil" ? { ...r, current: 1 } : r));
    store.setCharacterField("pal", "resources", spent);

    setArchetypes(store, ["gray-paladin"]);
    store.syncClassResources("pal");
    const smite = store
      .getCharacter("pal")!
      .resources.find((r) => r.id === "smiteEvil");
    // level 5: 1 + floor(4/3) = 2 uses; current spend preserved (clamped)
    expect(smite?.max).toBe(2);
    expect(smite?.current).toBe(1);
  });

  it("never prunes user-formula or item pools", () => {
    const store = makeStore();
    store.syncClassResources("pal");
    const customized = store.getCharacter("pal")!.resources.map((r) =>
      r.id === "smiteEvil"
        ? { ...r, formula: { kind: "flat" as const, value: 9 } }
        : r
    );
    customized.push({
      id: "layOnHands",
      name: "Wand Charges (LoH)",
      current: 3,
      max: 3,
      kind: "item" as const,
    });
    store.setCharacterField("pal", "resources", customized);

    setArchetypes(store, ["stonelord", "warrior-of-the-holy-light"]);
    store.syncClassResources("pal");
    const ids = poolIds(store);
    // formula'd smite survives stonelord's suppression
    expect(ids).toContain("smiteEvil");
    // layOnHands appears twice: the item pool (immune) and the re-added
    // archetype pool share the id — both survive
    expect(ids.filter((x) => x === "layOnHands").length).toBeGreaterThan(0);
  });

  it("scaled fist re-keys the ki pool to CHA on sync (Draconic Might)", () => {
    const store = makeStore();
    // wis +2, cha +4 — distinct so the formula source is unambiguous
    store.setCharacterField("pal", "baseAbilities", {
      str: 14,
      dex: 14,
      con: 12,
      int: 10,
      wis: 14,
      cha: 18,
    });
    store.setCharacterField("pal", "classes", [
      { className: "Monk (Unchained)", level: 5 },
    ]);
    store.syncClassResources("pal");
    const wisKi = store
      .getCharacter("pal")!
      .resources.find((r) => r.id === "kiPool");
    expect(wisKi?.max).toBe(4); // floor(5/2) + wis 2

    store.setCharacterField("pal", "classes", [
      {
        className: "Monk (Unchained)",
        level: 5,
        archetypeKeys: ["scaled-fist"],
      },
    ]);
    store.syncClassResources("pal");
    const chaKi = store
      .getCharacter("pal")!
      .resources.find((r) => r.id === "kiPool");
    expect(chaKi?.max).toBe(6); // floor(5/2) + cha 4
  });

  it("unchecking the archetype restores the base pool on the next sync", () => {
    const store = makeStore(5, "stonelord");
    store.syncClassResources("pal");
    expect(poolIds(store)).not.toContain("smiteEvil");

    setArchetypes(store, undefined);
    store.syncClassResources("pal");
    expect(poolIds(store)).toContain("smiteEvil");
    // stonestrike is NOT auto-pruned (nothing suppresses it; it's now an
    // unknown manual pool the user deletes if unwanted)
    expect(poolIds(store)).toContain("stonestrike");
  });
});

describe("syncClassQuickActions with archetypes", () => {
  it("prunes the suppressed smite action and reports it; re-add after uncheck", () => {
    const store = makeStore();
    store.syncClassQuickActions("pal");
    const has = (qaId: string) =>
      (store.getCharacter("pal")!.quickActions ?? []).some((a) => a.id === qaId);
    expect(has("smiteEvil")).toBe(true);

    setArchetypes(store, ["stonelord"]);
    const result = store.syncClassQuickActions("pal");
    expect(result.removed).toContain("Smite Evil");
    expect(has("smiteEvil")).toBe(false);

    setArchetypes(store, undefined);
    const restored = store.syncClassQuickActions("pal");
    expect(restored.added).toContain("Smite Evil");
    expect(has("smiteEvil")).toBe(true);
  });

  it("master of many styles prunes the flurry action on a core monk", () => {
    const store = makeStore();
    store.setCharacterField("pal", "classes", [
      { className: "Monk", level: 3 },
    ]);
    store.syncClassQuickActions("pal");
    const has = () =>
      (store.getCharacter("pal")!.quickActions ?? []).some(
        (a) => a.id === "flurryOfBlows"
      );
    expect(has()).toBe(true);

    store.setCharacterField("pal", "classes", [
      { className: "Monk", level: 3, archetypeKeys: ["master-of-many-styles"] },
    ]);
    const result = store.syncClassQuickActions("pal");
    expect(result.removed).toContain("Flurry of Blows");
    expect(has()).toBe(false);
  });

  it("virtuous bravo grants precise strike at 4th, not at 3rd", () => {
    const low = makeStore(3, "virtuous-bravo");
    low.syncClassQuickActions("pal");
    expect(
      (low.getCharacter("pal")!.quickActions ?? []).some(
        (a) => a.id === "preciseStrike"
      )
    ).toBe(false);

    const high = makeStore(4, "virtuous-bravo");
    high.syncClassQuickActions("pal");
    expect(
      (high.getCharacter("pal")!.quickActions ?? []).some(
        (a) => a.id === "preciseStrike"
      )
    ).toBe(true);
  });
});

describe("applyClassSkills with archetypes", () => {
  it("gray paladin's added class skills get flagged", () => {
    const store = makeStore();
    const record = store.getCharacter("pal")!;
    store.setCharacterField("pal", "skills", {
      ...record.skills,
      Bluff: { ability: "cha", ranks: 1, misc: 0, classSkill: false },
    });
    store.applyClassSkills("pal");
    expect(store.getCharacter("pal")!.skills["Bluff"].classSkill).toBe(false);

    setArchetypes(store, ["gray-paladin"]);
    store.applyClassSkills("pal");
    expect(store.getCharacter("pal")!.skills["Bluff"].classSkill).toBe(true);
  });
});
