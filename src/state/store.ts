import { signal, type Signal } from "@preact/signals";
import type { Plugin } from "obsidian";
import { TABS, type TabName } from "../constants";
import {
  createDefaultCharacter,
  type CharacterRecord,
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
import { resolveArchetypeEffects } from "../data/archetypes";
import { classQuickActionIds, classResources, unionClassSkills } from "../data/classes";
import { getCatalogQuickAction } from "../data/quick-actions";
import { getHeritage, getRaceData } from "../data/races";
import { migrateData } from "./migrations";

const SAVE_DEBOUNCE_MS = 500;

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
    const loaded = (await this.plugin.loadData()) as Partial<MiniSheetData> | null;
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
      throw new Error(`Unknown tab: ${String(tab)} (valid: ${TABS.join(", ")})`);
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
    const base = name
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
            ? characters[0]?.id ?? null
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
    characters[idx] = { ...characters[idx], ...patch };
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
    this.setQuickActionStage(record, def.id, nextStage, prev?.variantId, def.linkedBuff);
  }

  /** Select a quick action variant (null = off). Turning a variant on puts
   *  the action at stage 1; the variant choice persists across off cycles. */
  setQuickActionVariant(id: string, actionId: string, variantId: string | null): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const def = record.quickActions?.find((a) => a.id === actionId);
    if (!def) throw new Error(`No quick action "${actionId}"`);
    const prev = record.quickActionState?.[actionId];
    if (variantId === null) {
      this.setQuickActionStage(record, def.id, 0, prev?.variantId, def.linkedBuff);
    } else {
      this.setQuickActionStage(record, def.id, 1, variantId, def.linkedBuff);
    }
  }

  private setQuickActionStage(
    record: CharacterRecord,
    actionId: string,
    stage: number,
    variantId: string | undefined,
    linkedBuff: string | undefined
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
    const record = structuredClone(d.characters[idx]);
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
    cursor[keys[keys.length - 1]] = value;
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
    this.updateCharacter(id, {
      raceKey: race?.key,
      race: race ? race.name : current?.race ?? "",
      raceAbilityChoice: race?.flexibleAbility
        ? current?.raceAbilityChoice
        : undefined,
      raceHeritageKey:
        race && current?.raceHeritageKey && getHeritage(race.key, current.raceHeritageKey)
          ? current.raceHeritageKey
          : undefined,
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
    this.updateCharacter(id, { raceHeritageKey: valid ? valid.key : undefined });
  }

  /** Flag existing skill entries that are class skills for the character's
   *  classes. Only flags — never unflags (traits/feats can grant class
   *  skills we don't know about) and never creates skill rows. */
  applyClassSkills(id: string): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const union = unionClassSkills(record.classes);
    const isClassSkill = (name: string): boolean =>
      union.has(name) ||
      ["Craft", "Perform", "Profession"].some(
        (group) => name.startsWith(group) && union.has(`${group} (any)`)
      );
    const skills = Object.fromEntries(
      Object.entries(record.skills).map(([name, entry]) => [
        name,
        isClassSkill(name) && !entry.classSkill
          ? { ...entry, classSkill: true }
          : entry,
      ])
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
        const existing = resources[idx];
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
      const suppressed = new Set(
        fx.suppressedResources.flatMap((s) => [...s])
      );
      resources = resources.filter(
        (pool) =>
          !suppressed.has(pool.id) ||
          grantedIds.has(pool.id) ||
          pool.formula !== undefined ||
          pool.kind === "item"
      );
    }
    // user-defined formulas win over (and extend beyond) class defs
    const ctx = { classes: record.classes, mods, scores: computed.scores };
    for (let i = 0; i < resources.length; i++) {
      const pool = resources[i];
      if (!pool.formula) continue;
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
        fx.suppressedQuickActions.flatMap((s) => [...s])
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
      if (actionId === "fightingDefensively" && present.has("fightingDefensivelyCrane")) {
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
