import { useState } from "preact/hooks";
import {
  MAX_EFFECTIVE_BONUS,
  abilityFits,
  forgeItem,
  type ForgeSelection,
} from "../../calc/forge";
import { FORGE_CATALOG } from "../../data/equipment";
import type MiniSheetPlugin from "../../main";
import { newCustomItemId, type CustomItemDef } from "../../types/custom-items";
import type { ItemAbilityDef } from "../../types/equipment";
import { UI } from "../config/glyphs";
import { formatGp } from "./EquipTable";

/** Terse note for the forged item ("Flaming, Keen") — full text lives in
 *  the custom-items file; InventoryItem.note caps at 144 chars. */
function terseNote(abilityIds: string[], pool: ItemAbilityDef[]): string {
  return abilityIds
    .map((id) => pool.find((a) => a.id === id)?.name ?? id)
    .join(", ");
}

export function ForgePanel({
  plugin,
  editItem,
  onDone,
}: {
  plugin: MiniSheetPlugin;
  /** present = editing an existing custom item (recompute + re-stamp) */
  editItem: CustomItemDef | null;
  onDone(): void;
}) {
  const [kind, setKind] = useState<ForgeSelection["kind"]>(editItem?.kind ?? "weapon");
  const [baseId, setBaseId] = useState(editItem?.baseId ?? "");
  const [enhancement, setEnhancement] = useState(editItem?.enhancement ?? 1);
  const [abilityIds, setAbilityIds] = useState<string[]>(editItem?.abilityIds ?? []);
  const [nameOverride, setNameOverride] = useState(editItem ? editItem.name : "");
  const [abilQuery, setAbilQuery] = useState("");
  const [bonusFilter, setBonusFilter] = useState("");

  const customItems = plugin.customItems;
  const bases =
    kind === "weapon"
      ? FORGE_CATALOG.weapons
      : FORGE_CATALOG.armor.filter((a) =>
          kind === "shield" ? a.kind === "shield" : a.kind === "armor"
        );
  const base = kind === "weapon" ? FORGE_CATALOG.weapons.find((w) => w.id === baseId) : undefined;
  const abilityPool =
    kind === "weapon" ? FORGE_CATALOG.weaponAbilities : FORGE_CATALOG.armorAbilities;

  const sel: ForgeSelection = { kind, baseId, enhancement, abilityIds };
  const result = baseId ? forgeItem(sel, FORGE_CATALOG) : null;
  const usedEquiv = result?.totalBonusEquivalent ?? enhancement;
  const remaining = MAX_EFFECTIVE_BONUS - usedEquiv;
  const over = usedEquiv > MAX_EFFECTIVE_BONUS;

  const setKindReset = (next: ForgeSelection["kind"]) => {
    setKind(next);
    setBaseId("");
    setAbilityIds([]);
    setAbilQuery("");
    setBonusFilter("");
  };

  const toggleAbility = (id: string) => {
    setAbilityIds(
      abilityIds.includes(id)
        ? abilityIds.filter((a) => a !== id)
        : [...abilityIds, id]
    );
  };

  const save = () => {
    if (!result?.valid) return;
    const now = new Date().toISOString();
    const def: CustomItemDef = {
      id: editItem?.id ?? newCustomItemId(),
      name: nameOverride.trim() || result.name,
      kind,
      baseId,
      enhancement,
      abilityIds,
      priceGp: result.priceGp,
      weightLbs: result.weightLbs,
      modifiers: result.modifiers.map((m) => ({
        ...m,
        source: nameOverride.trim() || result.name,
      })),
      note: terseNote(abilityIds, abilityPool),
      createdAt: editItem?.createdAt ?? now,
      modifiedAt: now,
    };
    customItems.upsertItem(def);
    onDone();
  };

  const fileBlocked = customItems.status.value === "error";
  const displayName = nameOverride.trim() || result?.name || "—";

  // ---- ability search + cost-level filter + grouping ----
  const q = abilQuery.trim().toLowerCase();
  const legal = abilityPool
    .filter((a) => abilityFits(a, kind, base))
    .filter((a) => !q || a.name.toLowerCase().includes(q));
  const tiers = [
    ...new Set(
      legal
        .map((a) => a.bonusEquivalent)
        .filter((b): b is number => b !== null)
    ),
  ].sort((x, y) => x - y);
  const groups: Array<{ key: string; label: string; items: ItemAbilityDef[] }> = [];
  for (const t of tiers) {
    if (bonusFilter && bonusFilter !== String(t)) continue;
    const items = legal.filter((a) => a.bonusEquivalent === t);
    if (items.length) groups.push({ key: `t${t}`, label: `+${t} bonus`, items });
  }
  if (!bonusFilter || bonusFilter === "flat") {
    const flats = legal.filter((a) => a.bonusEquivalent === null);
    if (flats.length) groups.push({ key: "flat", label: "Flat cost", items: flats });
  }

  const renderAbility = (a: ItemAbilityDef) => {
    const on = abilityIds.includes(a.id);
    const cost =
      a.bonusEquivalent !== null
        ? `+${a.bonusEquivalent} bonus`
        : formatGp(a.flatPriceGp ?? 0);
    const wouldExceed =
      !on && a.bonusEquivalent !== null && a.bonusEquivalent > remaining;
    return (
      <label
        key={a.id}
        class={`ms-equipdb__ability${on ? " is-on" : ""}${wouldExceed ? " is-blocked" : ""}`}
        title={a.shortDesc}
      >
        <span class={`ms-equipdb__check${on ? " is-on" : ""}`}>{on && <UI.check />}</span>
        <span class="ms-equipdb__ability-name">{a.name}</span>
        <span class="ms-equipdb__ability-cost">{cost}</span>
        <input
          type="checkbox"
          checked={on}
          disabled={wouldExceed}
          style={{ display: "none" }}
          onChange={() => toggleAbility(a.id)}
        />
      </label>
    );
  };

  return (
    <div class="ms-equipdb__forge">
      <aside class="ms-equipdb__forge-aside">
        <div class="ms-equipdb__forge-result">
          <div class="ms-equipdb__forge-kicker">Forged item</div>
          {result ? (
            <>
              <div class="ms-equipdb__forge-name">{displayName}</div>
              <div class={`ms-equipdb__forge-price${result.valid ? "" : " is-invalid"}`}>
                {result.valid ? formatGp(result.priceGp) : "—"}
              </div>
              <div class="ms-equipdb__forge-stats">
                <div class="ms-equipdb__forge-stat">
                  <span class="ms-equipdb__forge-stat-k">Effective bonus</span>
                  <span class="ms-equipdb__forge-stat-v">
                    <b class={over ? "is-over" : ""}>+{usedEquiv}</b>
                    <span class="ms-equipdb__forge-stat-cap"> / +{MAX_EFFECTIVE_BONUS}</span>
                  </span>
                </div>
                <div class="ms-equipdb__forge-stat">
                  <span class="ms-equipdb__forge-stat-k">Abilities</span>
                  <span class="ms-equipdb__forge-stat-v">{abilityIds.length || "—"}</span>
                </div>
                <div class="ms-equipdb__forge-stat">
                  <span class="ms-equipdb__forge-stat-k">Weight</span>
                  <span class="ms-equipdb__forge-stat-v">{result.weightLbs} lb.</span>
                </div>
              </div>
              {result.errors.map((err) => (
                <div key={err} class="ms-equipdb__forge-error">
                  {err}
                </div>
              ))}
              {fileBlocked && (
                <div class="ms-equipdb__forge-error">
                  The custom items file is unreadable — fix it (or rename it in
                  settings) before saving.
                </div>
              )}
              <div class="ms-equipdb__forge-actions">
                <button
                  class="mod-cta ms-equipdb__cta"
                  disabled={!result.valid || fileBlocked}
                  onClick={save}
                >
                  {editItem ? "Save changes" : "Save custom item"}
                </button>
                {editItem && <button onClick={onDone}>Cancel</button>}
              </div>
            </>
          ) : (
            <div class="ms-equipdb__muted ms-equipdb__forge-hint">
              Pick a base item to begin forging. Price and effective bonus update
              live.
            </div>
          )}
        </div>
      </aside>

      <div class="ms-equipdb__forge-main">
        <div class="ms-equipdb__blocklabel">
          Base &amp; enhancement<span class="ms-equipdb__rule" />
        </div>
        <div class="ms-equipdb__forge-form">
          <div class="ms-equipdb__filter-group">
            <span class="ms-equipdb__filter-title">Item type</span>
            <select
              class="dropdown"
              value={kind}
              onChange={(e) =>
                setKindReset((e.target as HTMLSelectElement).value as ForgeSelection["kind"])
              }
            >
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
              <option value="shield">Shield</option>
            </select>
          </div>

          <div class="ms-equipdb__filter-group">
            <span class="ms-equipdb__filter-title">Base item</span>
            <select
              class="dropdown"
              value={baseId}
              onChange={(e) => setBaseId((e.target as HTMLSelectElement).value)}
            >
              <option value="">Pick a base item…</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatGp(b.costGp)})
                </option>
              ))}
            </select>
          </div>

          <div class="ms-equipdb__filter-group">
            <span class="ms-equipdb__filter-title">Enhancement</span>
            <select
              class="dropdown"
              value={String(enhancement)}
              onChange={(e) => setEnhancement(Number((e.target as HTMLSelectElement).value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  +{n}
                </option>
              ))}
            </select>
          </div>

          <div class="ms-equipdb__filter-group">
            <span class="ms-equipdb__filter-title">
              Name <span class="ms-equipdb__muted">(blank = auto)</span>
            </span>
            <input
              type="text"
              placeholder={result?.name ?? "auto"}
              value={nameOverride}
              onInput={(e) => setNameOverride((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div class="ms-equipdb__blocklabel">
          Special abilities<span class="ms-equipdb__rule" />
          <span class="ms-equipdb__muted">{abilityIds.length} selected</span>
        </div>

        <div class="ms-equipdb__ability-toolbar">
          <div class="ms-equipdb__search ms-equipdb__search--sm">
            <UI.search />
            <input
              class="ms-equipdb__search-input"
              placeholder="Search abilities…"
              value={abilQuery}
              onInput={(e) => setAbilQuery((e.target as HTMLInputElement).value)}
            />
          </div>
          <select
            class="dropdown"
            value={bonusFilter}
            onChange={(e) => setBonusFilter((e.target as HTMLSelectElement).value)}
          >
            <option value="">All costs</option>
            <option value="1">+1 bonus</option>
            <option value="2">+2 bonus</option>
            <option value="3">+3 bonus</option>
            <option value="4">+4 bonus</option>
            <option value="5">+5 bonus</option>
            <option value="flat">Flat cost</option>
          </select>
        </div>

        <div class="ms-equipdb__ability-wrap">
          {groups.length ? (
            groups.map((g) => (
              <div class="ms-equipdb__ability-group" key={g.key}>
                <div class="ms-equipdb__ability-group-label">
                  <b>{g.label}</b>
                  <span class="ms-equipdb__rule" />
                </div>
                <div class="ms-equipdb__ability-list">
                  {g.items.map((a) => renderAbility(a))}
                </div>
              </div>
            ))
          ) : (
            <div class="ms-equipdb__muted ms-equipdb__empty">
              No abilities match that filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
