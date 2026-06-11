/**
 * PRD anchor tests for the RAW spell tables added 2026-06 (the 13 classes
 * whose tableKeys were TODO). Expected rows are hand-transcribed from the
 * cited source pages — they validate SPELL_TABLES, never the reverse.
 *
 * Table encoding (see spells.ts): [classLevel-1][spellLevel], index 0 is
 * the cantrip/orison column (null = none or unlimited), null = spell level
 * not available, 0 = printed zero (slot level open, bonus spells apply).
 */
import { describe, expect, it } from "vitest";
import { CASTER_CONFIGS, getSpellSlots, SPELL_TABLES } from "../../../src/calc/spells";
import { CLASS_DATA } from "../../../src/data/classes";

const N = null;

describe("six-level capped-at-5 table (RAW)", () => {
  // https://aonprd.com/ClassDisplay.aspx?ItemName=Alchemist — anchor rows
  // L1 [1], L4 [3,1], L11 [5,4,4,2], L16 [5,5,5,4,3,1], L19 [5,5,5,5,5,4],
  // L20 [5,5,5,5,5,5]. Inquisitor/Investigator/Hunter/Mesmerist/Occultist/
  // Spiritualist/Skald/Omdura/Summoner (Unchained) print the same rows
  // (each page fetched and compared 2026-06-11).
  const t = SPELL_TABLES.alchemist;

  it("matches the printed anchor rows", () => {
    expect(t[0]).toEqual([N, 1, N, N, N, N, N]);
    expect(t[3]).toEqual([N, 3, 1, N, N, N, N]);
    expect(t[10]).toEqual([N, 5, 4, 4, 2, N, N]);
    expect(t[15]).toEqual([N, 5, 5, 5, 4, 3, 1]);
    expect(t[18]).toEqual([N, 5, 5, 5, 5, 5, 4]);
    expect(t[19]).toEqual([N, 5, 5, 5, 5, 5, 5]);
  });

  it("is shared by every six-level capped-at-5 class", () => {
    for (const key of [
      "inquisitor",
      "investigator",
      "hunter",
      "mesmerist",
      "occultist",
      "spiritualist",
      "omdura",
      "skald", // RAW FIX (2026-06): was a bard clone reaching 6/day
      "summoner (unchained)",
    ]) {
      expect(SPELL_TABLES[key]).toBe(t);
    }
  });
});

describe("warpriest table (RAW)", () => {
  // https://aonprd.com/ClassDisplay.aspx?ItemName=Warpriest — slots match
  // the six-level capped-at-5 family; the orison column (prepared, not
  // expended) is 3 at L1, 4 at L2-5, 5 from L6.
  const t = SPELL_TABLES.warpriest;

  it("matches the printed anchor rows (orisons + slots)", () => {
    expect(t[0]).toEqual([3, 1, N, N, N, N, N]);
    expect(t[4]).toEqual([4, 4, 2, N, N, N, N]);
    expect(t[5]).toEqual([5, 4, 3, N, N, N, N]);
    expect(t[10]).toEqual([5, 5, 4, 4, 2, N, N]);
    expect(t[19]).toEqual([5, 5, 5, 5, 5, 5, 5]);
  });
});

describe("bloodrager/medium four-level table (RAW)", () => {
  // https://aonprd.com/ClassDisplay.aspx?ItemName=Bloodrager and
  // ...?ItemName=Medium — identical: onset L4, L20 ends 4/4/3/2 (the
  // paladin/ranger table ends 4/4/3/3; that single row is why this is a
  // separate table).
  const t = SPELL_TABLES.bloodrager;

  it("matches the printed anchor rows", () => {
    expect(t[2]).toEqual([N, N, N, N, N]);
    expect(t[3]).toEqual([N, 1, N, N, N]);
    expect(t[6]).toEqual([N, 1, 1, N, N]);
    expect(t[12]).toEqual([N, 3, 2, 1, 1]);
    expect(t[18]).toEqual([N, 4, 3, 3, 2]);
    expect(t[19]).toEqual([N, 4, 4, 3, 2]);
  });

  it("is shared by the medium", () => {
    expect(SPELL_TABLES.medium).toBe(t);
  });
});

describe("vampire hunter table (RAW)", () => {
  // https://www.d20pfsrd.com/classes/base-classes/vampire-hunter/ —
  // printed ZEROS at each onset level (L4 1st, L7 2nd, L10 3rd, L13 4th):
  // the slot level is open and Wisdom bonus slots apply. L20 ends 4/4/3/3
  // (one 4th-level slot more than bloodrager/medium).
  const t = SPELL_TABLES["vampire hunter"];

  it("matches the printed anchor rows, preserving 0 vs null", () => {
    expect(t[2]).toEqual([N, N, N, N, N]);
    expect(t[3]).toEqual([N, 0, N, N, N]);
    expect(t[6]).toEqual([N, 1, 0, N, N]);
    expect(t[9]).toEqual([N, 2, 1, 0, N]);
    expect(t[12]).toEqual([N, 3, 2, 1, 0]);
    expect(t[19]).toEqual([N, 4, 4, 3, 3]);
  });

  it("printed 0 grants slots only via the casting-stat bonus", () => {
    expect(getSpellSlots("Vampire Hunter", 4, 1, 0)).toBe(0);
    expect(getSpellSlots("Vampire Hunter", 4, 1, 1)).toBe(1);
  });
});

describe("psychic table (RAW)", () => {
  // https://aonprd.com/ClassDisplay.aspx?ItemName=Psychic — the printed
  // spontaneous 9-level progression (3 first-level slots at L1, caps at 6).
  // The registry's legacy "sorcerer" table is a wizard-style clone and is
  // deliberately untouched; the psychic gets the true printed numbers.
  const t = SPELL_TABLES.psychic;

  it("matches the printed anchor rows", () => {
    expect(t[0]).toEqual([N, 3, N, N, N, N, N, N, N, N]);
    expect(t[3]).toEqual([N, 6, 3, N, N, N, N, N, N, N]);
    expect(t[10]).toEqual([N, 6, 6, 6, 6, 4, N, N, N, N]);
    expect(t[17]).toEqual([N, 6, 6, 6, 6, 6, 6, 6, 5, 3]);
    expect(t[19]).toEqual([N, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
  });
});

describe("tableKey / caster-config wiring", () => {
  it("every casting class resolves a table by its own name", () => {
    // The live spellbook path looks tables up by normalized castingClass,
    // not by tableKey — both must resolve.
    for (const data of Object.values(CLASS_DATA)) {
      if (!data.casting) continue;
      expect(data.casting.tableKey, `${data.key} tableKey`).toBeTruthy();
      expect(
        SPELL_TABLES[data.casting.tableKey!],
        `${data.key} SPELL_TABLES[${data.casting.tableKey}]`
      ).toBeDefined();
      expect(
        SPELL_TABLES[data.key.toLowerCase()],
        `${data.key} table by class name`
      ).toBeDefined();
    }
  });

  it("every casting class has a CASTER_CONFIGS entry matching its paradigm", () => {
    // Guards the silent wizard-prepared fallback in getCasterConfig.
    for (const data of Object.values(CLASS_DATA)) {
      if (!data.casting) continue;
      const config = CASTER_CONFIGS[data.key.toLowerCase()];
      expect(config, `${data.key} CASTER_CONFIGS entry`).toBeDefined();
      expect(config.type, `${data.key} paradigm`).toBe(data.casting.paradigm);
    }
  });
});
