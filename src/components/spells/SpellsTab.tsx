import type { ComputedCharacter } from "../../calc";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type MiniSheetPlugin from "../../main";
import { SPELL_LEVELS } from "../../types/spellbook";
import { GlobalMetamagic } from "./GlobalMetamagic";
import { PreparedKnownSection, PreparedLevelSection } from "./PreparedSections";
import { SlaSection } from "./SlaSection";
import { SpellbookConfig } from "./SpellbookConfig";
import { SpellLevelSection } from "./SpellLevelSection";
import { SpellSlotsTab } from "./SpellSlotsTab";

/**
 * The spells tab. Characters with a spellbook get the full port (legacy
 * section order: config, SLAs, then per-level sections — spontaneous shows
 * Known only; prepared/hybrid interleave Known and Prepared per the UI
 * spec). Characters without one (Hwayoung) keep the minimal slot-tracker
 * view.
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

  const spellbookComputed = computed.spellbook;
  const paradigm = spellbookComputed.paradigm;

  return (
    <div class="ms-spellbook">
      <SpellbookConfig
        store={store}
        character={character}
        castingStatBonus={spellbookComputed.castingStatBonus}
      />
      <SlaSection plugin={plugin} store={store} character={character} />
      {paradigm !== "prepared" && (
        <GlobalMetamagic store={store} character={character} />
      )}
      {paradigm === "spontaneous"
        ? SPELL_LEVELS.map((level) => (
            <SpellLevelSection
              key={level}
              plugin={plugin}
              store={store}
              character={character}
              computed={spellbookComputed}
              level={level}
            />
          ))
        : SPELL_LEVELS.map((level) => (
            <div key={level}>
              <PreparedKnownSection
                plugin={plugin}
                store={store}
                character={character}
                computed={spellbookComputed}
                level={level}
              />
              <PreparedLevelSection
                plugin={plugin}
                store={store}
                character={character}
                computed={spellbookComputed}
                level={level}
              />
            </div>
          ))}
    </div>
  );
}
