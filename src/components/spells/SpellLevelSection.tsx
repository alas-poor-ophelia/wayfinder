import { totalMetamagicAdjustment } from "../../calc/spells";
import type { SpellbookComputed } from "../../calc/spells";
import {
  castSpontaneous,
  setLevelRemaining,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type MiniSheetPlugin from "../../main";
import type { SpellLevel } from "../../types/spellbook";
import { Tracker } from "../combat/Resources";
import { CollapseSection } from "./CollapseSection";
import { SpontaneousSpellRow } from "./SpellRow";

/**
 * "Level N" known-spells callout for spontaneous casters — port of the
 * legacy renderKnownSpellsByLevel: spells bucket by baseLevel + global
 * metamagic adjustment, levels above 0 get a "Per Day" slot tracker, and
 * the section renders only when spells land at this level.
 */
export function SpellLevelSection({
  plugin,
  store,
  character,
  computed,
  level,
}: {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: SpellbookComputed;
  level: SpellLevel;
}) {
  const sb = character.spellbook;
  if (!sb) return null;

  const globalMetamagics = sb.globalMetamagic.active;
  const adjustment = totalMetamagicAdjustment(globalMetamagics);
  const relevantSpells = sb.spells.filter(
    (spell) => spell.known && spell.baseLevel + adjustment === level,
  );
  if (relevantSpells.length === 0) return null;

  const levelComputed = computed.levels[level];

  return (
    <CollapseSection
      store={store}
      character={character}
      title={`Level ${level}`}
      contextKey="known"
    >
      {level > 0 &&
        (levelComputed.maxSlots > 0 ? (
          <div class="ms-spell-slots">
            <Tracker
              pool={{
                id: `spellbook-preps-l${level}`,
                name: "Per Day",
                current: levelComputed.remaining,
                max: levelComputed.maxSlots,
                set: (value) =>
                  setLevelRemaining(store, character, level, value),
              }}
            />
          </div>
        ) : (
          <div class="ms-spell-slots ms-spell-slots--none">
            No spell slots available at this level
          </div>
        ))}
      {relevantSpells.map((spell) => (
        <SpontaneousSpellRow
          key={spell.id}
          plugin={plugin}
          spell={spell}
          adjustedLevel={level}
          globalMetamagics={globalMetamagics}
          castingStatBonus={computed.castingStatBonus}
          casterLevel={computed.casterLevel}
          onCast={() =>
            castSpontaneous(store, character, level, computed.castingStatBonus)
          }
        />
      ))}
    </CollapseSection>
  );
}
