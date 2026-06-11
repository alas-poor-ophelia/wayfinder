import { useState } from "preact/hooks";
import type { ConditionEffects } from "../../calc/conditions";
import { getBuffDef } from "../../data/buffs";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface ConditionNotesProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  effects: ConditionEffects;
}

const BOF_CHOICES = [
  "+30ft. Speed",
  "Stand as Swift",
  "Extra Attack",
  "+2 Atk/AC/Reflex",
  "Free Metamagic",
];

/**
 * Unified active-effects surface: one counter button (gold = conditions,
 * blue = buffs, split = both) opening a single panel that groups active
 * conditions and buffs with remove buttons and the calc notes. Hidden
 * entirely when nothing is active.
 */
export function ConditionNotes({ store, character, effects }: ConditionNotesProps) {
  const [open, setOpen] = useState(false);
  const negLevels = character.adjustments.negativeLevels;
  const hasConditions = character.conditions.length > 0 || negLevels > 0;
  const hasBuffs = character.buffs.length > 0;
  if (!hasConditions && !hasBuffs) return null;

  const count =
    character.conditions.length + character.buffs.length + (negLevels > 0 ? 1 : 0);
  const tone =
    hasConditions && hasBuffs ? "is-mixed" : hasConditions ? "is-conditions" : "is-buffs";

  const removeFrom = (field: "conditions" | "buffs", name: string) => {
    const list = character[field].filter((x) => x !== name);
    store.setCharacterField(character.id, field, list);
  };

  const buffLabel = (key: string) =>
    getBuffDef(key)?.name ??
    (character.customBuffs ?? []).find((b) => b.id === key)?.name ??
    key;

  return (
    <div class="ms-cond-notes">
      <button
        class={`ms-cond-notes__icon ${tone}${open ? " is-open" : ""}`}
        aria-label={`Show active effects (${count})`}
        onClick={() => setOpen(!open)}
      >
        {count}
      </button>
      {open && (
        <div class="ms-cond-notes__body">
          {hasConditions && (
            <section class="ms-cond-notes__group ms-cond-notes__group--conditions">
              <h4 class="ms-cond-notes__group-title">Conditions</h4>
              {character.conditions.map((c) => (
                <div class="ms-cond-notes__item" key={c}>
                  <span class="ms-cond-notes__name">{c}</span>
                  <button
                    class="ms-cond-notes__remove"
                    aria-label={`Remove ${c}`}
                    onClick={() => removeFrom("conditions", c)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {negLevels > 0 && (
                <div class="ms-cond-notes__item">
                  <span class="ms-cond-notes__name">negative levels ×{negLevels}</span>
                  <button
                    class="ms-cond-notes__remove"
                    aria-label="Clear negative levels"
                    onClick={() =>
                      store.setCharacterField(character.id, "adjustments.negativeLevels", 0)
                    }
                  >
                    ✕
                  </button>
                </div>
              )}
              {effects.conditionNotes && (
                <div class="ms-cond-notes__text">{effects.conditionNotes}</div>
              )}
            </section>
          )}
          {hasBuffs && (
            <section class="ms-cond-notes__group ms-cond-notes__group--buffs">
              <h4 class="ms-cond-notes__group-title">Buffs</h4>
              {character.buffs.map((b) => (
                <div class="ms-cond-notes__item" key={b}>
                  <span class="ms-cond-notes__name">{buffLabel(b)}</span>
                  <button
                    class="ms-cond-notes__remove"
                    aria-label={`Remove ${buffLabel(b)}`}
                    onClick={() => removeFrom("buffs", b)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {character.buffs.includes("blessing of fervor") && (
                <select
                  class="dropdown ms-cond-notes__bof"
                  value={character.bofChoice}
                  onChange={(e) =>
                    store.setCharacterField(
                      character.id,
                      "bofChoice",
                      (e.target as HTMLSelectElement).value
                    )
                  }
                >
                  {BOF_CHOICES.map((choice) => (
                    <option key={choice} value={choice} selected={choice === character.bofChoice}>
                      {choice}
                    </option>
                  ))}
                </select>
              )}
              {effects.buffNotes && (
                <div class="ms-cond-notes__text">
                  {effects.buffNotes
                    .split("\n")
                    .filter((line) => !line.includes("INPUT"))
                    .join("\n")}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
