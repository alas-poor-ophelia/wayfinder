import type { ComputedCharacter } from "../../calc";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type MiniSheetPlugin from "../../main";
import { SPELL_LEVELS } from "../../types/spellbook";
import { GlobalMetamagic } from "./GlobalMetamagic";
import { SlaSection } from "./SlaSection";
import { SpellLevelSection } from "./SpellLevelSection";
import { SpellSlotsTab } from "./SpellSlotsTab";

/**
 * The spells tab. Characters with a spellbook get the full port (legacy
 * section order: SLAs, then known spells per level; the config gear lands
 * with the prepared/hybrid milestone). Characters without one (Hwayoung)
 * keep the minimal slot-tracker view.
 */
export function SpellsTab({
  plugin,
  store,
  character,
  computed,
}: {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}) {
  const sb = character.spellbook;
  if (!sb || !computed.spellbook) {
    return <SpellSlotsTab store={store} character={character} />;
  }

  const paradigm = computed.spellbook.paradigm;

  return (
    <div class="ms-spellbook">
      <SlaSection plugin={plugin} store={store} character={character} />
      {paradigm === "spontaneous" && (
        <GlobalMetamagic store={store} character={character} />
      )}
      {paradigm === "spontaneous" &&
        SPELL_LEVELS.map((level) => (
          <SpellLevelSection
            key={level}
            plugin={plugin}
            store={store}
            character={character}
            computed={computed.spellbook!}
            level={level}
          />
        ))}
      {paradigm !== "spontaneous" && (
        <div class="ms-placeholder">
          <div>Prepared/hybrid spellbook</div>
          <div class="ms-muted">This casting paradigm lands with the next milestone</div>
        </div>
      )}
    </div>
  );
}
