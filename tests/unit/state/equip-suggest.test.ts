/**
 * Autocomplete search over the bundled catalogs. These run against the
 * REAL scraped data (per the fixture-pinning lesson) — names asserted here
 * are stable Core entries.
 */
import { describe, expect, it } from "vitest";
import { suggestEquipment } from "../../../src/state/equip-suggest";
import type { CustomItemDef } from "../../../src/types/custom-items";

const customSword: CustomItemDef = {
  id: "c1",
  name: "Longsword of the Guild",
  kind: "weapon",
  baseId: "longsword",
  enhancement: 1,
  abilityIds: [],
  priceGp: 2315,
  weightLbs: 4,
  note: "",
  modifiers: [],
  createdAt: "",
  modifiedAt: "",
};

describe("suggestEquipment", () => {
  it("returns nothing under the minimum query length", () => {
    expect(suggestEquipment("")).toEqual([]);
    expect(suggestEquipment("l")).toEqual([]);
  });

  it("finds a core weapon by prefix and prefills its draft", () => {
    const hits = suggestEquipment("longsw");
    expect(hits[0].name).toBe("Longsword");
    expect(hits[0].kind).toBe("Weapon");
    expect(hits[0].draft).toMatchObject({
      type: "Weapon",
      weight: 4,
      value: 15,
      count: 1,
    });
  });

  it("ranks prefix matches above substring matches", () => {
    const hits = suggestEquipment("sword", [], 50);
    // binary view of the rank tiers: starts-with first, everything else after
    const ranks = hits.map((h) => (h.name.toLowerCase().startsWith("sword") ? 0 : 1));
    expect(ranks).toContain(0);
    expect(ranks).toContain(1);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("armor suggestions carry the AC modifier in the draft", () => {
    const hits = suggestEquipment("chain shirt");
    const shirt = hits.find((h) => h.name === "Chain shirt");
    expect(shirt).toBeDefined();
    expect(shirt!.kind).toBe("Armor");
    expect(shirt!.draft.modifiers).toEqual([
      { target: "ac.all", type: "armor", value: 4, source: "Chain shirt" },
    ]);
  });

  it("shields suggest as Shield type", () => {
    const hits = suggestEquipment("tower shield");
    const tower = hits.find((h) => h.kind === "Shield");
    expect(tower).toBeDefined();
  });

  it("finds magic items", () => {
    const hits = suggestEquipment("ring of protection");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].kind).toBe("Magic Item");
    expect(hits[0].draft.type).toBe("Magic Item");
  });

  it("custom items rank ahead of same-rank catalog hits", () => {
    const hits = suggestEquipment("longsword", [customSword]);
    expect(hits[0].name).toBe("Longsword");
    // same rank (prefix), shorter name wins; custom still present
    expect(hits.some((h) => h.key === "custom:c1")).toBe(true);
    const subHits = suggestEquipment("guild", [customSword]);
    expect(subHits[0].key).toBe("custom:c1");
  });

  it("weapon drafts carry stamped attack stats; armor and magic do not", () => {
    const sword = suggestEquipment("longsw")[0];
    expect(sword.draft.weapon).toMatchObject({ kind: "melee", damageDie: "1d8" });
    const shirt = suggestEquipment("chain shirt").find((h) => h.name === "Chain shirt");
    expect(shirt!.draft.weapon).toBeUndefined();
    const ring = suggestEquipment("ring of protection")[0];
    expect(ring.draft.weapon).toBeUndefined();
  });

  it("custom weapon drafts inherit attack stats from their base weapon", () => {
    const hit = suggestEquipment("guild", [customSword])[0];
    expect(hit.key).toBe("custom:c1");
    expect(hit.draft.weapon).toMatchObject({ kind: "melee", damageDie: "1d8" });
  });

  it("caps results at the limit", () => {
    expect(suggestEquipment("sword").length).toBeLessThanOrEqual(8);
    expect(suggestEquipment("sword", [], 3).length).toBe(3);
  });
});
