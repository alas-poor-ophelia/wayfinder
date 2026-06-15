import { useState } from "preact/hooks";
import type { SaveValues } from "../../calc/saves";
import type { CharacterRecord } from "../../types/character";

interface SavesProps {
  character: CharacterRecord;
  saves: SaveValues;
  /** situational racial modifiers per save (computed.racial.saveNotes) */
  racialNotes?: { fort: string[]; ref: string[]; will: string[] } | undefined;
}

const KINDS = ["fort", "ref", "will"] as const;

/** Fort/Ref/Will with gold icons; tapping a save reveals its notes. */
export function Saves({ character, saves, racialNotes }: SavesProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div class="ms-saves">
      {KINDS.map((kind) => {
        const userLines = character.saveNotes[kind]
          .split("\n")
          .filter((line) => line.trim());
        const lines = [...userLines, ...(racialNotes?.[kind] ?? [])];
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
            {open === kind && lines.length > 0 && (
              <div class="ms-save__notes">
                {lines.map((line, i) => (
                  <div key={`${i}-${line}`}>{line.replace(/^- /, "")}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
