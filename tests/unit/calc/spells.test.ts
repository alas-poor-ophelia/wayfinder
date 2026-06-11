/**
 * Characterization tests for src/calc/spells.ts.
 *
 * Fixtures in tests/unit/fixtures/spell-fixtures.json were captured by
 * running the REAL legacy spellbook calculators (spell-slots-lookup.js,
 * spell-calculations.js, metamagic-utils.js, caster-configs.js) inside
 * Obsidian — the port must reproduce every value exactly. Quirks (bonus
 * slots on null base levels, the +17 bonus-table cap) are deliberate.
 *
 * EXCEPTION — skald (RAW FIX 2026-06): the legacy table was a bard clone;
 * the skald slotsMatrix grids were regenerated from the printed ACG table
 * (96 cells changed, all at L12+ where the tables diverge). PRD anchors
 * live in spell-tables.test.ts.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  calculateSpellDC,
  calculateSpellRange,
  CASTER_CONFIGS,
  computeSpellbook,
  getArcanistCasts,
  getCasterConfig,
  getMetamagicLevelAdjustment,
  getSpellSaveType,
  getSpellSlots,
  METAMAGIC_OPTIONS,
  totalMetamagicAdjustment,
} from "../../../src/calc/spells";
import { importSpellbook } from "../../../src/import/legacy-import";
import { createDefaultCharacter } from "../../../src/types/character";

interface SpellFixtures {
  adarinSpellbook: Record<string, unknown>;
  adarinLive: {
    castingClass: string;
    casterLevel: number;
    castingStatBonus: number;
    slotsByLevel: number[];
    casterConfig: { type: string; usesSpellbook: boolean; spontaneousCasting: boolean };
    spells: { name: string; baseLevel: number; dc: number; range: string; saveType: string }[];
  };
  slotsMatrix: Record<string, Record<string, number[][]>>;
  arcanistCasts: Record<string, number[][]>;
  highStatMods: { mod: number; skaldL1At2: number; wizardL1At1: number }[];
  aliases: { alias: string; l5s1mod3?: number; error?: string }[];
  unknownClass: { threw: boolean; message: string };
  dcSamples: { L: number; mod: number; dc: number }[];
  rangeMatrix: { rangeType: string; casterLevel: number; out: string }[];
  metamagicOptions: { name: string; adjustment: number }[];
  metamagicUnknown: number;
  metamagicSubsets: { subset: string[]; total: number }[];
  saveTypes: { input: { saveType?: string; save?: string }; out: string }[];
  casterConfigs: Record<string, { type: string; usesSpellbook: boolean; spontaneousCasting: boolean }>;
}

const fixtures: SpellFixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/spell-fixtures.json", import.meta.url)), "utf-8")
);

describe("getSpellSlots", () => {
  describe("full matrix: class × statMod × classLevel × spellLevel", () => {
    const classes = Object.keys(fixtures.slotsMatrix);
    it.each(classes)("%s", (cls) => {
      for (const [mod, grid] of Object.entries(fixtures.slotsMatrix[cls])) {
        const statMod = Number(mod);
        for (let cl = 1; cl <= 20; cl++) {
          for (let L = 0; L <= 9; L++) {
            expect(getSpellSlots(cls, cl, L, statMod)).toBe(grid[cl - 1][L]);
          }
        }
      }
    });
  });

  it("preserves the null-base bonus-slot quirk (skald CL2 +5 CHA gets L2-L5 slots)", () => {
    expect(getSpellSlots("skald", 2, 2, 5)).toBe(1);
    expect(getSpellSlots("skald", 2, 5, 5)).toBe(1);
    expect(getSpellSlots("skald", 2, 6, 5)).toBe(0);
  });

  it("caps the bonus table at +17 (higher mods add nothing — quirk)", () => {
    for (const { mod, skaldL1At2, wizardL1At1 } of fixtures.highStatMods) {
      expect(getSpellSlots("skald", 2, 1, mod)).toBe(skaldL1At2);
      expect(getSpellSlots("wizard", 1, 1, mod)).toBe(wizardL1At1);
    }
  });

  it("resolves class aliases", () => {
    for (const { alias, l5s1mod3, error } of fixtures.aliases) {
      if (error !== undefined) {
        expect(() => getSpellSlots(alias, 5, 1, 3)).toThrow();
      } else {
        expect(getSpellSlots(alias, 5, 1, 3)).toBe(l5s1mod3);
      }
    }
  });

  it("throws on unknown classes with the legacy message", () => {
    expect(fixtures.unknownClass.threw).toBe(true);
    expect(() => getSpellSlots("monk", 5, 1, 0)).toThrow(fixtures.unknownClass.message);
  });
});

describe("getArcanistCasts", () => {
  it("matches the captured casts matrix", () => {
    for (const [mod, grid] of Object.entries(fixtures.arcanistCasts)) {
      const statMod = Number(mod);
      for (let cl = 1; cl <= 20; cl++) {
        for (let L = 0; L <= 9; L++) {
          expect(getArcanistCasts("arcanist", cl, L, statMod)).toBe(grid[cl - 1][L]);
        }
      }
    }
  });

  it("falls through to getSpellSlots for non-arcanists", () => {
    expect(getArcanistCasts("wizard", 5, 1, 3)).toBe(getSpellSlots("wizard", 5, 1, 3));
  });
});

describe("calculateSpellDC", () => {
  it("matches captured samples", () => {
    for (const { L, mod, dc } of fixtures.dcSamples) {
      expect(calculateSpellDC(L, mod)).toBe(dc);
    }
  });
});

describe("calculateSpellRange", () => {
  it("matches the captured range matrix", () => {
    for (const { rangeType, casterLevel, out } of fixtures.rangeMatrix) {
      expect(calculateSpellRange(rangeType, casterLevel)).toBe(out);
    }
  });
});

describe("metamagic", () => {
  it("ports the exact 5 legacy options and adjustments", () => {
    expect([...METAMAGIC_OPTIONS]).toEqual(fixtures.metamagicOptions.map((o) => o.name));
    for (const { name, adjustment } of fixtures.metamagicOptions) {
      expect(getMetamagicLevelAdjustment(name)).toBe(adjustment);
    }
  });

  it("unknown metamagic adjusts by 0 (no Quicken in legacy)", () => {
    expect(getMetamagicLevelAdjustment("Quicken Spell (+4 levels)")).toBe(fixtures.metamagicUnknown);
    expect(fixtures.metamagicUnknown).toBe(0);
  });

  it("matches all 32 captured subsets", () => {
    for (const { subset, total } of fixtures.metamagicSubsets) {
      expect(totalMetamagicAdjustment(subset)).toBe(total);
    }
  });
});

describe("getSpellSaveType", () => {
  it("matches the captured variants", () => {
    for (const { input, out } of fixtures.saveTypes) {
      expect(getSpellSaveType(input)).toBe(out);
    }
  });
});

describe("getCasterConfig", () => {
  it("matches the legacy registry (unknown/empty/null fall back to wizard)", () => {
    for (const [cls, config] of Object.entries(fixtures.casterConfigs)) {
      const key = cls === "null" ? null : cls;
      expect(getCasterConfig(key)).toEqual(config);
    }
    // RAW expansion (2026-06): the legacy registry carried 15 entries; the
    // 14 new casting classes (incl. shaman/antipaladin) bring it to 29. The
    // legacy entries above are still matched verbatim.
    expect(Object.keys(CASTER_CONFIGS)).toHaveLength(29);
  });
});

describe("computeSpellbook (Adarin live integration)", () => {
  function adarinSpellbookState() {
    const record = createDefaultCharacter("adarin", "Adarin");
    record.classes = [
      { className: "Paladin (Unchained)", level: 5 },
      { className: "Skald", level: 2 },
    ];
    record.baseAbilities.cha = 20;
    const warnings: string[] = [];
    const spellbook = importSpellbook(fixtures.adarinSpellbook, record, warnings);
    return { record, spellbook, warnings };
  }

  it("reproduces the live slot maxima for every level", () => {
    const { spellbook } = adarinSpellbookState();
    const computed = computeSpellbook({
      spellbook,
      classes: [{ className: "Skald", level: 2 }],
      mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 5 },
    });
    expect(computed.casterLevel).toBe(fixtures.adarinLive.casterLevel);
    expect(computed.castingStatBonus).toBe(fixtures.adarinLive.castingStatBonus);
    expect(computed.paradigm).toBe(fixtures.adarinLive.casterConfig.type);
    expect(computed.levels.map((l) => l.maxSlots)).toEqual(fixtures.adarinLive.slotsByLevel);
  });

  it("renders stored remaining counts, with null meaning never-initialized (= max)", () => {
    const { spellbook } = adarinSpellbookState();
    const computed = computeSpellbook({
      spellbook,
      classes: [{ className: "Skald", level: 2 }],
      mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 5 },
    });
    // live file: level1 totalRemaining 3 (one cast spent of 4)
    expect(computed.levels[1].remaining).toBe(3);
    // live file: level0 totalRemaining null → renders as max
    expect(computed.levels[0].remaining).toBe(computed.levels[0].maxSlots);
    // deliberate divergence from legacy: stored 0 stays 0 (legacy displayed
    // null-after-last-cast as a refilled tracker)
    spellbook.levels.level1.remaining = 0;
    const recomputed = computeSpellbook({
      spellbook,
      classes: [{ className: "Skald", level: 2 }],
      mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 5 },
    });
    expect(recomputed.levels[1].remaining).toBe(0);
  });

  it("reproduces DC / range / saveType for all 14 live spells", () => {
    const { spellbook } = adarinSpellbookState();
    expect(spellbook.spells).toHaveLength(fixtures.adarinLive.spells.length);
    for (const live of fixtures.adarinLive.spells) {
      const spell = spellbook.spells.find((s) => s.name === live.name);
      expect(spell, live.name).toBeDefined();
      expect(calculateSpellDC(spell!.baseLevel, 5)).toBe(live.dc);
      expect(calculateSpellRange(spell!.range, 2)).toBe(live.range);
      expect(getSpellSaveType(spell!)).toBe(live.saveType);
    }
  });

  it("computes arcanist dual pools (preps ignore stat bonus, casts use it)", () => {
    const { spellbook } = adarinSpellbookState();
    const arcanist = { ...spellbook, castingClass: "arcanist", castingStat: "int" as const };
    const computed = computeSpellbook({
      spellbook: arcanist,
      classes: [{ className: "Arcanist", level: 7 }],
      mods: { str: 0, dex: 0, con: 0, int: 4, wis: 0, cha: 0 },
    });
    expect(computed.levels[1].maxSlots).toBe(getSpellSlots("arcanist", 7, 1, 0));
    expect(computed.levels[1].arcanistCasts).toBe(getArcanistCasts("arcanist", 7, 1, 4));
  });

  it("yields zero slots (not a crash) for classes outside the slot tables", () => {
    // (Was "alchemist" until the RAW tables landed 2026-06 — alchemist now
    // has real slots, so a true non-caster plays the unknown class.)
    const { spellbook } = adarinSpellbookState();
    const odd = { ...spellbook, castingClass: "fighter" };
    const computed = computeSpellbook({
      spellbook: odd,
      classes: [{ className: "Fighter", level: 5 }],
      mods: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
    });
    expect(computed.levels.every((l) => l.maxSlots === 0)).toBe(true);
    expect(computed.paradigm).toBe("prepared");
  });
});
