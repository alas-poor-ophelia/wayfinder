/**
 * Metamagic feat scraper: Feats.aspx?Category=Metamagic is one GridView
 * (Name / Prerequisite / short Description). The level adjustment and the
 * source book aren't in the grid, so each feat's FeatDisplay.aspx page is
 * fetched to read the Source line and derive the slot-level increase from the
 * benefit prose ("uses up a spell slot two levels higher…").
 */
import { parse } from "node-html-parser";
import { cleanCell, isDash, parseSource, slugify } from "../scrape-equipment/common";
import { cachedFetch } from "../scrape-equipment/fetch";

const BASE = "https://www.aonprd.com/";

const WORD_NUM: Record<string, number> = {
  a: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

export interface MetamagicFeatDef {
  id: string;
  name: string;
  /** spell-slot level increase; "var" when the feat's increase varies */
  adj: number | "var";
  desc: string;
  source: string;
  prerequisite: string;
}

/** Derive the slot-level increase from the benefit prose. */
function deriveAdj(text: string): number | "var" {
  const higher =
    /uses up a spell slot (a|one|two|three|four|five|six|\d+) (?:or more )?levels? higher/i.exec(
      text
    );
  if (higher) {
    const w = higher[1].toLowerCase();
    return WORD_NUM[w] ?? (Number.isNaN(Number(w)) ? "var" : Number(w));
  }
  // explicitly no increase
  if (/uses up a spell slot of the spell'?s (?:normal|actual) level/i.test(text)) {
    return 0;
  }
  // some increase, but the amount is conditional/variable
  if (/spell slot[^.]*levels? higher/i.test(text)) return "var";
  return "var";
}

export async function scrapeMetamagic(): Promise<MetamagicFeatDef[]> {
  const listHtml = await cachedFetch(`${BASE}Feats.aspx?Category=Metamagic`);
  const root = parse(listHtml);
  const table =
    root.querySelector("table[id*=GridView]") ?? root.querySelector("table");
  if (!table) throw new Error("metamagic: no feats table found");

  const out: MetamagicFeatDef[] = [];
  for (const tr of table.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) continue; // header row
    const name = cleanCell(tds[0].querySelector("a")?.text ?? tds[0].text);
    if (!name) continue;
    const prereq = cleanCell(tds[1].text);
    const desc = cleanCell(tds[2].text);

    let source = "";
    let adj: number | "var" = "var";
    try {
      const detail = await cachedFetch(
        `${BASE}FeatDisplay.aspx?ItemName=${encodeURIComponent(name)}`
      );
      source = parseSource(detail);
      adj = deriveAdj(detail);
    } catch (err) {
      console.warn(`  [metamagic] detail fetch failed for "${name}": ${err}`);
    }

    out.push({
      id: slugify(name),
      name,
      adj,
      desc: isDash(desc) ? "" : desc,
      source,
      prerequisite: isDash(prereq) ? "" : prereq,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
