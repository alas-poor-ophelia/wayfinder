import { useState } from "preact/hooks";
import type { ConditionEffects } from "../../calc/conditions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface ConditionNotesProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  effects: ConditionEffects;
}

/** Expandable notes for active conditions (gold !) and buffs (blue *). */
export function ConditionNotes({ store, character, effects }: ConditionNotesProps) {
  const [open, setOpen] = useState<"conditions" | "buffs" | null>(null);
  const hasConditions =
    character.conditions.length > 0 || character.adjustments.negativeLevels > 0;
  const hasBuffs = character.buffs.length > 0;
  if (!hasConditions && !hasBuffs) return null;

  const removeFrom = (field: "conditions" | "buffs", name: string) => {
    const list = character[field].filter((x) => x !== name);
    store.setCharacterField(character.id, field, list);
  };

  return (
    <div class="ms-cond-notes">
      <div class="ms-cond-notes__icons">
        {hasConditions && (
          <button
            class={`ms-cond-notes__icon ms-cond-notes__icon--condition${open === "conditions" ? " is-open" : ""}`}
            aria-label="Show condition notes"
            onClick={() => setOpen(open === "conditions" ? null : "conditions")}
          >
            !
          </button>
        )}
        {hasBuffs && (
          <button
            class={`ms-cond-notes__icon ms-cond-notes__icon--buff${open === "buffs" ? " is-open" : ""}`}
            aria-label="Show buff notes"
            onClick={() => setOpen(open === "buffs" ? null : "buffs")}
          >
            *
          </button>
        )}
      </div>
      {open === "conditions" && (
        <div class="ms-cond-notes__body">
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
          {effects.conditionNotes && (
            <div class="ms-cond-notes__text">{effects.conditionNotes}</div>
          )}
        </div>
      )}
      {open === "buffs" && (
        <div class="ms-cond-notes__body">
          {character.buffs.map((b) => (
            <div class="ms-cond-notes__item" key={b}>
              <span class="ms-cond-notes__name">{b}</span>
              <button
                class="ms-cond-notes__remove"
                aria-label={`Remove ${b}`}
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
              {["+30ft. Speed", "Stand as Swift", "Extra Attack", "+2 Atk/AC/Reflex", "Free Metamagic"].map(
                (choice) => (
                  <option
                    key={choice}
                    value={choice}
                    selected={choice === character.bofChoice}
                  >
                    {choice}
                  </option>
                )
              )}
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
        </div>
      )}
    </div>
  );
}
