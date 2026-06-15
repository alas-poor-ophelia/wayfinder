/**
 * Advanced Race Guide uncommon races (14). Mechanical traits expressed as
 * typed modifiers; conditional modifiers surface as notes, never auto-summed.
 * Source: PRD (legacy.aonprd.com/advancedRaceGuide/uncommonRaces/*.html), OGC.
 */

import type { RaceData } from "../types";

export const UNCOMMON_RACES: RaceData[] = [
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/changelings.html
  {
    key: "changeling",
    name: "Changeling",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { wis: 2, cha: 2, con: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "host society's language"],
    modifiers: [
      {
        target: "ac.natural",
        type: "natural",
        value: 1,
        source: "Changeling: Natural Armor",
      },
    ],
    traits: [
      {
        name: "Hag Racial Trait",
        summary:
          "One inherited trait by hag mother: Hulking Changeling (+1 racial melee damage), Green Widow (+2 Bluff vs attracted creatures), or Sea Lungs (hold breath 3x Con rounds).",
      },
      { name: "Claws", summary: "Two claw attacks dealing 1d4 damage each." },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/duergar.html
  {
    key: "duergar",
    name: "Duergar",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 20,
    abilityMods: { con: 2, wis: 2, cha: -4 },
    vision: ["darkvision120"],
    languages: ["Common", "Dwarven", "Undercommon"],
    modifiers: [
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Duergar: Duergar Immunities",
        condition: "vs spells and spell-like abilities",
      },
      {
        target: "cmd",
        type: "racial",
        value: 4,
        source: "Duergar: Stability",
        condition: "vs bull rush or trip while standing on the ground",
      },
    ],
    traits: [
      {
        name: "Duergar Immunities",
        summary: "Immune to paralysis, phantasms, and poison.",
      },
      {
        name: "Slow and Steady",
        summary: "Speed is never modified by armor or encumbrance.",
      },
      {
        name: "Light Sensitivity",
        summary: "Dazzled in areas of bright light.",
      },
      {
        name: "Spell-Like Abilities",
        summary:
          "1/day each: enlarge person and invisibility (self only, CL = character level).",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/gillmen.html
  {
    key: "gillman",
    name: "Gillman",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { con: 2, cha: 2, wis: -2 },
    vision: ["normal"],
    languages: ["Common", "Aboleth"],
    modifiers: [
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Gillman: Enchantment Resistance",
        condition: "vs non-aboleth enchantment spells and effects",
      },
      {
        target: "save.all",
        type: "racial",
        value: -2,
        source: "Gillman: Enchantment Resistance",
        condition: "vs enchantments from aboleths and aboleth magic items",
      },
    ],
    traits: [
      {
        name: "Amphibious",
        summary:
          "Aquatic subtype; breathes both water and air. Swim speed 30 ft.",
      },
      {
        name: "Water Dependent",
        summary:
          "Must fully submerge in water daily or risk internal organ failure and death within 4d6 hours.",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/gripplis.html
  {
    key: "grippli",
    name: "Grippli",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "small",
    speed: 30,
    abilityMods: { dex: 2, wis: 2, str: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Grippli"],
    modifiers: [
      {
        target: "skill.Stealth",
        type: "racial",
        value: 4,
        source: "Grippli: Camouflage",
        condition: "in marshes and forested areas",
      },
    ],
    traits: [
      { name: "Climber", summary: "Climb speed of 20 feet." },
      {
        name: "Swamp Stride",
        summary:
          "Moves through difficult terrain at normal speed within a swamp (magically altered terrain affects normally).",
      },
      { name: "Weapon Familiarity", summary: "Proficient with nets." },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/kitsune.html
  {
    key: "kitsune",
    name: "Kitsune",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, str: -2 },
    vision: ["low-light"],
    languages: ["Common", "Sylvan"],
    modifiers: [
      {
        target: "skill.Acrobatics",
        type: "racial",
        value: 2,
        source: "Kitsune: Agile",
      },
      {
        target: "skill.Disguise",
        type: "racial",
        value: 10,
        source: "Kitsune: Change Shape",
        condition: "to appear human while in human form",
      },
    ],
    traits: [
      {
        name: "Change Shape",
        summary:
          "Assume a specific human form (as alter self, no ability adjustments) as a standard action; no bite attack while transformed.",
      },
      {
        name: "Kitsune Magic",
        summary:
          "+1 DC on enchantment spells cast; with Cha 11+, dancing lights 3/day (CL = character level).",
      },
      {
        name: "Natural Weapons",
        summary: "Bite attack dealing 1d4 damage in natural form.",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/merfolk.html
  {
    key: "merfolk",
    name: "Merfolk",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 5,
    abilityMods: { dex: 2, con: 2, cha: 2 },
    vision: ["low-light"],
    languages: ["Common", "Aquan"],
    modifiers: [
      {
        target: "ac.natural",
        type: "natural",
        value: 2,
        source: "Merfolk: Natural Armor",
      },
    ],
    traits: [
      {
        name: "Amphibious",
        summary:
          "Aquatic subtype; breathes both water and air. Swim speed 50 ft (land speed only 5 ft).",
      },
      { name: "Legless", summary: "Has no legs and cannot be tripped." },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/nagaji.html
  {
    key: "nagaji",
    name: "Nagaji",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { str: 2, cha: 2, int: -2 },
    vision: ["low-light"],
    languages: ["Common", "Draconic"],
    modifiers: [
      {
        target: "ac.natural",
        type: "natural",
        value: 1,
        source: "Nagaji: Armored Scales",
      },
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Nagaji: Resistant",
        condition: "vs mind-affecting effects and poison",
      },
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Nagaji: Serpent's Sense",
      },
      {
        target: "skill.Handle Animal",
        type: "racial",
        value: 2,
        source: "Nagaji: Serpent's Sense",
        condition: "on checks against reptiles",
      },
    ],
    traits: [],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/samsarans.html
  {
    key: "samsaran",
    name: "Samsaran",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { int: 2, wis: 2, con: -2 },
    vision: ["low-light"],
    languages: ["Common", "Samsaran"],
    modifiers: [
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Samsaran: Lifebound",
        condition:
          "vs death effects and negative energy, Fort saves to remove negative levels, and Con checks to stabilize",
      },
    ],
    traits: [
      {
        name: "Samsaran Magic",
        summary:
          "With Cha 11+: comprehend languages, deathwatch, and stabilize each 1/day (CL = character level).",
      },
      {
        name: "Shards of the Past",
        summary:
          "Choose two skills: +2 racial bonus on each, and both are always class skills.",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/strix.html
  {
    key: "strix",
    name: "Strix",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: -2 },
    vision: ["low-light", "darkvision60"],
    languages: ["Strix"],
    modifiers: [
      {
        target: "attack.all",
        type: "racial",
        value: 1,
        source: "Strix: Hatred",
        condition: "vs humanoid creatures with the human subtype",
      },
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Strix: Nocturnal",
        condition: "in dim light or darkness",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Strix: Nocturnal",
        condition: "in dim light or darkness",
      },
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Strix: Suspicious",
        condition: "vs illusion spells and effects",
      },
    ],
    traits: [
      {
        name: "Flight",
        summary: "Fly speed of 60 feet (average maneuverability).",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/sulis.html
  {
    key: "suli",
    name: "Suli",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { str: 2, cha: 2, int: -2 },
    vision: ["low-light"],
    languages: [
      "Common",
      "one elemental tongue (Aquan, Auran, Ignan, or Terran)",
    ],
    modifiers: [
      {
        target: "skill.Diplomacy",
        type: "racial",
        value: 2,
        source: "Suli: Negotiator",
      },
      {
        target: "skill.Sense Motive",
        type: "racial",
        value: 2,
        source: "Suli: Negotiator",
      },
      {
        target: "energyRes.acid",
        type: "racial",
        value: 5,
        source: "Suli: Energy Resistance",
      },
      {
        target: "energyRes.cold",
        type: "racial",
        value: 5,
        source: "Suli: Energy Resistance",
      },
      {
        target: "energyRes.electricity",
        type: "racial",
        value: 5,
        source: "Suli: Energy Resistance",
      },
      {
        target: "energyRes.fire",
        type: "racial",
        value: 5,
        source: "Suli: Energy Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Elemental Assault",
        summary:
          "1/day swift action: shroud arms in acid, cold, electricity, or fire for 1 round/level; unarmed strikes and held weapons deal +1d6 of that energy type.",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/svirfneblins.html
  {
    key: "svirfneblin",
    name: "Svirfneblin",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "small",
    speed: 20,
    abilityMods: { dex: 2, wis: 2, str: -2, cha: -4 },
    vision: ["darkvision120", "low-light"],
    languages: ["Gnome", "Undercommon"],
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Svirfneblin: Defensive Training",
      },
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Svirfneblin: Fortunate",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Svirfneblin: Skilled",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 4,
        source: "Svirfneblin: Skilled",
        condition: "underground (replaces the base +2)",
      },
      {
        target: "skill.Craft (any)",
        type: "racial",
        value: 2,
        source: "Svirfneblin: Skilled",
        condition: "on Craft (alchemy) checks",
      },
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Svirfneblin: Skilled",
      },
      {
        target: "attack.all",
        type: "untyped",
        value: 1,
        source: "Svirfneblin: Hatred",
        condition: "vs humanoids of the reptilian and dwarf subtypes",
      },
      {
        target: "skill.Perception",
        type: "untyped",
        value: 2,
        source: "Svirfneblin: Stonecunning",
        condition: "to notice unusual stonework",
      },
      {
        target: "sr",
        type: "racial",
        value: 11,
        source: "Svirfneblin: Spell Resistance",
        condition: "SR equals 11 + class levels",
      },
    ],
    traits: [
      {
        name: "Stonecunning",
        summary:
          "Free Perception check within 10 ft of unusual stonework (as dwarves).",
      },
      {
        name: "Svirfneblin Magic",
        summary:
          "+1 DC on illusion spells cast; constant nondetection; 1/day each: blindness/deafness, blur, disguise self.",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/vanaras.html
  {
    key: "vanara",
    name: "Vanara",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, wis: 2, cha: -2 },
    vision: ["low-light"],
    languages: ["Common", "Vanaran"],
    modifiers: [
      {
        target: "skill.Acrobatics",
        type: "racial",
        value: 2,
        source: "Vanara: Nimble",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Vanara: Nimble",
      },
    ],
    traits: [
      { name: "Climber", summary: "Climb speed of 20 feet." },
      {
        name: "Prehensile Tail",
        summary:
          "Tail can retrieve a small stowed object on her person as a swift action (cannot wield weapons).",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/vishkanyas.html
  {
    key: "vishkanya",
    name: "Vishkanya",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, wis: -2 },
    vision: ["low-light"],
    languages: ["Common", "Vishkanya"],
    modifiers: [
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Vishkanya: Keen Senses",
      },
      {
        target: "skill.Escape Artist",
        type: "racial",
        value: 2,
        source: "Vishkanya: Limber",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Vishkanya: Limber",
      },
    ],
    traits: [
      {
        name: "Poison Resistance",
        summary:
          "Racial bonus on saves vs poison equal to Hit Dice (scales with level, so not a fixed modifier).",
      },
      {
        name: "Poison Use",
        summary:
          "Never accidentally self-poisons when using or applying poison.",
      },
      {
        name: "Toxic",
        summary:
          "Con mod times/day (min 1), swift action: envenom a weapon with saliva or blood (1d2 Dex damage, Fort DC 10 + 1/2 HD + Con mod, 6 rounds).",
      },
      {
        name: "Weapon Familiarity",
        summary: "Proficient with blowguns, kukri, and shuriken.",
      },
    ],
  },
  // http://legacy.aonprd.com/advancedRaceGuide/uncommonRaces/wayangs.html
  {
    key: "wayang",
    name: "Wayang",
    category: "uncommon",
    source: "Advanced Race Guide",
    size: "small",
    speed: 20,
    abilityMods: { dex: 2, int: 2, wis: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Wayang"],
    modifiers: [
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Wayang: Lurker",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Wayang: Lurker",
      },
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Wayang: Shadow Resistance",
        condition: "vs spells of the shadow subschool",
      },
    ],
    traits: [
      {
        name: "Light and Dark",
        summary:
          "1/day immediate action: treat positive and negative energy as if undead (healed by negative, harmed by positive) for 1 minute.",
      },
      {
        name: "Shadow Magic",
        summary:
          "+1 DC on shadow-subschool spells cast; with Cha 11+: ghost sound, pass without trace, and ventriloquism each 1/day.",
      },
    ],
  },
];
