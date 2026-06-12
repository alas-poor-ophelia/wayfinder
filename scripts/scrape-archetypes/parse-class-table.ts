/**
 * Base-class progression table parser: ClassDisplay.aspx?ItemName=<Class>.
 *
 * Reads the "Class Features" inner table's Special column into canonical
 * BaseClassFeature entries (first level of first appearance, "N/day"
 * qualifiers stripped: "smite evil 1/day" → smite-evil@1). If the table has
 * Spells Per Day columns, a synthetic "spells" feature is added at the first
 * level with a real slot entry — archetypes that trade away spellcasting
 * reference it ("This ability replaces the paladin's spellcasting").
 */
import { parse } from "node-html-parser";
import type { BaseClassFeature } from "../../src/types/archetypes";
import { cleanCell, isDash, slugify } from "../scrape-equipment/common";

export function parseClassTable(html: string, classKey: string): BaseClassFeature[] {
  const featuresIdx = html.indexOf('<h2 class="title">Class Features</h2>');
  const region = featuresIdx >= 0 ? html.slice(featuresIdx) : html;
  const table = parse(region).querySelector("table.inner");
  if (!table) {
    console.warn(`  [${classKey}] no Class Features table found`);
    return [];
  }

  const rows = table.querySelectorAll("tr");
  let specialCol = -1;
  let levelCol = -1;
  let headerRow = -1;
  for (let r = 0; r < rows.length && headerRow < 0; r++) {
    const cells = rows[r].querySelectorAll("td, th").map((c) => cleanCell(c.innerHTML));
    const s = cells.findIndex((c) => /^special$/i.test(c));
    const l = cells.findIndex((c) => /^level$/i.test(c));
    if (s >= 0 && l >= 0) {
      specialCol = s;
      levelCol = l;
      headerRow = r;
    }
  }
  if (headerRow < 0) {
    console.warn(`  [${classKey}] no Level/Special header row found`);
    return [];
  }

  // Columns beyond Special are a spell grid only when the header row says
  // so with ordinal spell-level headers ("1st", "2nd", ...). Monk-style
  // tables put named columns there (Flurry of Blows Attack Bonus, AC Bonus)
  // which used to mint a phantom spells@1 feature.
  const headerCells = rows[headerRow]
    .querySelectorAll("td, th")
    .map((c) => cleanCell(c.innerHTML));
  const hasSpellGrid = headerCells
    .slice(specialCol + 1)
    .some((c) => /^\d+(?:st|nd|rd|th)$/i.test(c));

  const byId = new Map<string, BaseClassFeature>();
  let spellsLevel = 0;
  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = rows[r].querySelectorAll("td").map((c) => cleanCell(c.innerHTML));
    if (cells.length <= specialCol) continue;
    const level = Number(/^(\d+)/.exec(cells[levelCol] ?? "")?.[1]);
    if (!level) continue;

    for (const entry of cells[specialCol].split(",")) {
      const name = entry.replace(/\s*\d+\/day/gi, "").replace(/\s+/g, " ").trim();
      if (!name || isDash(name)) continue;
      const id = slugify(name);
      if (!byId.has(id)) byId.set(id, { id, name, level });
    }

    // First level where any spell-grid cell holds a real slot entry.
    if (hasSpellGrid && !spellsLevel) {
      const spellCells = cells.slice(specialCol + 1);
      if (spellCells.some((c) => !isDash(c))) spellsLevel = level;
    }
  }

  if (spellsLevel && !byId.has("spells")) {
    byId.set("spells", { id: "spells", name: "Spells", level: spellsLevel });
  }

  return [...byId.values()].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}
