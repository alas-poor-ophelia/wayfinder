import type { SpellbookComputed } from "../../calc/spells";
import { setLevelRemaining } from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { SPELL_LEVELS } from "../../types/spellbook";
import { Tracker } from "../combat/Resources";

/**
 * Minimal spells tab for slot-only spellbooks (castingClass "", maxima in
 * slotOverrides — schema v5 home of the old spellSlotsL* resource pools)
 * and for characters with no spellbook at all.
 */
export function SpellSlotsTab({
  store,
  character,
  computed,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  computed?: SpellbookComputed;
}) {
  const slots = computed
    ? SPELL_LEVELS.filter((level) => computed.levels[level].maxSlots > 0)
    : [];

  if (slots.length === 0) {
    return (
      <div class="ms-placeholder">
        <div>No spell slots configured</div>
        <div class="ms-muted">Import a caster or configure a spellbook</div>
      </div>
    );
  }

  return (
    <div class="ms-spells">
      {slots.map((level) => {
        const lc = computed!.levels[level];
        return (
          <Tracker
            key={level}
            pool={{
              id: `spellSlotsL${level}`,
              name: `Level ${level} Slots`,
              current: lc.remaining,
              max: lc.maxSlots,
              set: (value) => setLevelRemaining(store, character, level, value),
            }}
          />
        );
      })}
    </div>
  );
}
