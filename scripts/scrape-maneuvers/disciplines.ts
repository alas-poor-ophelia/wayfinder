/**
 * The Path of War disciplines. The first 12 are the base Warlord/Warder/Stalker
 * corpus; the rest are the backfill (Story D1) — base disciplines absent from
 * the core books plus the Path of War: Expanded / Lords of the Night ones. Each
 * carries its associated skill (stamped on every maneuver note); the per-note
 * `source` is derived from the page's OGL Section 15 at scrape time (see
 * extract.ts extractSource), not from this table. `weapons` is reference-only
 * metadata (not written to notes).
 *
 * Each entry resolves to a d20pfsrd discipline page:
 *   .../path-of-war/disciplines-and-maneuvers/<slug>-maneuvers/
 * The associated skill + weapon groups come from the discipline write-ups (they
 * are not reliably repeated on every maneuver, so we carry them here and stamp
 * each maneuver note's frontmatter with its discipline's skill).
 */
import { slugify } from "../scrape-equipment/common";

export interface Discipline {
  name: string;
  skill: string;
  weapons: string[];
  /** full URL override — for pages whose slug isn't `<slug>-maneuvers/`. */
  url?: string;
  /**
   * Manual book-of-origin override, used ONLY when the page carries no OGL
   * Section 15 footer (extractSource then can't determine it). Verified by
   * other means (Dreamscarred SRD / printed book). §15-bearing pages ignore
   * this and use their own credit.
   */
  source?: string;
}

export const DISCIPLINES: Discipline[] = [
  { name: "Black Seraph", skill: "Intimidate", weapons: ["Axes", "Flails", "Polearms"] },
  { name: "Broken Blade", skill: "Acrobatics", weapons: ["Close", "Monk", "Natural"] },
  { name: "Cursed Razor", skill: "Spellcraft", weapons: ["Heavy Blades", "Light Blades", "Spears"] },
  { name: "Eternal Guardian", skill: "Intimidate", weapons: ["Hammers", "Heavy Blades", "Polearms"] },
  { name: "Golden Lion", skill: "Diplomacy", weapons: ["Heavy Blades", "Hammers", "Polearms"] },
  { name: "Iron Tortoise", skill: "Bluff", weapons: ["Axes", "Heavy Blades", "Close"] },
  { name: "Mithral Current", skill: "Perform (Dance)", weapons: ["Light Blades", "Heavy Blades", "Polearms"] },
  { name: "Piercing Thunder", skill: "Acrobatics", weapons: ["Polearms", "Spears"] },
  { name: "Primal Fury", skill: "Survival", weapons: ["Axes", "Heavy Blades", "Hammers"] },
  { name: "Scarlet Throne", skill: "Sense Motive", weapons: ["Heavy Blades", "Light Blades", "Spears"] },
  { name: "Silver Crane", skill: "Perception", weapons: ["Bows", "Hammers", "Spears"] },
  { name: "Thrashing Dragon", skill: "Acrobatics", weapons: ["Close", "Light Blades", "Double"] },
  // ── Backfill (Story D1) — skills confirmed from each discipline page ──
  // base disciplines absent from the first cut
  { name: "Steel Serpent", skill: "Heal", weapons: [] },
  { name: "Veiled Moon", skill: "Stealth", weapons: [] },
  // Path of War: Expanded disciplines
  { name: "Elemental Flux", skill: "Spellcraft", weapons: ["Light Blades", "Monk", "Thrown"] },
  { name: "Riven Hourglass", skill: "Autohypnosis", weapons: [] },
  { name: "Shattered Mirror", skill: "Craft", weapons: [] },
  { name: "Sleeping Goddess", skill: "Autohypnosis", weapons: [] },
  // Solar Wind's d20pfsrd page carries no §15 footer; PoW: Expanded confirmed
  // via the discipline write-up (Dreamscarred). source override applies.
  { name: "Solar Wind", skill: "Perception", weapons: ["Bows", "Crossbows", "Thrown"], source: "Path of War: Expanded" },
  { name: "Tempest Gale", skill: "Sleight of Hand", weapons: [] },
  // Radiant Dawn uses a non-standard d20pfsrd slug (path duplicated); also no
  // §15 footer, so the source override applies.
  {
    name: "Radiant Dawn",
    skill: "Diplomacy",
    weapons: [],
    url: "https://www.d20pfsrd.com/alternative-rule-systems/3rd-party-rules-systems/path-of-war/disciplines-and-maneuvers/alternative-rule-systems-path-of-war-disciplines-and-maneuvers-radiant-dawn-maneuvers/",
    source: "Path of War: Expanded",
  },
  // Lords of the Night (a separate product — §15 will stamp it per-page)
  { name: "Unquiet Grave", skill: "Knowledge (religion)", weapons: ["Axes", "Natural", "Polearms"] },
];

const BASE =
  "https://www.d20pfsrd.com/alternative-rule-systems/3rd-party-rules-systems/path-of-war/disciplines-and-maneuvers/";

export function disciplineUrl(d: Discipline): string {
  return d.url ?? `${BASE}${slugify(d.name)}-maneuvers/`;
}
