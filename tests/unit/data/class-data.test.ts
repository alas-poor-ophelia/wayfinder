/**
 * Class data registry contract. Spot-check values are hand-verified
 * against the PRD (legacy.aonprd.com) — they validate the registry, not
 * the other way round. The CLASS_STATS consistency block doubles as a
 * transcription-error detector for generated entries.
 */
import { describe, expect, it } from "vitest";
import { CLASS_DATA, classResources, getClassData, unionClassSkills } from "../../../src/data/classes";
import { BAB_RATE } from "../../../src/data/types";
import { CLASS_STATS, totalBab } from "../../../src/calc/class-stats";
import { calculateSaves } from "../../../src/calc/saves";
import { SPELL_TABLES } from "../../../src/calc/spells";
import { STANDARD_SKILLS } from "../../../src/calc/skills";

const entries = Object.values(CLASS_DATA);
const MODS0 = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

describe("CLASS_DATA coverage", () => {
  it("covers every CLASS_STATS class", () => {
    const missing = Object.keys(CLASS_STATS).filter((k) => !CLASS_DATA[k]);
    expect(missing).toEqual([]);
  });
});

describe("CLASS_DATA consistency with CLASS_STATS", () => {
  for (const data of entries) {
    const stats = CLASS_STATS[data.key];
    if (!stats) continue; // additions beyond the legacy registry
    it(`${data.key} matches the fixture-locked registry`, () => {
      expect(`d${data.hitDie}`).toBe(stats.hitDie);
      expect(BAB_RATE[data.bab]).toBe(stats.bab);
      expect(data.saves.fort === "good").toBe(stats.saves.fort);
      expect(data.saves.ref === "good").toBe(stats.saves.ref);
      expect(data.saves.will === "good").toBe(stats.saves.will);
    });
  }
});

describe("CLASS_DATA shape", () => {
  for (const data of entries) {
    it(`${data.key} has valid skills and casting refs`, () => {
      expect(data.classSkills.length).toBeGreaterThan(0);
      expect(new Set(data.classSkills).size).toBe(data.classSkills.length);
      const unknown = data.classSkills.filter((s) => !STANDARD_SKILLS[s]);
      expect(unknown).toEqual([]);
      expect([2, 4, 6, 8]).toContain(data.skillRanksPerLevel);
      if (data.casting?.tableKey) {
        expect(SPELL_TABLES[data.casting.tableKey]).toBeDefined();
      }
    });
  }
});

describe("core class spot-checks (PRD-verified)", () => {
  it("fighter: 2 ranks, soldier's skill list", () => {
    const f = getClassData("Fighter")!;
    expect(f.skillRanksPerLevel).toBe(2);
    expect(f.classSkills).toContain("Knowledge (dungeon)");
    expect(f.classSkills).toContain("Knowledge (engineering)");
    expect(f.classSkills).not.toContain("Perception");
  });

  it("rogue: 8 ranks; bard/wizard: all ten Knowledges", () => {
    expect(getClassData("Rogue")!.skillRanksPerLevel).toBe(8);
    const knowledges = (key: string) =>
      getClassData(key)!.classSkills.filter((s) => s.startsWith("Knowledge")).length;
    expect(knowledges("Bard")).toBe(10);
    expect(knowledges("Wizard")).toBe(10);
  });

  it("casting metadata: wizard INT/9 prepared, paladin CHA/4 prepared", () => {
    expect(getClassData("Wizard")!.casting).toMatchObject({
      ability: "int",
      paradigm: "prepared",
      maxSpellLevel: 9,
      tableKey: "wizard",
    });
    expect(getClassData("Paladin")!.casting).toMatchObject({
      ability: "cha",
      maxSpellLevel: 4,
      tableKey: "paladin",
    });
    expect(getClassData("Fighter")!.casting).toBeUndefined();
  });

  it("resource formulas match the PRD tables", () => {
    const mods = (over: Partial<typeof MODS0>) => ({ ...MODS0, ...over });
    const pool = (cls: string, id: string) =>
      getClassData(cls)!.resources!.find((r) => r.id === id)!;
    // Rage: 4 + Con + 2/(level beyond 1st) → L5, Con +2 = 14
    expect(pool("Barbarian", "rageRounds").max(5, mods({ con: 2 }))).toBe(14);
    // Ki: L/2 + Wis, from 4th → L4, Wis +3 = 5
    expect(pool("Monk", "kiPool").minLevel).toBe(4);
    expect(pool("Monk", "kiPool").max(4, mods({ wis: 3 }))).toBe(5);
    // Lay on hands: L/2 + Cha, from 2nd → L4, Cha +4 = 6
    expect(pool("Paladin", "layOnHands").max(4, mods({ cha: 4 }))).toBe(6);
    // Smite: 1st, then 4/7/10/13/16/19 → L19 = 7
    expect(pool("Paladin", "smiteEvil").max(19, MODS0)).toBe(7);
    // Bardic performance: 4 + Cha + 2/(level beyond 1st) → L1, Cha +3 = 7
    expect(pool("Bard", "bardicPerformance").max(1, mods({ cha: 3 }))).toBe(7);
    // Channel energy: 3 + Cha → Cha +2 = 5
    expect(pool("Cleric", "channelEnergy").max(10, mods({ cha: 2 }))).toBe(5);
    // Wild shape: from 4th, 1 use then +1 per 2 levels → L8 = 3
    expect(pool("Druid", "wildShape").max(8, MODS0)).toBe(3);
  });
});

/**
 * RAW corrections (PRD-verified). These eight classes shipped with legacy
 * CLASS_STATS values that contradict the published tables; the 2026-06
 * expedition adopted RAW deliberately. Each expectation is transcribed by
 * hand from the cited legacy.aonprd.com class table (L1/L20 rows), never
 * from the registries under test.
 */
describe("RAW corrections (PRD-verified)", () => {
  type Raw = {
    hitDie: 6 | 8 | 10 | 12;
    bab: "full" | "threeQuarters" | "half";
    saves: { fort: boolean; ref: boolean; will: boolean };
  };
  // citation: legacy.aonprd.com class table, L1 saves row (+2 = good, +0 = poor)
  const RAW_FIXES: Record<string, Raw> = {
    // advancedClassGuide/classes/bloodrager.html — d10, full BAB, L1 F+2/R+0/W+0
    Bloodrager: { hitDie: 10, bab: "full", saves: { fort: true, ref: false, will: false } },
    // advancedClassGuide/classes/hunter.html — d8, 3/4 BAB, L1 F+2/R+2/W+0
    Hunter: { hitDie: 8, bab: "threeQuarters", saves: { fort: true, ref: true, will: false } },
    // occultAdventures/occultClasses/kineticist.html — d8, 3/4 BAB, L1 F+2/R+2/W+0
    Kineticist: { hitDie: 8, bab: "threeQuarters", saves: { fort: true, ref: true, will: false } },
    // occultAdventures/occultClasses/mesmerist.html — d8, 3/4 BAB, L1 F+0/R+2/W+2
    Mesmerist: { hitDie: 8, bab: "threeQuarters", saves: { fort: false, ref: true, will: true } },
    // occultAdventures/occultClasses/spiritualist.html — d8, 3/4 BAB, L1 F+2/R+0/W+2
    Spiritualist: { hitDie: 8, bab: "threeQuarters", saves: { fort: true, ref: false, will: true } },
    // ultimateIntrigue/vigilante.html — d8, 3/4 BAB, L1 F+0/R+2/W+2
    Vigilante: { hitDie: 8, bab: "threeQuarters", saves: { fort: false, ref: true, will: true } },
    // ultimateWilderness/classes/shifter.html — d10, FULL BAB, L1 F+2/R+2/W+0
    Shifter: { hitDie: 10, bab: "full", saves: { fort: true, ref: true, will: false } },
    // advancedClassGuide/classes/swashbuckler.html — d10, FULL BAB, L1 F+0/R+2/W+0
    Swashbuckler: { hitDie: 10, bab: "full", saves: { fort: false, ref: true, will: false } },
  };

  for (const [key, raw] of Object.entries(RAW_FIXES)) {
    it(`${key}: CLASS_DATA and CLASS_STATS both carry the published values`, () => {
      const data = getClassData(key)!;
      expect(data.hitDie).toBe(raw.hitDie);
      expect(data.bab).toBe(raw.bab);
      expect(data.saves.fort === "good").toBe(raw.saves.fort);
      expect(data.saves.ref === "good").toBe(raw.saves.ref);
      expect(data.saves.will === "good").toBe(raw.saves.will);
      const stats = CLASS_STATS[key];
      expect(stats.hitDie).toBe(`d${raw.hitDie}`);
      expect(stats.bab).toBe(BAB_RATE[raw.bab]);
      expect(stats.saves).toEqual(raw.saves);
    });
  }

  it("RAW values take effect in totalBab/calculateSaves", () => {
    // Swashbuckler L5: full BAB → +5 (legacy 0.75 gave +3)
    expect(totalBab([{ className: "Swashbuckler", level: 5 }])).toBe(5);
    // Shifter L4: full BAB → +4 (legacy 0.75 gave +3)
    expect(totalBab([{ className: "Shifter", level: 4 }])).toBe(4);
    // Hunter L4: good Ref → 2 + 2 = +4 (legacy poor gave +1)
    const hunter = calculateSaves({ classes: [{ className: "Hunter", level: 4 }] });
    expect(hunter.ref).toBe(4);
    // Hunter L4: poor Will → floor(4/3) = +1 (legacy good gave +4)
    expect(hunter.will).toBe(1);
    // Bloodrager L6: poor Will → +2 (legacy good gave +5)
    const bloodrager = calculateSaves({ classes: [{ className: "Bloodrager", level: 6 }] });
    expect(bloodrager.will).toBe(2);
    // Mesmerist L6: good Will → +5, poor Fort → +2
    const mesmerist = calculateSaves({ classes: [{ className: "Mesmerist", level: 6 }] });
    expect(mesmerist.will).toBe(5);
    expect(mesmerist.fort).toBe(2);
  });
});

describe("classResources / unionClassSkills", () => {
  it("respects minLevel and multiclassing", () => {
    const mods = { ...MODS0, wis: 2, con: 1 };
    // Stunning Fist from 1st; ki only comes online at 4th
    const monk3 = classResources([{ className: "Monk", level: 3 }], mods);
    expect(monk3.map((p) => p.id)).toEqual(["stunningFist"]);
    const multi = classResources(
      [
        { className: "Monk", level: 4 },
        { className: "Barbarian", level: 2 },
      ],
      mods
    );
    expect(multi.map((p) => p.id).sort()).toEqual([
      "kiPool",
      "rageRounds",
      "stunningFist",
    ]);
  });

  it("unions class skills across classes", () => {
    const skills = unionClassSkills([
      { className: "Fighter", level: 1 },
      { className: "Rogue", level: 1 },
    ]);
    expect(skills.has("Perception")).toBe(true); // rogue
    expect(skills.has("Handle Animal")).toBe(true); // fighter
    expect(skills.has("Fly")).toBe(false); // neither
  });
});
