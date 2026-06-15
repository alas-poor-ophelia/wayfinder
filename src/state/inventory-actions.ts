/**
 * Inventory mutations — the typed vocabulary shared by the combat
 * inventory subtab, the party inventory view, and the MCP bridge.
 *
 * Two layers:
 *  - pure `applyX(inv, ...)` transforms on InventoryState (unit-tested);
 *  - a scope adapter so character inventory (CharacterRecord.inventory)
 *    and party inventory (data.partyInventory) share one write path.
 *
 * Deliberate divergence from legacy: updateItem rejects ANY containment
 * cycle (A in B, B in A), not just direct self-nesting — legacy's modal
 * only excluded the item itself.
 */

import {
  NOTE_MAX_LENGTH,
  WAND_MAX_CHARGES,
  createDefaultInventory,
  newItemId,
  type CurrencyState,
  type InventoryItem,
  type InventoryState,
} from "../types/inventory";
import type { MiniSheetStore } from "./store";

// ---- pure transforms ----

function sanitizeDraft(
  draft: Omit<InventoryItem, "id">,
): Omit<InventoryItem, "id"> {
  return {
    ...draft,
    name: draft.name.trim(),
    count: Math.max(1, Math.floor(draft.count || 1)),
    weight: Math.max(0, draft.weight || 0),
    value: Math.max(0, draft.value || 0),
    note: draft.note
      ? draft.note.trim().slice(0, NOTE_MAX_LENGTH) || null
      : null,
    charges:
      draft.type === "Wand"
        ? Math.min(
            Math.max(0, draft.charges ?? WAND_MAX_CHARGES),
            WAND_MAX_CHARGES,
          )
        : null,
  };
}

/** True when setting `item.containerId = targetId` would create a cycle
 *  (target is the item itself or sits inside it, at any depth). */
export function wouldCycle(
  items: InventoryItem[],
  itemId: string,
  targetId: string | null,
): boolean {
  let cursor = targetId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === itemId) return true;
    if (seen.has(cursor)) return true; // pre-existing loop: refuse to extend it
    seen.add(cursor);
    cursor = items.find((i) => i.id === cursor)?.containerId ?? null;
  }
  return false;
}

export function applyAddItem(
  inv: InventoryState,
  draft: Omit<InventoryItem, "id">,
  id = newItemId(),
): InventoryState {
  if (!draft.name.trim()) throw new Error("Item name is required");
  const clean = sanitizeDraft(draft);
  if (clean.containerId && !inv.items.some((i) => i.id === clean.containerId)) {
    throw new Error(`No container with id "${clean.containerId}"`);
  }
  return { ...inv, items: [...inv.items, { ...clean, id }] };
}

export function applyUpdateItem(
  inv: InventoryState,
  id: string,
  patch: Partial<Omit<InventoryItem, "id">>,
): InventoryState {
  const existing = inv.items.find((i) => i.id === id);
  if (!existing) throw new Error(`No item with id "${id}"`);
  if (
    patch.containerId !== undefined &&
    patch.containerId !== null &&
    wouldCycle(inv.items, id, patch.containerId)
  ) {
    throw new Error("Item cannot be placed inside itself or its own contents");
  }
  const merged = sanitizeDraft({ ...existing, ...patch });
  return {
    ...inv,
    items: inv.items.map((i) => (i.id === id ? { ...merged, id } : i)),
  };
}

/** Remove an item; a removed container's contents move to top level
 *  (containerId → null), matching legacy. */
export function applyRemoveItem(
  inv: InventoryState,
  id: string,
): InventoryState {
  return {
    ...inv,
    items: inv.items
      .filter((i) => i.id !== id)
      .map((i) => (i.containerId === id ? { ...i, containerId: null } : i)),
  };
}

/** Wand "Use": decrement charges, clamped at 0. Non-wands are no-ops. */
export function applySpendCharge(
  inv: InventoryState,
  id: string,
): InventoryState {
  return {
    ...inv,
    items: inv.items.map((i) =>
      i.id === id && i.type === "Wand" && (i.charges ?? 0) > 0
        ? { ...i, charges: (i.charges ?? 0) - 1 }
        : i,
    ),
  };
}

export function applySetCurrency(
  inv: InventoryState,
  patch: Partial<CurrencyState>,
): InventoryState {
  const next = { ...inv.currency };
  for (const key of ["copper", "silver", "gold", "platinum"] as const) {
    const value = patch[key];
    if (value !== undefined) next[key] = Math.max(0, Math.floor(value) || 0);
  }
  return { ...inv, currency: next };
}

// ---- scope adapter ----

export type InventoryScope =
  | { kind: "character"; id: string }
  | { kind: "party" };

export function readInventory(
  store: MiniSheetStore,
  scope: InventoryScope,
): InventoryState {
  if (scope.kind === "party") return store.getPartyInventory();
  const record = store.getCharacter(scope.id);
  if (!record) throw new Error(`No character with id "${scope.id}"`);
  // Like the party pool: default to empty, stored only once mutated —
  // the first write through writeInventory births character.inventory.
  return record.inventory ?? createDefaultInventory();
}

export function writeInventory(
  store: MiniSheetStore,
  scope: InventoryScope,
  next: InventoryState,
): void {
  if (scope.kind === "party") store.setPartyInventory(next);
  else store.setCharacterField(scope.id, "inventory", next);
}

export function addItem(
  store: MiniSheetStore,
  scope: InventoryScope,
  draft: Omit<InventoryItem, "id">,
): string {
  const id = newItemId();
  writeInventory(
    store,
    scope,
    applyAddItem(readInventory(store, scope), draft, id),
  );
  return id;
}

export function updateItem(
  store: MiniSheetStore,
  scope: InventoryScope,
  id: string,
  patch: Partial<Omit<InventoryItem, "id">>,
): void {
  writeInventory(
    store,
    scope,
    applyUpdateItem(readInventory(store, scope), id, patch),
  );
}

export function removeItem(
  store: MiniSheetStore,
  scope: InventoryScope,
  id: string,
): void {
  writeInventory(
    store,
    scope,
    applyRemoveItem(readInventory(store, scope), id),
  );
}

export function spendCharge(
  store: MiniSheetStore,
  scope: InventoryScope,
  id: string,
): void {
  writeInventory(
    store,
    scope,
    applySpendCharge(readInventory(store, scope), id),
  );
}

export function setCurrency(
  store: MiniSheetStore,
  scope: InventoryScope,
  patch: Partial<CurrencyState>,
): void {
  writeInventory(
    store,
    scope,
    applySetCurrency(readInventory(store, scope), patch),
  );
}
