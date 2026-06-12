/**
 * Custom magic items — user-forged weapons/armor persisted in a SEPARATE
 * vault JSON file (default at vault root) so they're shareable across every
 * character in the vault. The file is tracked by FILE NAME, not path: the
 * user may move it anywhere; renaming it updates the setting.
 *
 * Defs are denormalized: forge inputs (baseId/enhancement/abilityIds) are
 * stored alongside the emitted modifiers and price, so the file is
 * self-contained and robust to catalog changes. Editing in the forge
 * recomputes and re-stamps the derived fields.
 *
 * Pure types + parse/serialize helpers — no obsidian imports (unit-tested
 * directly in tests/unit/state/custom-items.test.ts).
 */
import type { Modifier } from "../calc/modifiers";

export const DEFAULT_CUSTOM_ITEMS_FILENAME = "minisheet-items.json";
export const CUSTOM_ITEMS_SCHEMA_VERSION = 1;

export interface CustomItemDef {
  /** "ci_" + 9 random base36 chars (mirrors the inventory id scheme) */
  id: string;
  /** "+1 Flaming Longsword" */
  name: string;
  kind: "weapon" | "armor" | "shield";
  /** forge inputs (source of truth for re-editing) */
  baseId: string;
  enhancement: number;
  abilityIds: string[];
  /** denormalized forge outputs */
  priceGp: number;
  weightLbs: number;
  modifiers: Modifier[];
  note: string;
  createdAt: string;
  modifiedAt: string;
}

export interface CustomItemsFile {
  schemaVersion: number;
  items: CustomItemDef[];
}

export function newCustomItemId(): string {
  return `ci_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Tolerant parse of the vault file. Returns null for anything that isn't
 * recognizably a custom-items file (the caller must then NEVER overwrite
 * the file — it may be the user's unrelated JSON under the same name).
 * Individual malformed entries are dropped, well-formed ones survive.
 */
export function parseCustomItemsFile(text: string): CustomItemsFile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;
  const items: CustomItemDef[] = [];
  for (const entry of obj.items) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.name !== "string") continue;
    if (e.kind !== "weapon" && e.kind !== "armor" && e.kind !== "shield") continue;
    items.push({
      id: e.id,
      name: e.name,
      kind: e.kind,
      baseId: typeof e.baseId === "string" ? e.baseId : "",
      enhancement: typeof e.enhancement === "number" ? e.enhancement : 1,
      abilityIds: Array.isArray(e.abilityIds)
        ? e.abilityIds.filter((a): a is string => typeof a === "string")
        : [],
      priceGp: typeof e.priceGp === "number" ? e.priceGp : 0,
      weightLbs: typeof e.weightLbs === "number" ? e.weightLbs : 0,
      modifiers: Array.isArray(e.modifiers) ? (e.modifiers as Modifier[]) : [],
      note: typeof e.note === "string" ? e.note : "",
      createdAt: typeof e.createdAt === "string" ? e.createdAt : "",
      modifiedAt: typeof e.modifiedAt === "string" ? e.modifiedAt : "",
    });
  }
  return { schemaVersion: CUSTOM_ITEMS_SCHEMA_VERSION, items };
}

export function serializeCustomItemsFile(items: CustomItemDef[]): string {
  return `${JSON.stringify(
    { schemaVersion: CUSTOM_ITEMS_SCHEMA_VERSION, items },
    null,
    2
  )}\n`;
}

/**
 * After a rename of the tracked file: the new file name to store in
 * settings, or null when only the path changed (user moved the file —
 * name-based tracking follows it for free).
 */
export function renamedFileName(oldPath: string, newPath: string): string | null {
  const oldName = oldPath.split("/").pop() ?? oldPath;
  const newName = newPath.split("/").pop() ?? newPath;
  return newName === oldName ? null : newName;
}
