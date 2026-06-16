import { type CharacterRecord } from "../../../types/character";
import { ModifierEditor } from "../../common/ModifierEditor";
import { UI } from "../glyphs";
import { Sec } from "../primitives";
import { type SectionProps } from "./shared";

export function BuffsSection({ store, character }: SectionProps) {
  const buffs = character.customBuffs ?? [];
  const setBuffs = (value: CharacterRecord["customBuffs"]) =>
    store.setCharacterField(character.id, "customBuffs", value);
  return (
    <Sec icon="ra-bell" title="Custom Buffs">
      <p class="help" style={{ marginTop: 2 }}>
        Your own typed modifiers, toggled as chips on the adjustments tab.
      </p>
      {buffs.map((buff, idx) => (
        <div key={buff.id} style={{ marginTop: 8 }}>
          <div class="respool" style={{ borderBottom: 0 }}>
            <input
              class="inp"
              type="text"
              value={buff.name}
              onInput={(e) =>
                setBuffs(
                  buffs.map((b, i) =>
                    i === idx
                      ? { ...b, name: (e.target as HTMLInputElement).value }
                      : b,
                  ),
                )
              }
            />
            <button
              class="iconbtn"
              aria-label={`Remove ${buff.name}`}
              onClick={() => {
                setBuffs(buffs.filter((_, i) => i !== idx));
                if (character.buffs.includes(buff.id)) {
                  store.setCharacterField(
                    character.id,
                    "buffs",
                    character.buffs.filter((k) => k !== buff.id),
                  );
                }
              }}
            >
              <UI.x />
            </button>
          </div>
          <ModifierEditor
            modifiers={buff.modifiers}
            source={buff.name || "Custom buff"}
            onChange={(modifiers) =>
              setBuffs(
                buffs.map((b, i) => (i === idx ? { ...b, modifiers } : b)),
              )
            }
          />
        </div>
      ))}
      <button
        class="btn btn--ghost btn--sm"
        style={{ marginTop: 8 }}
        onClick={() =>
          setBuffs([
            ...buffs,
            {
              id: `buff-${Date.now().toString(36)}`,
              name: "New buff",
              modifiers: [],
            },
          ])
        }
      >
        <UI.plus /> Add custom buff
      </button>
    </Sec>
  );
}
