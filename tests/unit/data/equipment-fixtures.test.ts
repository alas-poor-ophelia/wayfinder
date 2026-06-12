/**
 * Characterization spot-checks for the committed equipment catalog JSON
 * (scraped from aonprd.com by scripts/scrape-equipment/). Expected values
 * are hand-derived from the Core Rulebook equipment tables (6-4/6-6) and
 * independently cross-checked against the AoN display pages — if a re-scrape
 * breaks one of these, the parser regressed, not the data.
 */
import { describe, expect, it } from "vitest";
import type { BaseArmorDef, BaseWeaponDef } from "../../../src/types/equipment";
import armorJson from "../../../src/data/equipment/armor.json";
import weaponsJson from "../../../src/data/equipment/weapons.json";

const weapons = weaponsJson as unknown as BaseWeaponDef[];
const armor = armorJson as unknown as BaseArmorDef[];

const weapon = (id: string): BaseWeaponDef => {
  const def = weapons.find((w) => w.id === id);
  if (!def) throw new Error(`weapon "${id}" missing from catalog`);
  return def;
};
const armorPiece = (id: string): BaseArmorDef => {
  const def = armor.find((a) => a.id === id);
  if (!def) throw new Error(`armor "${id}" missing from catalog`);
  return def;
};

describe("equipment catalog: weapons.json", () => {
  it("has a plausible catalog size", () => {
    expect(weapons.length).toBeGreaterThan(100);
  });

  it("is sorted by id with unique ids", () => {
    const ids = weapons.map((w) => w.id);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("longsword matches the Core Rulebook row", () => {
    expect(weapon("longsword")).toMatchObject({
      name: "Longsword",
      costGp: 15,
      dmgS: "1d6",
      dmgM: "1d8",
      critRange: "19-20",
      critMult: "2",
      rangeFt: null,
      weightLbs: 4,
      dmgType: "S",
      proficiency: "martial",
      category: "one-handed",
    });
  });

  it("dagger matches the Core Rulebook row (thrown range, light)", () => {
    expect(weapon("dagger")).toMatchObject({
      costGp: 2,
      dmgS: "1d3",
      dmgM: "1d4",
      critRange: "19-20",
      critMult: "2",
      rangeFt: 10,
      weightLbs: 1,
      proficiency: "simple",
      category: "light",
    });
  });

  it("every weapon has a well-formed id and name", () => {
    for (const w of weapons) {
      expect(w.id, w.name).toMatch(/^[a-z0-9-]+$/);
      expect(w.name.length).toBeGreaterThan(0);
    }
  });
});

describe("equipment catalog: armor.json", () => {
  it("has a plausible catalog size", () => {
    expect(armor.length).toBeGreaterThan(40);
  });

  it("full plate matches the Core Rulebook row", () => {
    expect(armorPiece("full-plate")).toMatchObject({
      name: "Full plate",
      costGp: 1500,
      acBonus: 9,
      kind: "armor",
      maxDex: 1,
      acp: -6,
      asfPct: 35,
      speed30: 20,
      weightLbs: 50,
      category: "heavy",
    });
  });

  it("chain shirt matches the Core Rulebook row", () => {
    expect(armorPiece("chain-shirt")).toMatchObject({
      costGp: 100,
      acBonus: 4,
      kind: "armor",
      maxDex: 4,
      acp: -2,
      asfPct: 20,
      weightLbs: 25,
      category: "light",
    });
  });

  it("heavy steel shield is a shield with shield kind", () => {
    expect(armorPiece("heavy-steel-shield")).toMatchObject({
      acBonus: 2,
      kind: "shield",
      acp: -2,
      category: "shield",
    });
  });

  it("ACP is never positive", () => {
    for (const a of armor) {
      expect(a.acp, a.name).toBeLessThanOrEqual(0);
    }
  });
});
