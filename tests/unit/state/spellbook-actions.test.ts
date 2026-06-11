/**
 * Behavior tests for spellbook-actions — the prepared/hybrid flows ported
 * from the legacy prepare/cast/remove button actions (with the approved
 * null→0 divergence). Slot math goes through the characterized calc layer.
 */
import { getArcanistCasts, getSpellSlots } from "../../../src/calc/spells";
import {
  castPrepared,
  castSpontaneous,
  prepareSpell,
  removePreparation,
  resetSpellbook,
} from "../../../src/state/spellbook-actions";
import type { MiniSheetStore } from "../../../src/state/store";
import { createDefaultCharacter, type CharacterRecord } from "../../../src/types/character";
import { createDefaultSpellbook, type KnownSpell } from "../../../src/types/spellbook";

/** Minimal store double: one character + the real dot-path set semantics. */
function fakeStore(character: CharacterRecord) {
  const store = {
    getCharacter: () => character,
    setCharacterField: (_id: string, dotPath: string, value: unknown) => {
      const keys = dotPath.split(".");
      let cursor = character as unknown as Record<string, unknown>;
      for (const key of keys.slice(0, -1)) {
        if (typeof cursor[key] !== "object" || cursor[key] === null) {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[keys[keys.length - 1]] = value;
    },
  };
  return store as unknown as MiniSheetStore;
}

function spell(id: string, name: string, baseLevel: number): KnownSpell {
  return {
    id,
    name,
    baseLevel: baseLevel as KnownSpell["baseLevel"],
    known: true,
    range: "Close",
    castingTime: "1 std",
    components: "V, S",
    saveType: "none",
    sr: false,
  };
}

function cleric5(): CharacterRecord {
  const c = createDefaultCharacter("cleric", "Test Cleric");
  c.classes = [{ className: "Cleric", level: 5 }];
  c.baseAbilities.wis = 16; // +3
  c.spellbook = createDefaultSpellbook("cleric", "wis");
  c.spellbook.spells = [spell("c1", "Bless", 1), spell("c0", "Guidance", 0)];
  return c;
}

function arcanist7(): CharacterRecord {
  const c = createDefaultCharacter("arc", "Test Arcanist");
  c.classes = [{ className: "Arcanist", level: 7 }];
  c.baseAbilities.int = 18; // +4
  c.spellbook = createDefaultSpellbook("arcanist", "int");
  c.spellbook.spells = [spell("a1", "Shield", 1), spell("a0", "Detect Magic", 0)];
  return c;
}

describe("prepared caster flows (cleric 5, WIS +3)", () => {
  const maxL1 = getSpellSlots("cleric", 5, 1, 3);

  it("prepare appends an entry and consumes a slot at the adjusted level", () => {
    const c = cleric5();
    const store = fakeStore(c);
    prepareSpell(store, c, "c1", 3);
    expect(c.spellbook!.preparations.level1).toEqual([
      { spellId: "c1", adjustedLevel: 1, metamagic: [], count: 1 },
    ]);
    expect(c.spellbook!.levels.level1.remaining).toBe(maxL1 - 1);
  });

  it("preparing the same spell+metamagic again increments count", () => {
    const c = cleric5();
    const store = fakeStore(c);
    prepareSpell(store, c, "c1", 3);
    prepareSpell(store, c, "c1", 3);
    expect(c.spellbook!.preparations.level1).toEqual([
      { spellId: "c1", adjustedLevel: 1, metamagic: [], count: 2 },
    ]);
    expect(c.spellbook!.levels.level1.remaining).toBe(maxL1 - 2);
  });

  it("level metamagic shifts the preparation to the adjusted level's storage and slot", () => {
    const c = cleric5();
    c.spellbook!.levels.level1.activeMetamagics = ["Still Spell (+1 level)"];
    const store = fakeStore(c);
    prepareSpell(store, c, "c1", 3);
    expect(c.spellbook!.preparations.level1).toEqual([]);
    expect(c.spellbook!.preparations.level2).toEqual([
      {
        spellId: "c1",
        adjustedLevel: 2,
        metamagic: ["Still Spell (+1 level)"],
        count: 1,
      },
    ]);
    expect(c.spellbook!.levels.level2.remaining).toBe(getSpellSlots("cleric", 5, 2, 3) - 1);
    // level 1 slots untouched
    expect(c.spellbook!.levels.level1.remaining).toBeNull();
  });

  it("cast decrements count then removes the entry; slots are not refunded", () => {
    const c = cleric5();
    const store = fakeStore(c);
    prepareSpell(store, c, "c1", 3);
    prepareSpell(store, c, "c1", 3);
    castPrepared(store, c, 1, 0, 3);
    expect(c.spellbook!.preparations.level1[0].count).toBe(1);
    castPrepared(store, c, 1, 0, 3);
    expect(c.spellbook!.preparations.level1).toEqual([]);
    expect(c.spellbook!.levels.level1.remaining).toBe(maxL1 - 2);
  });

  it("remove deletes the whole entry (count and all) without touching slots", () => {
    const c = cleric5();
    const store = fakeStore(c);
    prepareSpell(store, c, "c1", 3);
    prepareSpell(store, c, "c1", 3);
    removePreparation(store, c, 1, 0);
    expect(c.spellbook!.preparations.level1).toEqual([]);
    expect(c.spellbook!.levels.level1.remaining).toBe(maxL1 - 2);
  });

  it("reset restores slot maxima and (with the flag) clears preparations", () => {
    const c = cleric5();
    const store = fakeStore(c);
    prepareSpell(store, c, "c1", 3);
    resetSpellbook(store, c, 3, { resetPreparations: true });
    expect(c.spellbook!.levels.level1.remaining).toBe(maxL1);
    expect(c.spellbook!.preparations.level1).toEqual([]);
    // levels with zero max stay null (untracked), like legacy
    expect(c.spellbook!.levels.level9.remaining).toBeNull();
  });
});

describe("hybrid caster flows (arcanist 7, INT +4)", () => {
  const maxPrepL1 = getSpellSlots("arcanist", 7, 1, 0); // preps ignore stat
  const maxCastsL1 = getArcanistCasts("arcanist", 7, 1, 4);
  const maxCastsL2 = getArcanistCasts("arcanist", 7, 2, 4);

  it("prepare is unique per spell+metamagic (no count increment)", () => {
    const c = arcanist7();
    const store = fakeStore(c);
    prepareSpell(store, c, "a1", 4);
    prepareSpell(store, c, "a1", 4);
    expect(c.spellbook!.preparations.level1).toEqual([
      { spellId: "a1", adjustedLevel: 1, metamagic: [], count: 1 },
    ]);
    // only the first prepare consumed a slot
    expect(c.spellbook!.levels.level1.remaining).toBe(maxPrepL1 - 1);
  });

  it("global metamagic makes prepare consume the slot at the FINAL level", () => {
    const c = arcanist7();
    c.spellbook!.globalMetamagic.active = ["Still Spell (+1 level)"];
    const store = fakeStore(c);
    prepareSpell(store, c, "a1", 4);
    // stored at the per-level adjusted level (1, no per-level metamagic)...
    expect(c.spellbook!.preparations.level1).toHaveLength(1);
    // ...but the slot burns at final level 2
    expect(c.spellbook!.levels.level1.remaining).toBeNull();
    expect(c.spellbook!.levels.level2.remaining).toBe(getSpellSlots("arcanist", 7, 2, 0) - 1);
  });

  it("cast burns from the casts pool and keeps the preparation", () => {
    const c = arcanist7();
    const store = fakeStore(c);
    prepareSpell(store, c, "a1", 4);
    castPrepared(store, c, 1, 0, 4);
    expect(c.spellbook!.levels.level1.castsRemaining).toBe(maxCastsL1 - 1);
    expect(c.spellbook!.preparations.level1).toHaveLength(1);
  });

  it("global metamagic shifts the cast to the display level's pool", () => {
    const c = arcanist7();
    c.spellbook!.globalMetamagic.active = ["Still Spell (+1 level)"];
    const store = fakeStore(c);
    prepareSpell(store, c, "a1", 4);
    castPrepared(store, c, 1, 0, 4); // storage level 1, display level 2
    expect(c.spellbook!.levels.level2.castsRemaining).toBe(maxCastsL2 - 1);
    expect(c.spellbook!.levels.level1.castsRemaining).toBeNull();
  });

  it("cantrip casts are no-ops (legacy behavior)", () => {
    const c = arcanist7();
    const store = fakeStore(c);
    prepareSpell(store, c, "a0", 4);
    castPrepared(store, c, 0, 0, 4);
    expect(c.spellbook!.levels.level0.castsRemaining).toBeNull();
    expect(c.spellbook!.preparations.level0).toHaveLength(1);
  });

  it("reset restores both pools", () => {
    const c = arcanist7();
    const store = fakeStore(c);
    prepareSpell(store, c, "a1", 4);
    castPrepared(store, c, 1, 0, 4);
    resetSpellbook(store, c, 4);
    expect(c.spellbook!.levels.level1.remaining).toBe(maxPrepL1);
    expect(c.spellbook!.levels.level1.castsRemaining).toBe(maxCastsL1);
  });
});

describe("spontaneous floor (approved divergence)", () => {
  it("casting at 0 remaining stays at 0 (legacy refilled the tracker)", () => {
    const c = cleric5();
    c.spellbook!.castingClass = "skald";
    c.classes = [{ className: "Skald", level: 2 }];
    c.spellbook!.levels.level1.remaining = 0;
    const store = fakeStore(c);
    castSpontaneous(store, c, 1, 5);
    expect(c.spellbook!.levels.level1.remaining).toBe(0);
  });
});
