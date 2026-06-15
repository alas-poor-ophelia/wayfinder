import {
  removeItem,
  spendCharge,
  updateItem,
  type InventoryScope,
} from "../../state/inventory-actions";
import type { MiniSheetStore } from "../../state/store";
import type { InventoryItem } from "../../types/inventory";
import { ItemRow } from "./ItemRow";
import type { DisplayRow } from "./InventoryPanel";

export function InventoryList({
  rows,
  allItems,
  store,
  scope,
  onEdit,
  onToggle,
}: {
  rows: DisplayRow[];
  /** full (unfiltered) item set — container weights count ALL contents */
  allItems: InventoryItem[];
  store: MiniSheetStore;
  scope: InventoryScope;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <div class="ms-inv-empty">No items match</div>;
  }
  return (
    <div class="ms-inv-list">
      {rows.map((row) => (
        <ItemRow
          key={row.item.id}
          row={row}
          allItems={allItems}
          onEdit={() => onEdit(row.item.id)}
          onDelete={() => removeItem(store, scope, row.item.id)}
          onUse={() => spendCharge(store, scope, row.item.id)}
          onToggle={() => onToggle(row.item.id)}
          onEquip={() =>
            updateItem(store, scope, row.item.id, {
              equipped: !row.item.equipped,
            })
          }
        />
      ))}
    </div>
  );
}
