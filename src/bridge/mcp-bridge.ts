import { computeAll } from "../calc";
import {
  filterItems,
  sortItems,
} from "../components/inventory/InventoryPanel";
import {
  filterSpells,
  sortSpells,
} from "../components/spelldb/SpellDatabaseApp";
import type { TabName } from "../constants";
import { ICONS, ICON_IDS, type IconDef } from "../data/icons/registry";
import {
  addGlobalMetamagic,
  addLevelMetamagic,
  castPrepared,
  castSla,
  castSpontaneous,
  prepareSpell,
  removeGlobalMetamagic,
  removeLevelMetamagic,
  removePreparation,
  resetSpellbook,
  setCastsRemaining,
  setGlobalMetamagicSelected,
  setLevelMetamagicSelected,
  setLevelRemaining,
  setSlaRemaining,
} from "../state/spellbook-actions";
import {
  addItem,
  removeItem,
  setCurrency,
  spendCharge,
  updateItem,
  type InventoryScope,
} from "../state/inventory-actions";
import type { CharacterRecord } from "../types/character";
import type { MiniSheetData } from "../types/data-file";
import { eitrEnabled } from "../types/data-file";
import type {
  CurrencyState,
  InventoryItem,
  InventoryState,
} from "../types/inventory";
import { inventoryTotals } from "../types/inventory";
import type { SpellbookState, SpellLevel } from "../types/spellbook";
import type MiniSheetPlugin from "../main";

export type SpellActionName =
  | "cast"
  | "castSla"
  | "setRemaining"
  | "setSlaRemaining"
  | "selectGlobalMetamagic"
  | "addGlobalMetamagic"
  | "removeGlobalMetamagic"
  | "prepare"
  | "castPrepared"
  | "removePrep"
  | "setCastsRemaining"
  | "selectLevelMetamagic"
  | "addLevelMetamagic"
  | "removeLevelMetamagic"
  | "reset";

export interface SpellActionPayload {
  level?: number;
  slaIndex?: number;
  value?: number;
  metamagic?: string;
  index?: number;
  spellId?: string;
  prepIndex?: number;
  resetMetamagics?: boolean;
  resetPreparations?: boolean;
  resetSLAs?: boolean;
}

export type InventoryActionName =
  | "add"
  | "update"
  | "remove"
  | "spendCharge"
  | "setCurrency";

export interface InventoryActionPayload {
  /** "add": full item draft (no id); "update": fields to merge */
  draft?: Partial<Omit<InventoryItem, "id">>;
  /** "update" | "remove" | "spendCharge": target item id */
  itemId?: string;
  /** "setCurrency": coin fields to set */
  currency?: Partial<CurrencyState>;
}

/**
 * window.__minisheet — the surface the MCP server drives via `ob eval`.
 * `buildStamp` changes every build so the reload tool can prove the
 * running code actually changed (reload-success-but-stale-code is a
 * known failure mode).
 */
export interface MiniSheetBridge {
  version: string;
  buildStamp: string;
  getState(): MiniSheetData;
  setTab(tab: TabName | number): void;
  listCharacters(): { id: string; name: string }[];
  getCharacter(id?: string): CharacterRecord | null;
  setCharacterField(id: string, dotPath: string, value: unknown): void;
  newCharacter(name: string): string;
  setActiveCharacter(id: string): void;
  /** Open the main-pane character configuration view. */
  openConfig(): Promise<void>;
  /** Calc outputs for a character — wired up in the calc-port milestone. */
  getComputed(id?: string): unknown;
  openSheet(): Promise<void>;
  /** Spellbook state for a character (null when none / no spellbook). */
  getSpellbook(id?: string): SpellbookState | null;
  /** Drive a spellbook mutation by name (the spells tab's action set). */
  spellAction(id: string, action: SpellActionName, payload?: SpellActionPayload): void;
  /** Open the main-pane spell database view. */
  openSpellDb(): Promise<void>;
  /** Filter/sort state + result stats from the spell database view. */
  getSpellDbState(): unknown;
  /** Spell index health: count, folder, last rebuild duration. */
  spellIndexStats(): { count: number; folder: string; rebuildMs: number };
  /** Character inventory (null when no character / no inventory). */
  getInventory(id?: string): InventoryState | null;
  /** Shared party inventory (empty default when never used). */
  getPartyInventory(): InventoryState;
  /** Drive an inventory mutation; scope is "party" or a character id. */
  inventoryAction(
    scope: "party" | (string & {}),
    action: InventoryActionName,
    payload?: InventoryActionPayload
  ): void;
  /** Combat tab subtab ("main" | "inventory"). */
  setCombatSub(sub: "main" | "inventory"): void;
  /** Open the main-pane party inventory view. */
  openPartyInventory(): Promise<void>;
  /** Filter state + result stats from the party inventory view. */
  getPartyInvState(): unknown;
  /** Set (or clear with null) the structured race for a character. */
  setRace(id: string, raceKey: string | null): void;
  /** Flag class skills on existing skill rows from the class registry. */
  applyClassSkills(id: string): void;
  /** Upsert class-granted resource pools (ki, rage, grit...). */
  syncClassResources(id: string): void;
  /** Bundled icon registry (id -> def) — lets MCP evals render/verify icons. */
  getIcon(iconId: string): IconDef | null;
  listIcons(): string[];
  /** Cycle a quick action's stage (off -> 1 -> ... -> off). */
  cycleQuickAction(id: string, actionId: string): void;
  /** Select a quick action variant (null = off). */
  setQuickActionVariant(id: string, actionId: string, variantId: string | null): void;
}

declare global {
  interface Window {
    __minisheet?: MiniSheetBridge;
  }
}

export function installBridge(plugin: MiniSheetPlugin): void {
  const store = plugin.store;
  window.__minisheet = {
    version: plugin.manifest.version,
    buildStamp: __BUILD_STAMP__,
    getState: () => JSON.parse(JSON.stringify(store.data.value)),
    setTab: (tab) => store.setTab(tab),
    listCharacters: () =>
      store.data.value.characters.map((c) => ({ id: c.id, name: c.name })),
    getCharacter: (id) => store.getCharacter(id),
    setCharacterField: (id, dotPath, value) =>
      store.setCharacterField(id, dotPath, value),
    newCharacter: (name) => store.addCharacter(name).id,
    setActiveCharacter: (id) => store.setActiveCharacter(id),
    openConfig: () => plugin.activateConfigView(),
    getComputed: (id) => {
      const record = store.getCharacter(id);
      if (!record) return null;
      const master = record.link ? store.getCharacter(record.link.masterId) : null;
      return computeAll(record, master, {
        elephantInTheRoom: eitrEnabled(store.data.value.settings),
      });
    },
    openSheet: () => plugin.activateView(),
    getSpellbook: (id) => {
      const record = store.getCharacter(id);
      return record?.spellbook
        ? (JSON.parse(JSON.stringify(record.spellbook)) as SpellbookState)
        : null;
    },
    spellAction: (id, action, payload = {}) => {
      const record = store.getCharacter(id);
      if (!record) throw new Error(`No character with id "${id}"`);
      const master = record.link ? store.getCharacter(record.link.masterId) : null;
      const bonus =
        computeAll(record, master, {
          elephantInTheRoom: eitrEnabled(store.data.value.settings),
        }).spellbook?.castingStatBonus ?? 0;
      const level = (payload.level ?? 0) as SpellLevel;
      switch (action) {
        case "cast":
          castSpontaneous(store, record, level, bonus);
          break;
        case "castSla":
          castSla(store, record, payload.slaIndex ?? 0);
          break;
        case "setRemaining":
          setLevelRemaining(store, record, level, payload.value ?? 0);
          break;
        case "setSlaRemaining":
          setSlaRemaining(store, record, payload.slaIndex ?? 0, payload.value ?? 0);
          break;
        case "selectGlobalMetamagic":
          setGlobalMetamagicSelected(store, record, payload.metamagic ?? "");
          break;
        case "addGlobalMetamagic": {
          if (payload.metamagic) {
            setGlobalMetamagicSelected(store, record, payload.metamagic);
          }
          // re-fetch: the mutation above replaced the record object, and
          // addGlobalMetamagic reads `selected` from the record it's given
          const fresh = store.getCharacter(id);
          if (fresh) addGlobalMetamagic(store, fresh);
          break;
        }
        case "removeGlobalMetamagic":
          removeGlobalMetamagic(store, record, payload.index ?? 0);
          break;
        case "prepare":
          prepareSpell(store, record, payload.spellId ?? "", bonus);
          break;
        case "castPrepared":
          castPrepared(store, record, level, payload.prepIndex ?? 0, bonus);
          break;
        case "removePrep":
          removePreparation(store, record, level, payload.prepIndex ?? 0);
          break;
        case "setCastsRemaining":
          setCastsRemaining(store, record, level, payload.value ?? 0);
          break;
        case "selectLevelMetamagic":
          setLevelMetamagicSelected(store, record, level, payload.metamagic ?? "");
          break;
        case "addLevelMetamagic": {
          if (payload.metamagic) {
            setLevelMetamagicSelected(store, record, level, payload.metamagic);
          }
          const freshRecord = store.getCharacter(id);
          if (freshRecord) addLevelMetamagic(store, freshRecord, level);
          break;
        }
        case "removeLevelMetamagic":
          removeLevelMetamagic(store, record, level, payload.index ?? 0);
          break;
        case "reset":
          resetSpellbook(store, record, bonus, {
            resetMetamagics: payload.resetMetamagics,
            resetPreparations: payload.resetPreparations,
            resetSLAs: payload.resetSLAs,
          });
          break;
        default:
          throw new Error(`Unknown spell action: ${String(action)}`);
      }
    },
    openSpellDb: () => plugin.activateSpellDbView(),
    getSpellDbState: () => {
      const db = store.spellDb();
      const docs = plugin.spellIndex.docs.value;
      const characters = store.data.value.characters.filter((c) => c.spellbook);
      const target =
        characters.find((c) => c.id === db.targetCharacterId) ??
        characters.find((c) => c.id === store.data.value.ui.activeCharacterId) ??
        characters[0] ??
        null;
      const knownIds = new Set<string>();
      if (target?.spellbook) {
        for (const s of target.spellbook.spells) {
          if (s.known) knownIds.add(s.originalId ?? s.id);
        }
      }
      const filtered = sortSpells(filterSpells(docs, db, knownIds), db);
      return {
        filters: db,
        targetCharacterId: target?.id ?? null,
        totalDocs: docs.length,
        filteredCount: filtered.length,
        firstPageNames: filtered.slice(0, 50).map((d) => d.name),
      };
    },
    spellIndexStats: () => ({
      count: plugin.spellIndex.docs.value.length,
      folder: plugin.spellIndex.folder(),
      rebuildMs: plugin.spellIndex.lastRebuildMs.value,
    }),
    getInventory: (id) => {
      const record = store.getCharacter(id);
      return record?.inventory
        ? (JSON.parse(JSON.stringify(record.inventory)) as InventoryState)
        : null;
    },
    getPartyInventory: () =>
      JSON.parse(JSON.stringify(store.getPartyInventory())) as InventoryState,
    inventoryAction: (scopeArg, action, payload = {}) => {
      const scope: InventoryScope =
        scopeArg === "party"
          ? { kind: "party" }
          : { kind: "character", id: scopeArg };
      switch (action) {
        case "add":
          addItem(store, scope, {
            name: "",
            type: "Other",
            count: 1,
            weight: 0,
            value: 0,
            containerId: null,
            note: null,
            charges: null,
            ...payload.draft,
          });
          break;
        case "update":
          updateItem(store, scope, payload.itemId ?? "", payload.draft ?? {});
          break;
        case "remove":
          removeItem(store, scope, payload.itemId ?? "");
          break;
        case "spendCharge":
          spendCharge(store, scope, payload.itemId ?? "");
          break;
        case "setCurrency":
          setCurrency(store, scope, payload.currency ?? {});
          break;
        default:
          throw new Error(`Unknown inventory action: ${String(action)}`);
      }
    },
    setCombatSub: (sub) => store.setCombatSub(sub),
    setRace: (id, raceKey) => store.setRace(id, raceKey),
    applyClassSkills: (id) => store.applyClassSkills(id),
    syncClassResources: (id) => store.syncClassResources(id),
    getIcon: (iconId) => ICONS[iconId] ?? null,
    listIcons: () => [...ICON_IDS],
    cycleQuickAction: (id, actionId) => store.cycleQuickAction(id, actionId),
    setQuickActionVariant: (id, actionId, variantId) =>
      store.setQuickActionVariant(id, actionId, variantId),
    openPartyInventory: () => plugin.activatePartyInvView(),
    getPartyInvState: () => {
      const filters = store.partyInv();
      const inventory = store.getPartyInventory();
      const filtered = sortItems(filterItems(inventory.items, filters), filters);
      return {
        filters,
        totalItems: inventory.items.length,
        filteredCount: filtered.length,
        totals: inventoryTotals(filtered),
        currency: inventory.currency,
        firstNames: filtered.slice(0, 50).map((i) => i.name),
      };
    },
  };
}

export function removeBridge(): void {
  delete window.__minisheet;
}
