import { signal, type Signal } from "@preact/signals";
import type { Plugin } from "obsidian";
import { TABS, type TabName } from "../constants";
import {
  createDefaultCharacter,
  type CharacterRecord,
  type ClassEntry,
  type SkillEntry,
} from "../types/character";
import type { QuickActionDef } from "../types/quick-actions";
import {
  DEFAULT_DATA,
  DEFAULT_EQUIP_DB,
  DEFAULT_PARTY_INV,
  DEFAULT_SPELL_DB,
  eitrEnabled,
  type EquipDbState,
  type MiniSheetData,
  type PartyInvState,
  type SpellDbState,
} from "../types/data-file";
import {
  createDefaultInventory,
  type InventoryState,
} from "../types/inventory";
import { computeAll } from "../calc";
import { evaluateResourceFormula } from "../calc/resources";
import { STANDARD_SKILLS } from "../calc/skills";
import { normalizeClassName } from "../calc/spells";
import { resolveArchetypeEffects } from "../data/archetypes";
import {
  classQuickActionIds,
  classResources,
  getClassData,
  unionClassSkills,
} from "../data/classes";
import { getCatalogQuickAction } from "../data/quick-actions";
import { getHeritage, getRaceData } from "../data/races";
import { createDefaultSpellbook } from "../types/spellbook";
import type { SpellbookState } from "../types/spellbook";
import { migrateData } from "./migrations";

const SAVE_DEBOUNCE_MS = 500;

/** First class entry that drives a spellbook: has a `casting` block and is
 *  not stripped of spellcasting by a selected archetype. null = no caster. */
function casterClassEntry(classes: ClassEntry[]): ClassEntry | null {
  const fx = resolveArchetypeEffects(classes);
  return (
    classes.find((entry) => {
      const data = getClassData(entry.className);
      if (!data?.casting) return false;
      return !(fx.any && fx.removedSpellcastingClassKeys.has(entry.className));
    }) ?? null
  );
}

/** A spellbook the user has never put content into — safe to discard when its
 *  driving caster class is removed. Slot-remaining tracking is ignored; only
 *  authored content (spells, SLAs, loadouts, overrides, preparations,
 *  metamagic) counts. */
function isPristineSpellbook(sb: SpellbookState): boolean {
  return (
    sb.spells.length === 0 &&
    sb.slas.length === 0 &&
    (sb.loadouts?.length ?? 0) === 0 &&
    sb.casterLevelOverride === undefined &&
    (sb.metamagicFeats?.length ?? 0) === 0 &&
    sb.globalMetamagic.active.length === 0 &&
    Object.keys(sb.slotOverrides ?? {}).length === 0 &&
    Object.values(sb.preparations).every((preps) => preps.length === 0)
  );
}

/**
 * Single source of truth for all plugin state, backed by data.json.
 * Components read `store.data.value` (signals make them reactive);
 * all writes go through the mutation methods so persistence is automatic.
 */
export class MiniSheetStore {
  readonly data: Signal<MiniSheetData>;
  private plugin: Plugin;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.data = signal(DEFAULT_DATA);
  }

  async load(): Promise<void> {
    // re-entrant for onExternalSettingsChange: the external file is the
    // newer truth, so drop any pending local debounce instead of letting
    // it fire and clobber what we're about to adopt
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.dirty = false;
    const loaded =
      (await this.plugin.loadData()) as Partial<MiniSheetData> | null;
    // migrate BEFORE the merge below — it stamps the current schemaVersion
    // over the loaded one, so migrateData must read the original
    const raw = loaded ? migrateData(loaded) : null;
    if (raw) {
      this.data.value = {
        ...DEFAULT_DATA,
        ...raw,
        // optional fields migrate schema-forward; the stamp tracks the code
        schemaVersion: DEFAULT_DATA.schemaVersion,
        settings: { ...DEFAULT_DATA.settings, ...raw.settings },
        ui: { ...DEFAULT_DATA.ui, ...raw.ui },
        // schema-forward: records saved before a field existed get defaults
        characters: (raw.characters ?? []).map((c) => ({
          ...createDefaultCharacter(c.id, c.name),
          ...c,
        })),
        // absent stays absent (no default injection); present gets shape-merged
        ...(raw.partyInventory
          ? {
              partyInventory: {
                ...createDefaultInventory(),
                ...raw.partyInventory,
              },
            }
          : {}),
      };
    }
  }

  /** Replace the whole data object and persist (debounced). */
  private commit(next: MiniSheetData): void {
    this.data.value = next;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Write pending changes to data.json immediately. */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    await this.plugin.saveData(this.data.value);
  }

  setTab(tab: TabName | number): void {
    const name = typeof tab === "number" ? TABS[tab] : tab;
    if (!name || !TABS.includes(name)) {
      throw new Error(
        `Unknown tab: ${String(tab)} (valid: ${TABS.join(", ")})`,
      );
    }
    this.commit({
      ...this.data.value,
      ui: { ...this.data.value.ui, selectedTab: name },
    });
  }

  setActiveCharacter(id: string | null): void {
    this.commit({
      ...this.data.value,
      ui: { ...this.data.value.ui, activeCharacterId: id },
    });
  }

  spellDb(): SpellDbState {
    return { ...DEFAULT_SPELL_DB, ...this.data.value.ui.spellDb };
  }

  updateSpellDb(patch: Partial<SpellDbState>): void {
    this.commit({
      ...this.data.value,
      ui: {
        ...this.data.value.ui,
        spellDb: { ...this.spellDb(), ...patch },
      },
    });
  }

  equipDb(): EquipDbState {
    return { ...DEFAULT_EQUIP_DB, ...this.data.value.ui.equipDb };
  }

  updateEquipDb(patch: Partial<EquipDbState>): void {
    this.commit({
      ...this.data.value,
      ui: {
        ...this.data.value.ui,
        equipDb: { ...this.equipDb(), ...patch },
      },
    });
  }

  setCombatSub(sub: "main" | "inventory"): void {
    this.commit({
      ...this.data.value,
      ui: { ...this.data.value.ui, combatSub: sub },
    });
  }

  partyInv(): PartyInvState {
    return { ...DEFAULT_PARTY_INV, ...this.data.value.ui.partyInv };
  }

  updatePartyInv(patch: Partial<PartyInvState>): void {
    this.commit({
      ...this.data.value,
      ui: {
        ...this.data.value.ui,
        partyInv: { ...this.partyInv(), ...patch },
      },
    });
  }

  /** Party inventory, defaulting to empty (stored only once mutated). */
  getPartyInventory(): InventoryState {
    return this.data.value.partyInventory ?? createDefaultInventory();
  }

  setPartyInventory(next: InventoryState): void {
    this.commit({ ...this.data.value, partyInventory: next });
  }

  updateSettings(patch: Partial<MiniSheetData["settings"]>): void {
    this.commit({
      ...this.data.value,
      settings: { ...this.data.value.settings, ...patch },
    });
  }

  getCharacter(id?: string): CharacterRecord | null {
    const d = this.data.value;
    const target = id ?? d.ui.activeCharacterId;
    return d.characters.find((c) => c.id === target) ?? null;
  }

  /** Create a character with defaults, make it active, return it. */
  addCharacter(name: string): CharacterRecord {
    const d = this.data.value;
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "character";
    let id = base;
    let n = 2;
    while (d.characters.some((c) => c.id === id)) id = `${base}-${n++}`;
    const record = createDefaultCharacter(id, name);
    this.commit({
      ...d,
      characters: [...d.characters, record],
      ui: { ...d.ui, activeCharacterId: id },
    });
    return record;
  }

  /** Insert or replace a full character record (used by legacy import). */
  upsertCharacter(record: CharacterRecord): void {
    const d = this.data.value;
    const idx = d.characters.findIndex((c) => c.id === record.id);
    const characters = [...d.characters];
    if (idx === -1) characters.push(record);
    else characters[idx] = record;
    this.commit({
      ...d,
      characters,
      ui: { ...d.ui, activeCharacterId: record.id },
    });
  }

  removeCharacter(id: string): void {
    const d = this.data.value;
    const characters = d.characters.filter((c) => c.id !== id);
    this.commit({
      ...d,
      characters,
      ui: {
        ...d.ui,
        activeCharacterId:
          d.ui.activeCharacterId === id
            ? (characters[0]?.id ?? null)
            : d.ui.activeCharacterId,
      },
    });
  }

  /** Shallow-merge a patch into a character record. */
  updateCharacter(id: string, patch: Partial<CharacterRecord>): void {
    const d = this.data.value;
    const idx = d.characters.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`No character with id "${id}"`);
    const characters = [...d.characters];
    characters[idx] = { ...characters[idx]!, ...patch };
    this.commit({ ...d, characters });
  }

  /** Cycle a quick action: off -> stage 1 -> ... -> last stage -> off.
   *  Handles the linkedBuff add/remove on the off<->on edges. */
  cycleQuickAction(id: string, actionId: string): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const def = record.quickActions?.find((a) => a.id === actionId);
    if (!def) throw new Error(`No quick action "${actionId}"`);
    const prev = record.quickActionState?.[actionId];
    const prevStage = prev?.stage ?? 0;
    const nextStage = prevStage >= def.stages.length ? 0 : prevStage + 1;
    this.setQuickActionStage(
      record,
      def.id,
      nextStage,
      prev?.variantId,
      def.linkedBuff,
    );
  }

  /** Select a quick action variant (null = off). Turning a variant on puts
   *  the action at stage 1; the variant choice persists across off cycles. */
  setQuickActionVariant(
    id: string,
    actionId: string,
    variantId: string | null,
  ): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const def = record.quickActions?.find((a) => a.id === actionId);
    if (!def) throw new Error(`No quick action "${actionId}"`);
    const prev = record.quickActionState?.[actionId];
    if (variantId === null) {
      this.setQuickActionStage(
        record,
        def.id,
        0,
        prev?.variantId,
        def.linkedBuff,
      );
    } else {
      this.setQuickActionStage(record, def.id, 1, variantId, def.linkedBuff);
    }
  }

  private setQuickActionStage(
    record: CharacterRecord,
    actionId: string,
    stage: number,
    variantId: string | undefined,
    linkedBuff: string | undefined,
  ): void {
    const prevStage = record.quickActionState?.[actionId]?.stage ?? 0;
    const quickActionState = {
      ...record.quickActionState,
      [actionId]: { stage, ...(variantId ? { variantId } : {}) },
    };
    let buffs = record.buffs;
    if (linkedBuff) {
      if (prevStage === 0 && stage > 0 && !buffs.includes(linkedBuff)) {
        buffs = [...buffs, linkedBuff];
      } else if (prevStage > 0 && stage === 0) {
        buffs = buffs.filter((b) => b !== linkedBuff);
      }
    }
    this.updateCharacter(record.id, { quickActionState, buffs });
  }

  /** Set a (possibly nested, dot-separated) field on a character record. */
  setCharacterField(id: string, dotPath: string, value: unknown): void {
    const d = this.data.value;
    const idx = d.characters.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`No character with id "${id}"`);
    const record = structuredClone(d.characters[idx]!);
    const keys = dotPath.split(".");
    let cursor: Record<string, unknown> = record as unknown as Record<
      string,
      unknown
    >;
    for (const key of keys.slice(0, -1)) {
      const next = cursor[key];
      if (typeof next !== "object" || next === null) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]!] = value;
    const characters = [...d.characters];
    characters[idx] = record;
    this.commit({ ...d, characters });
  }

  /** Set (or clear) the structured race. Keeps the free-text label in sync
   *  when picking, drops a stale flexible-ability choice, and drops the
   *  heritage unless the new race actually owns it. */
  setRace(id: string, raceKey: string | null): void {
    const race = raceKey ? getRaceData(raceKey) : null;
    const current = this.getCharacter(id);
    // Adopt the race's speed when the field is still the untouched default
    // ("30ft" from createDefaultCharacter): switch to derive-mode ("") so a
    // slow race (Dwarf 20ft) shows correctly. A custom speed is left alone.
    // Clearing the race off a derived speed restores the manual default.
    let speed = current?.speed;
    if (race && race.speed != null) {
      if (current?.speed === "30ft") speed = "";
    } else if (current?.speed === "") {
      speed = "30ft";
    }
    this.updateCharacter(id, {
      raceKey: race?.key,
      race: race ? race.name : (current?.race ?? ""),
      raceAbilityChoice: race?.flexibleAbility
        ? current?.raceAbilityChoice
        : undefined,
      raceHeritageKey:
        race &&
        current?.raceHeritageKey &&
        getHeritage(race.key, current.raceHeritageKey)
          ? current.raceHeritageKey
          : undefined,
      speed,
    });
  }

  /** Set (or clear) the variant heritage. Validated against the current
   *  raceKey — an unknown or foreign key clears instead of persisting. */
  setRaceHeritage(id: string, heritageKey: string | null): void {
    const current = this.getCharacter(id);
    const valid =
      heritageKey && current?.raceKey
        ? getHeritage(current.raceKey, heritageKey)
        : null;
    this.updateCharacter(id, {
      raceHeritageKey: valid ? valid.key : undefined,
    });
  }

  /** Set the character type, seeding/pruning the derived sub-objects so a
   *  flip mirrors the New-sheet creator: → familiar/companion keeps an
   *  existing master else defaults to the first OTHER PC (re-point via the
   *  Master picker), companion gets a level; → pc drops the now-meaningless
   *  master link + companion level. */
  setCharacterType(id: string, type: CharacterRecord["characterType"]): void {
    const current = this.getCharacter(id);
    if (!current) throw new Error(`No character with id "${id}"`);
    if (type === "pc") {
      this.updateCharacter(id, {
        characterType: "pc",
        link: undefined,
        companionLevel: undefined,
      });
      return;
    }
    const masterId =
      current.link?.masterId ??
      this.data.value.characters.find(
        (c) => c.id !== id && c.characterType === "pc",
      )?.id;
    this.updateCharacter(id, {
      characterType: type,
      link: masterId
        ? {
            masterId,
            hpMaxFromMaster: current.link?.hpMaxFromMaster ?? false,
            babFromMaster: current.link?.babFromMaster ?? false,
          }
        : undefined,
      companionLevel:
        type === "companion" ? (current.companionLevel ?? 1) : undefined,
    });
  }

  /**
   * Auto-create a spellbook for the first caster class that has one, if the
   * character has none yet. Idempotent: never overwrites an existing book and
   * never deletes one when a caster class is removed (no data loss). The
   * casting class/stat default from the class data's `casting` block —
   * `tableKey` when a slot table is modeled, else the normalized class name
   * (caster-level tracking + known-spell management still work; manual slot
   * overrides cover the rest). Archetypes that trade spellcasting away
   * (removesSpellcasting) are skipped. The user can re-point class/stat via
   * the spellbook gear flyout. Returns true when a book was created.
   */
  ensureSpellbookForClasses(id: string): boolean {
    const record = this.getCharacter(id);
    if (!record || record.spellbook) return false;
    const entry = casterClassEntry(record.classes);
    if (!entry) return false;
    const { casting } = getClassData(entry.className)!;
    const castingClass =
      casting!.tableKey ?? normalizeClassName(entry.className);
    this.updateCharacter(id, {
      spellbook: createDefaultSpellbook(castingClass, casting!.ability),
    });
    return true;
  }

  /**
   * Keep the spellbook in step with the class list after a class edit:
   * provision a book when a caster class appears without one, and drop a
   * still-pristine auto-created book when the last caster class is removed
   * (so the default-Alchemist-on-Add row doesn't strand an empty Spells tab).
   * Pristine = no user content (spells/SLAs/loadouts/overrides/preparations/
   * metamagic), so an imported or edited book is never discarded.
   */
  reconcileSpellbookForClasses(id: string): void {
    const record = this.getCharacter(id);
    if (!record) return;
    if (!record.spellbook) {
      this.ensureSpellbookForClasses(id);
      return;
    }
    const entry = casterClassEntry(record.classes);
    if (!entry) {
      // last caster class gone: drop the book only if untouched
      if (isPristineSpellbook(record.spellbook)) {
        this.updateCharacter(id, { spellbook: undefined });
      }
      return;
    }
    // still a caster, but the book may be keyed to a class we just swapped
    // away from — re-point a pristine book so its slots/CL follow the new class
    if (isPristineSpellbook(record.spellbook)) {
      const { casting } = getClassData(entry.className)!;
      const castingClass =
        casting!.tableKey ?? normalizeClassName(entry.className);
      if (record.spellbook.castingClass !== castingClass) {
        this.updateCharacter(id, {
          spellbook: createDefaultSpellbook(castingClass, casting!.ability),
        });
      }
    }
  }

  /**
   * Apply every class-derived default at once: provision/prune the spellbook,
   * flag class skills (seeding the standard list when empty), and sync class
   * resource pools + quick actions. Fired automatically when the class list
   * changes structurally (class added / class swapped / archetype toggled) so
   * the happy path needs no button hunt; the manual cards stay for explicit
   * re-sync. Each step keeps its insert/flag-only contract, so deliberately
   * removed defaults return — exactly as tapping a card would.
   */
  applyClassDefaults(id: string): void {
    this.reconcileSpellbookForClasses(id);
    this.applyClassSkills(id);
    this.syncClassResources(id);
    this.syncClassQuickActions(id);
  }

  /** Flag existing skill entries that are class skills for the character's
   *  classes. Only flags — never unflags (traits/feats can grant class
   *  skills we don't know about). Seeds the standard PF1e skill list first
   *  when the character has no skills yet, so the button always does the
   *  obvious thing (it used to silently no-op until the Skills tab was
   *  initialized). */
  applyClassSkills(id: string): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const seeded: Record<string, SkillEntry> = { ...record.skills };
    if (Object.keys(seeded).length === 0) {
      for (const [name, ability] of Object.entries(STANDARD_SKILLS)) {
        seeded[name] = { ability, ranks: 0, misc: 0, classSkill: false };
      }
    }
    const union = unionClassSkills(record.classes);
    const isClassSkill = (name: string): boolean =>
      union.has(name) ||
      ["Craft", "Perform", "Profession"].some(
        (group) => name.startsWith(group) && union.has(`${group} (any)`),
      );
    const skills = Object.fromEntries(
      Object.entries(seeded).map(([name, entry]) => [
        name,
        isClassSkill(name) && !entry.classSkill
          ? { ...entry, classSkill: true }
          : entry,
      ]),
    );
    this.updateCharacter(id, { skills });
  }

  /** Upsert resource pools granted by the character's classes, with maxima
   *  recomputed from current level + ability mods, then recompute every
   *  formula-driven pool. Existing pools keep their `current` (clamped);
   *  unknown manual pools are never touched. Pools an archetype suppresses
   *  are pruned — unless re-granted (altered formulas re-add the same id),
   *  user-formula'd, or item-granted. */
  syncClassResources(id: string): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const computed = computeAll(record, null, {
      elephantInTheRoom: eitrEnabled(this.data.value.settings),
    });
    const mods = computed.mods;
    const suggested = classResources(record.classes, mods);
    let resources = [...record.resources];
    for (const pool of suggested) {
      const idx = resources.findIndex((r) => r.id === pool.id);
      if (idx === -1) {
        resources.push({
          id: pool.id,
          name: pool.name,
          current: pool.max,
          max: pool.max,
          ...(pool.footer ? { footer: pool.footer } : {}),
        });
      } else {
        const existing = resources[idx]!;
        resources[idx] = {
          ...existing,
          max: pool.max,
          current: Math.min(existing.current, pool.max),
        };
      }
    }
    const fx = resolveArchetypeEffects(record.classes);
    if (fx.any) {
      const grantedIds = new Set(suggested.map((p) => p.id));
      const suppressed = new Set(fx.suppressedResources.flatMap((s) => [...s]));
      resources = resources.filter(
        (pool) =>
          !suppressed.has(pool.id) ||
          grantedIds.has(pool.id) ||
          pool.formula !== undefined ||
          pool.kind === "item",
      );
    }
    // User formulas apply ONLY to non-class pools — a class/archetype pool's
    // derived closure always wins (mirrors computeAll), so a stale stored
    // formula can't shadow it. Class pool ids come from `suggested`.
    const classPoolIds = new Set(suggested.map((p) => p.id));
    const ctx = { classes: record.classes, mods, scores: computed.scores };
    for (let i = 0; i < resources.length; i++) {
      const pool = resources[i]!;
      if (!pool.formula || classPoolIds.has(pool.id)) continue;
      const max = evaluateResourceFormula(pool.formula, ctx);
      resources[i] = { ...pool, max, current: Math.min(pool.current, max) };
    }
    this.updateCharacter(id, { resources });
  }

  /** Add quick actions granted by the character's classes. INSERT-ONLY:
   *  an action the character already has (by id) is never touched, so
   *  user edits and removals-then-re-adds always win. Removed-on-purpose
   *  actions WILL come back — that's the explicit point of the button.
   *  Exception: actions an archetype suppresses are pruned (re-add is one
   *  sync away after unchecking the archetype). */
  syncClassQuickActions(id: string): { added: string[]; removed: string[] } {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    let existing = record.quickActions ?? [];
    const removed: string[] = [];
    const fx = resolveArchetypeEffects(record.classes);
    const granted = new Set(classQuickActionIds(record.classes));
    if (fx.any) {
      const suppressed = new Set(
        fx.suppressedQuickActions.flatMap((s) => [...s]),
      );
      existing = existing.filter((a) => {
        if (suppressed.has(a.id) && !granted.has(a.id)) {
          removed.push(a.name);
          return false;
        }
        return true;
      });
    }
    const present = new Set(existing.map((a) => a.id));
    const added: string[] = [];
    const appended: QuickActionDef[] = [];
    for (const actionId of granted) {
      if (present.has(actionId)) continue;
      // the crane FD variant stands in for plain fighting defensively
      if (
        actionId === "fightingDefensively" &&
        present.has("fightingDefensivelyCrane")
      ) {
        continue;
      }
      const def = getCatalogQuickAction(actionId);
      if (!def) continue;
      appended.push(def);
      added.push(def.name);
    }
    if (appended.length || removed.length) {
      this.updateCharacter(id, { quickActions: [...existing, ...appended] });
    }
    return { added, removed };
  }
}
