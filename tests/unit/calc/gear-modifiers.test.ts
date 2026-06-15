/**
 * Equipped-gear modifiers through computeAll (Phase 5 of the modifier
 * pipeline): RAW stacking against config fields, touch/FF bucket routing,
 * ability cascades, and the enhancement path into attacks.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import {
  resolveAcModifiers,
  splitEnhancement,
  resolveModifiers,
  type Modifier,
} from "../../../src/calc/modifiers";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultInventory } from "../../../src/types/inventory";

function withGear(mods: Modifier[], equipped = true) {
  const c = createDefaultCharacter("t", "T");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.inventory = createDefaultInventory();
  c.inventory.items.push({
    id: "item_test00001",
    name: "Test Item",
    type: "Magic Item",
    count: 1,
    weight: 0,
    value: 0,
    containerId: null,
    note: null,
    charges: null,
    equipped,
    modifiers: mods,
  });
  return c;
}

describe("resolveAcModifiers buckets", () => {
  const mk = (
    target: Modifier["target"],
    type: Modifier["type"],
    value: number,
  ): Modifier => ({ target, type, value, source: "x" });

  it("partitions by touch/flat-footed applicability", () => {
    const r = resolveAcModifiers([
      mk("ac.all", "deflection", 2),
      mk("ac.all", "dodge", 1),
      mk("ac.natural", "enhancement", 2), // amulet: enhancement TO natural armor
      mk("ac.all", "armor", 4),
    ]);
    expect(r.deflectionLike).toBe(2);
    expect(r.dodge).toBe(1);
    expect(r.naturalLike).toBe(6); // amulet 2 + armor 4
  });

  it("stacks ac.all and ac.natural in one pass (same type suppresses)", () => {
    const r = resolveAcModifiers([
      mk("ac.natural", "enhancement", 2),
      mk("ac.natural", "enhancement", 3),
    ]);
    expect(r.naturalLike).toBe(3);
    expect(r.suppressed).toHaveLength(1);
  });
});

describe("splitEnhancement", () => {
  it("separates surviving enhancement from the rest", () => {
    const r = resolveModifiers(
      [
        {
          target: "attack.melee",
          type: "enhancement",
          value: 1,
          source: "Config",
        },
        {
          target: "attack.melee",
          type: "enhancement",
          value: 2,
          source: "Sword",
        },
        {
          target: "attack.melee",
          type: "competence",
          value: 1,
          source: "Banner",
        },
      ],
      "attack.melee",
    );
    expect(splitEnhancement(r)).toEqual({ enhancement: 2, rest: 1 });
  });
});

describe("computeAll with equipped gear", () => {
  it("deflection ring raises all three ACs; unequipped contributes nothing", () => {
    const bare = computeAll(withGear([], true));
    const ring = computeAll(
      withGear([
        { target: "ac.all", type: "deflection", value: 1, source: "Ring" },
      ]),
    );
    expect(ring.ac.normalAC).toBe(bare.ac.normalAC + 1);
    expect(ring.ac.touchAC).toBe(bare.ac.touchAC + 1);
    expect(ring.ac.flatFootedAC).toBe(bare.ac.flatFootedAC + 1);
    const unequipped = computeAll(
      withGear(
        [{ target: "ac.all", type: "deflection", value: 1, source: "Ring" }],
        false,
      ),
    );
    expect(unequipped.ac).toEqual(bare.ac);
  });

  it("natural armor item misses touch; dodge item misses flat-footed", () => {
    const bare = computeAll(withGear([]));
    const amulet = computeAll(
      withGear([
        {
          target: "ac.natural",
          type: "enhancement",
          value: 2,
          source: "Amulet",
        },
      ]),
    );
    expect(amulet.ac.normalAC).toBe(bare.ac.normalAC + 2);
    expect(amulet.ac.touchAC).toBe(bare.ac.touchAC);
    expect(amulet.ac.flatFootedAC).toBe(bare.ac.flatFootedAC + 2);

    const boots = computeAll(
      withGear([
        { target: "ac.all", type: "dodge", value: 1, source: "Boots" },
      ]),
    );
    expect(boots.ac.normalAC).toBe(bare.ac.normalAC + 1);
    expect(boots.ac.touchAC).toBe(bare.ac.touchAC + 1);
    expect(boots.ac.flatFootedAC).toBe(bare.ac.flatFootedAC);
  });

  it("same-type ring vs config deflection takes the max, with a suppression note", () => {
    const c = withGear([
      { target: "ac.all", type: "deflection", value: 1, source: "Ring" },
    ]);
    c.ac.deflection = 2; // config field converts to a deflection modifier
    const computed = computeAll(c);
    const bare = computeAll(withGear([]));
    expect(computed.ac.normalAC).toBe(bare.ac.normalAC + 2); // max(1, 2), not 3
    expect(
      computed.modifierReport?.suppressed.some((s) => s.includes("Ring")),
    ).toBe(true);
  });

  it("cloak resistance vs config resistance takes the max on saves", () => {
    const c = withGear([
      { target: "save.all", type: "resistance", value: 3, source: "Cloak" },
    ]);
    c.enhancements.resistance = 2;
    const bare = computeAll(withGear([]));
    const computed = computeAll(c);
    expect(computed.saves.fort).toBe(bare.saves.fort + 3); // max, not 5
    expect(computed.saves.will).toBe(bare.saves.will + 3);
  });

  it("belt of giant strength cascades through the ability mods", () => {
    const belt = computeAll(
      withGear([
        {
          target: "ability.str",
          type: "enhancement",
          value: 4,
          source: "Belt",
        },
      ]),
    );
    const bare = computeAll(withGear([]));
    expect(belt.scores.str).toBe(bare.scores.str + 4);
    expect(belt.mods.str).toBe(bare.mods.str + 2);
  });

  it("weapon enhancement gear vs config feeds attacks at the max", () => {
    const c = withGear([
      {
        target: "attack.melee",
        type: "enhancement",
        value: 2,
        source: "+2 Sword",
      },
    ]);
    c.enhancements.meleeWeapon = 1;
    const bare = withGear([]);
    bare.enhancements.meleeWeapon = 2; // baseline: a flat +2 via the config path
    expect(computeAll(c).attacks.melee).toEqual(computeAll(bare).attacks.melee);
  });

  it("conditional gear bonuses never auto-sum; they surface in the report", () => {
    const c = withGear([
      {
        target: "save.all",
        type: "resistance",
        value: 2,
        source: "Charm",
        condition: "vs fear",
      },
    ]);
    const bare = computeAll(withGear([]));
    const computed = computeAll(c);
    expect(computed.saves.will).toBe(bare.saves.will);
    expect(
      computed.modifierReport?.conditional.some((n) => n.includes("vs fear")),
    ).toBe(true);
  });

  it("skips malformed persisted modifier entries", () => {
    const c = withGear([
      { target: "ac.all", type: "deflection", value: 1, source: "Ring" },
      { bad: true } as never,
      { target: "ac.all", type: "deflection" } as never, // no value
    ]);
    const bare = computeAll(withGear([]));
    expect(computeAll(c).ac.normalAC).toBe(bare.ac.normalAC + 1);
  });
});
