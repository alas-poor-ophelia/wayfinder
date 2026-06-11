/**
 * PF1e class progression data — clean port of ClassStatsLookup.js.
 * Pure data + lookups; no Obsidian imports.
 */

export interface ClassStats {
  hitDie: string; // "d6" | "d8" | "d10" | "d12"
  saves: { fort: boolean; ref: boolean; will: boolean }; // true = good progression
  bab: number; // fractional BAB rate: 0.5 | 0.75 | 1.0
}

export const CLASS_STATS: Record<string, ClassStats> = {
  Alchemist: { hitDie: "d8", saves: { fort: true, ref: true, will: false }, bab: 0.75 },
  Antipaladin: { hitDie: "d10", saves: { fort: true, ref: false, will: true }, bab: 1.0 },
  Arcanist: { hitDie: "d6", saves: { fort: false, ref: false, will: true }, bab: 0.5 },
  Barbarian: { hitDie: "d12", saves: { fort: true, ref: false, will: false }, bab: 1.0 },
  "Barbarian (Unchained)": { hitDie: "d12", saves: { fort: true, ref: false, will: false }, bab: 1.0 },
  Bard: { hitDie: "d8", saves: { fort: false, ref: true, will: true }, bab: 0.75 },
  Bloodrager: { hitDie: "d10", saves: { fort: true, ref: false, will: true }, bab: 1.0 },
  Brawler: { hitDie: "d10", saves: { fort: true, ref: true, will: false }, bab: 1.0 },
  Cavalier: { hitDie: "d10", saves: { fort: true, ref: false, will: false }, bab: 1.0 },
  Cleric: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Druid: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Fighter: { hitDie: "d10", saves: { fort: true, ref: false, will: false }, bab: 1.0 },
  Gunslinger: { hitDie: "d10", saves: { fort: true, ref: true, will: false }, bab: 1.0 },
  Hunter: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Inquisitor: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Investigator: { hitDie: "d8", saves: { fort: false, ref: true, will: true }, bab: 0.75 },
  Kineticist: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Magus: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Medium: { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  Mesmerist: { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  Monk: { hitDie: "d8", saves: { fort: true, ref: true, will: true }, bab: 0.75 },
  "Monk (Unchained)": { hitDie: "d10", saves: { fort: true, ref: true, will: false }, bab: 1.0 },
  Ninja: { hitDie: "d8", saves: { fort: false, ref: true, will: false }, bab: 0.75 },
  Occultist: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Omdura: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Oracle: { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  Paladin: { hitDie: "d10", saves: { fort: true, ref: false, will: true }, bab: 1.0 },
  Psychic: { hitDie: "d6", saves: { fort: false, ref: false, will: true }, bab: 0.5 },
  Ranger: { hitDie: "d10", saves: { fort: true, ref: true, will: false }, bab: 1.0 },
  Rogue: { hitDie: "d8", saves: { fort: false, ref: true, will: false }, bab: 0.75 },
  "Rogue (Unchained)": { hitDie: "d8", saves: { fort: false, ref: true, will: false }, bab: 0.75 },
  Samurai: { hitDie: "d10", saves: { fort: true, ref: false, will: false }, bab: 1.0 },
  Shaman: { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  Shifter: { hitDie: "d8", saves: { fort: true, ref: true, will: false }, bab: 0.75 },
  Skald: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Slayer: { hitDie: "d10", saves: { fort: true, ref: true, will: false }, bab: 1.0 },
  Sorcerer: { hitDie: "d6", saves: { fort: false, ref: false, will: true }, bab: 0.5 },
  Spiritualist: { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  Summoner: { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  "Summoner (Unchained)": { hitDie: "d8", saves: { fort: false, ref: false, will: true }, bab: 0.75 },
  Swashbuckler: { hitDie: "d10", saves: { fort: false, ref: true, will: false }, bab: 0.75 },
  "Vampire Hunter": { hitDie: "d8", saves: { fort: false, ref: true, will: true }, bab: 1.0 },
  Vigilante: { hitDie: "d8", saves: { fort: false, ref: true, will: false }, bab: 0.75 },
  Warpriest: { hitDie: "d8", saves: { fort: true, ref: false, will: true }, bab: 0.75 },
  Witch: { hitDie: "d6", saves: { fort: false, ref: false, will: true }, bab: 0.5 },
  Wizard: { hitDie: "d6", saves: { fort: false, ref: false, will: true }, bab: 0.5 },
};

export const CLASS_NAMES = Object.keys(CLASS_STATS);

export function getClassStats(className: string): ClassStats | null {
  return CLASS_STATS[className] ?? null;
}

/**
 * Total BAB across classes — per-class floor(level * rate), summed
 * (matches the old sheet's BAB calculation block exactly).
 */
export function totalBab(classes: { className: string; level: number }[]): number {
  let bab = 0;
  for (const { className, level } of classes) {
    const stats = getClassStats(className);
    if (!stats || !level) continue;
    bab += Math.floor(level * stats.bab);
  }
  return bab;
}

export function totalLevel(classes: { className: string; level: number }[]): number {
  return classes.reduce((sum, c) => sum + (c.level || 0), 0);
}
