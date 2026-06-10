import type { AttackStrings } from "../../calc/attacks";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface AttackBlocksProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  attacks: AttackStrings;
}

const RANGED_STYLES = ["Shuriken", "Longbow", "Ray"];

/** Render "**Bold:** rest" lines from the calculator's markdown-ish strings. */
function AttackText({ text }: { text: string }) {
  return (
    <div class="ms-atk-block__body">
      {text.split("\n").map((line, i) => {
        const m = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
        if (m) {
          return (
            <div key={i}>
              <strong>{m[1]}:</strong> {m[2]}
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} class="ms-atk-block__gap" />;
        const bold = line.match(/^\*\*(.+?)\*\*$/);
        if (bold) {
          return (
            <div key={i}>
              <strong>{bold[1]}</strong>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

export function AttackBlocks({ store, character, attacks }: AttackBlocksProps) {
  const meleeName = character.weapons.find((w) => w.kind === "melee")?.name ?? "Melee";
  return (
    <div class="ms-attacks">
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">{meleeName}</summary>
        <AttackText text={attacks.melee} />
      </details>
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">Ranged</summary>
        <div class="ms-atk-block__ranged-style">
          <select
            class="dropdown"
            value={character.toggles.rangedAttackStyle}
            onChange={(e) =>
              store.setCharacterField(
                character.id,
                "toggles.rangedAttackStyle",
                (e.target as HTMLSelectElement).value
              )
            }
          >
            {RANGED_STYLES.map((style) => (
              <option
                key={style}
                value={style}
                selected={style === character.toggles.rangedAttackStyle}
              >
                {style}
              </option>
            ))}
          </select>
        </div>
        <AttackText text={attacks.ranged} />
      </details>
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">Unarmed Strike</summary>
        <AttackText text={attacks.unarmed} />
      </details>
    </div>
  );
}
