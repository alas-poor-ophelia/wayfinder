import { setCurrency, type InventoryScope } from "../../state/inventory-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CurrencyState } from "../../types/inventory";
import { currencyTotalGp } from "../../types/inventory";

const COINS: { key: keyof CurrencyState; label: string }[] = [
  { key: "platinum", label: "PP" },
  { key: "gold", label: "GP" },
  { key: "silver", label: "SP" },
  { key: "copper", label: "CP" },
];

export function CurrencySection({
  currency,
  store,
  scope,
  open,
  onToggle,
}: {
  currency: CurrencyState;
  store: MiniSheetStore;
  scope: InventoryScope;
  open: boolean;
  onToggle: () => void;
}) {
  const total = currencyTotalGp(currency);
  return (
    <section class="ms-inv-section">
      <button class="ms-inv-section__header" onClick={onToggle}>
        <span class="ms-inv-section__title">Currency</span>
        <span class="ms-inv-section__hint">
          {open ? "" : `${total.toFixed(2)} gp`}
        </span>
        <span class={`ms-inv-section__chevron${open ? " is-open" : ""}`} />
      </button>
      {open && (
        <div class="ms-inv-currency">
          {COINS.map(({ key, label }) => (
            <label key={key} class={`ms-inv-currency__coin ms-inv-currency__coin--${key}`}>
              <span class="ms-inv-currency__dot" />
              <span class="ms-inv-currency__label">{label}</span>
              <input
                type="number"
                min={0}
                value={currency[key]}
                onChange={(e) =>
                  setCurrency(store, scope, {
                    [key]: Number((e.target as HTMLInputElement).value) || 0,
                  })
                }
              />
            </label>
          ))}
          <div class="ms-inv-currency__total">
            Total <strong>{total.toFixed(2)} gp</strong>
          </div>
        </div>
      )}
    </section>
  );
}
