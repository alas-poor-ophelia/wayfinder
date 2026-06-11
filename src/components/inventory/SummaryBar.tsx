import type { EncumbranceComputed } from "../../calc/encumbrance";
import type { PartyInvState } from "../../types/data-file";
import type { InventoryItem, InventoryState } from "../../types/inventory";
import { inventoryTotals } from "../../types/inventory";

const LOAD_LABELS = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  over: "Overloaded",
} as const;

export function SummaryBar({
  items,
  inventory,
  encumbrance,
  filters,
}: {
  /** the currently visible (filtered) items — totals follow the filters, like legacy */
  items: InventoryItem[];
  inventory: InventoryState;
  encumbrance?: EncumbranceComputed;
  filters: PartyInvState;
}) {
  const totals = inventoryTotals(items);
  const container = filters.containerFilter
    ? inventory.items.find((i) => i.id === filters.containerFilter)
    : null;
  return (
    <div class="ms-inv-summary">
      <span>
        {totals.count} {totals.count === 1 ? "item" : "items"} •{" "}
        {totals.totalWeight.toFixed(1)} lbs • {totals.totalValue.toFixed(2)} gp
      </span>
      {encumbrance && encumbrance.capacity.heavy > 0 && (
        <span
          class={`ms-inv-load is-${encumbrance.level}`}
          title={`Light ≤ ${encumbrance.capacity.light} • Medium ≤ ${encumbrance.capacity.medium} • Heavy ≤ ${encumbrance.capacity.heavy} lbs`}
        >
          {LOAD_LABELS[encumbrance.level]} {Math.round(encumbrance.carried)}/
          {encumbrance.capacity.heavy}
        </span>
      )}
      {container && (
        <span class="ms-inv-summary__container">{container.name} contents</span>
      )}
    </div>
  );
}
