import {
  addGlobalMetamagic,
  removeGlobalMetamagic,
  setGlobalMetamagicSelected,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { UI } from "../config/glyphs";
import { CollapseSection } from "./CollapseSection";

/**
 * "Spontaneous Metamagic" callout — port of the legacy
 * createGlobalMetamagicSelector. (In the final legacy composition this
 * section had lost its mount point and never rendered; the machinery and
 * its calloutStates key survived, so the port restores it. Collapsed by
 * default when no metamagics are active.)
 *
 * The picker offers only the feats the character owns (spellbook config);
 * with no feats the whole section hides — active pills still show if a
 * stale metamagic remains applied.
 */
export function GlobalMetamagic({
  store,
  character,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
}) {
  const sb = character.spellbook;
  if (!sb) return null;
  const active = sb.globalMetamagic.active;
  const feats = sb.metamagicFeats ?? [];
  if (feats.length === 0 && active.length === 0) return null;

  return (
    <CollapseSection
      store={store}
      character={character}
      title="Spontaneous Metamagic"
      variant="sub"
      defaultCollapsed={active.length === 0}
    >
      {feats.length > 0 && (
        <div class="ms-metamagic__picker">
          <select
            class="dropdown ms-metamagic__select"
            value={sb.globalMetamagic.selected}
            onChange={(e) =>
              setGlobalMetamagicSelected(
                store,
                character,
                (e.target as HTMLSelectElement).value,
              )
            }
          >
            <option value=""></option>
            {feats.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            class="ms-metamagic__add"
            aria-label="Add metamagic"
            onClick={() => addGlobalMetamagic(store, character)}
          >
            <UI.plus />
          </button>
        </div>
      )}
      <div class="ms-metamagic__active">
        <label>Active Metamagics:</label>
        {active.length === 0 ? (
          <span class="ms-metamagic__none">None</span>
        ) : (
          <div class="ms-metamagic__pills">
            {active.map((metamagic, index) => (
              <div class="ms-metamagic__pill" key={`${metamagic}-${index}`}>
                <span class="metamagic-name">{metamagic}</span>
                <button
                  class="ms-metamagic__remove"
                  aria-label={`Remove ${metamagic}`}
                  onClick={() => removeGlobalMetamagic(store, character, index)}
                >
                  <UI.x />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapseSection>
  );
}
