/**
 * Buff registry — the 14 legacy hardcoded buffs as typed modifiers on the
 * modifier engine (RAW FIX 2026-06: buffs previously flat-added inside
 * calculateConditionEffects with no bonus-type stacking).
 *
 * Documented departures from the legacy handlers:
 *  - bless: legacy gave +1 to ALL saves unconditionally; RAW is +1 morale
 *    vs fear only (now a conditional modifier, surfaced as a note).
 *  - magic weapon: now a real enhancement bonus — it no longer stacks with
 *    a weapon's own enhancement (legacy summed them).
 *  - shield/mage armor: typed shield/armor bonuses — each suppresses other
 *    bonuses of its own type instead of always adding.
 *
 * Size/action machinery that is not modifier-shaped (enlarge, Blessing of
 * Fervor's choice, haste's extra attack + speed) stays in conditions.ts —
 * the `special` key marks those.
 */

import type { Modifier } from "../calc/modifiers";

export interface BuffDef {
  key: string;
  name: string;
  modifiers: Modifier[];
  /** display line appended to the combat tab's buff notes */
  note?: string;
  /** machinery handled by calculateConditionEffects */
  special?: "enlarge" | "blessingOfFervor" | "haste";
}

const ability = (
  key: string,
  name: string,
  target: Modifier["target"],
  stat: string,
): BuffDef => ({
  key,
  name,
  modifiers: [{ target, type: "enhancement", value: 4, source: name }],
  note: `- ${name}: +4 enhancement bonus to ${stat}`,
});

export const BUFF_DEFS: BuffDef[] = [
  { key: "enlarged", name: "Enlarged", modifiers: [], special: "enlarge" },
  {
    key: "haste",
    name: "Haste",
    special: "haste", // speed ×1.5 + extra attack (no-stack with BoF)
    modifiers: [
      { target: "attack.all", type: "untyped", value: 1, source: "Haste" },
      { target: "ac.all", type: "dodge", value: 1, source: "Haste" },
      { target: "save.ref", type: "dodge", value: 1, source: "Haste" },
    ],
    note: "- Haste: +1 attack/AC/Ref, +30ft speed, extra attack at full BAB",
  },
  {
    key: "blessing of fervor",
    name: "Blessing of Fervor",
    modifiers: [],
    special: "blessingOfFervor",
  },
  ability("bull's strength", "Bull's Strength", "ability.str", "Strength"),
  ability("cat's grace", "Cat's Grace", "ability.dex", "Dexterity"),
  ability(
    "bear's endurance",
    "Bear's Endurance",
    "ability.con",
    "Constitution",
  ),
  ability("fox's cunning", "Fox's Cunning", "ability.int", "Intelligence"),
  ability("owl's wisdom", "Owl's Wisdom", "ability.wis", "Wisdom"),
  ability("eagle's splendor", "Eagle's Splendor", "ability.cha", "Charisma"),
  {
    key: "bless",
    name: "Bless",
    // RAW FIX: the save bonus applies vs fear only (legacy: all saves, always)
    modifiers: [
      { target: "attack.all", type: "morale", value: 1, source: "Bless" },
      {
        target: "save.all",
        type: "morale",
        value: 1,
        source: "Bless",
        condition: "vs fear",
      },
    ],
    note: "- Bless: +1 morale bonus on attack rolls and saving throws against fear effects",
  },
  {
    key: "barkskin",
    name: "Barkskin",
    modifiers: [
      {
        target: "ac.natural",
        type: "enhancement",
        value: 2,
        source: "Barkskin",
      },
    ],
    note: "- Barkskin: +2 enhancement bonus to natural armor (does not apply to touch AC)",
  },
  {
    key: "magic weapon",
    name: "Magic Weapon",
    // enhancement rides the weapon-enhancement input: damage follows
    modifiers: [
      {
        target: "attack.melee",
        type: "enhancement",
        value: 1,
        source: "Magic Weapon",
      },
    ],
    note: "- Magic Weapon: +1 enhancement bonus to weapon attacks and damage",
  },
  {
    key: "shield",
    name: "Shield",
    modifiers: [
      { target: "ac.all", type: "shield", value: 4, source: "Shield" },
    ],
    note: "- Shield: +4 shield bonus to AC (does not apply to touch AC)",
  },
  {
    key: "mage armor",
    name: "Mage Armor",
    modifiers: [
      { target: "ac.all", type: "armor", value: 4, source: "Mage Armor" },
    ],
    note: "- Mage Armor: +4 armor bonus to AC (does not apply to touch AC)",
  },
];

const BY_KEY = new Map(BUFF_DEFS.map((d) => [d.key, d]));
// legacy alias kept selectable data-side (the chips list uses BUFF_DEFS)
BY_KEY.set("enlarge person", BY_KEY.get("enlarged")!);

export function getBuffDef(key: string): BuffDef | undefined {
  return BY_KEY.get(key);
}
