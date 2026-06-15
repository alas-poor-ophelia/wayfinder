import {
  ARMOR_SOURCES,
  MAGIC_SLOTS,
  MAGIC_SOURCES,
  WEAPON_SOURCES,
} from "../../data/equipment";
import type MiniSheetPlugin from "../../main";
import type { EquipDbState } from "../../types/data-file";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div class="ms-equipdb__filter-group">
      <span class="ms-equipdb__filter-title">{label}</span>
      <select
        class="dropdown"
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

export function EquipFilters({
  plugin,
  db,
}: {
  plugin: MiniSheetPlugin;
  db: EquipDbState;
}) {
  const store = plugin.store;
  const set = (patch: Partial<EquipDbState>) =>
    store.updateEquipDb({ ...patch, page: 0 });

  return (
    <div class="ms-equipdb__filters">
      {db.section === "weapons" && (
        <>
          <Select
            label="Proficiency"
            value={db.proficiency}
            options={[
              { value: "simple", label: "Simple" },
              { value: "martial", label: "Martial" },
              { value: "exotic", label: "Exotic" },
              { value: "ammo", label: "Ammunition" },
            ]}
            onChange={(proficiency) => set({ proficiency })}
          />
          <Select
            label="Category"
            value={db.category}
            options={[
              { value: "light", label: "Light" },
              { value: "one-handed", label: "One-Handed" },
              { value: "two-handed", label: "Two-Handed" },
              { value: "ranged", label: "Ranged" },
              { value: "ammunition", label: "Ammunition" },
            ]}
            onChange={(category) => set({ category })}
          />
          <Select
            label="Source"
            value={db.source}
            options={opts(WEAPON_SOURCES)}
            onChange={(source) => set({ source })}
          />
        </>
      )}
      {db.section === "armor" && (
        <>
          <Select
            label="Category"
            value={db.category}
            options={[
              { value: "light", label: "Light" },
              { value: "medium", label: "Medium" },
              { value: "heavy", label: "Heavy" },
              { value: "shield", label: "Shields" },
            ]}
            onChange={(category) => set({ category })}
          />
          <Select
            label="Source"
            value={db.source}
            options={opts(ARMOR_SOURCES)}
            onChange={(source) => set({ source })}
          />
        </>
      )}
      {db.section === "magic" && (
        <>
          <Select
            label="Type"
            value={db.group}
            options={[
              { value: "wondrous", label: "Wondrous Item" },
              { value: "ring", label: "Ring" },
              { value: "rod", label: "Rod" },
            ]}
            onChange={(group) => set({ group })}
          />
          <Select
            label="Slot"
            value={db.slot}
            options={opts(MAGIC_SLOTS)}
            onChange={(slot) => set({ slot })}
          />
          <Select
            label="Source"
            value={db.source}
            options={opts(MAGIC_SOURCES)}
            onChange={(source) => set({ source })}
          />
          <div class="ms-equipdb__filter-group">
            <span class="ms-equipdb__filter-title">Price (gp)</span>
            <div class="ms-equipdb__price-range">
              <input
                type="number"
                placeholder="min"
                value={db.priceMin ?? ""}
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  set({ priceMin: raw === "" ? null : Number(raw) });
                }}
              />
              <span>–</span>
              <input
                type="number"
                placeholder="max"
                value={db.priceMax ?? ""}
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  set({ priceMax: raw === "" ? null : Number(raw) });
                }}
              />
            </div>
            <label class="ms-equipdb__flag">
              <input
                type="checkbox"
                checked={db.stattedOnly}
                onChange={(e) =>
                  set({ stattedOnly: (e.target as HTMLInputElement).checked })
                }
              />
              Auto-statted only
            </label>
          </div>
        </>
      )}
    </div>
  );
}
