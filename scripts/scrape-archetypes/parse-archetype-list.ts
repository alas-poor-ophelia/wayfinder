/**
 * Archetype index parser: Archetypes.aspx?Class=<Class>.
 *
 * The grid has three columns: linked name, a "Replaces" summary, and a
 * one-line description. The Replaces column conflates replaced and altered
 * features, so it's kept as listAffects (cross-check/display) — suppression
 * comes from the detail pages' parsed sentences.
 */
import { parse } from "node-html-parser";
import { cleanCell } from "../scrape-equipment/common";

export interface ArchetypeListEntry {
  name: string;
  /** The FixedName query value, e.g. "Paladin Divine Hunter" (raw, unencoded). */
  fixedName: string;
  /** "Replaces" column entries, split on ";". */
  affects: string[];
}

export function parseArchetypeList(html: string): ArchetypeListEntry[] {
  const table = parse(html).querySelector("table[id*=GridViewArchetypes]");
  if (!table) {
    console.warn("  [list] GridViewArchetypes table not found");
    return [];
  }
  const out: ArchetypeListEntry[] = [];
  for (const tr of table.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) continue; // header row
    const link = tds[0].querySelector("a");
    const href = link?.getAttribute("href") ?? "";
    const m = /FixedName=([^"&]+)/.exec(href);
    if (!link || !m) continue;
    out.push({
      name: cleanCell(link.innerHTML),
      fixedName: m[1],
      affects: cleanCell(tds[1].innerHTML)
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  return out;
}
