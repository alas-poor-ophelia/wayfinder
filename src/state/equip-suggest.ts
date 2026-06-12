/**
 * Pure name-search over the equipment catalogs for the item editor's
 * autocomplete. Each suggestion carries a ready-to-apply inventory draft
 * (via equip-drafts builders) so a pick prefills type/weight/value/bonuses,
 * not just the name. No obsidian imports; unit-tested in
 * tests/unit/state/equip-suggest.test.ts.
 */
import { ARMOR, MAGIC_ITEMS, WEAPONS, getBaseWeapon } from "../data/equipment";
import type { CustomItemDef } from "../types/custom-items";
import type { InventoryItem } from "../types/inventory";
import {
  armorDraft,
  customDraft,
  magicDraft,
  weaponDraft,
} from "./equip-drafts";

export interface EquipSuggestion {
  key: string;
  name: string;
  /** badge text in the dropdown — the draft's ItemType, or "Custom" */
  kind: string;
  priceGp: number;
  /** magic items whose bonuses weren't auto-detected (edit after pick) */
  needsReview?: boolean;
  draft: Omit<InventoryItem, "id">;
}

export const SUGGEST_MIN_CHARS = 2;
export const SUGGEST_LIMIT = 8;

/** prefix match ranks above word-start, which ranks above substring */
function matchRank(nameLower: string, queryLower: string): number | null {
  const idx = nameLower.indexOf(queryLower);
  if (idx < 0) return null;
  if (idx === 0) return 0;
  if (nameLower[idx - 1] === " " || nameLower[idx - 1] === "(") return 1;
  return 2;
}

export function suggestEquipment(
  query: string,
  customItems: CustomItemDef[] = [],
  limit = SUGGEST_LIMIT
): EquipSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < SUGGEST_MIN_CHARS) return [];

  // custom items first so the user's own gear outranks same-rank catalog hits
  const ranked: Array<{ rank: number; s: EquipSuggestion }> = [];
  for (const c of customItems) {
    const rank = matchRank(c.name.toLowerCase(), q);
    if (rank === null) continue;
    const draft = customDraft(c, getBaseWeapon(c.baseId));
    ranked.push({
      rank,
      s: { key: `custom:${c.id}`, name: c.name, kind: "Custom", priceGp: c.priceGp, draft },
    });
  }
  for (const w of WEAPONS) {
    const rank = matchRank(w.name.toLowerCase(), q);
    if (rank === null) continue;
    ranked.push({
      rank,
      s: { key: `weapon:${w.id}`, name: w.name, kind: "Weapon", priceGp: w.costGp, draft: weaponDraft(w) },
    });
  }
  for (const a of ARMOR) {
    const rank = matchRank(a.name.toLowerCase(), q);
    if (rank === null) continue;
    const draft = armorDraft(a);
    ranked.push({
      rank,
      s: { key: `armor:${a.id}`, name: a.name, kind: draft.type, priceGp: a.costGp, draft },
    });
  }
  for (const m of MAGIC_ITEMS) {
    const rank = matchRank(m.name.toLowerCase(), q);
    if (rank === null) continue;
    ranked.push({
      rank,
      s: {
        key: `magic:${m.id}`,
        name: m.name,
        kind: "Magic Item",
        priceGp: m.priceGp,
        ...(m.needsReview ? { needsReview: true } : {}),
        draft: magicDraft(m),
      },
    });
  }

  // stable on insertion order within a rank (custom > weapons > armor > magic)
  return ranked
    .sort((a, b) => a.rank - b.rank || a.s.name.length - b.s.name.length)
    .slice(0, limit)
    .map((r) => r.s);
}
