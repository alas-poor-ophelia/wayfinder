/**
 * Magic weapon/armor special-ability scraper (Flaming, Keen, Fortification...).
 * Listing grids carry Name + Base Price Modifier ("+1 bonus" or "+N,NNN gp" —
 * exactly the bonusEquivalent/flatPriceGp split the forge prices with);
 * display pages supply aura/CL/description/source. An ability listed under
 * both the melee and ranged grids becomes appliesTo "weapon"; under both
 * armor and shield grids, "armor-or-shield".
 */
import { parse } from "node-html-parser";
import type { ItemAbilityDef } from "../../src/types/equipment";
import {
  capText,
  cleanCell,
  detailBlock,
  parseCasterLevel,
  parseDescription,
  parseDetailField,
  parseSource,
  slugify,
} from "./common";
import { cachedFetch } from "./fetch";

const BASE = "https://www.aonprd.com/";

interface AbilityPage {
  list: string;
  display: string;
  appliesTo: "melee" | "ranged" | "armor" | "shield";
}

const WEAPON_PAGES: AbilityPage[] = [
  {
    list: "MagicWeapons.aspx?Category=MeleeWeaponQuality",
    display: "MagicWeaponsDisplay.aspx",
    appliesTo: "melee",
  },
  {
    list: "MagicWeapons.aspx?Category=RangedWeaponQuality",
    display: "MagicWeaponsDisplay.aspx",
    appliesTo: "ranged",
  },
];

const ARMOR_PAGES: AbilityPage[] = [
  {
    list: "MagicArmor.aspx?Category=ArmorQuality",
    display: "MagicArmorDisplay.aspx",
    appliesTo: "armor",
  },
  {
    list: "MagicArmor.aspx?Category=ShieldQuality",
    display: "MagicArmorDisplay.aspx",
    appliesTo: "shield",
  },
];

interface ListedAbility {
  itemName: string; // ItemName= key from the link href
  name: string; // anchor text (display)
  priceMod: string;
  appliesTo: AbilityPage["appliesTo"];
  display: string;
}

function parseListing(html: string, page: AbilityPage): ListedAbility[] {
  const out: ListedAbility[] = [];
  for (const table of parse(html).querySelectorAll("table[id*=GridView]")) {
    for (const tr of table.querySelectorAll("tr")) {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) continue;
      const link = tds[0].querySelector("a");
      if (!link) continue;
      const href = link.getAttribute("href") ?? "";
      const key = /ItemName=([^&"]+)/.exec(href)?.[1];
      if (!key) continue;
      out.push({
        itemName: key,
        name: cleanCell(tds[0].innerHTML),
        priceMod: cleanCell(tds[1].innerHTML),
        appliesTo: page.appliesTo,
        display: page.display,
      });
    }
  }
  return out;
}

function parsePriceMod(s: string): {
  bonusEquivalent: number | null;
  flatPriceGp: number | null;
} {
  const bonus = /\+(\d+)\s*bonus/i.exec(s);
  if (bonus) return { bonusEquivalent: Number(bonus[1]), flatPriceGp: null };
  const flat = /\+?([\d,]+)\s*gp/i.exec(s);
  if (flat) {
    return { bonusEquivalent: null, flatPriceGp: Number(flat[1].replace(/,/g, "")) };
  }
  return { bonusEquivalent: null, flatPriceGp: null };
}

async function scrapeAbilitySet(
  pages: AbilityPage[],
  bothLabel: ItemAbilityDef["appliesTo"],
  tag: string
): Promise<ItemAbilityDef[]> {
  const listed = new Map<string, ListedAbility & { lists: Set<string> }>();
  for (const page of pages) {
    const html = await cachedFetch(BASE + page.list);
    const rows = parseListing(html, page);
    console.log(`  [abilities:${page.list.split("=")[1]}] ${rows.length} rows`);
    for (const row of rows) {
      const id = slugify(row.name);
      const seen = listed.get(id);
      if (seen) {
        seen.lists.add(row.appliesTo);
      } else {
        listed.set(id, { ...row, lists: new Set([row.appliesTo]) });
      }
    }
  }

  const out: ItemAbilityDef[] = [];
  for (const [id, row] of listed) {
    const { bonusEquivalent, flatPriceGp } = parsePriceMod(row.priceMod);
    if (bonusEquivalent === null && flatPriceGp === null) {
      console.warn(
        `  [abilities:${tag}] unparseable price "${row.priceMod}" for "${row.name}" — skipping`
      );
      continue;
    }
    let casterLevel = 0;
    let aura = "";
    let shortDesc = "";
    let source = "";
    try {
      const detailHtml = await cachedFetch(
        `${BASE}${row.display}?ItemName=${encodeURIComponent(row.itemName)}`
      );
      const block = detailBlock(detailHtml);
      casterLevel = parseCasterLevel(block);
      aura = parseDetailField(block, "Aura");
      shortDesc = capText(parseDescription(block));
      source = parseSource(block);
    } catch (err) {
      console.warn(`  [abilities:${tag}] detail fetch failed for "${row.name}": ${err}`);
    }
    out.push({
      id,
      name: row.name,
      appliesTo: row.lists.size > 1 ? bothLabel : row.appliesTo,
      bonusEquivalent,
      flatPriceGp,
      casterLevel,
      aura,
      shortDesc,
      source,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export async function scrapeWeaponAbilities(): Promise<ItemAbilityDef[]> {
  return scrapeAbilitySet(WEAPON_PAGES, "weapon", "weapon");
}

export async function scrapeArmorAbilities(): Promise<ItemAbilityDef[]> {
  return scrapeAbilitySet(ARMOR_PAGES, "armor-or-shield", "armor");
}
