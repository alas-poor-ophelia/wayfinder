import { describe, expect, it } from "vitest";
import {
  applyAddItem,
  applyRemoveItem,
  applySetCurrency,
  applySpendCharge,
  applyUpdateItem,
  wouldCycle,
} from "../../../src/state/inventory-actions";
import {
  contentsWeight,
  createDefaultInventory,
  currencyTotalGp,
  inventoryTotals,
  type InventoryItem,
  type InventoryState,
} from "../../../src/types/inventory";

function item(partial: Partial<InventoryItem> & { id: string }): InventoryItem {
  return {
    name: partial.id,
    type: "Other",
    count: 1,
    weight: 0,
    value: 0,
    containerId: null,
    note: null,
    charges: null,
    ...partial,
  };
}

function inv(...items: InventoryItem[]): InventoryState {
  return { ...createDefaultInventory(), items };
}

describe("inventory totals (legacy math)", () => {
  it("sums weight and value times count", () => {
    const totals = inventoryTotals([
      item({ id: "a", count: 10, weight: 1, value: 0.5 }),
      item({ id: "b", count: 1, weight: 4, value: 15 }),
    ]);
    expect(totals.totalWeight).toBe(14);
    expect(totals.totalValue).toBe(20);
    expect(totals.count).toBe(2);
  });

  it("treats missing/zero count as 1 (legacy `count || 1`)", () => {
    const totals = inventoryTotals([item({ id: "a", count: 0, weight: 3, value: 2 })]);
    expect(totals.totalWeight).toBe(3);
    expect(totals.totalValue).toBe(2);
  });

  it("container contents weight is direct children only", () => {
    const items = [
      item({ id: "pack", type: "Container", weight: 2 }),
      item({ id: "pouch", type: "Container", weight: 0.5, containerId: "pack" }),
      item({ id: "gem", weight: 0.1, count: 3, containerId: "pouch" }),
      item({ id: "rope", weight: 10, containerId: "pack" }),
    ];
    expect(contentsWeight(items, "pack")).toBeCloseTo(10.5);
    expect(contentsWeight(items, "pouch")).toBeCloseTo(0.3);
  });
});

describe("currencyTotalGp (legacy formula)", () => {
  it("pp*10 + gp + sp*0.1 + cp*0.01", () => {
    expect(
      currencyTotalGp({ platinum: 3, gold: 50, silver: 5, copper: 25 })
    ).toBeCloseTo(80.75);
  });
});

describe("applyAddItem", () => {
  it("appends with sanitized fields", () => {
    const next = applyAddItem(
      inv(),
      {
        name: "  Longsword ",
        type: "Weapon",
        count: 0,
        weight: 4,
        value: 15,
        containerId: null,
        note: "x".repeat(200),
        charges: 10,
      },
      "item_test00001"
    );
    expect(next.items).toHaveLength(1);
    const added = next.items[0];
    expect(added.id).toBe("item_test00001");
    expect(added.name).toBe("Longsword");
    expect(added.count).toBe(1); // clamped to min 1
    expect(added.note).toHaveLength(144); // truncated
    expect(added.charges).toBeNull(); // non-wand: charges stripped
  });

  it("keeps charges for wands, clamped to 0-50", () => {
    const next = applyAddItem(inv(), {
      name: "Wand of CLW",
      type: "Wand",
      count: 1,
      weight: 0,
      value: 750,
      containerId: null,
      note: null,
      charges: 99,
    });
    expect(next.items[0].charges).toBe(50);
  });

  it("rejects empty names and unknown containers", () => {
    expect(() =>
      applyAddItem(inv(), {
        name: "  ",
        type: "Other",
        count: 1,
        weight: 0,
        value: 0,
        containerId: null,
        note: null,
        charges: null,
      })
    ).toThrow(/name/i);
    expect(() =>
      applyAddItem(inv(), {
        name: "Rope",
        type: "Gear",
        count: 1,
        weight: 10,
        value: 1,
        containerId: "nope",
        note: null,
        charges: null,
      })
    ).toThrow(/container/i);
  });
});

describe("applyUpdateItem / cycles", () => {
  const base = inv(
    item({ id: "pack", type: "Container" }),
    item({ id: "pouch", type: "Container", containerId: "pack" }),
    item({ id: "gem", containerId: "pouch" })
  );

  it("merges a patch", () => {
    const next = applyUpdateItem(base, "gem", { name: "Ruby", value: 100 });
    const gem = next.items.find((i) => i.id === "gem")!;
    expect(gem.name).toBe("Ruby");
    expect(gem.value).toBe(100);
    expect(gem.containerId).toBe("pouch"); // untouched
  });

  it("rejects self-nesting", () => {
    expect(() => applyUpdateItem(base, "pack", { containerId: "pack" })).toThrow();
  });

  it("rejects deep cycles (divergence from legacy, which only blocked self)", () => {
    expect(wouldCycle(base.items, "pack", "pouch")).toBe(true);
    expect(() => applyUpdateItem(base, "pack", { containerId: "pouch" })).toThrow();
  });

  it("allows legal re-parenting", () => {
    expect(wouldCycle(base.items, "gem", "pack")).toBe(false);
    const next = applyUpdateItem(base, "gem", { containerId: "pack" });
    expect(next.items.find((i) => i.id === "gem")!.containerId).toBe("pack");
  });
});

describe("applyRemoveItem", () => {
  it("removes a plain item", () => {
    const next = applyRemoveItem(inv(item({ id: "a" }), item({ id: "b" })), "a");
    expect(next.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("promotes a removed container's contents to top level (legacy)", () => {
    const next = applyRemoveItem(
      inv(
        item({ id: "pack", type: "Container" }),
        item({ id: "rope", containerId: "pack" }),
        item({ id: "gem", containerId: "pack" })
      ),
      "pack"
    );
    expect(next.items).toHaveLength(2);
    expect(next.items.every((i) => i.containerId === null)).toBe(true);
  });
});

describe("applySpendCharge", () => {
  it("decrements wand charges, clamping at 0", () => {
    const wand = item({ id: "w", type: "Wand", charges: 1 });
    const once = applySpendCharge(inv(wand), "w");
    expect(once.items[0].charges).toBe(0);
    const twice = applySpendCharge(once, "w");
    expect(twice.items[0].charges).toBe(0); // no-op at 0
  });

  it("ignores non-wands", () => {
    const next = applySpendCharge(inv(item({ id: "a", charges: 5 })), "a");
    expect(next.items[0].charges).toBe(5);
  });
});

describe("applySetCurrency", () => {
  it("sets only the provided coins, clamped to non-negative integers", () => {
    const next = applySetCurrency(inv(), { gold: 50.9, copper: -3 });
    expect(next.currency).toEqual({ copper: 0, silver: 0, gold: 50, platinum: 0 });
  });
});
