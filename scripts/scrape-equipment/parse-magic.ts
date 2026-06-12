/**
 * Magic item scraper: wondrous items (13 FinalSlot listings), rings, and
 * rods. Listing grids carry Name + Cost only; display pages supply
 * aura/CL/slot/weight/description/source. AoN lists one row per priced
 * variant ("Belt of Giant Strength (+2)" → FinalName "Belt of Giant
 * Strength2"), so the href FinalName is the fetch key and the anchor text
 * is the display name. Typed modifiers are heuristically derived from the
 * FULL description (src/data/equipment/derive-modifiers.ts); items that
 * derive nothing ship with needsReview for manual fix-up in the UI.
 */
import { parse } from "node-html-parser";
import { deriveModifiers } from "../../src/data/equipment/derive-modifiers";
import type { MagicItemDef } from "../../src/types/equipment";
import {
  capText,
  cleanCell,
  detailBlock,
  parseCasterLevel,
  parseCostGp,
  parseDescription,
  parseDetailField,
  parseSource,
  parseWeightLbs,
  slugify,
} from "./common";
import { cachedFetch } from "./fetch";

const BASE = "https://www.aonprd.com/";

const WONDROUS_SLOTS = [
  "Belts",
  "Body",
  "Chest",
  "Eyes",
  "Feet",
  "Hands",
  "Head",
  "Headband",
  "Ioun",
  "Neck",
  "Other",
  "Shoulders",
  "Wrist",
] as const;

interface MagicListing {
  url: string;
  display: string;
  group: MagicItemDef["group"];
  fallbackSlot: string;
  tag: string;
}

function listings(): MagicListing[] {
  const out: MagicListing[] = WONDROUS_SLOTS.map((slot) => ({
    url: `MagicWondrous.aspx?FinalSlot=${slot}`,
    display: "MagicWondrousDisplay.aspx",
    group: "wondrous" as const,
    fallbackSlot: slot.toLowerCase(),
    tag: `wondrous:${slot}`,
  }));
  out.push({
    url: "MagicRings.aspx",
    display: "MagicRingsDisplay.aspx",
    group: "ring",
    fallbackSlot: "ring",
    tag: "rings",
  });
  for (const cat of ["Metamagic", "Other"]) {
    out.push({
      url: `MagicRods.aspx?Category=${cat}`,
      display: "MagicRodsDisplay.aspx",
      group: "rod",
      fallbackSlot: "none",
      tag: `rods:${cat}`,
    });
  }
  return out;
}

export async function scrapeMagicItems(): Promise<MagicItemDef[]> {
  const byId = new Map<string, MagicItemDef>();
  let reviewCount = 0;

  for (const listing of listings()) {
    const html = await cachedFetch(BASE + listing.url);
    let rowCount = 0;
    for (const table of parse(html).querySelectorAll("table[id*=GridView]")) {
      for (const tr of table.querySelectorAll("tr")) {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 2) continue;
        const link = tds[0].querySelector("a");
        if (!link) continue;
        const href = link.getAttribute("href") ?? "";
        const finalName = /FinalName=([^&"]+)/.exec(href)?.[1];
        if (!finalName) continue;
        const name = cleanCell(tds[0].innerHTML);
        const id = slugify(name);
        if (byId.has(id)) continue; // same item listed twice (e.g. Other slot)
        rowCount++;

        let casterLevel = 0;
        let aura = "";
        let slot = listing.fallbackSlot;
        let weightLbs = 0;
        let source = "";
        let description = "";
        try {
          const detailHtml = await cachedFetch(
            `${BASE}${listing.display}?FinalName=${encodeURIComponent(finalName)}`
          );
          const block = detailBlock(detailHtml);
          casterLevel = parseCasterLevel(block);
          aura = parseDetailField(block, "Aura");
          const detailSlot = parseDetailField(block, "Slot").toLowerCase();
          if (detailSlot) slot = detailSlot;
          weightLbs = parseWeightLbs(parseDetailField(block, "Weight"));
          source = parseSource(block);
          description = parseDescription(block);
        } catch (err) {
          console.warn(`  [${listing.tag}] detail fetch failed for "${name}": ${err}`);
        }

        const modifiers = deriveModifiers(name, description);
        if (modifiers.length === 0) reviewCount++;
        byId.set(id, {
          id,
          name,
          group: listing.group,
          slot,
          priceGp: parseCostGp(cleanCell(tds[1].innerHTML)),
          weightLbs,
          casterLevel,
          aura,
          source,
          shortDesc: capText(description),
          modifiers,
          ...(modifiers.length === 0 ? { needsReview: true } : {}),
        });
      }
    }
    console.log(`  [${listing.tag}] ${rowCount} items`);
  }

  const all = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  console.log(
    `  [magic] ${all.length} items total, ${reviewCount} needsReview ` +
      `(${Math.round((reviewCount / Math.max(all.length, 1)) * 100)}%)`
  );
  return all;
}
