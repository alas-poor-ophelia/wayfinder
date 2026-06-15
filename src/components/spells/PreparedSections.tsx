import { totalMetamagicAdjustment } from "../../calc/spells";
import type { SpellbookComputed } from "../../calc/spells";
import {
  castPrepared,
  prepareSpell,
  removePreparation,
  setCastsRemaining,
  setLevelRemaining,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type MiniSheetPlugin from "../../main";
import { UI } from "../config/glyphs";
import type { SpellLevel } from "../../types/spellbook";
import { getSpellLevelKey } from "../../types/spellbook";
import { Tracker } from "../combat/Resources";
import { CollapseSection } from "./CollapseSection";
import { LevelMetamagic } from "./LevelMetamagic";
import { PreparedKnownRow, PreparedSpellRow } from "./PreparedRows";

function clampLevel(level: number): SpellLevel {
  return Math.min(Math.max(level, 0), 9) as SpellLevel;
}

/**
 * "Level N" known section for prepared/hybrid casters — spells bucket by
 * BASE level (unlike spontaneous); a per-level Metamagic callout adjusts
 * what the prepare button records.
 */
export function PreparedKnownSection({
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
  const knownSpells = sb.spells.filter(
    (spell) => spell.known && spell.baseLevel === level,
  );
  if (knownSpells.length === 0) return null;

  const activeMetamagics =
    sb.levels[getSpellLevelKey(level)]?.activeMetamagics ?? [];
  const adjustedLevel = clampLevel(
    level + totalMetamagicAdjustment(activeMetamagics),
  );

  return (
    <CollapseSection
      store={store}
      character={character}
      title={`Level ${level}`}
      contextKey="known"
    >
      <LevelMetamagic store={store} character={character} level={level} />
      {knownSpells.map((spell) => (
        <PreparedKnownRow
          key={spell.id}
          plugin={plugin}
          spell={spell}
          adjustedLevel={adjustedLevel}
          activeMetamagics={activeMetamagics}
          castingStatBonus={computed.castingStatBonus}
          casterLevel={computed.casterLevel}
          onPrepare={() =>
            prepareSpell(store, character, spell.id, computed.castingStatBonus)
          }
        />
      ))}
    </CollapseSection>
  );
}

/**
 * "Level N" prepared section. Renders when preparations exist at this
 * level or slots remain. Prepared casters get one "Per Day" tracker;
 * hybrid casters get the dual trackers (prep slots + casts) and their
 * preparations display shifted by non-duplicate global metamagics.
 */
export function PreparedLevelSection({
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
  const hybrid = computed.paradigm === "hybrid";

  // hybrid: this section's TARGET level displays preparations stored at
  // (target - global adjustment); prepared casters display storage directly
  const globalAdj = hybrid
    ? totalMetamagicAdjustment(sb.globalMetamagic.active)
    : 0;
  const storageLevel = level - globalAdj;
  const preparations =
    storageLevel >= 0 && storageLevel <= 9
      ? (sb.preparations[getSpellLevelKey(storageLevel)] ?? [])
      : [];

  const levelComputed = computed.levels[level];
  // legacy render gate uses the STORED remaining values (null = fresh level,
  // hidden until something is prepared or a reset writes the maxima)
  const levelState = sb.levels[getSpellLevelKey(level)];
  const hasRemainingSlots = (levelState?.remaining ?? 0) > 0;
  const hasRemainingCasts = (levelState?.castsRemaining ?? 0) > 0;
  if (
    preparations.length === 0 &&
    !hasRemainingSlots &&
    !(hybrid && hasRemainingCasts)
  ) {
    return null;
  }

  const totalPrepared = preparations.reduce(
    (sum, p) => sum + (p.count || 1),
    0,
  );

  return (
    <CollapseSection
      store={store}
      character={character}
      title={`Level ${level}`}
      contextKey="prepared"
    >
      {level > 0 && (
        <div class={`ms-spell-slots${hybrid ? " ms-spell-slots--hybrid" : ""}`}>
          {levelComputed.maxSlots > 0 && (
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
          )}
          {hybrid && (levelComputed.arcanistCasts ?? 0) > 0 && (
            <Tracker
              pool={{
                id: `spellbook-casts-l${level}`,
                name: "Casts",
                current: levelComputed.castsRemaining ?? 0,
                max: levelComputed.arcanistCasts!,
                set: (value) =>
                  setCastsRemaining(store, character, level, value),
              }}
            />
          )}
        </div>
      )}
      {totalPrepared > levelComputed.maxSlots && (
        <div class="ms-overprep">
          <UI.warn />
          {totalPrepared}/{levelComputed.maxSlots} spells prepared
        </div>
      )}
      {preparations.map((prep, prepIndex) => {
        const spell = sb.spells.find((s) => s.id === prep.spellId);
        if (!spell) return null;
        const nonDupGlobals = hybrid
          ? sb.globalMetamagic.active.filter((g) => !prep.metamagic.includes(g))
          : [];
        return (
          <PreparedSpellRow
            key={`${prep.spellId}-${prepIndex}`}
            plugin={plugin}
            spell={spell}
            preparation={prep}
            displayLevel={level}
            displayMetamagics={[...nonDupGlobals, ...prep.metamagic]}
            castingStatBonus={computed.castingStatBonus}
            casterLevel={computed.casterLevel}
            onCast={() =>
              castPrepared(
                store,
                character,
                clampLevel(storageLevel),
                prepIndex,
                computed.castingStatBonus,
              )
            }
            onRemove={() =>
              removePreparation(
                store,
                character,
                clampLevel(storageLevel),
                prepIndex,
              )
            }
          />
        );
      })}
    </CollapseSection>
  );
}
