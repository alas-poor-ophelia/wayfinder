import type { InventoryItem, ItemType } from "../../types/inventory";
import { contentsWeight, isContainer } from "../../types/inventory";
import type { DisplayRow } from "./InventoryPanel";

/** Token-derived badge families (UX pass: replaces legacy's 16 saturated
 *  hexes + emoji with ~6 palette mixes — see scss/_inventory.scss). */
const TYPE_FAMILY: Record<ItemType, string> = {
  Weapon: "martial",
  Armor: "martial",
  Shield: "martial",
  Ammunition: "martial",
  Wand: "magical",
  Scroll: "magical",
  "Magic Item": "magical",
  Tool: "mundane",
  Gear: "mundane",
  Clothing: "mundane",
  Jewelry: "valuable",
  "Art Object": "valuable",
  "Trade Good": "valuable",
  Consumable: "consumable",
  Container: "neutral",
  Other: "neutral",
};

function weightDisplay(item: InventoryItem, allItems: InventoryItem[]): string {
  if (isContainer(item)) {
    const contents = contentsWeight(allItems, item.id);
    const self = item.weight || 0;
    return self > 0 || contents > 0 ? `${self} | ${contents.toFixed(1)} lbs` : "—";
  }
  const total = (item.weight || 0) * (item.count || 1);
  return total > 0 ? `${+total.toFixed(1)} lbs` : "—";
}

export function ItemRow({
  row,
  allItems,
  onEdit,
  onDelete,
  onUse,
  onToggle,
  onEquip,
}: {
  row: DisplayRow;
  allItems: InventoryItem[];
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
  onToggle: () => void;
  onEquip?: () => void;
}) {
  const { item, level, expanded, childCount } = row;
  const container = isContainer(item);
  const totalValue = (item.value || 0) * (item.count || 1);
  return (
    <div
      class={`ms-inv-row${level > 0 ? " is-nested" : ""}`}
      style={level > 1 ? `--ms-inv-nest:${level}` : undefined}
    >
      <div class="ms-inv-row__head">
        {container && (
          <button
            class={`ms-inv-row__expand${expanded ? " is-open" : ""}`}
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={onToggle}
          />
        )}
        <span class="ms-inv-row__name">
          {item.name}
          {item.count > 1 && <span class="ms-inv-row__count">×{item.count}</span>}
        </span>
      </div>
      <div class="ms-inv-row__meta">
        <span class={`ms-inv-badge ms-inv-badge--${TYPE_FAMILY[item.type]}`}>
          {item.type}
        </span>
        <span class="ms-inv-row__actions">
          {(!!item.modifiers?.length || !!item.weapon) && onEquip && (
            <button
              class={`ms-inv-row__equip${item.equipped ? " is-on" : ""}`}
              aria-label={`${item.equipped ? "Unequip" : "Equip"} ${item.name}`}
              aria-pressed={!!item.equipped}
              title={item.equipped ? "Equipped (bonuses/attacks active)" : "Not equipped"}
              onClick={onEquip}
            >
              {item.equipped ? "◉" : "○"}
            </button>
          )}
          <button class="ms-inv-row__edit" aria-label={`Edit ${item.name}`} onClick={onEdit} />
          <button
            class="ms-inv-row__delete"
            aria-label={`Delete ${item.name}`}
            onClick={onDelete}
          />
        </span>
      </div>
      {item.note && <div class="ms-inv-row__note">{item.note}</div>}
      {container && childCount > 0 && !expanded && (
        <div class="ms-inv-row__contents">Contains {childCount} item{childCount === 1 ? "" : "s"}</div>
      )}
      <div class="ms-inv-row__foot">
        <span class="ms-inv-row__weight">{weightDisplay(item, allItems)}</span>
        {item.type === "Wand" && (
          <span class="ms-inv-row__charges">
            {item.charges ?? 0}/50
            <button
              class="ms-inv-row__use"
              disabled={(item.charges ?? 0) <= 0}
              onClick={onUse}
            >
              Use
            </button>
          </span>
        )}
        {item.owner && <span class="ms-inv-row__owner">{item.owner}</span>}
        <span class="ms-inv-row__value">
          {totalValue > 0 ? `${+totalValue.toFixed(2)} gp` : "—"}
        </span>
      </div>
    </div>
  );
}
