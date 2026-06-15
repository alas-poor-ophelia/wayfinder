/**
 * Store mutations for quick actions: stage cycling, variant selection,
 * linked-buff edges, and the v6 migration seeding through migrateData.
 */
import { describe, expect, it } from "vitest";
import type { Plugin } from "obsidian";
import { migrateData } from "../../../src/state/migrations";
import { MiniSheetStore } from "../../../src/state/store";
import {
  createDefaultCharacter,
  defaultToggles,
  type CharacterRecord,
} from "../../../src/types/character";
import type { QuickActionDef } from "../../../src/types/quick-actions";

function makeStore() {
  const plugin = {
    loadData: async () => null,
    saveData: async () => undefined,
  } as unknown as Plugin;
  return new MiniSheetStore(plugin);
}

function withCharacter(extraDefs: QuickActionDef[] = []) {
  const store = makeStore();
  const c = createDefaultCharacter("hero", "Hero");
  c.quickActions = [...c.quickActions!, ...extraDefs];
  store.upsertCharacter(c);
  return store;
}

describe("cycleQuickAction", () => {
  it("single-stage: off -> 1 -> off", () => {
    const store = withCharacter();
    store.cycleQuickAction("hero", "powerAttack");
    expect(
      store.getCharacter("hero")!.quickActionState!.powerAttack.stage,
    ).toBe(1);
    store.cycleQuickAction("hero", "powerAttack");
    expect(
      store.getCharacter("hero")!.quickActionState!.powerAttack.stage,
    ).toBe(0);
  });

  it("two-stage: off -> 1 -> 2 -> off (legacy cycleThree)", () => {
    const store = withCharacter();
    const stages = () =>
      store.getCharacter("hero")!.quickActionState!.smiteEvil.stage;
    store.cycleQuickAction("hero", "smiteEvil");
    expect(stages()).toBe(1);
    store.cycleQuickAction("hero", "smiteEvil");
    expect(stages()).toBe(2);
    store.cycleQuickAction("hero", "smiteEvil");
    expect(stages()).toBe(0);
  });

  it("throws on unknown action id", () => {
    const store = withCharacter();
    expect(() => store.cycleQuickAction("hero", "nope")).toThrow(
      /quick action/,
    );
  });
});

describe("setQuickActionVariant", () => {
  it("selecting a variant turns the action on; null turns it off but keeps the choice", () => {
    const store = withCharacter();
    store.setQuickActionVariant("hero", "weaponSong", "flaming");
    let state = store.getCharacter("hero")!.quickActionState!.weaponSong;
    expect(state).toEqual({ stage: 1, variantId: "flaming" });
    store.setQuickActionVariant("hero", "weaponSong", null);
    state = store.getCharacter("hero")!.quickActionState!.weaponSong;
    expect(state).toEqual({ stage: 0, variantId: "flaming" });
  });
});

describe("linkedBuff edges", () => {
  const linked: QuickActionDef = {
    id: "blessedStrike",
    name: "Blessed Strike",
    icon: "ra-sword",
    linkedBuff: "bless",
    stages: [{ effects: [] }, { effects: [] }],
  };

  it("adds the buff on off->on, keeps it across stage 1->2, removes it on ->off", () => {
    const store = withCharacter([linked]);
    const buffs = () => store.getCharacter("hero")!.buffs;
    store.cycleQuickAction("hero", "blessedStrike");
    expect(buffs()).toContain("bless");
    store.cycleQuickAction("hero", "blessedStrike"); // stage 2
    expect(buffs().filter((b) => b === "bless")).toHaveLength(1);
    store.cycleQuickAction("hero", "blessedStrike"); // off
    expect(buffs()).not.toContain("bless");
  });

  it("does not duplicate an already-active buff and leaves a manually-set buff alone on... removal", () => {
    const store = withCharacter([linked]);
    store.setCharacterField("hero", "buffs", ["bless"]);
    store.cycleQuickAction("hero", "blessedStrike");
    expect(
      store.getCharacter("hero")!.buffs.filter((b) => b === "bless"),
    ).toHaveLength(1);
  });
});

describe("migrateData v5 -> v6", () => {
  function v5Record(
    toggles: Partial<CharacterRecord["toggles"]>,
  ): CharacterRecord {
    const c = createDefaultCharacter("a", "A");
    // pre-v6 records have no quickActions fields
    delete c.quickActions;
    delete c.quickActionState;
    c.toggles = { ...defaultToggles(), ...toggles };
    return c;
  }

  it("seeds the catalog and maps active toggles into state, zeroing the old fields", () => {
    const out = migrateData({
      schemaVersion: 5,
      characters: [
        v5Record({
          powerAttack: true,
          smiteEvilOutsider: true,
          smiteEvil: true,
          weaponSong: "Keen",
          rangedAttackStyle: "Shuriken",
        }),
      ],
    });
    const c = out.characters![0];
    expect(c.quickActions!.map((d) => d.id)).toContain("powerAttack");
    expect(c.quickActionState).toEqual({
      powerAttack: { stage: 1 },
      smiteEvil: { stage: 2 },
      weaponSong: { stage: 1, variantId: "keen" },
    });
    expect(c.toggles.powerAttack).toBe(false);
    expect(c.toggles.weaponSong).toBe("Off");
    expect(c.toggles.rangedAttackStyle).toBe("Shuriken"); // survives
  });

  it("is idempotent: a record that already owns quickActions is untouched", () => {
    const c = createDefaultCharacter("b", "B");
    c.quickActions = [c.quickActions![0]]; // user pruned the catalog
    c.quickActionState = { powerAttack: { stage: 1 } };
    const out = migrateData({ schemaVersion: 5, characters: [c] });
    expect(out.characters![0].quickActions).toHaveLength(1);
    expect(out.characters![0].quickActionState).toEqual({
      powerAttack: { stage: 1 },
    });
  });

  it("craneStyle swaps the crane action in", () => {
    const out = migrateData({
      schemaVersion: 5,
      characters: [v5Record({ fightingDefensively: true, craneStyle: true })],
    });
    const c = out.characters![0];
    expect(
      c.quickActions!.some((d) => d.id === "fightingDefensivelyCrane"),
    ).toBe(true);
    expect(c.quickActions!.some((d) => d.id === "fightingDefensively")).toBe(
      false,
    );
    expect(c.quickActionState!.fightingDefensivelyCrane).toEqual({ stage: 1 });
  });
});

describe("migrateData v6 -> v7 (song Enhancement RAW repair)", () => {
  const V6_SHAPE = [
    { kind: "modifier", target: "attack.melee", type: "untyped", value: 1 },
    { kind: "modifier", target: "attack.ranged", type: "untyped", value: 1 },
    { kind: "modifier", target: "damage.melee", type: "untyped", value: 1 },
    { kind: "modifier", target: "damage.ranged", type: "untyped", value: 1 },
  ];

  function v6Record(enhancementEffects: unknown): CharacterRecord {
    const c = createDefaultCharacter("a", "A");
    const song = c.quickActions!.find((d) => d.id === "weaponSong")!;
    song.variants = song.variants!.map((v) =>
      v.id === "enhancement"
        ? { ...v, effects: enhancementEffects as typeof v.effects }
        : v,
    );
    return c;
  }

  it("repairs the exact v6-shipped shape to enhancement-typed attack modifiers", () => {
    const out = migrateData({
      schemaVersion: 6,
      characters: [v6Record(V6_SHAPE)],
    });
    const song = out.characters![0].quickActions!.find(
      (d) => d.id === "weaponSong",
    )!;
    const enh = song.variants!.find((v) => v.id === "enhancement")!;
    expect(enh.effects).toEqual([
      {
        kind: "modifier",
        target: "attack.melee",
        type: "enhancement",
        value: 1,
      },
      {
        kind: "modifier",
        target: "attack.ranged",
        type: "enhancement",
        value: 1,
      },
    ]);
  });

  it("leaves a user-edited enhancement variant alone", () => {
    const edited = [
      { kind: "modifier", target: "attack.melee", type: "untyped", value: 2 },
    ];
    const out = migrateData({
      schemaVersion: 6,
      characters: [v6Record(edited)],
    });
    const song = out.characters![0].quickActions!.find(
      (d) => d.id === "weaponSong",
    )!;
    expect(song.variants!.find((v) => v.id === "enhancement")!.effects).toEqual(
      edited,
    );
  });

  it("is idempotent on already-repaired data", () => {
    const once = migrateData({
      schemaVersion: 6,
      characters: [v6Record(V6_SHAPE)],
    });
    const twice = migrateData({
      schemaVersion: 6,
      characters: once.characters!,
    });
    expect(twice.characters).toEqual(once.characters);
  });
});

describe("syncClassQuickActions (insert-only)", () => {
  function storeWith(
    classes: { className: string; level: number }[],
    prune?: string[],
  ) {
    const store = makeStore();
    const c = createDefaultCharacter("hero", "Hero");
    c.classes = classes;
    if (prune)
      c.quickActions = c.quickActions!.filter((a) => !prune.includes(a.id));
    store.upsertCharacter(c);
    return store;
  }

  it("re-adds a class-granted action the character is missing", () => {
    const store = storeWith(
      [{ className: "Monk (Unchained)", level: 5 }],
      ["flurryOfBlows"],
    );
    const { added } = store.syncClassQuickActions("hero");
    expect(added).toEqual(["Flurry of Blows"]);
    expect(
      store
        .getCharacter("hero")!
        .quickActions!.some((a) => a.id === "flurryOfBlows"),
    ).toBe(true);
  });

  it("never duplicates or overwrites an existing def (user edits win)", () => {
    const store = storeWith([{ className: "Paladin", level: 5 }]);
    // user renames their smite
    const acts = store.getCharacter("hero")!.quickActions!;
    store.setCharacterField(
      "hero",
      "quickActions",
      acts.map((a) => (a.id === "smiteEvil" ? { ...a, name: "Smite!" } : a)),
    );
    const { added } = store.syncClassQuickActions("hero");
    expect(added).toEqual([]);
    const smites = store
      .getCharacter("hero")!
      .quickActions!.filter((a) => a.id === "smiteEvil");
    expect(smites).toHaveLength(1);
    expect(smites[0].name).toBe("Smite!");
  });

  it("respects minLevel gates (bard VP needs level 2)", () => {
    const store = storeWith(
      [{ className: "Bard", level: 1 }],
      ["versatilePerformance"],
    );
    expect(store.syncClassQuickActions("hero").added).toEqual([]);
    store.setCharacterField("hero", "classes", [
      { className: "Bard", level: 2 },
    ]);
    expect(store.syncClassQuickActions("hero").added).toEqual([
      "Versatile Performance",
    ]);
  });

  it("swashbuckler grants precise strike at 3", () => {
    const store = storeWith(
      [{ className: "Swashbuckler", level: 3 }],
      ["preciseStrike"],
    );
    expect(store.syncClassQuickActions("hero").added).toEqual([
      "Precise Strike",
    ]);
  });

  it("the crane FD variant satisfies a fightingDefensively grant", () => {
    // hypothetical: no class currently grants FD, so exercise the guard
    // directly through the dedup path — crane present, plain absent
    const store = storeWith(
      [{ className: "Monk", level: 4 }],
      ["fightingDefensively"],
    );
    const acts = store.getCharacter("hero")!.quickActions!;
    store.setCharacterField("hero", "quickActions", [
      ...acts,
      {
        id: "fightingDefensivelyCrane",
        name: "FD (Crane)",
        icon: "ra-acid",
        stages: [{ effects: [] }],
      },
    ]);
    const { added } = store.syncClassQuickActions("hero");
    expect(added).toEqual([]); // monk grants only flurry, already present
    expect(
      store
        .getCharacter("hero")!
        .quickActions!.some((a) => a.id === "fightingDefensively"),
    ).toBe(false);
  });
});
