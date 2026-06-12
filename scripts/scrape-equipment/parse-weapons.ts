/**
 * Weapon scraper: EquipmentWeapons.aspx?Proficiency={Simple,Martial,Exotic,Ammo}
 * index grids (one grid per <h1 class="title"> category section) + per-item
 * display pages for source/category/proficiency (the display page is
 * authoritative where present; the index supplies the stat columns).
 *
 * Firearm/Mod/Siege/Special proficiency pages are deliberately skipped in v1
 * (siege engines and weapon mods are not character gear; firearms need their
 * own subsystem).
 */
import { parse } from "node-html-parser";
import type { BaseWeaponDef } from "../../src/types/equipment";
import {
  cleanCell,
  detailBlock,
  isDash,
  parseCostGp,
  parseCrit,
  parseDetailField,
  parseRangeFt,
  parseSource,
  parseWeightLbs,
  slugify,
} from "./common";
import { cachedFetch } from "./fetch";

const BASE = "https://www.aonprd.com/";
const PROFICIENCY_PAGES = ["Simple", "Martial", "Exotic", "Ammo"] as const;

const CATEGORY_BY_TITLE: Record<string, BaseWeaponDef["category"]> = {
  "Light Weapons": "light",
  "One-Handed Weapons": "one-handed",
  "Two-Handed Weapons": "two-handed",
  "Ranged Weapons": "ranged",
  Ammunition: "ammunition",
};

const CATEGORY_BY_DETAIL: Record<string, BaseWeaponDef["category"]> = {
  light: "light",
  "one-handed": "one-handed",
  "two-handed": "two-handed",
  ranged: "ranged",
  ammunition: "ammunition",
};

const PROFICIENCY_BY_DETAIL: Record<string, BaseWeaponDef["proficiency"]> = {
  simple: "simple",
  martial: "martial",
  exotic: "exotic",
  ammo: "ammo",
  ammunition: "ammo",
};

interface IndexRow {
  name: string;
  cost: string;
  dmgS: string;
  dmgM: string;
  crit: string;
  range: string;
  weight: string;
  dmgType: string;
  special: string;
  category: BaseWeaponDef["category"];
}

/** Split a listing page into (section title, table html) chunks. */
function sections(html: string): Array<{ title: string; chunk: string }> {
  const parts = html.split(/<h1 class="title">([^<]+)<\/h1>/);
  const out: Array<{ title: string; chunk: string }> = [];
  for (let i = 1; i < parts.length; i += 2) {
    out.push({ title: cleanCell(parts[i]), chunk: parts[i + 1] ?? "" });
  }
  return out;
}

function parseIndexPage(html: string, page: string): IndexRow[] {
  const rows: IndexRow[] = [];
  for (const { title, chunk } of sections(html)) {
    const category = CATEGORY_BY_TITLE[title];
    if (!category) {
      if (chunk.includes("GridView")) {
        console.warn(`  [weapons:${page}] skipping unknown section "${title}"`);
      }
      continue;
    }
    const table = parse(chunk).querySelector("table[id*=GridView]");
    if (!table) continue;
    for (const tr of table.querySelectorAll("tr")) {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 9) continue; // header row
      const cells = tds.map((td) => cleanCell(td.innerHTML));
      rows.push({
        name: cells[0],
        cost: cells[1],
        dmgS: cells[2],
        dmgM: cells[3],
        crit: cells[4],
        range: cells[5],
        weight: cells[6],
        dmgType: cells[7],
        special: cells[8],
        category,
      });
    }
  }
  return rows;
}

export async function scrapeWeapons(): Promise<BaseWeaponDef[]> {
  const byId = new Map<string, BaseWeaponDef>();
  for (const page of PROFICIENCY_PAGES) {
    const html = await cachedFetch(
      `${BASE}EquipmentWeapons.aspx?Proficiency=${page}`
    );
    const rows = parseIndexPage(html, page);
    console.log(`  [weapons:${page}] ${rows.length} rows`);
    for (const row of rows) {
      const id = slugify(row.name);
      if (byId.has(id)) {
        console.warn(`  [weapons] duplicate id "${id}" — keeping first`);
        continue;
      }

      let source = "";
      let category = row.category;
      let proficiency: BaseWeaponDef["proficiency"] =
        page === "Ammo" ? "ammo" : (page.toLowerCase() as "simple" | "martial" | "exotic");
      try {
        const detailHtml = await cachedFetch(
          `${BASE}EquipmentWeaponsDisplay.aspx?ItemName=${encodeURIComponent(row.name)}`
        );
        const block = detailBlock(detailHtml);
        source = parseSource(block);
        const detailCat =
          CATEGORY_BY_DETAIL[parseDetailField(block, "Category").toLowerCase()];
        if (detailCat) category = detailCat;
        const detailProf =
          PROFICIENCY_BY_DETAIL[
            parseDetailField(block, "Proficiency").toLowerCase()
          ];
        if (detailProf) proficiency = detailProf;
      } catch (err) {
        console.warn(`  [weapons] detail fetch failed for "${row.name}": ${err}`);
      }

      const { critRange, critMult } = parseCrit(row.crit);
      byId.set(id, {
        id,
        name: row.name,
        costGp: parseCostGp(row.cost),
        dmgS: isDash(row.dmgS) ? "" : row.dmgS,
        dmgM: isDash(row.dmgM) ? "" : row.dmgM,
        critRange,
        critMult,
        rangeFt: parseRangeFt(row.range),
        weightLbs: parseWeightLbs(row.weight),
        dmgType: isDash(row.dmgType) ? "" : row.dmgType,
        special: isDash(row.special)
          ? []
          : row.special.split(",").map((s) => s.trim()).filter(Boolean),
        proficiency,
        category,
        source,
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
