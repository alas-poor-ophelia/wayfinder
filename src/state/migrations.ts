/**
 * Load-time data.json migrations. store.load() runs migrateData() on the
 * raw loaded object BEFORE the schema-forward merge (which stamps the
 * current schemaVersion over whatever was loaded — so the version must be
 * read here, first). Every step is idempotent: re-running on already-
 * migrated data is a no-op.
 */

import { seedQuickActionsFromToggles } from "../data/quick-actions";
import { defaultToggles, type CharacterRecord, type ResourcePool } from "../types/character";
import type { QuickActionEffect } from "../types/quick-actions";
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
  if (version < 6) data = migrateToV6(data);
  if (version < 7) data = migrateToV7(data);
  // (v8 was schema-forward only: ClassEntry.archetypeKeys, no code.)
  if (version < 9) data = migrateToV9(data);
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

/**
 * v6: CombatToggles (minus rangedAttackStyle) become editable Quick Actions.
 * The default catalog is seeded per character with the active toggle values
 * mapped into quickActionState, then the deprecated toggle fields are zeroed
 * so stale values can't confuse anything downstream.
 */
function migrateToV6(raw: Partial<MiniSheetData>): Partial<MiniSheetData> {
  if (!raw.characters) return raw;
  return { ...raw, characters: raw.characters.map(migrateCharacterToV6) };
}

function migrateCharacterToV6(record: CharacterRecord): CharacterRecord {
  // idempotency: a record that already owns quick actions is left alone
  if (record.quickActions) return record;
  const seeded = seedQuickActionsFromToggles(record.toggles ?? {});
  return {
    ...record,
    quickActions: seeded.quickActions,
    quickActionState: seeded.quickActionState,
    toggles: {
      ...defaultToggles(),
      rangedAttackStyle:
        record.toggles?.rangedAttackStyle ?? defaultToggles().rangedAttackStyle,
    },
  };
}

/**
 * v7: Weapon Song "Enhancement" becomes a true enhancement bonus (RAW FIX —
 * v6 briefly shipped it as untyped, stacking with weapon enhancement).
 * Repairs ONLY variants that still carry the exact v6 shape, so user-edited
 * defs are never touched.
 */
const V6_SONG_ENHANCEMENT_EFFECTS = JSON.stringify([
  { kind: "modifier", target: "attack.melee", type: "untyped", value: 1 },
  { kind: "modifier", target: "attack.ranged", type: "untyped", value: 1 },
  { kind: "modifier", target: "damage.melee", type: "untyped", value: 1 },
  { kind: "modifier", target: "damage.ranged", type: "untyped", value: 1 },
]);

function migrateToV7(raw: Partial<MiniSheetData>): Partial<MiniSheetData> {
  if (!raw.characters) return raw;
  return { ...raw, characters: raw.characters.map(migrateCharacterToV7) };
}

function migrateCharacterToV7(record: CharacterRecord): CharacterRecord {
  if (!record.quickActions) return record;
  const quickActions = record.quickActions.map((def) => {
    if (!def.variants) return def;
    const variants = def.variants.map((variant) =>
      variant.id === "enhancement" &&
      JSON.stringify(variant.effects) === V6_SONG_ENHANCEMENT_EFFECTS
        ? {
            ...variant,
            effects: [
              { kind: "modifier", target: "attack.melee", type: "enhancement", value: 1 },
              { kind: "modifier", target: "attack.ranged", type: "enhancement", value: 1 },
            ] satisfies QuickActionEffect[],
          }
        : variant
    );
    return { ...def, variants };
  });
  return { ...record, quickActions };
}

/**
 * v9: the monk AC bonus moved behind the Scaled Fist archetype (calc/ac.ts
 * granted CHA-to-AC to every monk unconditionally before — the sheet's only
 * monk WAS a scaled fist). Stamp the archetype onto leveled monk entries
 * that don't already declare archetypes, so existing characters keep the
 * exact AC they had; entries with archetypeKeys are user-curated and never
 * touched. Same inference the legacy importer applies.
 */
function migrateToV9(raw: Partial<MiniSheetData>): Partial<MiniSheetData> {
  if (!raw.characters) return raw;
  return { ...raw, characters: raw.characters.map(migrateCharacterToV9) };
}

function migrateCharacterToV9(record: CharacterRecord): CharacterRecord {
  if (!record.classes?.length) return record;
  const classes = record.classes.map((entry) =>
    /\bmonk\b/i.test(entry.className) && entry.level > 0 && !entry.archetypeKeys
      ? { ...entry, archetypeKeys: ["scaled-fist"] }
      : entry
  );
  return { ...record, classes };
}
