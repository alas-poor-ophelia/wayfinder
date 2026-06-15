/**
 * Advanced Race Guide featured races (16). Mechanical traits expressed as
 * typed modifiers; conditional modifiers surface as notes, never auto-summed.
 * Each entry verified against aonprd.com (URL in the comment above it). OGC.
 */

import type { RaceData } from "../types";

export const FEATURED_RACES: RaceData[] = [
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Aasimar
  {
    key: "aasimar",
    name: "Aasimar",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { wis: 2, cha: 2 },
    vision: ["darkvision60"],
    languages: ["Common", "Celestial"],
    modifiers: [
      {
        target: "skill.Diplomacy",
        type: "racial",
        value: 2,
        source: "Aasimar: Skilled",
      },
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Aasimar: Skilled",
      },
      {
        target: "energyRes.acid",
        type: "racial",
        value: 5,
        source: "Aasimar: Celestial Resistance",
      },
      {
        target: "energyRes.cold",
        type: "racial",
        value: 5,
        source: "Aasimar: Celestial Resistance",
      },
      {
        target: "energyRes.electricity",
        type: "racial",
        value: 5,
        source: "Aasimar: Celestial Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Spell-Like Ability",
        summary: "Daylight 1/day (caster level equals character level).",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Catfolk
  {
    key: "catfolk",
    name: "Catfolk",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, wis: -2 },
    vision: ["low-light"],
    languages: ["Common", "Catfolk"],
    modifiers: [
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Catfolk: Natural Hunter",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Catfolk: Natural Hunter",
      },
      {
        target: "skill.Survival",
        type: "racial",
        value: 2,
        source: "Catfolk: Natural Hunter",
      },
      {
        target: "speed",
        type: "racial",
        value: 10,
        source: "Catfolk: Sprinter",
        condition: "when using the charge, run, or withdraw actions",
      },
    ],
    traits: [
      {
        name: "Cat's Luck",
        summary:
          "1/day, roll a Reflex save twice and take the better result (decide before rolling).",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Dhampir
  {
    key: "dhampir",
    name: "Dhampir",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, con: -2 },
    vision: ["low-light", "darkvision60"],
    languages: ["Common"],
    modifiers: [
      {
        target: "skill.Bluff",
        type: "racial",
        value: 2,
        source: "Dhampir: Manipulative",
      },
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Dhampir: Manipulative",
      },
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Dhampir: Undead Resistance",
        condition: "vs disease and mind-affecting effects",
      },
    ],
    traits: [
      {
        name: "Light Sensitivity",
        summary:
          "Dazzled in bright sunlight or within the radius of a daylight spell.",
      },
      {
        name: "Negative Energy Affinity",
        summary: "Positive energy harms, negative energy heals (as undead).",
      },
      {
        name: "Resist Level Drain",
        summary:
          "No penalties from energy drain; negative levels fade after 24 hours without a save.",
      },
      {
        name: "Spell-Like Ability",
        summary: "Detect undead 3/day (caster level equals character level).",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Drow
  {
    key: "drow",
    name: "Drow",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, con: -2 },
    vision: ["darkvision120"],
    languages: ["Elven", "Undercommon"],
    modifiers: [
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Drow: Keen Senses",
      },
      {
        target: "save.all",
        type: "racial",
        value: 2,
        source: "Drow: Drow Immunities",
        condition: "vs enchantment spells and effects",
      },
      {
        target: "sr",
        type: "racial",
        value: 6,
        source: "Drow: Spell Resistance",
        condition: "SR equals 6 + character level",
      },
    ],
    traits: [
      { name: "Drow Immunities", summary: "Immune to magic sleep effects." },
      {
        name: "Poison Use",
        summary:
          "Never risk accidentally poisoning themselves when applying poison.",
      },
      {
        name: "Spell-Like Abilities",
        summary:
          "Dancing lights, darkness, and faerie fire each 1/day (caster level equals character level).",
      },
      {
        name: "Light Blindness",
        summary:
          "Abrupt exposure to bright light blinds for 1 round, then dazzled while in the area.",
      },
      {
        name: "Weapon Familiarity",
        summary: "Proficient with hand crossbows, rapiers, and short swords.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Fetchling
  {
    key: "fetchling",
    name: "Fetchling",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, wis: -2 },
    vision: ["darkvision60", "low-light"],
    languages: ["Common"],
    modifiers: [
      {
        target: "skill.Knowledge (planes)",
        type: "racial",
        value: 2,
        source: "Fetchling: Skilled",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Fetchling: Skilled",
      },
      {
        target: "energyRes.cold",
        type: "racial",
        value: 5,
        source: "Fetchling: Shadowy Resistance",
      },
      {
        target: "energyRes.electricity",
        type: "racial",
        value: 5,
        source: "Fetchling: Shadowy Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Shadow Blending",
        summary:
          "Attacks against a fetchling in dim light have a 50% miss chance instead of 20%.",
      },
      {
        name: "Spell-Like Abilities",
        summary:
          "Disguise self 1/day; shadow walk (self only) 1/day at 9th level; plane shift (self only, Shadow/Material) 1/day at 13th level.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Goblin
  {
    key: "goblin",
    name: "Goblin",
    category: "featured",
    source: "Advanced Race Guide",
    size: "small",
    speed: 30,
    abilityMods: { dex: 4, str: -2, cha: -2 },
    vision: ["darkvision60"],
    languages: ["Goblin"],
    modifiers: [
      {
        target: "skill.Ride",
        type: "racial",
        value: 4,
        source: "Goblin: Skilled",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 4,
        source: "Goblin: Skilled",
      },
    ],
    traits: [
      { name: "Fast", summary: "Base speed 30 feet despite small size." },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Hobgoblin
  {
    key: "hobgoblin",
    name: "Hobgoblin",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, con: 2 },
    vision: ["darkvision60"],
    languages: ["Common", "Goblin"],
    modifiers: [
      {
        target: "skill.Stealth",
        type: "racial",
        value: 4,
        source: "Hobgoblin: Sneaky",
      },
    ],
    traits: [],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Ifrit
  {
    key: "ifrit",
    name: "Ifrit",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, cha: 2, wis: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Ignan"],
    modifiers: [
      {
        target: "energyRes.fire",
        type: "racial",
        value: 5,
        source: "Ifrit: Energy Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Spell-Like Ability",
        summary:
          "Burning hands 1/day (caster level equals character level; DC 11 + Cha modifier).",
      },
      {
        name: "Fire Affinity",
        summary:
          "Elemental (fire) bloodline sorcerers treat Cha as 2 higher; Fire-domain casters at +1 caster level for domain powers and spells.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Kobold
  {
    key: "kobold",
    name: "Kobold",
    category: "featured",
    source: "Advanced Race Guide",
    size: "small",
    speed: 30,
    abilityMods: { dex: 2, str: -4, con: -2 },
    vision: ["darkvision60"],
    languages: ["Draconic"],
    modifiers: [
      {
        target: "ac.natural",
        type: "natural",
        value: 1,
        source: "Kobold: Natural Armor",
      },
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Kobold: Crafty",
      },
      {
        target: "skill.Craft (any)",
        type: "racial",
        value: 2,
        source: "Kobold: Crafty",
        condition: "on Craft (traps) checks only",
      },
      {
        target: "skill.Profession (any)",
        type: "racial",
        value: 2,
        source: "Kobold: Crafty",
        condition: "on Profession (miner) checks only",
      },
    ],
    traits: [
      {
        name: "Crafty",
        summary: "Craft (traps) and Stealth are always class skills.",
      },
      {
        name: "Light Sensitivity",
        summary: "Dazzled in areas of bright light.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Orc
  {
    key: "orc",
    name: "Orc",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { str: 4, int: -2, wis: -2, cha: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Orc"],
    modifiers: [],
    traits: [
      {
        name: "Ferocity",
        summary:
          "Remains conscious and can keep fighting below 0 hp; still staggered and losing 1 hp per round.",
      },
      {
        name: "Light Sensitivity",
        summary:
          "Dazzled in bright sunlight or within the radius of a daylight spell.",
      },
      {
        name: "Weapon Familiarity",
        summary:
          "Proficient with greataxes and falchions; 'orc' weapons are martial.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Oread
  {
    key: "oread",
    name: "Oread",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 20,
    abilityMods: { str: 2, wis: 2, cha: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Terran"],
    modifiers: [
      {
        target: "energyRes.acid",
        type: "racial",
        value: 5,
        source: "Oread: Energy Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Spell-Like Ability",
        summary:
          "Magic stone 1/day (caster level equals character level; DC 11 + Cha modifier).",
      },
      {
        name: "Earth Affinity",
        summary:
          "Elemental (earth) bloodline sorcerers treat Cha as 2 higher; Earth-domain clerics at +1 caster level for domain powers and spells.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Ratfolk
  {
    key: "ratfolk",
    name: "Ratfolk",
    category: "featured",
    source: "Advanced Race Guide",
    size: "small",
    speed: 20,
    abilityMods: { dex: 2, int: 2, str: -2 },
    vision: ["darkvision60"],
    languages: ["Common"],
    modifiers: [
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Ratfolk: Tinker",
      },
      {
        target: "skill.Use Magic Device",
        type: "racial",
        value: 2,
        source: "Ratfolk: Tinker",
      },
      {
        target: "skill.Craft (any)",
        type: "racial",
        value: 2,
        source: "Ratfolk: Tinker",
        condition: "on Craft (alchemy) checks only",
      },
      {
        target: "skill.Handle Animal",
        type: "racial",
        value: 4,
        source: "Ratfolk: Rodent Empathy",
        condition: "to influence rodents",
      },
    ],
    traits: [
      {
        name: "Swarming",
        summary:
          "Two ratfolk can share a square; both attacking the same foe count as flanking it.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Sylph
  {
    key: "sylph",
    name: "Sylph",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, int: 2, con: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Auran"],
    modifiers: [
      {
        target: "energyRes.electricity",
        type: "racial",
        value: 5,
        source: "Sylph: Energy Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Spell-Like Ability",
        summary: "Feather fall 1/day (caster level equals character level).",
      },
      {
        name: "Air Affinity",
        summary:
          "Elemental (air) bloodline sorcerers treat Cha as 2 higher; Air-domain casters at +1 caster level for domain powers and spells.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Tengu
  {
    key: "tengu",
    name: "Tengu",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, wis: 2, con: -2 },
    vision: ["low-light"],
    languages: ["Common", "Tengu"],
    modifiers: [
      {
        target: "skill.Perception",
        type: "racial",
        value: 2,
        source: "Tengu: Sneaky",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Tengu: Sneaky",
      },
      {
        target: "skill.Linguistics",
        type: "racial",
        value: 4,
        source: "Tengu: Gifted Linguist",
      },
    ],
    traits: [
      {
        name: "Gifted Linguist",
        summary: "Learns two languages per rank in Linguistics instead of one.",
      },
      {
        name: "Swordtrained",
        summary:
          "Proficient with swordlike weapons (bastard sword, dagger, elven curve blade, falchion, greatsword, kukri, longsword, punching dagger, rapier, scimitar, short sword, two-bladed sword).",
      },
      { name: "Natural Weapon", summary: "Bite attack dealing 1d3 damage." },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Tiefling
  {
    key: "tiefling",
    name: "Tiefling",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, int: 2, cha: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Abyssal or Infernal"],
    modifiers: [
      {
        target: "skill.Bluff",
        type: "racial",
        value: 2,
        source: "Tiefling: Skilled",
      },
      {
        target: "skill.Stealth",
        type: "racial",
        value: 2,
        source: "Tiefling: Skilled",
      },
      {
        target: "energyRes.cold",
        type: "racial",
        value: 5,
        source: "Tiefling: Fiendish Resistance",
      },
      {
        target: "energyRes.electricity",
        type: "racial",
        value: 5,
        source: "Tiefling: Fiendish Resistance",
      },
      {
        target: "energyRes.fire",
        type: "racial",
        value: 5,
        source: "Tiefling: Fiendish Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      {
        name: "Spell-Like Ability",
        summary: "Darkness 1/day (caster level equals character level).",
      },
      {
        name: "Fiendish Sorcery",
        summary:
          "Abyssal or Infernal bloodline sorcerers treat Cha as 2 higher for sorcerer class abilities.",
      },
    ],
  },
  // https://www.aonprd.com/RacesDisplay.aspx?ItemName=Undine
  {
    key: "undine",
    name: "Undine",
    category: "featured",
    source: "Advanced Race Guide",
    size: "medium",
    speed: 30,
    abilityMods: { dex: 2, wis: 2, str: -2 },
    vision: ["darkvision60"],
    languages: ["Common", "Aquan"],
    modifiers: [
      {
        target: "energyRes.cold",
        type: "racial",
        value: 5,
        source: "Undine: Energy Resistance",
      },
    ],
    traits: [
      { name: "Native Outsider", summary: "Outsider with the native subtype." },
      { name: "Swim", summary: "Swim speed of 30 feet." },
      {
        name: "Spell-Like Ability",
        summary: "Hydraulic push 1/day (caster level equals character level).",
      },
      {
        name: "Water Affinity",
        summary:
          "Elemental (water) bloodline sorcerers treat Cha as 2 higher; Water-domain clerics at +1 caster level for domain powers and spells.",
      },
    ],
  },
];
