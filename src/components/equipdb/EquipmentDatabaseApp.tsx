import { Notice } from "obsidian";
import { useState } from "preact/hooks";
import {
  ARMOR,
  MAGIC_ITEMS,
  WEAPONS,
  getBaseWeapon,
} from "../../data/equipment";
import type MiniSheetPlugin from "../../main";
import {
  armorDraft,
  customDraft,
  magicDraft,
  weaponDraft,
} from "../../state/equip-drafts";
import { addItem } from "../../state/inventory-actions";
import type { CustomItemDef } from "../../types/custom-items";
import type { EquipDbState } from "../../types/data-file";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  MagicItemDef,
} from "../../types/equipment";
import type { InventoryItem } from "../../types/inventory";
import { Icon } from "../common/Icon";
import { UI } from "../config/glyphs";
import { EquipFilters } from "./EquipFilters";
import { EquipTable, formatGp, sortRows, type EquipColumn } from "./EquipTable";
import { ForgePanel } from "./ForgePanel";

export const PAGE_SIZE = 50;

const SECTIONS: Array<{
  key: EquipDbState["section"];
  label: string;
  icon: string;
}> = [
  { key: "weapons", label: "Weapons", icon: "ra-crossed-swords" },
  { key: "armor", label: "Armor", icon: "ra-shield" },
  { key: "magic", label: "Magic Items", icon: "ra-aura" },
  { key: "custom", label: "Custom", icon: "ra-gem-pendant" },
  { key: "forge", label: "Forge", icon: "ra-anvil" },
];

// ---- filtering (pure) ----

function matchesCommon(
  name: string,
  source: string,
  price: number,
  db: EquipDbState,
): boolean {
  if (db.search && !name.toLowerCase().includes(db.search.toLowerCase())) {
    return false;
  }
  if (db.source && source !== db.source) return false;
  if (db.priceMin !== null && price < db.priceMin) return false;
  if (db.priceMax !== null && price > db.priceMax) return false;
  return true;
}

function filterWeapons(
  rows: BaseWeaponDef[],
  db: EquipDbState,
): BaseWeaponDef[] {
  return rows.filter(
    (w) =>
      matchesCommon(w.name, w.source, w.costGp, db) &&
      (!db.proficiency || w.proficiency === db.proficiency) &&
      (!db.category || w.category === db.category),
  );
}

function filterArmor(rows: BaseArmorDef[], db: EquipDbState): BaseArmorDef[] {
  return rows.filter(
    (a) =>
      matchesCommon(a.name, a.source, a.costGp, db) &&
      (!db.category || a.category === db.category),
  );
}

function filterMagic(rows: MagicItemDef[], db: EquipDbState): MagicItemDef[] {
  return rows.filter(
    (m) =>
      matchesCommon(m.name, m.source, m.priceGp, db) &&
      (!db.group || m.group === db.group) &&
      (!db.slot || m.slot === db.slot) &&
      (!db.stattedOnly || m.modifiers.length > 0),
  );
}

/** Clamp the stored page to the filtered row count and slice — the ONE
 *  source of page arithmetic for both the tables and the pager. */
function pageSlice<T>(
  filtered: T[],
  dbPage: number,
): { rows: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(dbPage, pageCount - 1);
  return {
    rows: filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    page,
    pageCount,
  };
}

function Sections({
  db,
  store,
  counts,
  onSwitch,
}: {
  db: EquipDbState;
  store: MiniSheetPlugin["store"];
  counts: Partial<Record<EquipDbState["section"], number>>;
  onSwitch?: () => void;
}) {
  return (
    <div class="ms-equipdb__sections">
      {SECTIONS.map((s) => (
        <button
          key={s.key}
          class={`ms-equipdb__section${db.section === s.key ? " is-on" : ""}`}
          onClick={() => {
            onSwitch?.();
            // tab switch resets sort, page, search, and all filters (handoff)
            store.updateEquipDb({
              section: s.key,
              page: 0,
              sortKey: "name",
              sortDir: "asc",
              search: "",
              proficiency: "",
              category: "",
              group: "",
              slot: "",
              source: "",
              priceMin: null,
              priceMax: null,
              stattedOnly: false,
            });
          }}
        >
          <Icon id={s.icon} class="ms-equipdb__section-icon" />
          <span class="ms-equipdb__section-label">{s.label}</span>
          {counts[s.key] != null && (
            <span class="ms-equipdb__section-count">{counts[s.key]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function EquipmentDatabaseApp({ plugin }: { plugin: MiniSheetPlugin }) {
  const store = plugin.store;
  const db = store.equipDb();
  const characters = store.data.value.characters;
  const customItems = plugin.customItems.items.value;
  const [editing, setEditing] = useState<CustomItemDef | null>(null);
  const target =
    characters.find((c) => c.id === db.targetCharacterId) ??
    characters.find((c) => c.id === store.data.value.ui.activeCharacterId) ??
    characters[0] ??
    null;

  const counts: Partial<Record<EquipDbState["section"], number>> = {
    weapons: WEAPONS.length,
    armor: ARMOR.length,
    magic: MAGIC_ITEMS.length,
    custom: customItems.length,
  };

  const weaponColumns: EquipColumn<BaseWeaponDef>[] = [
    { key: "name", label: "Name", val: (w) => w.name },
    {
      key: "cost",
      label: "Cost",
      num: true,
      cls: "ms-equipdb__cost",
      val: (w) => w.costGp,
      render: (w) => formatGp(w.costGp),
    },
    { key: "dmg", label: "Dmg (M)", val: (w) => w.dmgM || "—" },
    {
      key: "crit",
      label: "Crit",
      val: (w) => (w.critMult ? `${w.critRange}/×${w.critMult}` : "—"),
    },
    {
      key: "range",
      label: "Range",
      num: true,
      val: (w) => w.rangeFt ?? 0,
      render: (w) => (w.rangeFt ? `${w.rangeFt} ft.` : "—"),
    },
    {
      key: "weight",
      label: "Wt",
      num: true,
      val: (w) => w.weightLbs,
      render: (w) => (w.weightLbs ? `${w.weightLbs} lbs.` : "—"),
    },
    { key: "type", label: "Type", val: (w) => w.dmgType || "—" },
    {
      key: "proficiency",
      label: "Prof.",
      cls: "ms-equipdb__dim",
      val: (w) => w.proficiency,
    },
    {
      key: "category",
      label: "Category",
      cls: "ms-equipdb__dim",
      val: (w) => w.category,
    },
    {
      key: "source",
      label: "Source",
      cls: "ms-equipdb__dim",
      val: (w) => w.source,
    },
  ];

  const armorColumns: EquipColumn<BaseArmorDef>[] = [
    { key: "name", label: "Name", val: (a) => a.name },
    {
      key: "cost",
      label: "Cost",
      num: true,
      cls: "ms-equipdb__cost",
      val: (a) => a.costGp,
      render: (a) => formatGp(a.costGp),
    },
    {
      key: "ac",
      label: "AC",
      num: true,
      val: (a) => a.acBonus,
      render: (a) => `+${a.acBonus}`,
    },
    {
      key: "maxDex",
      label: "Max Dex",
      num: true,
      val: (a) => a.maxDex ?? 99,
      render: (a) => (a.maxDex === null ? "—" : `+${a.maxDex}`),
    },
    {
      key: "acp",
      label: "ACP",
      num: true,
      val: (a) => a.acp,
      render: (a) => String(a.acp),
    },
    {
      key: "asf",
      label: "ASF",
      num: true,
      val: (a) => a.asfPct,
      render: (a) => `${a.asfPct}%`,
    },
    {
      key: "weight",
      label: "Wt",
      num: true,
      val: (a) => a.weightLbs,
      render: (a) => `${a.weightLbs} lbs.`,
    },
    {
      key: "category",
      label: "Category",
      cls: "ms-equipdb__dim",
      val: (a) => a.category,
    },
    {
      key: "source",
      label: "Source",
      cls: "ms-equipdb__dim",
      val: (a) => a.source,
    },
  ];

  const magicColumns: EquipColumn<MagicItemDef>[] = [
    {
      key: "name",
      label: "Name",
      val: (m) => m.name,
      render: (m) => (
        <span title={m.shortDesc}>
          {m.name}
          {m.needsReview && (
            <span
              class="ms-equipdb__review"
              title="Bonuses not auto-detected — edit the item after adding to set them"
            >
              ⚠
            </span>
          )}
        </span>
      ),
    },
    {
      key: "price",
      label: "Price",
      num: true,
      cls: "ms-equipdb__cost",
      val: (m) => m.priceGp,
      render: (m) => formatGp(m.priceGp),
    },
    {
      key: "group",
      label: "Type",
      cls: "ms-equipdb__dim",
      val: (m) => m.group,
    },
    { key: "slot", label: "Slot", cls: "ms-equipdb__dim", val: (m) => m.slot },
    {
      key: "cl",
      label: "CL",
      num: true,
      val: (m) => m.casterLevel,
      render: (m) => (m.casterLevel ? String(m.casterLevel) : "—"),
    },
    {
      key: "bonuses",
      label: "Bonuses",
      val: (m) => m.modifiers.length,
      render: (m) =>
        m.modifiers.length
          ? m.modifiers
              .map(
                (mod) =>
                  `${mod.value > 0 ? "+" : ""}${mod.value} ${mod.target}`,
              )
              .join(", ")
          : "—",
    },
    {
      key: "source",
      label: "Source",
      cls: "ms-equipdb__dim",
      val: (m) => m.source,
    },
  ];

  const addTo = (draft: Omit<InventoryItem, "id">, after?: () => void) => {
    if (!target) return;
    addItem(store, { kind: "character", id: target.id }, draft);
    after?.();
    new Notice(`Added ${draft.name} to ${target.name}`);
  };

  const customColumns: EquipColumn<CustomItemDef>[] = [
    { key: "name", label: "Name", val: (c) => c.name },
    { key: "kind", label: "Kind", cls: "ms-equipdb__dim", val: (c) => c.kind },
    {
      key: "price",
      label: "Price",
      num: true,
      cls: "ms-equipdb__cost",
      val: (c) => c.priceGp,
      render: (c) => formatGp(c.priceGp),
    },
    {
      key: "weight",
      label: "Wt",
      num: true,
      val: (c) => c.weightLbs,
      render: (c) => `${c.weightLbs} lbs.`,
    },
    {
      key: "bonuses",
      label: "Bonuses",
      val: (c) => c.modifiers.length,
      render: (c) =>
        c.modifiers
          .map(
            (m) => `${m.value > 0 ? "+" : ""}${m.value} ${m.type} ${m.target}`,
          )
          .join(", ") || "—",
    },
    {
      key: "note",
      label: "Abilities",
      cls: "ms-equipdb__dim",
      val: (c) => c.note || "—",
    },
  ];

  // forge replaces the whole search/table surface
  if (db.section === "forge") {
    return (
      <div class="ms-equipdb">
        <Sections
          db={db}
          store={store}
          counts={counts}
          onSwitch={() => setEditing(null)}
        />
        <ForgePanel
          plugin={plugin}
          editItem={editing}
          onDone={() => {
            setEditing(null);
            store.updateEquipDb({ section: "custom" });
          }}
        />
      </div>
    );
  }

  let totalCount: number;
  let filteredCount: number;
  let page: number;
  let pageCount: number;
  let table;
  if (db.section === "weapons") {
    const filtered = sortRows(
      filterWeapons(WEAPONS, db),
      weaponColumns,
      db.sortKey,
      db.sortDir,
    );
    totalCount = WEAPONS.length;
    filteredCount = filtered.length;
    const view = pageSlice(filtered, db.page);
    ({ page, pageCount } = view);
    table = (
      <EquipTable
        plugin={plugin}
        db={db}
        rows={view.rows}
        columns={weaponColumns}
        onAdd={target ? (w) => addTo(weaponDraft(w)) : null}
      />
    );
  } else if (db.section === "armor") {
    const filtered = sortRows(
      filterArmor(ARMOR, db),
      armorColumns,
      db.sortKey,
      db.sortDir,
    );
    totalCount = ARMOR.length;
    filteredCount = filtered.length;
    const view = pageSlice(filtered, db.page);
    ({ page, pageCount } = view);
    table = (
      <EquipTable
        plugin={plugin}
        db={db}
        rows={view.rows}
        columns={armorColumns}
        onAdd={target ? (a) => addTo(armorDraft(a)) : null}
      />
    );
  } else if (db.section === "custom") {
    const search = db.search.toLowerCase();
    const filtered = sortRows(
      customItems.filter(
        (c) => !search || c.name.toLowerCase().includes(search),
      ),
      customColumns,
      db.sortKey,
      db.sortDir,
    );
    totalCount = customItems.length;
    filteredCount = filtered.length;
    const view = pageSlice(filtered, db.page);
    ({ page, pageCount } = view);
    table = (
      <>
        {plugin.customItems.status.value === "error" && (
          <div class="ms-equipdb__forge-error">
            The custom items file is unreadable — fix it or rename it in
            settings.
          </div>
        )}
        <EquipTable
          plugin={plugin}
          db={db}
          rows={view.rows}
          columns={customColumns}
          onAdd={
            target
              ? (c) => addTo(customDraft(c, getBaseWeapon(c.baseId)))
              : null
          }
          emptyText="No custom items yet — forge one in the Forge tab."
          actions={(c) => (
            <>
              <button
                class="ms-equipdb__row-action"
                aria-label={`Edit ${c.name}`}
                onClick={() => {
                  setEditing(c);
                  store.updateEquipDb({ section: "forge" });
                }}
              >
                <UI.pencil />
              </button>
              <button
                class="ms-equipdb__row-action ms-equipdb__row-action--danger"
                aria-label={`Delete ${c.name}`}
                onClick={() => plugin.customItems.removeItem(c.id)}
              >
                <UI.trash />
              </button>
            </>
          )}
        />
      </>
    );
  } else {
    const filtered = sortRows(
      filterMagic(MAGIC_ITEMS, db),
      magicColumns,
      db.sortKey,
      db.sortDir,
    );
    totalCount = MAGIC_ITEMS.length;
    filteredCount = filtered.length;
    const view = pageSlice(filtered, db.page);
    ({ page, pageCount } = view);
    table = (
      <EquipTable
        plugin={plugin}
        db={db}
        rows={view.rows}
        columns={magicColumns}
        onAdd={target ? (m) => addTo(magicDraft(m)) : null}
      />
    );
  }

  return (
    <div class="ms-equipdb">
      <Sections
        db={db}
        store={store}
        counts={counts}
        onSwitch={() => setEditing(null)}
      />
      <div class="ms-equipdb__header">
        <div class="ms-equipdb__search">
          <UI.search />
          <input
            type="search"
            class="ms-equipdb__search-input"
            placeholder={`Search ${db.section}…`}
            value={db.search}
            onInput={(e) =>
              store.updateEquipDb({
                search: (e.target as HTMLInputElement).value,
                page: 0,
              })
            }
          />
        </div>
        {db.section !== "custom" && (
          <button
            class={`ms-equipdb__filters-toggle${db.filtersOpen ? " is-on" : ""}`}
            aria-expanded={db.filtersOpen}
            onClick={() =>
              store.updateEquipDb({ filtersOpen: !db.filtersOpen })
            }
          >
            <UI.sliders />
            Filters
          </button>
        )}
        <button
          class="ms-equipdb__clear"
          onClick={() =>
            store.updateEquipDb({
              search: "",
              proficiency: "",
              category: "",
              group: "",
              slot: "",
              source: "",
              priceMin: null,
              priceMax: null,
              stattedOnly: false,
              page: 0,
            })
          }
        >
          Clear all
        </button>
        <span class="ms-equipdb__count">
          Showing <b>{filteredCount}</b> of {totalCount}
        </span>
        {characters.length > 0 && (
          <label class="ms-equipdb__target">
            Add to:
            <select
              class="dropdown"
              value={target?.id ?? ""}
              onChange={(e) =>
                store.updateEquipDb({
                  targetCharacterId: (e.target as HTMLSelectElement).value,
                })
              }
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {db.filtersOpen && <EquipFilters plugin={plugin} db={db} />}
      {table}
      {pageCount > 1 && (
        <div class="ms-equipdb__pager">
          <button
            disabled={page === 0}
            aria-label="Previous page"
            onClick={() => store.updateEquipDb({ page: page - 1 })}
          >
            <UI.arrowL />
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount - 1}
            aria-label="Next page"
            onClick={() => store.updateEquipDb({ page: page + 1 })}
          >
            <UI.arrowR />
          </button>
        </div>
      )}
    </div>
  );
}
