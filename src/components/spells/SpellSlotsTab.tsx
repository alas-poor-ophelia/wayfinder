import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { Tracker } from "../combat/Resources";

/** Minimal spells tab: slot trackers only. The full spellbook is a later
 *  phase; this is the architecture's mount point for it. */
export function SpellSlotsTab({
  store,
  character,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
}) {
  const slots = character.resources
    .map((pool, idx) => ({ pool, idx }))
    .filter(({ pool }) => pool.id.startsWith("spellSlots"));

  if (slots.length === 0) {
    return (
      <div class="ms-placeholder">
        <div>No spell slots configured</div>
        <div class="ms-muted">Add “spellSlots…” resources in the character config</div>
      </div>
    );
  }

  return (
    <div class="ms-spells">
      {slots.map(({ pool, idx }) => (
        <Tracker
          key={pool.id}
          pool={pool}
          onSet={(value) =>
            store.setCharacterField(character.id, `resources.${idx}.current`, value)
          }
        />
      ))}
    </div>
  );
}
