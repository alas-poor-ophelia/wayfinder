/**
 * Derived attack profiles through computeAll: equipped Weapon-type items
 * with stamped weapon stats become per-weapon attack text; everything else
 * (unequipped, statless, wrong type) stays out. The legacy attacks.melee /
 * .ranged strings are untouched by equipping.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import {
  createDefaultInventory,
  type InventoryItem,
} from "../../../src/types/inventory";

let nextId = 0;
function weaponItem(patch: Partial<InventoryItem>): InventoryItem {
  return {
    id: `item_test${nextId++}`,
    name: "Test Weapon",
    type: "Weapon",
    count: 1,
    weight: 4,
    value: 15,
    containerId: null,
    note: null,
    charges: null,
    equipped: true,
    weapon: { kind: "melee", damageDie: "1d8", critRange: "19-20", critMult: "2" },
    ...patch,
  };
}

function withItems(items: InventoryItem[]) {
  const c = createDefaultCharacter("t", "T");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.inventory = createDefaultInventory();
  c.inventory.items.push(...items);
  return c;
}

describe("computeAll attackProfiles", () => {
  it("equipped melee weapon yields a melee profile with its dice", () => {
    const out = computeAll(
      withItems([weaponItem({ name: "Longsword" })])
    );
    expect(out.attackProfiles.melee).toHaveLength(1);
    expect(out.attackProfiles.melee[0].name).toBe("Longsword");
    expect(out.attackProfiles.melee[0].text).toContain("1d8");
    expect(out.attackProfiles.melee[0].text).toContain("(19-20/x2)");
    expect(out.attackProfiles.ranged).toHaveLength(0);
  });

  it("ranged weapons land in the ranged bucket", () => {
    const out = computeAll(
      withItems([
        weaponItem({
          name: "Composite Longbow",
          weapon: { kind: "ranged", damageDie: "1d8", critRange: "20", critMult: "3" },
        }),
      ])
    );
    expect(out.attackProfiles.ranged).toHaveLength(1);
    expect(out.attackProfiles.melee).toHaveLength(0);
    expect(out.attackProfiles.ranged[0].text).toContain("(20/x3)");
  });

  it("unequipped, statless, and non-Weapon items yield no profiles", () => {
    const out = computeAll(
      withItems([
        weaponItem({ equipped: false }),
        weaponItem({ weapon: undefined }),
        weaponItem({ type: "Gear" }),
      ])
    );
    expect(out.attackProfiles.melee).toHaveLength(0);
    expect(out.attackProfiles.ranged).toHaveLength(0);
  });

  it("equipping weapons never changes the legacy attack strings", () => {
    const bare = computeAll(withItems([]));
    const armed = computeAll(
      withItems([weaponItem({}), weaponItem({ name: "Dagger" })])
    );
    expect(armed.attacks).toEqual(bare.attacks);
    expect(armed.attackProfiles.melee).toHaveLength(2);
  });

  it("shuriken-style flags flow through to the ranged profile math", () => {
    const c = withItems([
      weaponItem({
        name: "Shuriken (5)",
        weapon: {
          kind: "ranged",
          damageDie: "1d2",
          critRange: "20",
          critMult: "2",
          damageStat: "str",
          flurry: true,
        },
      }),
    ]);
    c.baseAbilities.str = 16; // +3
    const out = computeAll(c);
    // str rides the damage line, like the legacy built-in Shuriken entry
    expect(out.attackProfiles.ranged[0].text).toContain("1d2+3");
  });

  it("rangedTouch toggle swaps the legacy ranged string to the Ray entry", () => {
    const c = withItems([]);
    const off = computeAll(c);
    c.toggles.rangedTouch = true;
    const on = computeAll(c);
    expect(off.attacks.ranged).not.toContain("(touch)");
    expect(on.attacks.ranged).toContain("(touch)");
    expect(on.attacks.ranged).not.toContain("1d8"); // no weapon dice on a ray
  });

  it("meleeTouch swaps attacks.melee but never the weapon profiles", () => {
    const c = withItems([weaponItem({ name: "Longsword" })]);
    c.toggles.meleeTouch = true;
    const out = computeAll(c);
    expect(out.attacks.melee).toContain("(touch)");
    expect(out.attacks.melee).not.toContain("1d6");
    // per-weapon profile text keeps the weapon math (touch forced off)
    expect(out.attackProfiles.melee[0].text).toContain("1d8");
    expect(out.attackProfiles.melee[0].text).not.toContain("(touch)");
  });

  it("weapon enhancement modifiers flow into the profile text", () => {
    const plain = computeAll(withItems([weaponItem({})]));
    const enhanced = computeAll(
      withItems([
        weaponItem({
          name: "+1 Longsword",
          modifiers: [
            { target: "attack.melee", type: "enhancement", value: 1, source: "+1" },
          ],
        }),
      ])
    );
    // standard attack line: "+N (1d8+M) (19-20/x2)" — both attack and
    // damage rise by 1 over the unenhanced profile
    const bonus = (text: string): number =>
      Number(text.match(/\*\*Standard Attack:\*\* \+(\d+)/)?.[1] ?? NaN);
    expect(bonus(enhanced.attackProfiles.melee[0].text)).toBe(
      bonus(plain.attackProfiles.melee[0].text) + 1
    );
  });
});
