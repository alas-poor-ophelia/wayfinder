/**
 * Spellbook state schema — ported from the legacy spellbook note frontmatter
 * (z_Components/spellbooks/*SpellBook.md). Derived values (slot maxima, DCs,
 * adjusted levels, ranges) are NEVER stored; src/calc/spells.ts computes them.
 */

import type { AbilityKey } from "./character";

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const SPELL_LEVELS: SpellLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A spell on the character (the legacy `spells[]` array, 1:1). Display fields
 * are a denormalized snapshot taken at add-time (legacy behavior) so the row
 * renders even if the vault note moves or changes; the SpellIndex re-links by
 * name for the note link.
 */
export interface KnownSpell {
  /**
   * Legacy ids are mixed: hand-entered numeric ids (stringified here),
   * database ids ("PFRPGC_436"), and composite ids minted when a multi-level
   * spell is added at a chosen level ("APG_240_L0_bardmesmerist").
   */
  id: string;
  /** database id when `id` is composite */
  originalId?: string;
  name: string;
  baseLevel: SpellLevel;
  /** legacy keeps known:false rows in the array (SLA sources reference them) */
  known: boolean;
  range: string;
  castingTime: string;
  components: string;
  saveType: string;
  /** legacy mixes booleans and strings like "yes (harmless)" — kept raw */
  sr: boolean | string;
  duration?: string;
  school?: string;
  source?: string;
  /** present on composite-level adds from the spell database */
  classes?: string[];
}

export interface SpellLevelState {
  /**
   * Remaining casts/slots today. null = never initialized (renders as max).
   * Deliberate divergence from legacy: casting the last slot stores 0 here;
   * legacy wrote null, which its renderers displayed as a full tracker.
   */
  remaining: number | null;
  /** hybrid (arcanist) second pool — legacy totalCastsRemaining */
  castsRemaining?: number | null;
  /** the metamagic dropdown's current pick (persisted UI state) */
  selectedMetamagic: string;
  /** per-level active metamagic (prepared/hybrid paradigms) */
  activeMetamagics: string[];
}

export interface SpellPreparation {
  spellId: string;
  /** base level + metamagic adjustment, captured at prepare time */
  adjustedLevel: SpellLevel;
  metamagic: string[];
  count: number;
}

export interface SlaEntry {
  /** references KnownSpell.id */
  spellId: string;
  /** uses per day; 0 = At Will */
  casts: number;
  castsRemaining: number;
}

/**
 * One entry in a Loadout — a SpellPreparation snapshot. `spellId` references a
 * KnownSpell.id in the same spellbook; `level` is the level it is prepared at
 * (the adjustedLevel). Display name/school are resolved at render from the
 * spellbook's KnownSpell (or the spell index), never stored.
 */
export interface LoadoutSpell {
  spellId: string;
  level: SpellLevel;
  metamagic: string[];
  count: number;
}

/**
 * A named preparation set a prepared/hybrid caster swaps between (schema v14).
 * Re-adds the legacy vault-YAML "loadouts" feature into the plugin data model;
 * `icon` is an Icon-registry id, `color` a hex from the loadout palette.
 */
export interface Loadout {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  spells: LoadoutSpell[];
}

export function newLoadoutId(): string {
  let suffix = "";
  while (suffix.length < 9) {
    suffix += Math.random().toString(36).slice(2);
  }
  return `lo_${suffix.slice(0, 9)}`;
}

export interface SpellbookState {
  /** key into CASTER_CONFIGS, e.g. "skald" */
  castingClass: string;
  castingStat: AbilityKey;
  /**
   * Optional override; default = summed level of class entries matching
   * castingClass. Import sets this only when the legacy stored value
   * disagrees with the class level (warned).
   */
  casterLevelOverride?: number;
  spells: KnownSpell[];
  /**
   * Metamagic feats the character actually has (subset of the 5 legacy
   * options). The metamagic pickers offer only these and hide entirely
   * when the list is empty. Legacy offered all 5 unconditionally; this
   * is a deliberate refinement.
   */
  metamagicFeats?: string[];
  /** "level0".."level9" */
  levels: Record<string, SpellLevelState>;
  /**
   * Manual per-level slot maxima ("level0".."level9"), schema v5. When a
   * key is present it replaces the computed table max for that level —
   * the home of the old spellSlotsL* resource pools (slot-only books use
   * castingClass "" so the tables contribute nothing).
   */
  slotOverrides?: Record<string, number>;
  /** spontaneous casters' global metamagic */
  globalMetamagic: { selected: string; active: string[] };
  /** prepared/hybrid casters: "level0".."level9" */
  preparations: Record<string, SpellPreparation[]>;
  slas: SlaEntry[];
  /** persisted collapse state of the tab's sections (legacy calloutStates) */
  sectionCollapsed: Record<string, boolean>;
  /**
   * Named preparation sets (schema v14). Optional/absent on books that predate
   * v14 — read with `?? []`. Managed from the Spell Database's Loadouts tab.
   */
  loadouts?: Loadout[];
  /** which loadout is currently "applied" (drives the Active marker) */
  appliedLoadoutId?: string;
}

export function getSpellLevelKey(level: SpellLevel | number): string {
  return `level${level}`;
}

export function defaultSpellLevelState(): SpellLevelState {
  return {
    remaining: null,
    castsRemaining: null,
    selectedMetamagic: "",
    activeMetamagics: [],
  };
}

/**
 * Slot-only spellbook (schema v5): replaces the old spellSlotsL* resource
 * pools. castingClass "" is deliberately invalid — computed table slots
 * stay 0 and slotOverrides carry the manual maxima.
 */
export function createSlotOnlySpellbook(
  slots: { level: SpellLevel; current: number; max: number }[],
): SpellbookState {
  const book = createDefaultSpellbook("", "cha");
  const overrides: Record<string, number> = {};
  for (const { level, current, max } of slots) {
    const key = getSpellLevelKey(level);
    overrides[key] = max;
    book.levels[key].remaining = current;
  }
  book.slotOverrides = overrides;
  return book;
}

export function createDefaultSpellbook(
  castingClass: string,
  castingStat: AbilityKey,
): SpellbookState {
  const levels: Record<string, SpellLevelState> = {};
  const preparations: Record<string, SpellPreparation[]> = {};
  for (const level of SPELL_LEVELS) {
    levels[getSpellLevelKey(level)] = defaultSpellLevelState();
    preparations[getSpellLevelKey(level)] = [];
  }
  return {
    castingClass,
    castingStat,
    spells: [],
    metamagicFeats: [],
    levels,
    globalMetamagic: { selected: "", active: [] },
    preparations,
    slas: [],
    sectionCollapsed: {},
    loadouts: [],
  };
}
