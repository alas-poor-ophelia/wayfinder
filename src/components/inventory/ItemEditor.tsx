import { useState } from "preact/hooks";
import {
  suggestEquipment,
  type EquipSuggestion,
} from "../../state/equip-suggest";
import {
  addItem,
  updateItem,
  wouldCycle,
  type InventoryScope,
} from "../../state/inventory-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CustomItemDef } from "../../types/custom-items";
import type { InventoryItem, InventoryState, ItemType } from "../../types/inventory";
import {
  ITEM_TYPES,
  NOTE_MAX_LENGTH,
  WAND_MAX_CHARGES,
  isContainer,
} from "../../types/inventory";
import { formatGp } from "../equipdb/EquipTable";
import { ModifierEditor } from "../common/ModifierEditor";

type Draft = Omit<InventoryItem, "id">;

function emptyDraft(): Draft {
  return {
    name: "",
    type: "Gear",
    count: 1,
    weight: 0,
    value: 0,
    containerId: null,
    note: null,
    charges: null,
    owner: null,
  };
}

/**
 * Add/edit form. Sidebar: rendered as a full-surface swap (ConfigSurface
 * pattern). Party view: same component inside an absolutely-positioned
 * overlay (CSS only).
 */
export function ItemEditor({
  inventory,
  item,
  store,
  scope,
  variant,
  ownerChoices,
  customItems,
  onClose,
}: {
  inventory: InventoryState;
  /** null = adding a new item */
  item: InventoryItem | null;
  store: MiniSheetStore;
  scope: InventoryScope;
  variant: "sidebar" | "party";
  ownerChoices?: string[];
  /** equipment-DB custom items, included in the name autocomplete */
  customItems?: CustomItemDef[];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    item ? { ...item } : emptyDraft()
  );
  const [error, setError] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  // catalog autocomplete: add-mode only — editing must not bulk-replace stats
  const suggestions =
    !item && suggestOpen ? suggestEquipment(draft.name, customItems) : [];
  const pick = (s: EquipSuggestion) => {
    setSuggestOpen(false);
    // keep what the user already chose about placement/quantity
    setDraft((d) => ({
      ...s.draft,
      count: d.count,
      containerId: d.containerId,
      owner: d.owner,
    }));
  };

  // container choices exclude the item itself and anything inside it
  const containers = inventory.items.filter(
    (c) =>
      isContainer(c) && (!item || !wouldCycle(inventory.items, item.id, c.id))
  );

  const save = () => {
    try {
      if (item) updateItem(store, scope, item.id, draft);
      else addItem(store, scope, draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const body = (
    <div class="ms-inv-editor">
      <header class="ms-inv-editor__title">
        {item ? `Edit ${item.name}` : "Add item"}
      </header>
      <label class="ms-inv-editor__field">
        Name
        <div class="ms-inv-editor__namewrap">
          <input
            type="text"
            value={draft.name}
            onInput={(e) => {
              patch({ name: (e.target as HTMLInputElement).value });
              setSuggestOpen(true);
            }}
            onBlur={() => setSuggestOpen(false)}
          />
          {suggestions.length > 0 && (
            <div
              class="ms-inv-editor__suggest"
              // keep the input focused so its blur doesn't kill the click
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  class="ms-inv-editor__suggest-row"
                  onClick={() => pick(s)}
                >
                  <span class="ms-inv-editor__suggest-name">
                    {s.name}
                    {s.needsReview && (
                      <span title="Bonuses not auto-detected — set them below after picking"> ⚠</span>
                    )}
                  </span>
                  <span class="ms-inv-editor__suggest-kind">{s.kind}</span>
                  <span class="ms-inv-editor__suggest-price">{formatGp(s.priceGp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </label>
      <label class="ms-inv-editor__field">
        Type
        <select
          value={draft.type}
          onChange={(e) =>
            patch({ type: (e.target as HTMLSelectElement).value as ItemType })
          }
        >
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <div class="ms-inv-editor__numbers">
        <label class="ms-inv-editor__field">
          Count
          <input
            type="number"
            min={1}
            value={draft.count}
            onChange={(e) =>
              patch({ count: Number((e.target as HTMLInputElement).value) || 1 })
            }
          />
        </label>
        <label class="ms-inv-editor__field">
          Weight (lbs)
          <input
            type="number"
            min={0}
            step={0.1}
            value={draft.weight}
            onChange={(e) =>
              patch({ weight: Number((e.target as HTMLInputElement).value) || 0 })
            }
          />
        </label>
        <label class="ms-inv-editor__field">
          Value (gp)
          <input
            type="number"
            min={0}
            step={0.01}
            value={draft.value}
            onChange={(e) =>
              patch({ value: Number((e.target as HTMLInputElement).value) || 0 })
            }
          />
        </label>
      </div>
      {draft.type === "Wand" && (
        <label class="ms-inv-editor__field">
          Charges (0–{WAND_MAX_CHARGES})
          <input
            type="number"
            min={0}
            max={WAND_MAX_CHARGES}
            value={draft.charges ?? WAND_MAX_CHARGES}
            onChange={(e) =>
              patch({ charges: Number((e.target as HTMLInputElement).value) || 0 })
            }
          />
        </label>
      )}
      {containers.length > 0 && (
        <label class="ms-inv-editor__field">
          Container
          <select
            value={draft.containerId ?? ""}
            onChange={(e) =>
              patch({
                containerId: (e.target as HTMLSelectElement).value || null,
              })
            }
          >
            <option value="">None (top level)</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {ownerChoices && (
        <label class="ms-inv-editor__field">
          Owner
          <input
            type="text"
            list="ms-inv-owner-choices"
            value={draft.owner ?? ""}
            onInput={(e) =>
              patch({ owner: (e.target as HTMLInputElement).value || null })
            }
          />
          <datalist id="ms-inv-owner-choices">
            {ownerChoices.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
      )}
      {(!!draft.weapon || !!draft.modifiers?.length) && (
        <label class="ms-inv-editor__equipped">
          <input
            type="checkbox"
            checked={!!draft.equipped}
            onChange={(e) =>
              patch({ equipped: (e.target as HTMLInputElement).checked })
            }
          />
          Equipped (bonuses &amp; attacks apply only while equipped)
        </label>
      )}
      <details class="ms-inv-editor__bonuses" open={!!draft.modifiers?.length}>
        <summary>Bonuses {draft.modifiers?.length ? `(${draft.modifiers.length})` : ""}</summary>
        <ModifierEditor
          modifiers={draft.modifiers ?? []}
          source={draft.name || "Item"}
          onChange={(modifiers) =>
            patch({ modifiers: modifiers.length ? modifiers : undefined })
          }
        />
        <div class="ms-inv-editor__bonus-hint">
          Weapon enhancement: use type “enhancement” on an attack target —
          damage follows automatically (melee/ranged).
        </div>
      </details>
      <label class="ms-inv-editor__field">
        Note
        <textarea
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          value={draft.note ?? ""}
          onInput={(e) =>
            patch({ note: (e.target as HTMLTextAreaElement).value || null })
          }
        />
      </label>
      {error && <div class="ms-inv-editor__error">{error}</div>}
      <footer class="ms-inv-editor__actions">
        <button class="ms-inv-editor__cancel" onClick={onClose}>
          Cancel
        </button>
        <button class="ms-inv-editor__save" onClick={save}>
          {item ? "Update" : "Add"}
        </button>
      </footer>
    </div>
  );

  return variant === "party" ? (
    <div class="ms-inv-editor__overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {body}
    </div>
  ) : (
    body
  );
}
