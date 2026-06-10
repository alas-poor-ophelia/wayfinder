import { useState } from "preact/hooks";
import type { SaveValues } from "../../calc/saves";
import type { CharacterRecord } from "../../types/character";

interface SavesProps {
  character: CharacterRecord;
  saves: SaveValues;
}

const KINDS = ["fort", "ref", "will"] as const;

/** Fort/Ref/Will with gold icons; tapping a save reveals its notes. */
export function Saves({ character, saves }: SavesProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div class="ms-saves">
      {KINDS.map((kind) => {
        const notes = character.saveNotes[kind];
        return (
          <div
            class={`ms-save ms-save--${kind}${open === kind ? " is-open" : ""}`}
            key={kind}
          >
            <button
              class="ms-save__value"
              onClick={() => setOpen(open === kind ? null : kind)}
            >
              {saves[kind]}
            </button>
            {open === kind && notes && (
              <div class="ms-save__notes">
                {notes.split("\n").map((line) => (
                  <div key={line}>{line.replace(/^- /, "")}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
