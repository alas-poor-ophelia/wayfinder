/**
 * One-line effect summaries + display labels for the Adjustments tab chips and
 * the "Now Active" tray. These are RAW paraphrases (authored for the redesign
 * handoff) shown on hover/in tokens — the authoritative mechanical effects live
 * in src/calc/conditions.ts (CONDITION_EFFECTS) and src/data/buffs.ts (modifier
 * tables); these strings are spot-checked against those, not the source of truth.
 *
 * Keys match CONDITION_NAMES (conditions.ts) and BUFF_DEFS.key (buffs.ts) exactly.
 */

export interface ConditionMeta {
  label: string;
  eff: string;
}

/** Display label + short effect per selectable condition (CONDITION_NAMES order). */
export const CONDITION_META: Record<string, ConditionMeta> = {
  blinded: { label: "Blinded", eff: "−2 AC, lose Dex to AC, 50% miss, half speed" },
  confused: { label: "Confused", eff: "Acts randomly each round" },
  dazed: { label: "Dazed", eff: "Can take no actions" },
  deafened: { label: "Deafened", eff: "−4 initiative, 20% spell failure" },
  entangled: { label: "Entangled", eff: "−2 attack, −4 Dex, half speed" },
  exhausted: { label: "Exhausted", eff: "−6 Str & Dex, half speed" },
  fatigued: { label: "Fatigued", eff: "−2 Str & Dex, can’t run or charge" },
  "flat-footed": { label: "Flat-Footed", eff: "Lose Dex to AC, no attacks of opportunity" },
  frightened: { label: "Frightened", eff: "−2 attack/saves/skills, must flee" },
  grappled: { label: "Grappled", eff: "−4 Dex, −2 attack, cannot move" },
  helpless: { label: "Helpless", eff: "Dex 0; melee foes auto-hit & may crit" },
  nauseated: { label: "Nauseated", eff: "Only a single move action per turn" },
  panicked: { label: "Panicked", eff: "−2 saves, drops items, must flee" },
  paralyzed: { label: "Paralyzed", eff: "Str & Dex 0, cannot move or act" },
  prone: { label: "Prone", eff: "−4 melee attack, +4 AC vs ranged" },
  shaken: { label: "Shaken", eff: "−2 attack, saves & skill checks" },
  sickened: { label: "Sickened", eff: "−2 attack, damage, saves & skills" },
  staggered: { label: "Staggered", eff: "Only one action (move or standard) per turn" },
  stunned: { label: "Stunned", eff: "Drops items, −2 AC, lose Dex to AC" },
};

/** Short effect per registry buff, keyed by BUFF_DEFS.key. */
export const BUFF_EFF: Record<string, string> = {
  enlarged: "Size +1: +2 Str, −2 Dex, −1 attack & AC, +5 ft reach",
  haste: "+1 attack/AC/Ref, +30 ft speed, extra attack",
  "blessing of fervor": "Choose one benefit each round",
  "bull's strength": "+4 enhancement to Strength",
  "cat's grace": "+4 enhancement to Dexterity",
  "bear's endurance": "+4 enhancement to Constitution",
  "fox's cunning": "+4 enhancement to Intelligence",
  "owl's wisdom": "+4 enhancement to Wisdom",
  "eagle's splendor": "+4 enhancement to Charisma",
  bless: "+1 morale to attack & saves vs fear",
  barkskin: "+2 enhancement to natural armor",
  "magic weapon": "+1 enhancement to attack & damage",
  shield: "+4 shield bonus to AC",
  "mage armor": "+4 armor bonus to AC",
};
