import { useState } from "preact/hooks";
import { CASTER_CONFIGS } from "../../calc/spells";
import {
  resetSpellbook,
  setCasterLevelOverride,
  setCastingClass,
  setCastingStat,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { AbilityKey, CharacterRecord } from "../../types/character";
import { ABILITY_KEYS } from "../../types/character";

/**
 * Gear icon + flyout for spellbook configuration. The legacy flyout held
 * only loadout controls (out of scope) and a nav button; this surface
 * exposes what the legacy system configured via raw frontmatter editing:
 * casting class/stat, caster level override, and the reset actions
 * (resetAllPreparationCounts flags + SLA refill). [USER REVIEW] — no
 * legacy pixel reference exists for this menu.
 */
export function SpellbookConfig({
  store,
  character,
  castingStatBonus,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  castingStatBonus: number;
}) {
  const [open, setOpen] = useState(false);
  const sb = character.spellbook;
  if (!sb) return null;

  return (
    <div class="ms-spellbook-config">
      <button
        class="ms-spellbook-config__gear"
        aria-label="Spellbook configuration"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ⚙️
      </button>
      {open && (
        <div class="ms-spellbook-config__menu">
          <label class="ms-spellbook-config__row">
            <span>Class</span>
            <select
              class="dropdown"
              value={sb.castingClass}
              onChange={(e) =>
                setCastingClass(store, character, (e.target as HTMLSelectElement).value)
              }
            >
              {Object.keys(CASTER_CONFIGS).map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </label>
          <label class="ms-spellbook-config__row">
            <span>Stat</span>
            <select
              class="dropdown"
              value={sb.castingStat}
              onChange={(e) =>
                setCastingStat(
                  store,
                  character,
                  (e.target as HTMLSelectElement).value as AbilityKey
                )
              }
            >
              {ABILITY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label class="ms-spellbook-config__row">
            <span>CL override</span>
            <input
              type="number"
              min="0"
              max="20"
              value={sb.casterLevelOverride ?? ""}
              placeholder="auto"
              onChange={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                setCasterLevelOverride(
                  store,
                  character,
                  raw === "" ? undefined : Number(raw)
                );
              }}
            />
          </label>
          <div class="ms-spellbook-config__separator" />
          <button
            class="ms-spellbook-config__action"
            onClick={() => resetSpellbook(store, character, castingStatBonus)}
          >
            Reset slots + SLAs
          </button>
          <button
            class="ms-spellbook-config__action"
            onClick={() =>
              resetSpellbook(store, character, castingStatBonus, {
                resetMetamagics: true,
              })
            }
          >
            Reset + metamagics
          </button>
          <button
            class="ms-spellbook-config__action ms-spellbook-config__action--danger"
            onClick={() =>
              resetSpellbook(store, character, castingStatBonus, {
                resetMetamagics: true,
                resetPreparations: true,
              })
            }
          >
            Reset everything
          </button>
        </div>
      )}
    </div>
  );
}
