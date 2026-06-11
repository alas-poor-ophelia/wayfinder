/**
 * Spellbook mutations — the typed vocabulary shared by the spells tab,
 * the spell database view, and the MCP bridge. Each function translates
 * one legacy Meta Bind button action into a store mutation.
 *
 * Deliberate divergence from legacy (user-approved): casting the last
 * slot/use stores 0. Legacy wrote null, which its renderers displayed as
 * a refilled tracker.
 */

import { getSpellSlots, isValidCasterClass, resolveCasterLevel } from "../calc/spells";
import type { CharacterRecord } from "../types/character";
import type { KnownSpell, SpellLevel } from "../types/spellbook";
import { getSpellLevelKey } from "../types/spellbook";
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
  castingStatBonus: number
): number {
  const sb = requireSpellbook(character);
  if (!isValidCasterClass(sb.castingClass)) return 0;
  const casterLevel = Math.min(
    Math.max(resolveCasterLevel(sb, character.classes), 1),
    20
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
  castingStatBonus: number
): void {
  const sb = requireSpellbook(character);
  const key = getSpellLevelKey(level);
  const stored = sb.levels[key]?.remaining;
  const current = stored ?? maxSlotsFor(character, level, castingStatBonus);
  store.setCharacterField(
    character.id,
    `spellbook.levels.${key}.remaining`,
    Math.max(0, current - 1)
  );
}

export function setLevelRemaining(
  store: MiniSheetStore,
  character: CharacterRecord,
  level: SpellLevel,
  value: number
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    `spellbook.levels.${getSpellLevelKey(level)}.remaining`,
    Math.max(0, value)
  );
}

/** SLA cast: decrement castsRemaining (floor 0; at-will SLAs are no-ops). */
export function castSla(
  store: MiniSheetStore,
  character: CharacterRecord,
  slaIndex: number
): void {
  const sb = requireSpellbook(character);
  const entry = sb.slas[slaIndex];
  if (!entry || entry.casts === 0) return;
  store.setCharacterField(
    character.id,
    `spellbook.slas.${slaIndex}.castsRemaining`,
    Math.max(0, entry.castsRemaining - 1)
  );
}

export function setSlaRemaining(
  store: MiniSheetStore,
  character: CharacterRecord,
  slaIndex: number,
  value: number
): void {
  const sb = requireSpellbook(character);
  const entry = sb.slas[slaIndex];
  if (!entry) return;
  store.setCharacterField(
    character.id,
    `spellbook.slas.${slaIndex}.castsRemaining`,
    Math.min(Math.max(0, value), entry.casts)
  );
}

export function setGlobalMetamagicSelected(
  store: MiniSheetStore,
  character: CharacterRecord,
  value: string
): void {
  requireSpellbook(character);
  store.setCharacterField(character.id, "spellbook.globalMetamagic.selected", value);
}

/** Legacy "+" button: append the selected metamagic if new and non-empty. */
export function addGlobalMetamagic(
  store: MiniSheetStore,
  character: CharacterRecord
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
  index: number
): void {
  const sb = requireSpellbook(character);
  store.setCharacterField(
    character.id,
    "spellbook.globalMetamagic.active",
    sb.globalMetamagic.active.filter((_, i) => i !== index)
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
  collapsed: boolean
): void {
  requireSpellbook(character);
  store.setCharacterField(
    character.id,
    `spellbook.sectionCollapsed.${key}`,
    collapsed
  );
}

export interface ResetFlags {
  resetMetamagics?: boolean;
  resetPreparations?: boolean;
  resetSLAs?: boolean;
}

/**
 * Legacy resetAllPreparationCounts for spontaneous casters: every level's
 * remaining back to max (legacy wrote null when max was 0 — we keep null
 * there too, meaning "untracked"), optionally clear global metamagics and
 * refill SLA uses. Prepared/hybrid extensions land with that milestone.
 */
export function resetSpellbook(
  store: MiniSheetStore,
  character: CharacterRecord,
  castingStatBonus: number,
  flags: ResetFlags = {}
): void {
  const sb = requireSpellbook(character);
  const next = structuredClone(sb);
  for (let level = 0 as SpellLevel; level <= 9; level++) {
    const max = maxSlotsFor(character, level as SpellLevel, castingStatBonus);
    const key = getSpellLevelKey(level);
    if (!next.levels[key]) continue;
    next.levels[key].remaining = max > 0 ? max : null;
  }
  if (flags.resetMetamagics) {
    next.globalMetamagic.active = [];
  }
  if (flags.resetSLAs ?? true) {
    next.slas = next.slas.map((sla) =>
      sla.casts > 0 ? { ...sla, castsRemaining: sla.casts } : sla
    );
  }
  store.setCharacterField(character.id, "spellbook", next);
}

/** Add a known spell (spell database flow); dedupes on id. */
export function addKnownSpell(
  store: MiniSheetStore,
  character: CharacterRecord,
  spell: KnownSpell
): void {
  const sb = requireSpellbook(character);
  if (sb.spells.some((s) => s.id === spell.id)) return;
  store.setCharacterField(character.id, "spellbook.spells", [...sb.spells, spell]);
}

/** Remove every variant of a database spell (matches originalId ?? id). */
export function removeKnownSpell(
  store: MiniSheetStore,
  character: CharacterRecord,
  dbId: string
): void {
  const sb = requireSpellbook(character);
  store.setCharacterField(
    character.id,
    "spellbook.spells",
    sb.spells.filter((s) => (s.originalId ?? s.id) !== dbId)
  );
}
