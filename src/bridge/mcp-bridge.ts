import { computeAll } from "../calc";
import type { TabName } from "../constants";
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
import type { CharacterRecord } from "../types/character";
import type { MiniSheetData } from "../types/data-file";
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
  setConfigOpen(open: boolean): void;
  /** Calc outputs for a character — wired up in the calc-port milestone. */
  getComputed(id?: string): unknown;
  openSheet(): Promise<void>;
  /** Spellbook state for a character (null when none / no spellbook). */
  getSpellbook(id?: string): SpellbookState | null;
  /** Drive a spellbook mutation by name (the spells tab's action set). */
  spellAction(id: string, action: SpellActionName, payload?: SpellActionPayload): void;
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
    setConfigOpen: (open) => store.setConfigOpen(open),
    getComputed: (id) => {
      const record = store.getCharacter(id);
      if (!record) return null;
      const master = record.link ? store.getCharacter(record.link.masterId) : null;
      return computeAll(record, master);
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
      const bonus = computeAll(record, master).spellbook?.castingStatBonus ?? 0;
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
  };
}

export function removeBridge(): void {
  delete window.__minisheet;
}
