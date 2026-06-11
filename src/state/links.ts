/**
 * Derived/linked pool resolution — replaces the old ResourceSyncManager.
 * A derived pool has no state of its own: it displays
 * floor(source.current / divisor) and writes back source.current =
 * value * divisor, clamped to the source max. The source can live on
 * another character (familiar pools deriving from the master's).
 */

import type { CharacterRecord, ResourcePool } from "../types/character";
import type { MiniSheetStore } from "./store";

export interface ResolvedPool {
  id: string;
  name: string;
  current: number;
  max: number;
  footer?: string;
  /** item-granted pools render on the Items tab; absent = "class" */
  kind?: "class" | "item";
  set(value: number): void;
}

export function resolvePool(
  store: MiniSheetStore,
  character: CharacterRecord,
  pool: ResourcePool,
  index: number
): ResolvedPool {
  if (!pool.derived) {
    return {
      id: pool.id,
      name: pool.name,
      current: pool.current,
      max: pool.max,
      footer: pool.footer,
      kind: pool.kind,
      set: (value) =>
        store.setCharacterField(character.id, `resources.${index}.current`, value),
    };
  }

  const { sourceCharacterId, sourceResourceId, divisor } = pool.derived;
  const sourceChar = sourceCharacterId
    ? store.getCharacter(sourceCharacterId)
    : character;
  const sourceIdx =
    sourceChar?.resources.findIndex((r) => r.id === sourceResourceId) ?? -1;
  const source = sourceIdx >= 0 ? sourceChar!.resources[sourceIdx] : null;

  if (!source || !sourceChar) {
    // broken link — show as empty, writes are no-ops
    return {
      id: pool.id,
      name: pool.name,
      current: 0,
      max: 0,
      footer: pool.footer,
      kind: pool.kind,
      set: () => undefined,
    };
  }

  return {
    id: pool.id,
    name: pool.name,
    current: Math.floor(source.current / divisor),
    max: Math.floor(source.max / divisor),
    footer: pool.footer,
    kind: pool.kind,
    set: (value) => {
      const next = Math.max(0, Math.min(source.max, value * divisor));
      store.setCharacterField(
        sourceChar.id,
        `resources.${sourceIdx}.current`,
        next
      );
    },
  };
}
