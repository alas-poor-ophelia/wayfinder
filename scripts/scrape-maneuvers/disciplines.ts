/**
 * The twelve core Path of War disciplines (the Warlord / Warder / Stalker
 * corpus). Path of War: Expanded disciplines (Elemental Flux, Riven Hourglass,
 * Shattered Mirror, Sleeping Goddess, Solar Wind, Steel Serpent, Tempest Gale,
 * Veiled Moon, Radiant Dawn, Unquiet Grave) are intentionally out of scope for
 * the first cut.
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
];

const BASE =
  "https://www.d20pfsrd.com/alternative-rule-systems/3rd-party-rules-systems/path-of-war/disciplines-and-maneuvers/";

export function disciplineUrl(d: Discipline): string {
  return `${BASE}${slugify(d.name)}-maneuvers/`;
}
