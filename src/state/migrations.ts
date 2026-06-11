/**
 * Load-time data.json migrations. store.load() runs migrateData() on the
 * raw loaded object BEFORE the schema-forward merge (which stamps the
 * current schemaVersion over whatever was loaded — so the version must be
 * read here, first). Every step is idempotent: re-running on already-
 * migrated data is a no-op.
 */

import type { CharacterRecord, ResourcePool } from "../types/character";
import type { MiniSheetData } from "../types/data-file";
import {
  createSlotOnlySpellbook,
  getSpellLevelKey,
  type SpellLevel,
} from "../types/spellbook";

/** Pools the old sheet hardcoded as item-granted (Resources.tsx had a
 *  literal ITEM_POOL_IDS set until schema v4 introduced pool.kind). */
const LEGACY_ITEM_POOL_IDS = new Set([
  "plumeOfPanache",
  "quickrunners",
  "avengingBracers",
]);

export function migrateData(raw: Partial<MiniSheetData>): Partial<MiniSheetData> {
  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  let data = raw;
  if (version < 4) data = migrateToV4(data);
  if (version < 5) data = migrateToV5(data);
  return data;
}

/**
 * v4: pool.kind stamps for the legacy item pools, and the top-level
 * panache field becomes a resources[] pool (formula-driven only when the
 * character actually has Swashbuckler levels — Adarin carries panache
 * without the class, so his stored max is preserved as a manual pool).
 */
function migrateToV4(raw: Partial<MiniSheetData>): Partial<MiniSheetData> {
  if (!raw.characters) return raw;
  return { ...raw, characters: raw.characters.map(migrateCharacterToV4) };
}

function migrateCharacterToV4(record: CharacterRecord): CharacterRecord {
  const next: CharacterRecord = { ...record };

  let resources: ResourcePool[] = (next.resources ?? []).map((pool) =>
    LEGACY_ITEM_POOL_IDS.has(pool.id) && !pool.kind
      ? { ...pool, kind: "item" as const }
      : pool
  );

  const panache = next.panache;
  const hasPanachePool = resources.some((r) => r.id === "panache");
  if (panache && (panache.max > 0 || panache.current > 0) && !hasPanachePool) {
    const isSwashbuckler = (next.classes ?? []).some(
      (c) => c.className.toLowerCase().includes("swashbuckler") && c.level > 0
    );
    resources = [
      {
        id: "panache",
        name: "Panache",
        current: panache.current ?? 0,
        max: panache.max ?? 0,
        footer: "points",
        // matches the Swashbuckler classResource def (Cha mod, min 1)
        ...(isSwashbuckler
          ? { formula: { source: "abilityMod" as const, ability: "cha" as const, minimum: 1 } }
          : {}),
      },
      // panache rendered first in the legacy crease; keep that order
      ...resources,
    ];
  }
  delete next.panache;

  return { ...next, resources };
}

/**
 * v5: spellSlotsL* resource pools move into the spellbook. Characters
 * without one get a slot-only book (castingClass "" → table contributes
 * nothing; slotOverrides carry the maxima). Characters WITH a spellbook
 * never had these pools rendered — their `current` is folded into any
 * uninitialized level remaining, computed maxima stay authoritative.
 */
function migrateToV5(raw: Partial<MiniSheetData>): Partial<MiniSheetData> {
  if (!raw.characters) return raw;
  return { ...raw, characters: raw.characters.map(migrateCharacterToV5) };
}

const SPELL_SLOT_POOL = /^spellSlotsL(\d)$/;

function migrateCharacterToV5(record: CharacterRecord): CharacterRecord {
  const slotPools = (record.resources ?? []).filter((r) => SPELL_SLOT_POOL.test(r.id));
  if (slotPools.length === 0) return record;

  const resources = record.resources.filter((r) => !SPELL_SLOT_POOL.test(r.id));
  const slots = slotPools.map((pool) => ({
    level: Number(SPELL_SLOT_POOL.exec(pool.id)![1]) as SpellLevel,
    current: pool.current,
    max: pool.max,
  }));

  if (!record.spellbook) {
    return { ...record, resources, spellbook: createSlotOnlySpellbook(slots) };
  }

  const spellbook = structuredClone(record.spellbook);
  for (const { level, current } of slots) {
    const key = getSpellLevelKey(level);
    if (spellbook.levels[key] && spellbook.levels[key].remaining == null) {
      spellbook.levels[key].remaining = current;
    }
  }
  return { ...record, resources, spellbook };
}
