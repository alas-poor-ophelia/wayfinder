import { describe, expect, it } from "vitest";
import { importLegacyInventory } from "../../../src/import/legacy-import";

const legacyFrontmatter = {
  inventory: [
    {
      id: "item_abc123def",
      name: "Longsword",
      type: "weapon", // legacy stored mixed case
      count: "1",
      weight: 4,
      value: 15,
      containerId: null,
      note: null,
      charges: null,
    },
    {
      id: "item_pack00001",
      name: "Backpack",
      type: "Container",
      count: 1,
      weight: 2,
      value: 5,
      containerId: null,
      note: null,
      charges: null,
    },
    {
      id: "item_rations01",
      name: "Rations",
      type: "Consumable",
      count: 10,
      weight: 1,
      value: 0.5,
      containerId: "item_pack00001",
      note: null,
      charges: null,
      owner: "Adarin",
    },
    {
      id: "item_wand0001",
      name: "Wand of CLW",
      type: "Wand",
      count: 1,
      weight: 0,
      value: 750,
      containerId: null,
      note: null,
      charges: 99,
    },
  ],
  currency: { copper: 25, silver: 5, gold: "50", platinum: 3 },
};

describe("importLegacyInventory", () => {
  it("imports items + currency with lenient coercion", () => {
    const { inventory, warnings } = importLegacyInventory(legacyFrontmatter, {
      scope: "party",
    });
    expect(inventory.items).toHaveLength(4);
    expect(inventory.currency).toEqual({
      copper: 25,
      silver: 5,
      gold: 50,
      platinum: 3,
    });
    const sword = inventory.items[0];
    expect(sword.type).toBe("Weapon"); // case-normalized
    expect(sword.count).toBe(1); // string-coerced
    const wand = inventory.items[3];
    expect(wand.charges).toBe(50); // clamped
    expect(warnings.some((w) => /0 items/.test(w))).toBe(false);
  });

  it("keeps owner only for party scope", () => {
    const party = importLegacyInventory(legacyFrontmatter, { scope: "party" });
    expect(party.inventory.items[2].owner).toBe("Adarin");
    const char = importLegacyInventory(legacyFrontmatter, { scope: "character" });
    expect("owner" in char.inventory.items[2]).toBe(false);
  });

  it("repairs orphan container references with a warning", () => {
    const { inventory, warnings } = importLegacyInventory(
      {
        inventory: [
          {
            id: "item_a",
            name: "Gem",
            type: "Jewelry",
            count: 1,
            weight: 0.1,
            value: 100,
            containerId: "item_missing",
          },
        ],
      },
      { scope: "character" }
    );
    expect(inventory.items[0].containerId).toBeNull();
    expect(warnings.some((w) => /moved to top level/.test(w))).toBe(true);
  });

  it("warns loudly on an empty source (H-546 guard)", () => {
    const { inventory, warnings } = importLegacyInventory(
      { inventory: [], currency: {} },
      { scope: "party" }
    );
    expect(inventory.items).toHaveLength(0);
    expect(warnings[0]).toMatch(/verify it is the note the legacy inventory UI binds/);
  });

  it("generates ids, normalizes unknown types, truncates notes", () => {
    const { inventory, warnings } = importLegacyInventory(
      {
        inventory: [
          {
            name: "Mystery Box",
            type: "Doohickey",
            count: 1,
            weight: 1,
            value: 1,
            note: "x".repeat(200),
          },
        ],
        currency: { gold: 1 },
      },
      { scope: "character" }
    );
    const item = inventory.items[0];
    expect(item.id).toMatch(/^item_/);
    expect(item.type).toBe("Other");
    expect(item.note).toHaveLength(144);
    expect(warnings.some((w) => /unknown type/.test(w))).toBe(true);
    expect(warnings.some((w) => /generated/.test(w))).toBe(true);
    expect(warnings.some((w) => /truncated/.test(w))).toBe(true);
  });
});
