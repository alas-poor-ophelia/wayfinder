import type { PartyInvState } from "../../types/data-file";
import type { InventoryItem } from "../../types/inventory";
import { ITEM_TYPES, isContainer } from "../../types/inventory";

const SORT_KEYS: PartyInvState["sortKey"][] = [
  "name",
  "count",
  "weight",
  "value",
  "type",
];

export function InventoryControls({
  items,
  filters,
  onFilters,
  onAdd,
  ownerChoices,
}: {
  items: InventoryItem[];
  filters: PartyInvState;
  onFilters: (patch: Partial<PartyInvState>) => void;
  onAdd: () => void;
  ownerChoices?: string[] | undefined;
}) {
  const containers = items.filter(isContainer);
  const owners = ownerChoices ?? [];
  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.containerFilter ? 1 : 0) +
    (filters.owner ? 1 : 0);

  return (
    <section class="ms-inv-section">
      <div class="ms-inv-controls__bar">
        <input
          type="search"
          class="ms-inv-controls__search"
          placeholder="Search items…"
          value={filters.search}
          onInput={(e) =>
            onFilters({ search: (e.target as HTMLInputElement).value })
          }
        />
        <button
          class={`ms-inv-controls__filter${filters.controlsOpen ? " is-active" : ""}`}
          aria-label="Filters"
          onClick={() => onFilters({ controlsOpen: !filters.controlsOpen })}
        >
          Filter
          {activeCount > 0 && (
            <span class="ms-inv-controls__badge">{activeCount}</span>
          )}
        </button>
        <button class="ms-inv-controls__add" onClick={onAdd}>
          + Add
        </button>
      </div>
      {filters.controlsOpen && (
        <div class="ms-inv-controls__panel">
          <label>
            Type
            <select
              value={filters.type}
              onChange={(e) =>
                onFilters({ type: (e.target as HTMLSelectElement).value })
              }
            >
              <option value="">All types</option>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {containers.length > 0 && (
            <label>
              Container
              <select
                value={filters.containerFilter}
                onChange={(e) =>
                  onFilters({
                    containerFilter: (e.target as HTMLSelectElement).value,
                  })
                }
              >
                <option value="">All containers</option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {owners.length > 0 && (
            <label>
              Owner
              <select
                value={filters.owner}
                onChange={(e) =>
                  onFilters({ owner: (e.target as HTMLSelectElement).value })
                }
              >
                <option value="">Anyone</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Sort by
            <select
              value={filters.sortKey}
              onChange={(e) =>
                onFilters({
                  sortKey: (e.target as HTMLSelectElement)
                    .value as PartyInvState["sortKey"],
                })
              }
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k[0]!.toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button
            class="ms-inv-controls__dir"
            onClick={() =>
              onFilters({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" })
            }
          >
            {filters.sortDir === "asc" ? "Ascending" : "Descending"}
          </button>
          {activeCount > 0 && (
            <button
              class="ms-inv-controls__clear"
              onClick={() =>
                onFilters({
                  search: "",
                  type: "",
                  containerFilter: "",
                  owner: "",
                })
              }
            >
              Clear
            </button>
          )}
        </div>
      )}
    </section>
  );
}
