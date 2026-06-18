/**
 * Variant heritages: Blood of Fiends tieflings, Blood of Angels aasimars.
 * Each entry transcribed from aonprd.com (URL comment above each block) —
 * never authored from memory. A heritage REPLACES the base race's ability
 * modifiers, its "Skilled" skill bonuses (via replacesSources), and its
 * spell-like ability; size, speed, vision, resistances, languages, and the
 * remaining traits are kept. applyHeritage() is the single seam: it returns
 * an effective RaceData, so calc, notes, and the config summary all work
 * unmodified.
 */

import type { RaceData, RaceHeritage, RaceTrait } from "../types";

const tieflingSkilled = (
  alt: string,
  skillA: string,
  skillB: string,
): Pick<RaceHeritage, "replacesSources" | "modifiers"> => ({
  replacesSources: ["Tiefling: Skilled"],
  modifiers: [
    {
      target: `skill.${skillA}`,
      type: "racial",
      value: 2,
      source: `Tiefling (${alt}): Skilled`,
    },
    {
      target: `skill.${skillB}`,
      type: "racial",
      value: 2,
      source: `Tiefling (${alt}): Skilled`,
    },
  ],
});

// All 10 transcribed from https://www.aonprd.com/RacesDisplay.aspx?ItemName=Tiefling
// (heritages render on the aggregate page; per-heritage URLs 500), cross-
// checked against d20pfsrd with full agreement. SLAs replace Darkness 1/day;
// all are 1/day, caster level equals character level.
export const TIEFLING_HERITAGES: RaceHeritage[] = [
  // Blood of Fiends pg. 19
  {
    key: "asura-spawn",
    name: "Asura-Spawn (Faultspawn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { dex: 2, wis: 2, int: -2 },
    sla: "Hideous laughter 1/day (caster level equals character level).",
    slaSpells: [{ name: "Hideous Laughter", perDay: 1 }],
    ...tieflingSkilled("Faultspawn", "Appraise", "Knowledge (local)"),
  },
  // Blood of Fiends pg. 19
  {
    key: "daemon-spawn",
    name: "Daemon-Spawn (Grimspawn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { dex: 2, int: 2, wis: -2 },
    sla: "Death knell 1/day (caster level equals character level).",
    slaSpells: [{ name: "Death Knell", perDay: 1 }],
    ...tieflingSkilled("Grimspawn", "Disable Device", "Sleight of Hand"),
  },
  // Blood of Fiends pg. 20
  {
    key: "demodand-spawn",
    name: "Demodand-Spawn (Foulspawn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { con: 2, wis: 2, int: -2 },
    sla: "Bear's endurance 1/day (caster level equals character level).",
    slaSpells: [{ name: "Bear's Endurance", perDay: 1 }],
    ...tieflingSkilled("Foulspawn", "Intimidate", "Knowledge (religion)"),
  },
  // Blood of Fiends pg. 20
  {
    key: "demon-spawn",
    name: "Demon-Spawn (Pitborn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { str: 2, cha: 2, int: -2 },
    sla: "Shatter 1/day (caster level equals character level).",
    slaSpells: [{ name: "Shatter", perDay: 1 }],
    ...tieflingSkilled("Pitborn", "Disable Device", "Perception"),
  },
  // Blood of Fiends pg. 21
  {
    key: "devil-spawn",
    name: "Devil-Spawn (Hellspawn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { con: 2, wis: 2, cha: -2 },
    sla: "Pyrotechnics 1/day (caster level equals character level).",
    slaSpells: [{ name: "Pyrotechnics", perDay: 1 }],
    ...tieflingSkilled("Hellspawn", "Diplomacy", "Sense Motive"),
  },
  // Blood of Fiends pg. 21
  {
    key: "div-spawn",
    name: "Div-Spawn (Spitespawn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { dex: 2, cha: 2, int: -2 },
    sla: "Misdirection 1/day (caster level equals character level).",
    slaSpells: [{ name: "Misdirection", perDay: 1 }],
    ...tieflingSkilled("Spitespawn", "Diplomacy", "Linguistics"),
  },
  // Blood of Fiends pg. 22
  {
    key: "kyton-spawn",
    name: "Kyton-Spawn (Shackleborn)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { con: 2, cha: 2, wis: -2 },
    sla: "Web 1/day (caster level equals character level).",
    slaSpells: [{ name: "Web", perDay: 1 }],
    ...tieflingSkilled("Shackleborn", "Escape Artist", "Intimidate"),
  },
  // Blood of Fiends pg. 22
  {
    key: "oni-spawn",
    name: "Oni-Spawn (Hungerseed)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { str: 2, wis: 2, cha: -2 },
    sla: "Alter self 1/day (caster level equals character level).",
    slaSpells: [{ name: "Alter Self", perDay: 1 }],
    ...tieflingSkilled("Hungerseed", "Disguise", "Intimidate"),
  },
  // Blood of Fiends pg. 23
  {
    key: "qlippoth-spawn",
    name: "Qlippoth-Spawn (Motherless)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { str: 2, wis: 2, int: -2 },
    sla: "Blur 1/day (caster level equals character level).",
    slaSpells: [{ name: "Blur", perDay: 1 }],
    ...tieflingSkilled("Motherless", "Escape Artist", "Survival"),
  },
  // Blood of Fiends pg. 23
  {
    key: "rakshasa-spawn",
    name: "Rakshasa-Spawn (Beastbrood)",
    raceKey: "tiefling",
    source: "Blood of Fiends",
    abilityMods: { dex: 2, cha: 2, wis: -2 },
    sla: "Detect thoughts 1/day (caster level equals character level).",
    slaSpells: [{ name: "Detect Thoughts", perDay: 1 }],
    ...tieflingSkilled("Beastbrood", "Disguise", "Sense Motive"),
  },
];

// All 6 transcribed from https://www.aonprd.com/RacesDisplay.aspx?ItemName=Aasimar
// (same aggregate-page situation), cross-checked against d20pfsrd with full
// agreement. SLAs replace Daylight 1/day; all are 1/day.
export const AASIMAR_HERITAGES: RaceHeritage[] = [
  // Blood of Angels pg. 21
  {
    key: "agathion-blooded",
    name: "Agathion-Blooded (Idyllkin)",
    raceKey: "aasimar",
    source: "Blood of Angels",
    abilityMods: { con: 2, cha: 2 },
    sla: "Summon nature's ally II 1/day.",
    slaSpells: [{ name: "Summon Nature's Ally II", perDay: 1 }],
    replacesSources: ["Aasimar: Skilled"],
    modifiers: [
      {
        target: "skill.Handle Animal",
        type: "racial",
        value: 2,
        source: "Aasimar (Idyllkin): Skilled",
      },
      {
        target: "skill.Survival",
        type: "racial",
        value: 2,
        source: "Aasimar (Idyllkin): Skilled",
      },
    ],
  },
  // Blood of Angels pg. 21
  {
    key: "angel-blooded",
    name: "Angel-Blooded (Angelkin)",
    raceKey: "aasimar",
    source: "Blood of Angels",
    abilityMods: { str: 2, cha: 2 },
    sla: "Alter self 1/day.",
    slaSpells: [{ name: "Alter Self", perDay: 1 }],
    replacesSources: ["Aasimar: Skilled"],
    modifiers: [
      {
        target: "skill.Heal",
        type: "racial",
        value: 2,
        source: "Aasimar (Angelkin): Skilled",
      },
      {
        target: "skill.Knowledge (planes)",
        type: "racial",
        value: 2,
        source: "Aasimar (Angelkin): Skilled",
      },
    ],
  },
  // Blood of Angels pg. 22
  {
    key: "archon-blooded",
    name: "Archon-Blooded (Lawbringer)",
    raceKey: "aasimar",
    source: "Blood of Angels",
    abilityMods: { con: 2, wis: 2 },
    sla: "Continual flame 1/day.",
    slaSpells: [{ name: "Continual Flame", perDay: 1 }],
    replacesSources: ["Aasimar: Skilled"],
    modifiers: [
      {
        target: "skill.Intimidate",
        type: "racial",
        value: 2,
        source: "Aasimar (Lawbringer): Skilled",
      },
      {
        target: "skill.Sense Motive",
        type: "racial",
        value: 2,
        source: "Aasimar (Lawbringer): Skilled",
      },
    ],
  },
  // Blood of Angels pg. 22
  {
    key: "azata-blooded",
    name: "Azata-Blooded (Musetouched)",
    raceKey: "aasimar",
    source: "Blood of Angels",
    abilityMods: { dex: 2, cha: 2 },
    sla: "Glitterdust 1/day.",
    slaSpells: [{ name: "Glitterdust", perDay: 1 }],
    replacesSources: ["Aasimar: Skilled"],
    modifiers: [
      {
        target: "skill.Diplomacy",
        type: "racial",
        value: 2,
        source: "Aasimar (Musetouched): Skilled",
      },
      // Perform is a skill GROUP ("Perform (sing)" etc.) — no exact target
      // exists, so this rides as a conditional note, never auto-summed.
      {
        target: "skill.Perform (any)",
        type: "racial",
        value: 2,
        source: "Aasimar (Musetouched): Skilled",
        condition: "on all Perform checks",
      },
    ],
  },
  // Blood of Angels pg. 23
  {
    key: "garuda-blooded",
    name: "Garuda-Blooded (Plumekith)",
    raceKey: "aasimar",
    source: "Blood of Angels",
    abilityMods: { dex: 2, wis: 2 },
    sla: "See invisibility 1/day.",
    slaSpells: [{ name: "See Invisibility", perDay: 1 }],
    replacesSources: ["Aasimar: Skilled"],
    modifiers: [
      {
        target: "skill.Acrobatics",
        type: "racial",
        value: 2,
        source: "Aasimar (Plumekith): Skilled",
      },
      {
        target: "skill.Fly",
        type: "racial",
        value: 2,
        source: "Aasimar (Plumekith): Skilled",
      },
    ],
  },
  // Blood of Angels pg. 23
  {
    key: "peri-blooded",
    name: "Peri-Blooded (Emberkin)",
    raceKey: "aasimar",
    source: "Blood of Angels",
    abilityMods: { int: 2, cha: 2 },
    sla: "Pyrotechnics 1/day.",
    slaSpells: [{ name: "Pyrotechnics", perDay: 1 }],
    replacesSources: ["Aasimar: Skilled"],
    modifiers: [
      {
        target: "skill.Knowledge (planes)",
        type: "racial",
        value: 2,
        source: "Aasimar (Emberkin): Skilled",
      },
      {
        target: "skill.Spellcraft",
        type: "racial",
        value: 2,
        source: "Aasimar (Emberkin): Skilled",
      },
    ],
  },
];

export const HERITAGES_BY_RACE: Record<string, RaceHeritage[]> = {
  tiefling: TIEFLING_HERITAGES,
  aasimar: AASIMAR_HERITAGES,
};

export function listHeritages(raceKey: string): RaceHeritage[] {
  return HERITAGES_BY_RACE[raceKey] ?? [];
}

export function getHeritage(raceKey: string, key: string): RaceHeritage | null {
  return listHeritages(raceKey).find((h) => h.key === key) ?? null;
}

/** The base-race trait every heritage swaps out. */
const SLA_TRAIT = "Spell-Like Ability";

/**
 * Effective race for a heritage selection. Unknown or absent key returns
 * the base race unchanged (stale persisted keys are tolerated, not fatal).
 */
export function applyHeritage(race: RaceData, heritageKey?: string): RaceData {
  const heritage = heritageKey ? getHeritage(race.key, heritageKey) : null;
  if (!heritage) return race;
  const kept = race.modifiers.filter(
    (m) => !heritage.replacesSources.includes(m.source),
  );
  const traits: RaceTrait[] = [
    ...race.traits.map((t) =>
      t.name === SLA_TRAIT ? { name: SLA_TRAIT, summary: heritage.sla } : t,
    ),
    ...(heritage.traits ?? []),
  ];
  return {
    ...race,
    abilityMods: heritage.abilityMods,
    modifiers: [...kept, ...heritage.modifiers],
    traits,
    // heritage SLA replaces the base racial SLA (RAW); fall back to the base
    // race's when a heritage somehow lacks structured data.
    slaSpells: heritage.slaSpells ?? race.slaSpells,
  };
}
