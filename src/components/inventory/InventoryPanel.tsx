import { useState } from "preact/hooks";
import type { EncumbranceComputed } from "../../calc/encumbrance";
import type { InventoryScope } from "../../state/inventory-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CustomItemDef } from "../../types/custom-items";
import type { PartyInvState } from "../../types/data-file";
import type { InventoryItem, InventoryState } from "../../types/inventory";
import { isContainer } from "../../types/inventory";
import { CurrencySection } from "./CurrencySection";
import { InventoryControls } from "./InventoryControls";
import { InventoryList } from "./InventoryList";
import { ItemEditor } from "./ItemEditor";
import { SummaryBar } from "./SummaryBar";

/** Pure filter, shared with the MCP bridge (like filterSpells). */
export function filterItems(
  items: InventoryItem[],
  filters: PartyInvState,
): InventoryItem[] {
  return items.filter((item) => {
    if (
      filters.search &&
      !item.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.type && item.type !== filters.type) return false;
    if (filters.owner && (item.owner ?? "") !== filters.owner) return false;
    if (filters.containerFilter) {
      return (
        item.id === filters.containerFilter ||
        item.containerId === filters.containerFilter
      );
    }
    return true;
  });
}

/** Pure sort, shared with the MCP bridge (like sortSpells). */
export function sortItems(
  items: InventoryItem[],
  filters: PartyInvState,
): InventoryItem[] {
  const dir = filters.sortDir === "desc" ? -1 : 1;
  const key = filters.sortKey;
  return [...items].sort((a, b) => {
    if (key === "name" || key === "type") {
      return a[key].localeCompare(b[key]) * dir;
    }
    return ((a[key] || 0) - (b[key] || 0)) * dir;
  });
}

export interface DisplayRow {
  item: InventoryItem;
  level: number;
  /** container rows: whether contents are currently shown */
  expanded: boolean;
  childCount: number;
}

/** Nest filtered+sorted items: containers precede their (visible) contents.
 *  Items whose parent was filtered out surface at top level. */
export function buildRows(
  sorted: InventoryItem[],
  expandedMap: Record<string, boolean>,
): DisplayRow[] {
  const byId = new Map(sorted.map((i) => [i.id, i]));
  const rows: DisplayRow[] = [];
  const visit = (item: InventoryItem, level: number) => {
    const children = sorted.filter((i) => i.containerId === item.id);
    const expanded = expandedMap[item.id] !== false; // legacy default: open
    rows.push({ item, level, expanded, childCount: children.length });
    if (isContainer(item) && expanded) {
      for (const child of children) visit(child, level + 1);
    }
  };
  for (const item of sorted) {
    const parentVisible = item.containerId && byId.has(item.containerId);
    if (!parentVisible) visit(item, 0);
  }
  return rows;
}

export interface InventoryPanelProps {
  store: MiniSheetStore;
  scope: InventoryScope;
  inventory: InventoryState;
  variant: "sidebar" | "party";
  encumbrance?: EncumbranceComputed;
  ownerChoices?: string[];
  customItems?: CustomItemDef[];
  filters: PartyInvState;
  onFilters: (patch: Partial<PartyInvState>) => void;
}

/**
 * Shared inventory core (combat subtab + party view). The sidebar passes
 * component-local filter state; the party view passes the persisted
 * ui.partyInv slice — one component, two state homes.
 */
export function InventoryPanel(props: InventoryPanelProps) {
  const { store, scope, inventory, variant, encumbrance, filters } = props;
  // editor surface: null = closed, "" = add, otherwise the item id to edit
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const editor =
    editing !== null ? (
      <ItemEditor
        inventory={inventory}
        item={inventory.items.find((i) => i.id === editing) ?? null}
        store={store}
        scope={scope}
        variant={variant}
        ownerChoices={props.ownerChoices}
        customItems={props.customItems}
        onClose={() => setEditing(null)}
      />
    ) : null;

  // sidebar: the editor replaces the panel (ConfigSurface pattern — an
  // Obsidian modal would escape .minisheet-root and lose the skin)
  if (editor && variant === "sidebar") return editor;

  const visible = sortItems(filterItems(inventory.items, filters), filters);
  const rows = buildRows(visible, expanded);

  const list = (
    <>
      <SummaryBar
        items={visible}
        inventory={inventory}
        encumbrance={encumbrance}
        filters={filters}
      />
      <InventoryList
        rows={rows}
        allItems={inventory.items}
        store={store}
        scope={scope}
        onEdit={(id) => setEditing(id)}
        onToggle={(id) =>
          setExpanded((prev) => ({ ...prev, [id]: prev[id] === false }))
        }
      />
    </>
  );

  const rail = (
    <>
      <CurrencySection
        currency={inventory.currency}
        store={store}
        scope={scope}
        open={filters.currencyOpen}
        onToggle={() =>
          props.onFilters({ currencyOpen: !filters.currencyOpen })
        }
      />
      <InventoryControls
        items={inventory.items}
        filters={filters}
        onFilters={props.onFilters}
        onAdd={() => setEditing("")}
        ownerChoices={variant === "party" ? props.ownerChoices : undefined}
      />
    </>
  );

  return (
    <div class={`ms-inv ms-inv--${variant}`}>
      {variant === "party" ? (
        <>
          <div class="ms-inv__rail">{rail}</div>
          <div class="ms-inv__main">{list}</div>
          {editor}
        </>
      ) : (
        <>
          {rail}
          {list}
        </>
      )}
    </div>
  );
}
