/**
 * Inventory schema — shared by the per-character combat subtab and the
 * party inventory main-pane view. Ported from the legacy Datacore
 * InventoryManager(-Party).jsx data model (frontmatter `inventory` +
 * `currency` keys). Derived values (totals, load) are never stored.
 */

import type { Modifier } from "../calc/modifiers";

/** Legacy party list (16 types — the character manager lacked Scroll;
 *  the superset is safe for both scopes). */
export const ITEM_TYPES = [
  "Weapon",
  "Armor",
  "Shield",
  "Consumable",
  "Scroll",
  "Tool",
  "Gear",
  "Magic Item",
  "Wand",
  "Container",
  "Ammunition",
  "Clothing",
  "Jewelry",
  "Art Object",
  "Trade Good",
  "Other",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const NOTE_MAX_LENGTH = 144;
export const WAND_MAX_CHARGES = 50;

export interface InventoryItem {
  /** legacy scheme: "item_" + 9 random base36 chars */
  id: string;
  name: string;
  type: ItemType;
  /** minimum 1 */
  count: number;
  /** lbs per unit */
  weight: number;
  /** gp per unit */
  value: number;
  /** id of the containing item (type Container), or null for top level */
  containerId: string | null;
  note: string | null;
  /** wands only, 0–50 */
  charges: number | null;
  /** party scope only: who carries it (character name or free text) */
  owner?: string | null;
  /** worn/wielded — only equipped items feed their modifiers to computeAll */
  equipped?: boolean;
  /** typed stat bonuses the item grants while equipped (modifier engine) */
  modifiers?: Modifier[];
}

export interface CurrencyState {
  copper: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface InventoryState {
  items: InventoryItem[];
  currency: CurrencyState;
}

export function createDefaultInventory(): InventoryState {
  return {
    items: [],
    currency: { copper: 0, silver: 0, gold: 0, platinum: 0 },
  };
}

export function newItemId(): string {
  let suffix = "";
  while (suffix.length < 9) {
    suffix += Math.random().toString(36).slice(2);
  }
  return `item_${suffix.slice(0, 9)}`;
}

/** Total coin value in gp: pp×10 + gp + sp×0.1 + cp×0.01 (legacy formula). */
export function currencyTotalGp(c: CurrencyState): number {
  return c.platinum * 10 + c.gold + c.silver * 0.1 + c.copper * 0.01;
}

export function inventoryTotals(items: InventoryItem[]): {
  totalWeight: number;
  totalValue: number;
  count: number;
} {
  let totalWeight = 0;
  let totalValue = 0;
  for (const item of items) {
    const count = item.count || 1;
    totalWeight += (item.weight || 0) * count;
    totalValue += (item.value || 0) * count;
  }
  return { totalWeight, totalValue, count: items.length };
}

/** Summed weight of a container's direct contents (legacy shows
 *  "containerWeight | contentsWeight lbs" — contents are NOT recursive). */
export function contentsWeight(items: InventoryItem[], containerId: string): number {
  let total = 0;
  for (const item of items) {
    if (item.containerId === containerId) {
      total += (item.weight || 0) * (item.count || 1);
    }
  }
  return total;
}

export function isContainer(item: InventoryItem): boolean {
  return item.type === "Container";
}

/** Normalize arbitrary text to a known item type (case-insensitive),
 *  or null when it matches nothing. */
export function normalizeItemType(raw: string): ItemType | null {
  const lower = raw.trim().toLowerCase();
  return ITEM_TYPES.find((t) => t.toLowerCase() === lower) ?? null;
}
