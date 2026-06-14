import type { ComponentChildren } from "preact";
import type MiniSheetPlugin from "../../main";
import type { EquipDbState } from "../../types/data-file";
import { UI } from "../config/glyphs";

/** One sortable column: `val` feeds sort + default rendering. */
export interface EquipColumn<T> {
  key: string;
  label: string;
  val(item: T): string | number;
  render?(item: T): ComponentChildren;
  /** right-align + tabular-nums for numeric columns */
  num?: boolean;
  /** extra cell class, e.g. ms-equipdb__cost (gold price) / ms-equipdb__dim */
  cls?: string;
}

export function sortRows<T extends { name: string }>(
  rows: T[],
  columns: EquipColumn<T>[],
  sortKey: string,
  sortDir: "asc" | "desc"
): T[] {
  const col = columns.find((c) => c.key === sortKey) ?? columns[0];
  const dir = sortDir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = col.val(a);
    const bv = col.val(b);
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return cmp === 0 ? a.name.localeCompare(b.name) : cmp * dir;
  });
}

export function EquipTable<T extends { id: string; name: string }>({
  plugin,
  db,
  rows,
  columns,
  onAdd,
  actions,
}: {
  plugin: MiniSheetPlugin;
  db: EquipDbState;
  rows: T[];
  columns: EquipColumn<T>[];
  /** null hides the add column (no characters in the vault) */
  onAdd: ((item: T) => void) | null;
  /** optional trailing per-row actions (edit/delete on custom items) */
  actions?(item: T): ComponentChildren;
}) {
  const store = plugin.store;

  const setSort = (key: string) => {
    if (db.sortKey === key) {
      store.updateEquipDb({ sortDir: db.sortDir === "asc" ? "desc" : "asc" });
    } else {
      store.updateEquipDb({ sortKey: key, sortDir: "asc" });
    }
  };

  return (
    <table class="ms-equipdb__table">
      <thead>
        <tr>
          {onAdd && <th class="ms-equipdb__add-col" />}
          {columns.map((col) => {
            const active = db.sortKey === col.key;
            return (
              <th
                key={col.key}
                class={
                  `${col.num ? "ms-equipdb__numcol" : ""}${active ? " is-sort" : ""}`.trim() ||
                  undefined
                }
                onClick={() => setSort(col.key)}
              >
                {col.label}
                {active && (
                  <span class="ms-equipdb__sortcaret">
                    {db.sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            );
          })}
          {actions && <th />}
        </tr>
      </thead>
      <tbody>
        {rows.map((item) => (
          <tr key={item.id}>
            {onAdd && (
              <td class="ms-equipdb__add-col">
                <button
                  class="ms-equipdb__add"
                  aria-label={`Add ${item.name}`}
                  onClick={() => onAdd(item)}
                >
                  <UI.plus />
                </button>
              </td>
            )}
            {columns.map((col) => {
              const cls =
                `${col.num ? "ms-equipdb__numcol" : ""}${col.cls ? " " + col.cls : ""}`.trim();
              return (
                <td key={col.key} class={cls || undefined}>
                  {col.render ? col.render(item) : col.val(item)}
                </td>
              );
            })}
            {actions && <td class="ms-equipdb__actions">{actions(item)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function formatGp(value: number): string {
  if (value === 0) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} gp`;
}
