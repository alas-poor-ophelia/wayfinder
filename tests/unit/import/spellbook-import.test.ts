/**
 * Importer tests for importSpellbook — the verbatim AdarinSpellBook.md
 * frontmatter (captured live into spell-fixtures.json) must convert into
 * the exact SpellbookState the plugin expects, warning on every drift.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { importLegacy, importSpellbook } from "../../../src/import/legacy-import";
import { createDefaultCharacter, type CharacterRecord } from "../../../src/types/character";

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/spell-fixtures.json", import.meta.url)), "utf-8")
) as { adarinSpellbook: Record<string, unknown> };

function adarinRecord(): CharacterRecord {
  const record = createDefaultCharacter("adarin", "Adarin");
  record.classes = [
    { className: "Paladin (Unchained)", level: 5 },
    { className: "Skald", level: 2 },
  ];
  record.baseAbilities.cha = 20;
  return record;
}

describe("importSpellbook (Adarin live frontmatter)", () => {
  function run() {
    const warnings: string[] = [];
    const spellbook = importSpellbook(fixtures.adarinSpellbook, adarinRecord(), warnings);
    return { spellbook, warnings };
  }

  it("imports identity without an override when class level agrees", () => {
    const { spellbook, warnings } = run();
    expect(spellbook.castingClass).toBe("skald");
    expect(spellbook.castingStat).toBe("cha");
    // casterLevel 2 === Skald class level 2 → derived, no override
    expect(spellbook.casterLevelOverride).toBeUndefined();
    expect(warnings.some((w) => w.includes("casterLevel"))).toBe(false);
    // castingStatBonus 5 === floor((20-10)/2) → no drift warning
    expect(warnings.some((w) => w.includes("castingStatBonus"))).toBe(false);
  });

  it("stores casterLevel as an override (warned) when it disagrees", () => {
    const record = adarinRecord();
    record.classes = [{ className: "Skald", level: 3 }];
    const warnings: string[] = [];
    const spellbook = importSpellbook(fixtures.adarinSpellbook, record, warnings);
    expect(spellbook.casterLevelOverride).toBe(2);
    expect(warnings.some((w) => w.includes("casterLevel 2 disagrees"))).toBe(true);
  });

  it("warns on castingStatBonus drift (derived value wins, nothing stored)", () => {
    const record = adarinRecord();
    record.baseAbilities.cha = 18; // derived +4, stored 5
    const warnings: string[] = [];
    importSpellbook(fixtures.adarinSpellbook, record, warnings);
    expect(warnings.some((w) => w.includes("castingStatBonus 5 differs from derived cha mod 4"))).toBe(true);
  });

  it("imports all 14 spells with legacy ids stringified verbatim", () => {
    const { spellbook } = run();
    expect(spellbook.spells).toHaveLength(14);
    expect(spellbook.spells.map((s) => s.id)).toEqual([
      "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
      "PFRPGC_436", "APG_240_L0_bardmesmerist",
    ]);
    const readMagic = spellbook.spells[0];
    expect(readMagic).toMatchObject({
      name: "Read Magic",
      baseLevel: 0,
      known: false,
      range: "Personal",
      castingTime: "1 std",
      components: "V, S, F",
      saveType: "none",
      sr: false,
    });
    // composite-id entry keeps originalId, classes, and raw string sr
    const unwitting = spellbook.spells[13];
    expect(unwitting).toMatchObject({
      id: "APG_240_L0_bardmesmerist",
      originalId: "APG_240",
      name: "Unwitting Ally",
      baseLevel: 0,
      known: true,
      classes: ["bard", "mesmerist"],
      sr: "yes",
      school: "enchantment",
      source: "APG",
    });
    const removeFear = spellbook.spells[12];
    expect(removeFear.sr).toBe("yes (harmless)");
    expect(removeFear.saveType).toBe("Will negates (harmless)");
  });

  it("imports level states, dropping vestigial keys and keeping null remaining", () => {
    const { spellbook } = run();
    expect(spellbook.levels.level1).toEqual({
      remaining: 3,
      selectedMetamagic: "Still Spell (+1 level)",
      activeMetamagics: ["Still Spell (+1 level)"],
    });
    // level2 carries vestigial spellSlots: 1 in the file — dropped
    expect(spellbook.levels.level2).toEqual({
      remaining: 1,
      selectedMetamagic: "Extend Spell (+1 level)",
      activeMetamagics: [],
    });
    // level0 totalRemaining is empty in YAML → null (never initialized)
    expect(spellbook.levels.level0.remaining).toBeNull();
    expect(spellbook.levels.level9.remaining).toBeNull();
  });

  it("global metamagic: the UI-bound nested selectedGlobalMetamagic wins", () => {
    const { spellbook, warnings } = run();
    // The legacy dropdown binds spellLevelSettings.selectedGlobalMetamagic
    // ("Silent Spell (+1 level)" in the live file); the root selectedMetamagic
    // key ("") was only read by a dead accessor. Empty root = no drift warning.
    expect(spellbook.globalMetamagic.selected).toBe("Silent Spell (+1 level)");
    expect(spellbook.globalMetamagic.active).toEqual([]);
    expect(warnings.some((w) => w.includes("selectedGlobalMetamagic"))).toBe(false);
  });

  it("imports empty preparations and the three SLAs from spellPreparations.sla", () => {
    const { spellbook } = run();
    for (let level = 0; level <= 9; level++) {
      expect(spellbook.preparations[`level${level}`]).toEqual([]);
    }
    expect(spellbook.slas).toEqual([
      { spellId: "2", casts: 0, castsRemaining: 0 },
      { spellId: "1", casts: 0, castsRemaining: 0 },
      { spellId: "3", casts: 1, castsRemaining: 1 },
    ]);
  });

  it("imports calloutStates verbatim into sectionCollapsed", () => {
    const { spellbook } = run();
    expect(spellbook.sectionCollapsed).toEqual({
      "Level 1": false,
      "Level 2": false,
      Level_1_known: false,
      Level_2_known: false,
      Spontaneous_Metamagic: false,
      SpellLike_Abilities: false,
      Level_0_known: false,
    });
  });

  it("is idempotent (same input → identical state)", () => {
    const a = run().spellbook;
    const b = run().spellbook;
    expect(b).toEqual(a);
  });
});

describe("importLegacy with a spellbook note", () => {
  it("attaches the spellbook and suppresses the fallback slot pools", () => {
    const { record } = importLegacy({
      id: "adarin",
      name: "Adarin",
      characterType: "pc",
      sheet: {
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 20,
        level1SpellSlotsCurrent: 3,
      },
      config: { classes: ["Skald"], skaldLevel: 2 },
      spellbook: fixtures.adarinSpellbook,
    });
    expect(record.spellbook).toBeDefined();
    expect(record.spellbook!.castingClass).toBe("skald");
    expect(record.resources.some((r) => r.id.startsWith("spellSlots"))).toBe(false);
  });

  it("keeps the minimal slot pools when no spellbook note exists", () => {
    const { record, warnings } = importLegacy({
      id: "x",
      name: "X",
      characterType: "pc",
      sheet: { level1SpellSlotsCurrent: 3 },
      config: {},
    });
    expect(record.spellbook).toBeUndefined();
    expect(record.resources.some((r) => r.id === "spellSlotsL1")).toBe(true);
    expect(warnings.some((w) => w.includes("Spell slot max"))).toBe(true);
  });
});

describe("importSpellbook leniency", () => {
  it("defaults and warns on missing castingClass/castingStat", () => {
    const warnings: string[] = [];
    const spellbook = importSpellbook({}, createDefaultCharacter("x", "X"), warnings);
    expect(spellbook.castingClass).toBe("wizard");
    expect(spellbook.castingStat).toBe("int");
    expect(warnings.some((w) => w.includes("castingClass"))).toBe(true);
    expect(warnings.some((w) => w.includes("castingStat"))).toBe(true);
  });

  it("skips malformed spells, preparations, and SLAs with warnings", () => {
    const warnings: string[] = [];
    const spellbook = importSpellbook(
      {
        castingClass: "wizard",
        castingStat: "int",
        spells: [
          { id: 1, name: "Shield", baseLevel: 1, known: true },
          { name: "No Id" },
          null,
        ],
        spellPreparations: {
          level1: [{ spellId: 1, adjustedLevel: 1, metamagic: [], count: 2 }, { bogus: true }],
          sla: [{ spellId: 99, casts: 1, castsRemaining: 1 }, { nope: 1 }],
        },
      },
      createDefaultCharacter("x", "X"),
      warnings
    );
    expect(spellbook.spells).toHaveLength(1);
    expect(spellbook.preparations.level1).toEqual([
      { spellId: "1", adjustedLevel: 1, metamagic: [], count: 2 },
    ]);
    expect(spellbook.slas).toEqual([{ spellId: "99", casts: 1, castsRemaining: 1 }]);
    expect(warnings.some((w) => w.includes("spell entry without id/name"))).toBe(true);
    expect(warnings.some((w) => w.includes("malformed preparation"))).toBe(true);
    expect(warnings.some((w) => w.includes("not in spells[]"))).toBe(true);
    expect(warnings.some((w) => w.includes("malformed SLA"))).toBe(true);
  });
});
