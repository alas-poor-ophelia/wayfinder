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

  const setKindReset = (next: ForgeSelection["kind"]) => {
    setKind(next);
    setBaseId("");
    setAbilityIds([]);
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

  return (
    <div class="ms-equipdb__forge">
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

      <div class="ms-equipdb__forge-abilities">
        <span class="ms-equipdb__filter-title">
          Special abilities{" "}
          <span class="ms-equipdb__muted">
            ({usedEquiv}/{MAX_EFFECTIVE_BONUS} effective bonus used)
          </span>
        </span>
        <div class="ms-equipdb__ability-list">
          {abilityPool
            .filter((a) => abilityFits(a, kind, base))
            .map((a) => {
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
                  class={`${on ? "is-on" : ""}${wouldExceed ? " is-blocked" : ""}`}
                  title={a.shortDesc}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={wouldExceed}
                    onChange={() => toggleAbility(a.id)}
                  />
                  {a.name} <span class="ms-equipdb__muted">({cost})</span>
                </label>
              );
            })}
        </div>
      </div>

      <div class="ms-equipdb__forge-result">
        {result ? (
          <>
            <div class="ms-equipdb__forge-name">
              {nameOverride.trim() || result.name}
            </div>
            <div class="ms-equipdb__forge-price">
              {result.valid ? formatGp(result.priceGp) : "—"}
            </div>
            {result.errors.map((err) => (
              <div key={err} class="ms-equipdb__forge-error">
                {err}
              </div>
            ))}
          </>
        ) : (
          <div class="ms-equipdb__muted">Pick a base item to begin.</div>
        )}
        {fileBlocked && (
          <div class="ms-equipdb__forge-error">
            The custom items file is unreadable — fix it (or rename it in
            settings) before saving.
          </div>
        )}
        <div class="ms-equipdb__forge-actions">
          <button
            class="mod-cta"
            disabled={!result?.valid || fileBlocked}
            onClick={save}
          >
            {editItem ? "Save changes" : "Save custom item"}
          </button>
          {editItem && <button onClick={onDone}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}
