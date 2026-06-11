/**
 * Schema migrations (store.load runs migrateData on the RAW loaded object
 * before the schema-forward merge). v4: panache field → resources[] pool,
 * kind stamps for the legacy hardcoded item pools.
 */
import { describe, expect, it } from "vitest";
import { migrateData } from "../../../src/state/migrations";
import { createDefaultCharacter, type CharacterRecord } from "../../../src/types/character";
import type { MiniSheetData } from "../../../src/types/data-file";
import { createDefaultSpellbook } from "../../../src/types/spellbook";

function v3Adarin(): CharacterRecord {
  const c = createDefaultCharacter("adarin", "Adarin");
  c.classes = [
    { className: "Paladin", level: 5 },
    { className: "Skald", level: 3 },
  ];
  c.panache = { current: 4, max: 6 }; // no Swashbuckler class!
  c.resources = [
    { id: "layOnHands", name: "Lay on Hands", current: 8, max: 8 },
    { id: "plumeOfPanache", name: "Plume of Panache", current: 1, max: 1 },
    { id: "quickrunners", name: "Quickrunner's Shirt", current: 1, max: 1 },
  ];
  return c;
}

function v3Data(characters: CharacterRecord[]): Partial<MiniSheetData> {
  return { schemaVersion: 3, characters };
}

describe("migrateData v3 -> v4", () => {
  it("converts the panache field to a leading manual pool when no Swashbuckler class", () => {
    const out = migrateData(v3Data([v3Adarin()]));
    const adarin = out.characters![0];
    expect(adarin.panache).toBeUndefined();
    const pool = adarin.resources[0];
    expect(pool).toMatchObject({ id: "panache", name: "Panache", current: 4, max: 6 });
    // Adarin has panache without the class — stored max must survive as-is
    expect(pool.formula).toBeUndefined();
  });

  it("attaches the Cha-mod formula when the character has Swashbuckler levels", () => {
    const swash = createDefaultCharacter("s", "Swash");
    swash.classes = [{ className: "Swashbuckler", level: 3 }];
    swash.panache = { current: 2, max: 3 };
    const out = migrateData(v3Data([swash]));
    expect(out.characters![0].resources[0].formula).toEqual({
      source: "abilityMod",
      ability: "cha",
      minimum: 1,
    });
  });

  it("drops a zeroed panache field without creating a pool", () => {
    const familiar = createDefaultCharacter("h", "Hwayoung");
    familiar.panache = { current: 0, max: 0 };
    const out = migrateData(v3Data([familiar]));
    expect(out.characters![0].panache).toBeUndefined();
    expect(out.characters![0].resources.some((r) => r.id === "panache")).toBe(false);
  });

  it("stamps kind: item on the legacy hardcoded item pools only", () => {
    const out = migrateData(v3Data([v3Adarin()]));
    const byId = Object.fromEntries(out.characters![0].resources.map((r) => [r.id, r]));
    expect(byId.plumeOfPanache.kind).toBe("item");
    expect(byId.quickrunners.kind).toBe("item");
    expect(byId.layOnHands.kind).toBeUndefined();
  });

  it("is idempotent (running twice is a no-op)", () => {
    const once = migrateData(v3Data([v3Adarin()]));
    const twice = migrateData({ ...once, schemaVersion: 3 }); // worst case: stale stamp
    expect(twice).toEqual(once);
  });

  it("does not touch already-migrated (v4+) data", () => {
    const v4 = migrateData(v3Data([v3Adarin()]));
    const again = migrateData({ ...v4, schemaVersion: 4 });
    expect(again.characters).toEqual(v4.characters);
  });

  it("tolerates missing characters", () => {
    expect(migrateData({ schemaVersion: 3 })).toEqual({ schemaVersion: 3 });
  });
});

describe("migrateData v4 -> v5 (spell slots into the spellbook)", () => {
  it("converts spellSlotsL* pools to a slot-only spellbook", () => {
    const c = createDefaultCharacter("x", "X");
    c.resources = [
      { id: "spellSlotsL1", name: "Level 1 Slots", current: 2, max: 4 },
      { id: "spellSlotsL2", name: "Level 2 Slots", current: 1, max: 2 },
      { id: "layOnHands", name: "Lay on Hands", current: 8, max: 8 },
    ];
    const out = migrateData(v3Data([c]));
    const rec = out.characters![0];
    expect(rec.resources.map((r) => r.id)).toEqual(["layOnHands"]);
    expect(rec.spellbook).toBeDefined();
    expect(rec.spellbook!.castingClass).toBe("");
    expect(rec.spellbook!.slotOverrides).toEqual({ level1: 4, level2: 2 });
    expect(rec.spellbook!.levels.level1.remaining).toBe(2);
    expect(rec.spellbook!.levels.level2.remaining).toBe(1);
  });

  it("folds pool currents into an existing spellbook's uninitialized levels only", () => {
    // a real caster: computed maxima stay authoritative, no overrides
    const c = createDefaultCharacter("x", "X");
    c.spellbook = createDefaultSpellbook("skald", "cha");
    c.spellbook!.levels.level1.remaining = 5; // already initialized
    c.resources = [
      { id: "spellSlotsL1", name: "Level 1 Slots", current: 2, max: 4 },
      { id: "spellSlotsL2", name: "Level 2 Slots", current: 1, max: 2 },
    ];
    const out = migrateData(v3Data([c]));
    const rec = out.characters![0];
    expect(rec.resources).toEqual([]);
    expect(rec.spellbook!.slotOverrides).toBeUndefined();
    expect(rec.spellbook!.levels.level1.remaining).toBe(5); // untouched
    expect(rec.spellbook!.levels.level2.remaining).toBe(1); // folded
  });

  it("leaves characters without slot pools alone", () => {
    const c = v3Adarin();
    const out = migrateData(v3Data([c]));
    expect(out.characters![0].spellbook).toBeUndefined();
  });
});
