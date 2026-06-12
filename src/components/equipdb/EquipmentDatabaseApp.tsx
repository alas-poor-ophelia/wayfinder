import { Notice } from "obsidian";
import { useState } from "preact/hooks";
import { ARMOR, MAGIC_ITEMS, WEAPONS, getBaseWeapon } from "../../data/equipment";
import type MiniSheetPlugin from "../../main";
import { addItem } from "../../state/inventory-actions";
import type { CustomItemDef } from "../../types/custom-items";
import type { EquipDbState } from "../../types/data-file";
import type {
  BaseArmorDef,
  BaseWeaponDef,
  MagicItemDef,
} from "../../types/equipment";
import type { CharacterRecord, WeaponProfile } from "../../types/character";
import type { InventoryItem } from "../../types/inventory";
import { EquipFilters } from "./EquipFilters";
import { EquipTable, formatGp, sortRows, type EquipColumn } from "./EquipTable";
import { ForgePanel } from "./ForgePanel";

export const PAGE_SIZE = 50;

const SECTIONS: Array<{ key: EquipDbState["section"]; label: string }> = [
  { key: "weapons", label: "Weapons" },
  { key: "armor", label: "Armor" },
  { key: "magic", label: "Magic Items" },
  { key: "custom", label: "Custom" },
  { key: "forge", label: "Forge" },
];

// ---- filtering (pure) ----

function matchesCommon(
  name: string,
  source: string,
  price: number,
  db: EquipDbState
): boolean {
  if (db.search && !name.toLowerCase().includes(db.search.toLowerCase())) {
    return false;
  }
  if (db.source && source !== db.source) return false;
  if (db.priceMin !== null && price < db.priceMin) return false;
  if (db.priceMax !== null && price > db.priceMax) return false;
  return true;
}

export function filterWeapons(rows: BaseWeaponDef[], db: EquipDbState): BaseWeaponDef[] {
  return rows.filter(
    (w) =>
      matchesCommon(w.name, w.source, w.costGp, db) &&
      (!db.proficiency || w.proficiency === db.proficiency) &&
      (!db.category || w.category === db.category)
  );
}

export function filterArmor(rows: BaseArmorDef[], db: EquipDbState): BaseArmorDef[] {
  return rows.filter(
    (a) =>
      matchesCommon(a.name, a.source, a.costGp, db) &&
      (!db.category || a.category === db.category)
  );
}

export function filterMagic(rows: MagicItemDef[], db: EquipDbState): MagicItemDef[] {
  return rows.filter(
    (m) =>
      matchesCommon(m.name, m.source, m.priceGp, db) &&
      (!db.group || m.group === db.group) &&
      (!db.slot || m.slot === db.slot) &&
      (!db.stattedOnly || m.modifiers.length > 0)
  );
}

// ---- add-to-inventory drafts ----

function weaponDraft(w: BaseWeaponDef): Omit<InventoryItem, "id"> {
  return {
    name: w.name,
    type: "Weapon",
    count: 1,
    weight: w.weightLbs,
    value: w.costGp,
    containerId: null,
    note: null,
    charges: null,
    equipped: false,
  };
}

function armorDraft(a: BaseArmorDef): Omit<InventoryItem, "id"> {
  return {
    name: a.name,
    type: a.kind === "shield" ? "Shield" : "Armor",
    count: 1,
    weight: a.weightLbs,
    value: a.costGp,
    containerId: null,
    note: null,
    charges: null,
    equipped: false,
    modifiers: [
      { target: "ac.all", type: a.kind, value: a.acBonus, source: a.name },
    ],
  };
}

function magicDraft(m: MagicItemDef): Omit<InventoryItem, "id"> {
  return {
    name: m.name,
    type: "Magic Item",
    count: 1,
    weight: m.weightLbs,
    value: m.priceGp,
    containerId: null,
    note: null,
    charges: null,
    equipped: false,
    ...(m.modifiers.length ? { modifiers: m.modifiers } : {}),
  };
}

function customDraft(c: CustomItemDef): Omit<InventoryItem, "id"> {
  return {
    name: c.name,
    type: c.kind === "weapon" ? "Weapon" : c.kind === "shield" ? "Shield" : "Armor",
    count: 1,
    weight: c.weightLbs,
    value: c.priceGp,
    containerId: null,
    note: c.note || null,
    charges: null,
    equipped: false,
    modifiers: c.modifiers,
  };
}

/** Append a WeaponProfile derived from a catalog weapon (skip same-name). */
function addWeaponProfile(
  plugin: MiniSheetPlugin,
  target: CharacterRecord,
  w: BaseWeaponDef
): void {
  if (target.weapons.some((p) => p.name === w.name)) return;
  const base = w.id;
  let id = base;
  let n = 2;
  while (target.weapons.some((p) => p.id === id)) id = `${base}-${n++}`;
  const profile: WeaponProfile = {
    id,
    name: w.name,
    kind: w.category === "ranged" || w.category === "ammunition" ? "ranged" : "melee",
    damageDie: w.dmgM,
    critRange: w.critRange || "20",
    critMult: w.critMult || "2",
  };
  plugin.store.updateCharacter(target.id, {
    weapons: [...target.weapons, profile],
  });
}

function Sections({
  db,
  store,
  onSwitch,
}: {
  db: EquipDbState;
  store: MiniSheetPlugin["store"];
  onSwitch?(): void;
}) {
  return (
    <div class="ms-equipdb__sections">
      {SECTIONS.map((s) => (
        <button
          key={s.key}
          class={`ms-equipdb__section${db.section === s.key ? " is-on" : ""}`}
          onClick={() => {
            onSwitch?.();
            store.updateEquipDb({
              section: s.key,
              page: 0,
              sortKey: "name",
              sortDir: "asc",
            });
          }}
        >
          {s.label}
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

  const weaponColumns: EquipColumn<BaseWeaponDef>[] = [
    { key: "name", label: "Name", val: (w) => w.name },
    { key: "cost", label: "Cost", val: (w) => w.costGp, render: (w) => formatGp(w.costGp) },
    { key: "dmg", label: "Dmg (M)", val: (w) => w.dmgM || "—" },
    {
      key: "crit",
      label: "Crit",
      val: (w) => (w.critMult ? `${w.critRange}/×${w.critMult}` : "—"),
    },
    { key: "range", label: "Range", val: (w) => w.rangeFt ?? 0, render: (w) => (w.rangeFt ? `${w.rangeFt} ft.` : "—") },
    { key: "weight", label: "Wt", val: (w) => w.weightLbs, render: (w) => (w.weightLbs ? `${w.weightLbs} lbs.` : "—") },
    { key: "type", label: "Type", val: (w) => w.dmgType || "—" },
    { key: "proficiency", label: "Prof.", val: (w) => w.proficiency },
    { key: "category", label: "Category", val: (w) => w.category },
    { key: "source", label: "Source", val: (w) => w.source },
  ];

  const armorColumns: EquipColumn<BaseArmorDef>[] = [
    { key: "name", label: "Name", val: (a) => a.name },
    { key: "cost", label: "Cost", val: (a) => a.costGp, render: (a) => formatGp(a.costGp) },
    { key: "ac", label: "AC", val: (a) => a.acBonus, render: (a) => `+${a.acBonus}` },
    {
      key: "maxDex",
      label: "Max Dex",
      val: (a) => a.maxDex ?? 99,
      render: (a) => (a.maxDex === null ? "—" : `+${a.maxDex}`),
    },
    { key: "acp", label: "ACP", val: (a) => a.acp, render: (a) => String(a.acp) },
    { key: "asf", label: "ASF", val: (a) => a.asfPct, render: (a) => `${a.asfPct}%` },
    { key: "weight", label: "Wt", val: (a) => a.weightLbs, render: (a) => `${a.weightLbs} lbs.` },
    { key: "category", label: "Category", val: (a) => a.category },
    { key: "source", label: "Source", val: (a) => a.source },
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
    { key: "price", label: "Price", val: (m) => m.priceGp, render: (m) => formatGp(m.priceGp) },
    { key: "group", label: "Type", val: (m) => m.group },
    { key: "slot", label: "Slot", val: (m) => m.slot },
    { key: "cl", label: "CL", val: (m) => m.casterLevel, render: (m) => (m.casterLevel ? String(m.casterLevel) : "—") },
    {
      key: "bonuses",
      label: "Bonuses",
      val: (m) => m.modifiers.length,
      render: (m) =>
        m.modifiers.length
          ? m.modifiers.map((mod) => `${mod.value > 0 ? "+" : ""}${mod.value} ${mod.target}`).join(", ")
          : "—",
    },
    { key: "source", label: "Source", val: (m) => m.source },
  ];

  const addTo = (draft: Omit<InventoryItem, "id">, after?: () => void) => {
    if (!target) return;
    addItem(store, { kind: "character", id: target.id }, draft);
    after?.();
    new Notice(`Added ${draft.name} to ${target.name}`);
  };

  const customColumns: EquipColumn<CustomItemDef>[] = [
    { key: "name", label: "Name", val: (c) => c.name },
    { key: "kind", label: "Kind", val: (c) => c.kind },
    { key: "price", label: "Price", val: (c) => c.priceGp, render: (c) => formatGp(c.priceGp) },
    { key: "weight", label: "Wt", val: (c) => c.weightLbs, render: (c) => `${c.weightLbs} lbs.` },
    {
      key: "bonuses",
      label: "Bonuses",
      val: (c) => c.modifiers.length,
      render: (c) =>
        c.modifiers
          .map((m) => `${m.value > 0 ? "+" : ""}${m.value} ${m.type} ${m.target}`)
          .join(", ") || "—",
    },
    { key: "note", label: "Abilities", val: (c) => c.note || "—" },
  ];

  // forge replaces the whole search/table surface
  if (db.section === "forge") {
    return (
      <div class="ms-equipdb">
        <Sections db={db} store={store} onSwitch={() => setEditing(null)} />
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
  let table;
  if (db.section === "weapons") {
    const filtered = sortRows(filterWeapons(WEAPONS, db), weaponColumns, db.sortKey, db.sortDir);
    totalCount = WEAPONS.length;
    filteredCount = filtered.length;
    const page = Math.min(db.page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
    table = (
      <EquipTable
        plugin={plugin}
        db={db}
        rows={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
        columns={weaponColumns}
        onAdd={
          target
            ? (w) =>
                addTo(weaponDraft(w), () => {
                  if (db.addProfile) addWeaponProfile(plugin, store.getCharacter(target.id) ?? target, w);
                })
            : null
        }
      />
    );
  } else if (db.section === "armor") {
    const filtered = sortRows(filterArmor(ARMOR, db), armorColumns, db.sortKey, db.sortDir);
    totalCount = ARMOR.length;
    filteredCount = filtered.length;
    const page = Math.min(db.page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
    table = (
      <EquipTable
        plugin={plugin}
        db={db}
        rows={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
        columns={armorColumns}
        onAdd={target ? (a) => addTo(armorDraft(a)) : null}
      />
    );
  } else if (db.section === "custom") {
    const search = db.search.toLowerCase();
    const filtered = sortRows(
      customItems.filter((c) => !search || c.name.toLowerCase().includes(search)),
      customColumns,
      db.sortKey,
      db.sortDir
    );
    totalCount = customItems.length;
    filteredCount = filtered.length;
    const page = Math.min(db.page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
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
          rows={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
          columns={customColumns}
          onAdd={
            target
              ? (c) =>
                  addTo(customDraft(c), () => {
                    if (c.kind === "weapon" && db.addProfile) {
                      const base = getBaseWeapon(c.baseId);
                      if (base) {
                        addWeaponProfile(
                          plugin,
                          store.getCharacter(target.id) ?? target,
                          { ...base, name: c.name }
                        );
                      }
                    }
                  })
              : null
          }
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
                ✎
              </button>
              <button
                class="ms-equipdb__row-action ms-equipdb__row-action--danger"
                aria-label={`Delete ${c.name}`}
                onClick={() => plugin.customItems.removeItem(c.id)}
              >
                ✕
              </button>
            </>
          )}
        />
        {customItems.length === 0 && (
          <div class="ms-equipdb__muted ms-equipdb__empty">
            No custom items yet — forge one in the Forge tab.
          </div>
        )}
      </>
    );
  } else {
    const filtered = sortRows(filterMagic(MAGIC_ITEMS, db), magicColumns, db.sortKey, db.sortDir);
    totalCount = MAGIC_ITEMS.length;
    filteredCount = filtered.length;
    const page = Math.min(db.page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
    table = (
      <EquipTable
        plugin={plugin}
        db={db}
        rows={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
        columns={magicColumns}
        onAdd={target ? (m) => addTo(magicDraft(m)) : null}
      />
    );
  }
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const page = Math.min(db.page, pageCount - 1);

  return (
    <div class="ms-equipdb">
      <Sections db={db} store={store} onSwitch={() => setEditing(null)} />
      <div class="ms-equipdb__header">
        <input
          type="search"
          class="ms-equipdb__search"
          placeholder={`Search ${db.section}…`}
          value={db.search}
          onInput={(e) =>
            store.updateEquipDb({
              search: (e.target as HTMLInputElement).value,
              page: 0,
            })
          }
        />
        <button
          class="ms-equipdb__filters-toggle"
          aria-expanded={db.filtersOpen}
          onClick={() => store.updateEquipDb({ filtersOpen: !db.filtersOpen })}
        >
          Filters
        </button>
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
          Showing {filteredCount} of {totalCount}
        </span>
        {db.section === "weapons" && target && (
          <label class="ms-equipdb__flag" title="Also create an attack profile (damage/crit) on the character">
            <input
              type="checkbox"
              checked={db.addProfile}
              onChange={(e) =>
                store.updateEquipDb({ addProfile: (e.target as HTMLInputElement).checked })
              }
            />
            + weapon profile
          </label>
        )}
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
            onClick={() => store.updateEquipDb({ page: page - 1 })}
          >
            ←
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount - 1}
            onClick={() => store.updateEquipDb({ page: page + 1 })}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
