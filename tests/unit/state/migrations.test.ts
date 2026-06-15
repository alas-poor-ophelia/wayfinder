/**
 * Schema migrations (store.load runs migrateData on the RAW loaded object
 * before the schema-forward merge). v4: panache field → resources[] pool,
 * kind stamps for the legacy hardcoded item pools.
 */
import { describe, expect, it } from "vitest";
import { migrateData } from "../../../src/state/migrations";
import {
  createDefaultCharacter,
  type CharacterRecord,
} from "../../../src/types/character";
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
    expect(pool).toMatchObject({
      id: "panache",
      name: "Panache",
      current: 4,
      max: 6,
    });
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
    expect(out.characters![0].resources.some((r) => r.id === "panache")).toBe(
      false,
    );
  });

  it("stamps kind: item on the legacy hardcoded item pools only", () => {
    const out = migrateData(v3Data([v3Adarin()]));
    const byId = Object.fromEntries(
      out.characters![0].resources.map((r) => [r.id, r]),
    );
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

describe("migrateData v8 -> v9 (Scaled Fist stamped onto legacy monks)", () => {
  const v8Data = (characters: CharacterRecord[]): Partial<MiniSheetData> => ({
    schemaVersion: 8,
    characters,
  });

  it("stamps scaled-fist onto leveled monk entries without archetypes", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [
      { className: "Paladin", level: 5, archetypeKeys: ["virtuous-bravo"] },
      { className: "Skald", level: 3 },
      { className: "Monk (Unchained)", level: 2 },
    ];
    const out = migrateData(v8Data([c]));
    const classes = out.characters![0].classes;
    // monk gets the inference; everything else untouched
    expect(classes[2].archetypeKeys).toEqual(["scaled-fist"]);
    expect(classes[0].archetypeKeys).toEqual(["virtuous-bravo"]);
    expect(classes[1].archetypeKeys).toBeUndefined();
  });

  it("never touches user-curated archetype selections or level-0 entries", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [
      { className: "Monk", level: 4, archetypeKeys: ["kata-master"] },
      { className: "Monk (Unchained)", level: 0 },
    ];
    const out = migrateData(v8Data([c]));
    expect(out.characters![0].classes[0].archetypeKeys).toEqual([
      "kata-master",
    ]);
    expect(out.characters![0].classes[1].archetypeKeys).toBeUndefined();
  });

  it("idempotent: re-running on migrated data is a no-op", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [{ className: "Monk (Unchained)", level: 2 }];
    const once = migrateData(v8Data([c]));
    const twice = migrateData({ ...once, schemaVersion: 8 }); // stale stamp
    expect(twice.characters![0].classes).toEqual(once.characters![0].classes);
  });

  it("v9 does not run for data already at v9", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [{ className: "Monk (Unchained)", level: 2 }];
    const out = migrateData({ schemaVersion: 9, characters: [c] });
    expect(out.characters![0].classes[0].archetypeKeys).toBeUndefined();
  });
});

describe("migrateData v9 -> v10 (Spell Warrior stamped onto weapon-song skalds)", () => {
  it("stamps spell-warrior when a weaponSongRounds pool is present", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [
      { className: "Paladin", level: 5, archetypeKeys: ["virtuous-bravo"] },
      { className: "Skald", level: 3 },
    ];
    c.resources = [
      { id: "weaponSongRounds", name: "Weapon Song", current: 13, max: 13 },
    ];
    const out = migrateData({ schemaVersion: 9, characters: [c] });
    const classes = out.characters![0].classes;
    expect(classes[1].archetypeKeys).toEqual(["spell-warrior"]);
    expect(classes[0].archetypeKeys).toEqual(["virtuous-bravo"]);
  });

  it("skalds without weapon-song evidence are untouched", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [{ className: "Skald", level: 3 }];
    c.resources = [
      { id: "ragingSong", name: "Raging Song", current: 10, max: 10 },
    ];
    const out = migrateData({ schemaVersion: 9, characters: [c] });
    expect(out.characters![0].classes[0].archetypeKeys).toBeUndefined();
  });

  it("user-curated skald selections are never overwritten", () => {
    const c = createDefaultCharacter("x", "X");
    c.classes = [{ className: "Skald", level: 3, archetypeKeys: ["elegist"] }];
    c.resources = [
      { id: "weaponSongRounds", name: "Weapon Song", current: 13, max: 13 },
    ];
    const out = migrateData({ schemaVersion: 9, characters: [c] });
    expect(out.characters![0].classes[0].archetypeKeys).toEqual(["elegist"]);
  });
});

describe("migrateData v10 -> v11 (speed/size derive-with-override)", () => {
  const v10 = (c: CharacterRecord) =>
    migrateData({ schemaVersion: 10, characters: [c] }).characters![0];

  it("no raceKey: default 30ft / sizeMod 0 record is untouched (H-594)", () => {
    const c = createDefaultCharacter("x", "X"); // speed "30ft", sizeMod 0, no raceKey
    const out = v10(c);
    expect(out.speed).toBe("30ft");
    expect(out.ac.sizeModOverride).toBeUndefined();
  });

  it("raceKey + speed matching the racial canonical form → derived sentinel", () => {
    const c = createDefaultCharacter("x", "X");
    c.raceKey = "dwarf"; // 20 ft
    c.speed = "20ft";
    expect(v10(c).speed).toBe("");
  });

  it("raceKey + non-matching speed string is preserved as an override", () => {
    const c = createDefaultCharacter("x", "X");
    c.raceKey = "dwarf";
    c.speed = "40ft";
    expect(v10(c).speed).toBe("40ft");
  });

  it("small race with sizeMod 0 stays derived (no override stamped)", () => {
    const c = createDefaultCharacter("x", "X");
    c.raceKey = "halfling"; // small → derived +1
    c.ac.sizeMod = 1; // already matches derived
    expect(v10(c).ac.sizeModOverride).toBeUndefined();
  });

  it("a sizeMod differing from the race-derived value is stamped as override", () => {
    const c = createDefaultCharacter("x", "X");
    c.raceKey = "halfling"; // derived +1
    c.ac.sizeMod = 0; // differs → preserve via override
    expect(v10(c).ac.sizeModOverride).toBe(0);
  });

  it("is idempotent on already-migrated data", () => {
    const c = createDefaultCharacter("x", "X");
    c.raceKey = "dwarf";
    c.speed = "20ft";
    c.ac.sizeMod = 0;
    const once = v10(c);
    const twice = migrateData({ schemaVersion: 11, characters: [once] })
      .characters![0];
    expect(twice).toEqual(once);
  });
});
