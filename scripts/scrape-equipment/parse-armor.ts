/**
 * Armor scraper: EquipmentArmor.aspx?Category={Light,Medium,Heavy,Shield}
 * index grids + per-item display pages for source. Extra/Mod categories
 * (armor extras, armor mods) are deliberately skipped in v1.
 *
 * Index columns: Name | Cost | Armor Bonus | Max Dex | ACP | ASF | Speed(30)
 * | Speed(20) | Weight — Speed(20) is dropped (the sheet stores speed30).
 */
import { parse } from "node-html-parser";
import type { BaseArmorDef } from "../../src/types/equipment";
import {
  cleanCell,
  detailBlock,
  parseCostGp,
  parseRangeFt,
  parseSignedInt,
  parseSource,
  parseWeightLbs,
  slugify,
} from "./common";
import { cachedFetch } from "./fetch";

const BASE = "https://www.aonprd.com/";
const CATEGORY_PAGES = ["Light", "Medium", "Heavy", "Shield"] as const;

export async function scrapeArmor(): Promise<BaseArmorDef[]> {
  const byId = new Map<string, BaseArmorDef>();
  for (const page of CATEGORY_PAGES) {
    const html = await cachedFetch(`${BASE}EquipmentArmor.aspx?Category=${page}`);
    const category = page.toLowerCase() as BaseArmorDef["category"];
    const kind = page === "Shield" ? "shield" : "armor";

    let rowCount = 0;
    for (const table of parse(html).querySelectorAll("table[id*=GridView]")) {
      for (const tr of table.querySelectorAll("tr")) {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 9) continue; // header row
        const cells = tds.map((td) => cleanCell(td.innerHTML));
        // The Shield grid prints bare names ("Heavy steel", "Tower") because
        // the page implies the noun; outside that page they're ambiguous, so
        // suffix " shield" unless the name already carries its own noun.
        const rawName = cells[0];
        const name =
          kind === "shield" && !/shield|buckler|klar|madu/i.test(rawName)
            ? `${rawName} shield`
            : rawName;
        const id = slugify(name);
        if (byId.has(id)) {
          console.warn(`  [armor] duplicate id "${id}" — keeping first`);
          continue;
        }
        rowCount++;

        let source = "";
        try {
          const detailHtml = await cachedFetch(
            `${BASE}EquipmentArmorDisplay.aspx?ItemName=${encodeURIComponent(rawName)}`
          );
          source = parseSource(detailBlock(detailHtml));
        } catch (err) {
          console.warn(`  [armor] detail fetch failed for "${name}": ${err}`);
        }

        byId.set(id, {
          id,
          name,
          costGp: parseCostGp(cells[1]),
          acBonus: parseSignedInt(cells[2]) ?? 0,
          kind,
          maxDex: parseSignedInt(cells[3]),
          acp: parseSignedInt(cells[4]) ?? 0,
          asfPct: parseSignedInt(cells[5]) ?? 0,
          speed30: parseRangeFt(cells[6]),
          weightLbs: parseWeightLbs(cells[8]),
          category,
          source,
        });
      }
    }
    console.log(`  [armor:${page}] ${rowCount} rows`);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
