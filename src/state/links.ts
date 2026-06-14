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
  index: number,
  /** computed.resourceMaxes — live class-pool maxima keyed by id. A pool whose
   *  id is in this map is class-derived and uses the live value; custom pools
   *  (absent) fall back to their stored max. Defaults to {} for non-UI callers. */
  resourceMaxes: Record<string, number> = {},
  /** computed.resourceFooters — live composed footer strings keyed by id.
   *  Overrides the pool's static footer when present. */
  resourceFooters: Record<string, string> = {}
): ResolvedPool {
  if (!pool.derived) {
    const max = resourceMaxes[pool.id] ?? pool.max;
    return {
      id: pool.id,
      name: pool.name,
      current: Math.min(pool.current, max),
      max,
      footer: resourceFooters[pool.id] ?? pool.footer,
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

  // The source's max derives live when it lives on THIS character (e.g. Adarin's
  // channelEnergy → layOnHands); a cross-character source (familiar → master)
  // falls back to its stored snapshot, which sync keeps fresh.
  const sourceMax =
    (sourceChar.id === character.id ? resourceMaxes[source.id] : undefined) ??
    source.max;

  return {
    id: pool.id,
    name: pool.name,
    current: Math.floor(source.current / divisor),
    max: Math.floor(sourceMax / divisor),
    footer: resourceFooters[pool.id] ?? pool.footer,
    kind: pool.kind,
    set: (value) => {
      const next = Math.max(0, Math.min(sourceMax, value * divisor));
      store.setCharacterField(
        sourceChar.id,
        `resources.${sourceIdx}.current`,
        next
      );
    },
  };
}
