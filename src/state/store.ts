import { signal, type Signal } from "@preact/signals";
import type { Plugin } from "obsidian";
import { TABS, type TabName } from "../constants";
import {
  createDefaultCharacter,
  type CharacterRecord,
} from "../types/character";
import {
  DEFAULT_DATA,
  DEFAULT_PARTY_INV,
  DEFAULT_SPELL_DB,
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
import { classResources, unionClassSkills } from "../data/classes";
import { getRaceData } from "../data/races";
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
   *  when picking and drops a stale flexible-ability choice. */
  setRace(id: string, raceKey: string | null): void {
    const race = raceKey ? getRaceData(raceKey) : null;
    const current = this.getCharacter(id);
    this.updateCharacter(id, {
      raceKey: race?.key,
      race: race ? race.name : current?.race ?? "",
      raceAbilityChoice: race?.flexibleAbility
        ? current?.raceAbilityChoice
        : undefined,
    });
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
   *  unknown manual pools are never touched. */
  syncClassResources(id: string): void {
    const record = this.getCharacter(id);
    if (!record) throw new Error(`No character with id "${id}"`);
    const computed = computeAll(record);
    const mods = computed.mods;
    const resources = [...record.resources];
    for (const pool of classResources(record.classes, mods)) {
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
}
