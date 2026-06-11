import { METAMAGIC_OPTIONS } from "../../calc/spells";
import {
  addLevelMetamagic,
  removeLevelMetamagic,
  setLevelMetamagicSelected,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type { SpellLevel } from "../../types/spellbook";
import { getSpellLevelKey } from "../../types/spellbook";
import { CollapseSection } from "./CollapseSection";

/**
 * Per-level "Metamagic" callout for prepared/hybrid known sections — port
 * of the legacy uiFactory.createMetamagicSelector (same controls as the
 * global selector, bound to the level's selectedMetamagic/activeMetamagics).
 */
export function LevelMetamagic({
  store,
  character,
  level,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  level: SpellLevel;
}) {
  const state = character.spellbook?.levels[getSpellLevelKey(level)];
  if (!state) return null;
  const active = state.activeMetamagics;

  return (
    <CollapseSection
      store={store}
      character={character}
      title="Metamagic"
      contextKey={`level${level}`}
      variant="sub"
      defaultCollapsed={active.length === 0}
    >
      <div class="ms-metamagic__picker">
        <select
          class="dropdown ms-metamagic__select"
          value={state.selectedMetamagic}
          onChange={(e) =>
            setLevelMetamagicSelected(
              store,
              character,
              level,
              (e.target as HTMLSelectElement).value
            )
          }
        >
          <option value=""></option>
          {METAMAGIC_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          class="ms-metamagic__add"
          aria-label={`Add level ${level} metamagic`}
          onClick={() => addLevelMetamagic(store, character, level)}
        >
          +
        </button>
      </div>
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
                  onClick={() => removeLevelMetamagic(store, character, level, index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapseSection>
  );
}
