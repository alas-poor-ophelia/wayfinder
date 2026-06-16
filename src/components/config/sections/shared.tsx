/**
 * Shared helpers, constants, and the SectionProps prop type used by 2+ config
 * section modules. Moved verbatim from the original sections.tsx barrel.
 */
import { getClassStats, totalLevel } from "../../../calc/class-stats";
import { RACE_DATA, RACE_KEYS } from "../../../data/races";
import type { RaceData, RaceHeritage } from "../../../data/types";
import type { MiniSheetStore } from "../../../state/store";
import {
  ABILITY_KEYS,
  type AbilityKey,
  type CharacterRecord,
} from "../../../types/character";

export interface SectionProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

export const ABILITY_LABELS: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};
export const ABIL: [string, string][] = ABILITY_KEYS.map((k) => [
  k,
  ABILITY_LABELS[k]!,
]);
export const ENERGY: [string, string, string][] = [
  ["cold", "Cold", "ra-snowflake"],
  ["fire", "Fire", "ra-fire"],
  ["acid", "Acid", "ra-acid"],
  ["electricity", "Electricity", "ra-lightning-bolt"],
  ["sonic", "Sonic", "ra-bell"],
];

export function formatMods(mods: Partial<Record<AbilityKey, number>>): string {
  const parts = ABILITY_KEYS.filter((k) => mods[k]).map((k) => {
    const v = mods[k]!;
    return `${v > 0 ? "+" : ""}${v} ${ABILITY_LABELS[k]}`;
  });
  return parts.length ? parts.join(", ") : "no ability modifiers";
}

export const CUSTOM_RACE = "(custom)";
export const BASE_HERITAGE = "— (base)";
export const RACE_NAME_OPTIONS = RACE_KEYS.map(
  (k) => RACE_DATA[k]!.name,
).sort();

export function setter(store: MiniSheetStore, character: CharacterRecord) {
  return (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);
}

/* ============================== CHARACTER ============================== */

const VISION_LABELS: Record<string, string> = {
  "low-light": "low-light vision",
  darkvision60: "darkvision 60 ft",
  darkvision120: "darkvision 120 ft",
};

/** One formatted block for the effective race: ability mods, size, speed,
 *  senses, plus the heritage's spell-like ability + source when present.
 *  Single source of truth — no duplicate inline summary. */
export function RaceDetail({
  race,
  heritage,
}: {
  race: RaceData;
  heritage: RaceHeritage | null;
}) {
  const senses = race.vision
    .filter((v) => v !== "normal")
    .map((v) => VISION_LABELS[v] ?? v)
    .join(", ");
  const rows: [string, string][] = [
    [
      "Ability",
      race.flexibleAbility ? "+2 to one ability" : formatMods(race.abilityMods),
    ],
    ["Size", race.size === "small" ? "Small" : "Medium"],
    ["Speed", `${race.speed} ft`],
  ];
  if (senses) rows.push(["Senses", senses]);
  if (heritage) {
    rows.push(["Spell-like", heritage.sla]);
    rows.push(["Source", heritage.source]);
  }
  return (
    <div class="race-detail">
      {rows.map(([label, value]) => (
        <div class="race-detail__row" key={label}>
          <span class="race-detail__lbl">{label}</span>
          <span class="race-detail__val">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** PF average HP: first character level = max die, every other HD = die/2+1,
 *  plus CON mod × total level. Derived from stored hit dice + levels + CON. */
export function hpBreakdown(character: CharacterRecord): string {
  const lines: string[] = [];
  let total = 0;
  character.classes.forEach((c, i) => {
    const die = getClassStats(c.className)?.hitDie ?? "d8";
    const dieMax = parseInt(die.slice(1), 10) || 8;
    const avg = dieMax / 2 + 1;
    const level = c.level || 0;
    let hp = 0;
    if (level > 0) hp = i === 0 ? dieMax + (level - 1) * avg : level * avg;
    total += hp;
    lines.push(`${level}×${die} ${c.className}:  ${hp}`);
  });
  const conMod = Math.floor((character.baseAbilities.con - 10) / 2);
  const level = totalLevel(character.classes);
  const conTotal = conMod * level;
  total += conTotal;
  lines.push(
    `CON ${conMod >= 0 ? "+" : ""}${conMod} × ${level} levels:  ${conTotal}`,
  );
  return `${lines.join("\n")}\n────────────\nAverage max HP:  ${total}`;
}
