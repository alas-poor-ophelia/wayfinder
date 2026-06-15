/**
 * Spellbook mutations — the typed vocabulary shared by the spells tab,
 * the spell database view, and the MCP bridge. Each function translates
 * one legacy Meta Bind button action into a store mutation.
 *
 * Deliberate divergence from legacy (user-approved): casting the last
 * slot/use stores 0. Legacy wrote null, which its renderers displayed as
 * a refilled tracker.
 */

import {
  getArcanistCasts,
  getCasterConfig,
  getSpellSlots,
  isValidCasterClass,
  resolveCasterLevel,
  totalMetamagicAdjustment,
} from "../calc/spells";
import type { AbilityKey, CharacterRecord } from "../types/character";
import type {
  KnownSpell,
  Loadout,
  LoadoutSpell,
  SpellLevel,
  SpellPreparation,
} from "../types/spellbook";
import { getSpellLevelKey, newLoadoutId } from "../types/spellbook";
import type { MiniSheetStore } from "./store";

function requireSpellbook(character: CharacterRecord) {
  if (!character.spellbook) {
    throw new Error(`Character "${character.id}" has no spellbook`);
  }
  return character.spellbook;
}

/** Max slots for a level the way the legacy tab computed them (the
 *  spellbook's own stat bonus comes from computeAll; callers pass it). */
export function maxSlotsFor(
  character: CharacterRecord,
  level: SpellLevel,
  castingStatBonus: number,
): number {
  const sb = requireSpellbook(character);
  // manual override (schema v5) replaces the computed table max
  const override = sb.slotOverrides?.[getSpellLevelKey(level)];
  if (override !== undefined) return override;
  if (!isValidCasterClass(sb.castingClass)) return 0;
  const casterLevel = Math.min(
    Math.max(resolveCasterLevel(sb, character.classes), 1),
    20,
  );
  // legacy arcanist workaround: preparation slots ignore the stat bonus
  const statMod = sb.castingClass === "arcanist" ? 0 : castingStatBonus;
  return getSpellSlots(sb.castingClass, casterLevel, level, statMod);
}

/** Spontaneous cast: decrement the level's remaining pool (floor 0). */
export function castSpontaneous(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
  castingStatBonus: number,
): void {
  const sb = requireSpellbook(character);
  const key = getSpellLevelKey(level);
  const stored = sb.levels[key]?.remaining;
  const current = stored ?? maxSlotsFor(character, level, castingStatBonus);
  store.setCharacterField(
    character.id,
    `spellbook.levels.${key}.remaining`,
    Math.max(0, current - 1),
  );
}

export function setLevelRemaining(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
  value: number,
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    `spellbook.levels.${getSpellLevelKey(level)}.remaining`,
    Math.max(0, value),
  );
}

/** SLA cast: decrement castsRemaining (floor 0; at-will SLAs are no-ops). */
export function castSla(
  store: MiniSheetStore,
  character: CharacterRecord,
  slaIndex: number,
): void {
  const sb = requireSpellbook(character);
  const entry = sb.slas[slaIndex];
  if (!entry || entry.casts === 0) return;
  store.setCharacterField(
    character.id,
    `spellbook.slas.${slaIndex}.castsRemaining`,
    Math.max(0, entry.castsRemaining - 1),
  );
}

export function setSlaRemaining(
  store: MiniSheetStore,
  character: CharacterRecord,
  slaIndex: number,
  value: number,
): void {
  const sb = requireSpellbook(character);
  const entry = sb.slas[slaIndex];
  if (!entry) return;
  store.setCharacterField(
    character.id,
    `spellbook.slas.${slaIndex}.castsRemaining`,
    Math.min(Math.max(0, value), entry.casts),
  );
}

export function setGlobalMetamagicSelected(
  store: MiniSheetStore,
  character: CharacterRecord,
  value: string,
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    "spellbook.globalMetamagic.selected",
    value,
  );
}

/** Legacy "+" button: append the selected metamagic if new and non-empty. */
export function addGlobalMetamagic(
  store: MiniSheetStore,
  character: CharacterRecord,
): void {
  const sb = requireSpellbook(character);
  const selected = sb.globalMetamagic.selected;
  if (!selected || sb.globalMetamagic.active.includes(selected)) return;
  store.setCharacterField(character.id, "spellbook.globalMetamagic.active", [
    ...sb.globalMetamagic.active,
    selected,
  ]);
}

export function removeGlobalMetamagic(
  store: MiniSheetStore,
  character: CharacterRecord,
  index: number,
): void {
  const sb = requireSpellbook(character);
  store.setCharacterField(
    character.id,
    "spellbook.globalMetamagic.active",
    sb.globalMetamagic.active.filter((_, i) => i !== index),
  );
}

/**
 * Legacy calloutStates key scheme: spaces → underscores, strip everything
 * non-alphanumeric, then `_${context}`. ("Spell-Like Abilities" →
 * "SpellLike_Abilities", "Level 1" + "known" → "Level_1_known".)
 */
export function sectionKey(title: string, context = ""): string {
  const base = title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  return context ? `${base}_${context}` : base;
}

export function setSectionCollapsed(
  store: MiniSheetStore,
  character: CharacterRecord,
  key: string,
  collapsed: boolean,
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    `spellbook.sectionCollapsed.${key}`,
    collapsed,
  );
}

function clampLevel(level: number): SpellLevel {
  return Math.min(Math.max(level, 0), 9) as SpellLevel;
}

/** Hybrid max casts (arcanist second pool) — casts DO use the stat bonus. */
export function maxCastsFor(
  character: CharacterRecord,
  level: SpellLevel,
  castingStatBonus: number,
): number {
  const sb = requireSpellbook(character);
  if (!isValidCasterClass(sb.castingClass)) return 0;
  const casterLevel = Math.min(
    Math.max(resolveCasterLevel(sb, character.classes), 1),
    20,
  );
  return getArcanistCasts(
    sb.castingClass,
    casterLevel,
    level,
    castingStatBonus,
  );
}

/**
 * Prepare a known spell (prepared + hybrid paradigms). Port of the legacy
 * prepare buttons:
 * - prepared: same (spellId, adjustedLevel, sorted metamagic) increments
 *   count, else a new entry is appended; a preparation slot at the adjusted
 *   level is consumed immediately (slots are spent by PREPARING).
 * - hybrid: entries are unique per (spellId, sorted metamagic) — no count
 *   increment; the slot is consumed at the FINAL level (adjusted + any
 *   global metamagics not already on the preparation).
 */
export function prepareSpell(
  store: MiniSheetStore,
  character: CharacterRecord,
  spellId: string,
  castingStatBonus: number,
): void {
  const sb = requireSpellbook(character);
  const spell = sb.spells.find((s) => s.id === spellId);
  if (!spell) throw new Error(`No spell with id "${spellId}" in spellbook`);
  const paradigm = getCasterConfig(sb.castingClass).type;
  const levelMetamagics =
    sb.levels[getSpellLevelKey(spell.baseLevel)]?.activeMetamagics ?? [];
  const adjustedLevel = clampLevel(
    spell.baseLevel + totalMetamagicAdjustment(levelMetamagics),
  );
  const storageKey = getSpellLevelKey(adjustedLevel);
  const preps = sb.preparations[storageKey] ?? [];
  const sortedMeta = JSON.stringify([...levelMetamagics].sort());

  let nextPreps: SpellPreparation[];
  let slotLevel = adjustedLevel;
  if (paradigm === "hybrid") {
    const exists = preps.some(
      (p) =>
        p.spellId === spellId &&
        JSON.stringify([...p.metamagic].sort()) === sortedMeta,
    );
    if (exists) return; // hybrid preparations are unique
    nextPreps = [
      ...preps,
      { spellId, adjustedLevel, metamagic: levelMetamagics, count: 1 },
    ];
    const nonDupGlobals = sb.globalMetamagic.active.filter(
      (g) => !levelMetamagics.includes(g),
    );
    slotLevel = clampLevel(
      adjustedLevel + totalMetamagicAdjustment(nonDupGlobals),
    );
  } else {
    const idx = preps.findIndex(
      (p) =>
        p.spellId === spellId &&
        p.adjustedLevel === adjustedLevel &&
        JSON.stringify([...p.metamagic].sort()) === sortedMeta,
    );
    if (idx >= 0) {
      nextPreps = [...preps];
      nextPreps[idx] = { ...nextPreps[idx], count: nextPreps[idx].count + 1 };
    } else {
      nextPreps = [
        ...preps,
        { spellId, adjustedLevel, metamagic: levelMetamagics, count: 1 },
      ];
    }
  }

  const next = structuredClone(sb);
  next.preparations[storageKey] = nextPreps;
  const slotKey = getSpellLevelKey(slotLevel);
  const stored = next.levels[slotKey]?.remaining;
  const current = stored ?? maxSlotsFor(character, slotLevel, castingStatBonus);
  if (next.levels[slotKey]) {
    next.levels[slotKey].remaining = Math.max(0, current - 1);
  }
  store.setCharacterField(character.id, "spellbook", next);
}

/**
 * Cast a prepared spell.
 * - prepared: decrement the preparation's count (entry removed at 0); the
 *   slot was already consumed at prepare time.
 * - hybrid: decrement the level's casts pool (floor 0); the preparation
 *   stays. Cantrips (display level 0) are no-ops, like legacy.
 */
export function castPrepared(
  store: MiniSheetStore,
  character: CharacterRecord,
  storageLevel: SpellLevel,
  prepIndex: number,
  castingStatBonus: number,
): void {
  const sb = requireSpellbook(character);
  const paradigm = getCasterConfig(sb.castingClass).type;
  const storageKey = getSpellLevelKey(storageLevel);
  const preps = sb.preparations[storageKey] ?? [];
  const prep = preps[prepIndex];
  if (!prep) return;

  if (paradigm === "hybrid") {
    const nonDupGlobals = sb.globalMetamagic.active.filter(
      (g) => !prep.metamagic.includes(g),
    );
    const displayLevel = clampLevel(
      storageLevel + totalMetamagicAdjustment(nonDupGlobals),
    );
    if (displayLevel === 0) return; // legacy: cantrip cast is a no-op
    const key = getSpellLevelKey(displayLevel);
    const stored = sb.levels[key]?.castsRemaining;
    const current =
      stored === null || stored === undefined
        ? maxCastsFor(character, displayLevel, castingStatBonus)
        : stored;
    store.setCharacterField(
      character.id,
      `spellbook.levels.${key}.castsRemaining`,
      Math.max(0, current - 1),
    );
    return;
  }

  const nextPreps = [...preps];
  if (prep.count <= 1) {
    nextPreps.splice(prepIndex, 1);
  } else {
    nextPreps[prepIndex] = { ...prep, count: prep.count - 1 };
  }
  store.setCharacterField(
    character.id,
    `spellbook.preparations.${storageKey}`,
    nextPreps,
  );
}

/** Remove an entire preparation entry (legacy: no slot refund). */
export function removePreparation(
  store: MiniSheetStore,
  character: CharacterRecord,
  storageLevel: SpellLevel,
  prepIndex: number,
): void {
  const sb = requireSpellbook(character);
  const storageKey = getSpellLevelKey(storageLevel);
  const preps = [...(sb.preparations[storageKey] ?? [])];
  if (prepIndex < 0 || prepIndex >= preps.length) return;
  preps.splice(prepIndex, 1);
  store.setCharacterField(
    character.id,
    `spellbook.preparations.${storageKey}`,
    preps,
  );
}

export function setCastsRemaining(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
  value: number,
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    `spellbook.levels.${getSpellLevelKey(level)}.castsRemaining`,
    Math.max(0, value),
  );
}

// ---- per-level metamagic (prepared/hybrid known sections) ----

export function setLevelMetamagicSelected(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
  value: string,
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    `spellbook.levels.${getSpellLevelKey(level)}.selectedMetamagic`,
    value,
  );
}

export function addLevelMetamagic(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
): void {
  const sb = requireSpellbook(character);
  const state = sb.levels[getSpellLevelKey(level)];
  if (!state) return;
  const selected = state.selectedMetamagic;
  if (!selected || state.activeMetamagics.includes(selected)) return;
  store.setCharacterField(
    character.id,
    `spellbook.levels.${getSpellLevelKey(level)}.activeMetamagics`,
    [...state.activeMetamagics, selected],
  );
}

export function removeLevelMetamagic(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
  index: number,
): void {
  const sb = requireSpellbook(character);
  const state = sb.levels[getSpellLevelKey(level)];
  if (!state) return;
  store.setCharacterField(
    character.id,
    `spellbook.levels.${getSpellLevelKey(level)}.activeMetamagics`,
    state.activeMetamagics.filter((_, i) => i !== index),
  );
}

/** Toggle ownership of a metamagic feat (spellbook config UI). */
export function toggleMetamagicFeat(
  store: MiniSheetStore,
  character: CharacterRecord,
  feat: string,
): void {
  const sb = requireSpellbook(character);
  const feats = sb.metamagicFeats ?? [];
  store.setCharacterField(
    character.id,
    "spellbook.metamagicFeats",
    feats.includes(feat) ? feats.filter((f) => f !== feat) : [...feats, feat],
  );
}

// ---- spellbook config (gear flyout) ----

export function setCastingClass(
  store: MiniSheetStore,
  character: CharacterRecord,
  castingClass: string,
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    "spellbook.castingClass",
    castingClass.toLowerCase(),
  );
}

export function setCastingStat(
  store: MiniSheetStore,
  character: CharacterRecord,
  stat: AbilityKey,
): void {
  requireSpellbook(character);
  store.setCharacterField(character.id, "spellbook.castingStat", stat);
}

export function setCasterLevelOverride(
  store: MiniSheetStore,
  character: CharacterRecord,
  value: number | undefined,
): void {
  requireSpellbook(character);
  store.setCharacterField(character.id, "spellbook.casterLevelOverride", value);
}

export interface ResetFlags {
  resetMetamagics?: boolean;
  resetPreparations?: boolean;
  resetSLAs?: boolean;
}

/**
 * Legacy resetAllPreparationCounts: every level's remaining (and, for
 * hybrid, casts remaining) back to max — legacy wrote null when max was 0,
 * kept here as "untracked". Optional flags clear metamagics (global +
 * per-level), preparations, and refill SLA uses.
 *
 * Deliberate divergence: the legacy prepared renderer's resetPreparations
 * wrote vestigial `spells[].preparations` fields and never actually cleared
 * spellPreparations (a bug); we clear the preparation lists, matching the
 * hybrid renderer's correct behavior.
 */
export function resetSpellbook(
  store: MiniSheetStore,
  character: CharacterRecord,
  castingStatBonus: number,
  flags: ResetFlags = {},
): void {
  const sb = requireSpellbook(character);
  const paradigm = getCasterConfig(sb.castingClass).type;
  const next = structuredClone(sb);
  for (let level = 0 as SpellLevel; level <= 9; level++) {
    const key = getSpellLevelKey(level);
    if (!next.levels[key]) continue;
    const max = maxSlotsFor(character, level as SpellLevel, castingStatBonus);
    next.levels[key].remaining = max > 0 ? max : null;
    if (paradigm === "hybrid") {
      const maxCasts = maxCastsFor(
        character,
        level as SpellLevel,
        castingStatBonus,
      );
      next.levels[key].castsRemaining = maxCasts > 0 ? maxCasts : null;
    }
    if (flags.resetMetamagics) {
      next.levels[key].activeMetamagics = [];
    }
  }
  if (flags.resetMetamagics) {
    next.globalMetamagic.active = [];
  }
  if (flags.resetPreparations) {
    for (let level = 0; level <= 9; level++) {
      next.preparations[getSpellLevelKey(level)] = [];
    }
  }
  if (flags.resetSLAs ?? true) {
    next.slas = next.slas.map((sla) =>
      sla.casts > 0 ? { ...sla, castsRemaining: sla.casts } : sla,
    );
  }
  store.setCharacterField(character.id, "spellbook", next);
}

/** Add a known spell (spell database flow); dedupes on id. */
export function addKnownSpell(
  store: MiniSheetStore,
  character: CharacterRecord,
  spell: KnownSpell,
): void {
  const sb = requireSpellbook(character);
  if (sb.spells.some((s) => s.id === spell.id)) return;
  store.setCharacterField(character.id, "spellbook.spells", [
    ...sb.spells,
    spell,
  ]);
}

/** Remove every variant of a database spell (matches originalId ?? id). */
export function removeKnownSpell(
  store: MiniSheetStore,
  character: CharacterRecord,
  dbId: string,
): void {
  const sb = requireSpellbook(character);
  store.setCharacterField(
    character.id,
    "spellbook.spells",
    sb.spells.filter((s) => (s.originalId ?? s.id) !== dbId),
  );
}

// ===========================================================================
// Loadouts (schema v14) — named preparation sets a prepared/hybrid caster
// swaps between. Mutations write the whole `spellbook` (structuredClone) so
// the optional `loadouts` key is created cleanly on books that predate v14.
// ===========================================================================

export function getLoadouts(character: CharacterRecord): Loadout[] {
  return character.spellbook?.loadouts ?? [];
}

/** dedupe key for a loadout entry: same spell + level + metamagic set. */
function loadoutEntryKey(s: LoadoutSpell): string {
  return JSON.stringify([s.spellId, s.level, [...s.metamagic].sort()]);
}

export function createLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  partial: Partial<Omit<Loadout, "id">> = {},
): string {
  const sb = requireSpellbook(character);
  const id = newLoadoutId();
  const loadout: Loadout = {
    name: "New Loadout",
    icon: "ra-crystals",
    color: "#ca9759",
    desc: "",
    spells: [],
    ...partial,
    id,
  };
  const next = structuredClone(sb);
  next.loadouts = [...(next.loadouts ?? []), loadout];
  store.setCharacterField(character.id, "spellbook", next);
  return id;
}

export function updateLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
  patch: Partial<Omit<Loadout, "id" | "spells">>,
): void {
  const sb = requireSpellbook(character);
  const next = structuredClone(sb);
  next.loadouts = (next.loadouts ?? []).map((l) =>
    l.id === id ? { ...l, ...patch } : l,
  );
  store.setCharacterField(character.id, "spellbook", next);
}

export function duplicateLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): string | null {
  const sb = requireSpellbook(character);
  const src = (sb.loadouts ?? []).find((l) => l.id === id);
  if (!src) return null;
  const newId = newLoadoutId();
  const copy: Loadout = {
    ...structuredClone(src),
    id: newId,
    name: `${src.name} (copy)`,
  };
  const next = structuredClone(sb);
  next.loadouts = [...(next.loadouts ?? []), copy];
  store.setCharacterField(character.id, "spellbook", next);
  return newId;
}

export function deleteLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  id: string,
): void {
  const sb = requireSpellbook(character);
  const next = structuredClone(sb);
  next.loadouts = (next.loadouts ?? []).filter((l) => l.id !== id);
  if (next.appliedLoadoutId === id) next.appliedLoadoutId = undefined;
  store.setCharacterField(character.id, "spellbook", next);
}

/** Add (or increment) a prepared-spell entry on a loadout. */
export function addSpellToLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  loadoutId: string,
  entry: LoadoutSpell,
): void {
  const sb = requireSpellbook(character);
  const next = structuredClone(sb);
  next.loadouts = (next.loadouts ?? []).map((l) => {
    if (l.id !== loadoutId) return l;
    const key = loadoutEntryKey(entry);
    const idx = l.spells.findIndex((s) => loadoutEntryKey(s) === key);
    if (idx >= 0) {
      const spells = [...l.spells];
      spells[idx] = { ...spells[idx], count: spells[idx].count + entry.count };
      return { ...l, spells };
    }
    return { ...l, spells: [...l.spells, entry] };
  });
  store.setCharacterField(character.id, "spellbook", next);
}

export function removeLoadoutSpell(
  store: MiniSheetStore,
  character: CharacterRecord,
  loadoutId: string,
  index: number,
): void {
  const sb = requireSpellbook(character);
  const next = structuredClone(sb);
  next.loadouts = (next.loadouts ?? []).map((l) =>
    l.id === loadoutId
      ? { ...l, spells: l.spells.filter((_, i) => i !== index) }
      : l,
  );
  store.setCharacterField(character.id, "spellbook", next);
}

/** Bump a loadout entry's prepared count by delta (clamped to >= 1). */
export function setLoadoutSpellCount(
  store: MiniSheetStore,
  character: CharacterRecord,
  loadoutId: string,
  index: number,
  delta: number,
): void {
  const sb = requireSpellbook(character);
  const next = structuredClone(sb);
  next.loadouts = (next.loadouts ?? []).map((l) => {
    if (l.id !== loadoutId) return l;
    const spells = l.spells.map((s, i) =>
      i === index ? { ...s, count: Math.max(1, s.count + delta) } : s,
    );
    return { ...l, spells };
  });
  store.setCharacterField(character.id, "spellbook", next);
}

/** Snapshot the character's current preparations into a new loadout. */
export function snapshotCurrentPrep(
  store: MiniSheetStore,
  character: CharacterRecord,
  name: string,
): string | null {
  const sb = requireSpellbook(character);
  const spells: LoadoutSpell[] = [];
  for (const preps of Object.values(sb.preparations)) {
    for (const p of preps) {
      spells.push({
        spellId: p.spellId,
        level: p.adjustedLevel,
        metamagic: [...p.metamagic],
        count: p.count,
      });
    }
  }
  if (spells.length === 0) return null;
  return createLoadout(store, character, {
    name,
    icon: "ra-scroll-unfurled",
    spells,
  });
}

/**
 * Apply a loadout: replace the character's preparations with the loadout's
 * set, reset every level pool to max, then replay prepare-time slot
 * consumption (prepared: at the entry level; hybrid: at the entry level plus
 * any global metamagics not already on the entry — mirrors prepareSpell).
 * Sets appliedLoadoutId. Caller gates this behind a confirm dialog.
 */
export function applyLoadout(
  store: MiniSheetStore,
  character: CharacterRecord,
  loadoutId: string,
  castingStatBonus: number,
): void {
  const sb = requireSpellbook(character);
  const loadout = (sb.loadouts ?? []).find((l) => l.id === loadoutId);
  if (!loadout) return;
  const paradigm = getCasterConfig(sb.castingClass).type;
  const next = structuredClone(sb);

  // 1. reset all level pools to max
  for (
    let level = 0 as SpellLevel;
    level <= 9;
    level = (level + 1) as SpellLevel
  ) {
    const key = getSpellLevelKey(level);
    if (!next.levels[key]) continue;
    const max = maxSlotsFor(character, level, castingStatBonus);
    next.levels[key].remaining = max > 0 ? max : null;
    if (paradigm === "hybrid") {
      const maxCasts = maxCastsFor(character, level, castingStatBonus);
      next.levels[key].castsRemaining = maxCasts > 0 ? maxCasts : null;
    }
  }

  // 2. rebuild preparations from the loadout
  for (let level = 0; level <= 9; level++) {
    next.preparations[getSpellLevelKey(level as SpellLevel)] = [];
  }
  for (const entry of loadout.spells) {
    const key = getSpellLevelKey(entry.level);
    (next.preparations[key] ??= []).push({
      spellId: entry.spellId,
      adjustedLevel: entry.level,
      metamagic: [...entry.metamagic],
      count: entry.count,
    });
  }

  // 3. replay prepare-time slot consumption
  for (const entry of loadout.spells) {
    let slotLevel: SpellLevel = entry.level;
    if (paradigm === "hybrid") {
      const nonDupGlobals = next.globalMetamagic.active.filter(
        (g) => !entry.metamagic.includes(g),
      );
      slotLevel = clampLevel(
        entry.level + totalMetamagicAdjustment(nonDupGlobals),
      );
    }
    const lvl = next.levels[getSpellLevelKey(slotLevel)];
    if (lvl && lvl.remaining != null) {
      lvl.remaining = Math.max(0, lvl.remaining - entry.count);
    }
  }

  next.appliedLoadoutId = loadoutId;
  store.setCharacterField(character.id, "spellbook", next);
}
