/**
 * Weapon Finesse / Agile / Elephant in the Room.
 *
 * Dex-for-Str substitution has three independent sources that the attack
 * calc OR's together, always as an UPGRADE (dex > str):
 *   - the legacy `agileWeapon` manual toggle (no weapon needed)
 *   - a finesse weapon (item.finesse) with Weapon Finesse active — automatic
 *     under EitR, otherwise the feat toggle / a class grant
 *   - Dex-to-DAMAGE, which EitR grants to any finesse weapon but RAW gates
 *     behind the Agile enchant (item.agile)
 *
 * CMB: Dex under EitR (the preserved legacy quirk), Str under RAW.
 */
import { describe, expect, it } from "vitest";
import { calculateAttackStrings } from "../../../src/calc/attacks";
import { computeAll } from "../../../src/calc";
import { customDraft, weaponStatsFor } from "../../../src/state/equip-drafts";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultInventory, type InventoryItem } from "../../../src/types/inventory";
import type { BaseWeaponDef } from "../../../src/types/equipment";
import type { CustomItemDef } from "../../../src/types/custom-items";

const FINESSE_WEAPON = {
  damageDie: "1d8",
  critRange: "19-20",
  critMult: "2",
  finesse: true,
} as const;
const PLAIN_WEAPON = { damageDie: "1d8", critRange: "19-20", critMult: "2" } as const;

// str +2, dex +5: finesse turns +2 into +5 on whichever line it reaches.
function melee(patch: Record<string, unknown>): string {
  return calculateAttackStrings({ bab: 0, strMod: 2, dexMod: 5, ...patch }).melee;
}
const atkBonus = (s: string): number =>
  Number(s.match(/Standard Attack:\*\* \+(-?\d+)/)![1]);
const dmgBonus = (s: string): number => Number(s.match(/\(1d\d+\+(-?\d+)\)/)![1]);

describe("weaponStatsFor finesse stamping", () => {
  const base: BaseWeaponDef = {
    id: "longsword", name: "Longsword", costGp: 15, dmgS: "1d6", dmgM: "1d8",
    critRange: "19-20", critMult: "2", rangeFt: null, weightLbs: 4, dmgType: "S",
    special: [], proficiency: "martial", category: "one-handed", source: "Core",
  };

  it("light weapons stamp finesse", () => {
    expect(weaponStatsFor({ ...base, category: "light" })?.finesse).toBe(true);
  });
  it("named finesse weapons (rapier) stamp finesse despite one-handed", () => {
    expect(weaponStatsFor({ ...base, id: "rapier", category: "one-handed" })?.finesse).toBe(true);
  });
  it("a plain one-handed/two-handed weapon does not stamp finesse", () => {
    expect(weaponStatsFor(base)?.finesse).toBeUndefined();
    expect(weaponStatsFor({ ...base, category: "two-handed" })?.finesse).toBeUndefined();
  });
  it("ranged finesse weapons never stamp finesse (melee-only)", () => {
    expect(weaponStatsFor({ ...base, id: "rapier", category: "ranged" })?.finesse).toBeUndefined();
  });
});

describe("customDraft Agile stamping", () => {
  const base: BaseWeaponDef = {
    id: "rapier", name: "Rapier", costGp: 20, dmgS: "1d4", dmgM: "1d6",
    critRange: "18-20", critMult: "2", rangeFt: null, weightLbs: 2, dmgType: "P",
    special: [], proficiency: "martial", category: "one-handed", source: "Core",
  };
  const forged = (abilityIds: string[]): CustomItemDef => ({
    id: "ci_a", name: "+1 Agile Rapier", kind: "weapon", baseId: "rapier",
    enhancement: 1, abilityIds, priceGp: 8000, weightLbs: 2, modifiers: [],
    note: "", createdAt: "", modifiedAt: "",
  });

  it("stamps agile when the forge applied the agile ability", () => {
    const w = customDraft(forged(["agile"]), base).weapon;
    expect(w?.agile).toBe(true);
    expect(w?.finesse).toBe(true); // rapier is finesse
  });
  it("does not stamp agile otherwise", () => {
    expect(customDraft(forged(["flaming"]), base).weapon?.agile).toBeUndefined();
  });
});

describe("melee attack/damage stat selection", () => {
  it("EitR: a finesse weapon auto-uses Dex for attack AND damage", () => {
    const s = melee({ meleeWeapon: FINESSE_WEAPON, elephantInTheRoom: true });
    expect(atkBonus(s)).toBe(5);
    expect(dmgBonus(s)).toBe(5);
  });

  it("EitR: a non-finesse weapon stays on Str (greatsword)", () => {
    const s = melee({ meleeWeapon: PLAIN_WEAPON, elephantInTheRoom: true });
    expect(atkBonus(s)).toBe(2);
    expect(dmgBonus(s)).toBe(2);
  });

  it("RAW + no finesse: a finesse weapon stays on Str", () => {
    const s = melee({ meleeWeapon: FINESSE_WEAPON, elephantInTheRoom: false });
    expect(atkBonus(s)).toBe(2);
    expect(dmgBonus(s)).toBe(2);
  });

  it("RAW + Weapon Finesse: Dex to attack, but Str to damage (no Agile)", () => {
    const s = melee({
      meleeWeapon: FINESSE_WEAPON,
      elephantInTheRoom: false,
      weaponFinesse: true,
    });
    expect(atkBonus(s)).toBe(5);
    expect(dmgBonus(s)).toBe(2);
  });

  it("RAW + Weapon Finesse + Agile enchant: Dex to attack AND damage", () => {
    const s = melee({
      meleeWeapon: { ...FINESSE_WEAPON, agile: true },
      elephantInTheRoom: false,
      weaponFinesse: true,
    });
    expect(atkBonus(s)).toBe(5);
    expect(dmgBonus(s)).toBe(5);
  });

  it("Agile enchant alone (no Weapon Finesse, RAW) does nothing", () => {
    const s = melee({
      meleeWeapon: { ...FINESSE_WEAPON, agile: true },
      elephantInTheRoom: false,
    });
    expect(atkBonus(s)).toBe(2);
    expect(dmgBonus(s)).toBe(2);
  });

  it("the generic legacy melee line (no weapon) never auto-finesses", () => {
    // EitR on but meleeWeapon absent → no finesse signal → Str, exactly as
    // the frozen QA-parity matrix expects.
    const s = melee({ elephantInTheRoom: true });
    expect(atkBonus(s)).toBe(2);
  });

  it("the legacy agileWeapon toggle still forces Dex (no weapon needed)", () => {
    const s = melee({ agileWeapon: true });
    expect(atkBonus(s)).toBe(5);
    expect(dmgBonus(s)).toBe(5);
  });

  it("finesse is only ever an upgrade — Str wins when Str >= Dex", () => {
    const s = calculateAttackStrings({
      bab: 0, strMod: 5, dexMod: 2,
      meleeWeapon: FINESSE_WEAPON, elephantInTheRoom: true,
    }).melee;
    expect(atkBonus(s)).toBe(5); // str, not dex
  });
});

describe("CMB ability under the EitR toggle", () => {
  function fighter() {
    const c = createDefaultCharacter("f", "F");
    c.classes = [{ className: "Fighter", level: 4 }];
    c.baseAbilities = { str: 10, dex: 16, con: 12, int: 10, wis: 10, cha: 10 };
    return c;
  }
  it("EitR on → Dex (bab 4 + dex 3)", () => {
    expect(computeAll(fighter(), null, { elephantInTheRoom: true }).ac.cmb).toBe(7);
  });
  it("EitR off → Str (bab 4 + str 0)", () => {
    expect(computeAll(fighter(), null, { elephantInTheRoom: false }).ac.cmb).toBe(4);
  });
  it("default (no options) keeps the legacy Dex quirk", () => {
    expect(computeAll(fighter()).ac.cmb).toBe(7);
  });
});

describe("Virtuous Bravo grants Weapon Finesse to its profiles", () => {
  function bravo(): InventoryItem[] {
    return [
      {
        id: "item_rap", name: "Rapier", type: "Weapon", count: 1, weight: 2,
        value: 20, containerId: null, note: null, charges: null, equipped: true,
        weapon: { kind: "melee", ...FINESSE_WEAPON },
      },
    ];
  }
  function char(archetypeKeys: string[]) {
    const c = createDefaultCharacter("b", "Bravo");
    c.classes = [{ className: "Paladin (Virtuous Bravo)", level: 5, archetypeKeys }];
    c.baseAbilities = { str: 12, dex: 18, con: 14, int: 10, wis: 8, cha: 16 };
    c.inventory = createDefaultInventory();
    c.inventory.items.push(...bravo());
    return c;
  }
  const profileAtk = (archetypeKeys: string[]): number => {
    // EitR off isolates the archetype grant from the houserule.
    const out = computeAll(char(archetypeKeys), null, { elephantInTheRoom: false });
    return Number(
      out.attackProfiles.melee[0].text.match(/Standard Attack:\*\* \+(-?\d+)/)![1]
    );
  };
  it("the class grant swaps the rapier profile from Str to Dex (delta = dex - str)", () => {
    // str 12 (+1), dex 18 (+4): the grant should raise the bonus by 3.
    expect(profileAtk(["virtuous-bravo"]) - profileAtk([])).toBe(3);
  });
});
