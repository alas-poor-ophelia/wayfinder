/**
 * Skill totals — clean port of the inline meta-bind-js-view block in
 * MinISheetSkills.md.
 *
 * total = ranks + abilityMod + classBonus(+3 if class skill with ranks)
 *       + globalSkillAdjust + perAbilitySkillAdjust + bardic knowledge
 *       + (otherBonus + acp)
 *
 * Versatile Performance: Bluff and Sense Motive use the Perform (Sing)
 * entry instead (and display "(uses Perform)").
 *
 * Note: the old sheet bound the per-ability skill adjusts from top-level
 * frontmatter keys that never existed, so condition-derived skill adjusts
 * were dead in practice. We wire them from conditionEffects (the intent);
 * fixtures were captured with all adjusts at 0 so both behaviors match.
 */

import type { AbilityKey, AbilityScores, SkillEntry } from "../types/character";

export interface SkillsInput {
  skills: Record<string, SkillEntry>;
  abilityMods: AbilityScores;
  globalSkillAdjust?: number;
  abilitySkillAdjusts?: Partial<Record<AbilityKey, number>>;
  skaldLevel?: number;
  versatilePerformance?: boolean;
  armorCheckPenalty?: number;
}

export interface SkillRow {
  name: string;
  ability: AbilityKey;
  ranks: number;
  classSkill: boolean;
  total: number;
  /** the "Other" figure displayed in the breakdown line */
  otherMod: number;
  usesPerform: boolean;
}

/** The standard PF1e skill list with governing abilities (new-character default). */
export const STANDARD_SKILLS: Record<string, AbilityKey> = {
  Acrobatics: "dex",
  Appraise: "int",
  Bluff: "cha",
  Climb: "str",
  "Craft (any)": "int",
  Diplomacy: "cha",
  "Disable Device": "dex",
  Disguise: "cha",
  "Escape Artist": "dex",
  Fly: "dex",
  "Handle Animal": "cha",
  Heal: "wis",
  Intimidate: "cha",
  "Knowledge (arcana)": "int",
  "Knowledge (dungeon)": "int",
  "Knowledge (engineering)": "int",
  "Knowledge (geography)": "int",
  "Knowledge (history)": "int",
  "Knowledge (local)": "int",
  "Knowledge (nature)": "int",
  "Knowledge (nobility)": "int",
  "Knowledge (planes)": "int",
  "Knowledge (religion)": "int",
  Linguistics: "int",
  Perception: "wis",
  "Perform (any)": "cha",
  "Profession (any)": "wis",
  Ride: "dex",
  "Sense Motive": "wis",
  "Sleight of Hand": "dex",
  Spellcraft: "int",
  Stealth: "dex",
  Survival: "wis",
  Swim: "str",
  "Use Magic Device": "cha",
};

function bardicBonus(skillName: string, skaldLevel: number): number {
  return skillName.startsWith("Knowledge") && skaldLevel > 0
    ? Math.max(1, Math.ceil(skaldLevel / 2))
    : 0;
}

export function calculateSkills(input: SkillsInput): SkillRow[] {
  const mods = input.abilityMods;
  const adjusts = input.abilitySkillAdjusts ?? {};
  const global = input.globalSkillAdjust || 0;
  const skald = input.skaldLevel || 0;
  const acp = input.armorCheckPenalty || 0;
  const vp = input.versatilePerformance || false;

  const totalFor = (entry: SkillEntry, name: string, other: number): number => {
    const abilityMod = mods[entry.ability] || 0;
    const classBonus = entry.classSkill && entry.ranks > 0 ? 3 : 0;
    const adjustment = global + (adjusts[entry.ability] || 0);
    return (
      entry.ranks +
      abilityMod +
      classBonus +
      adjustment +
      bardicBonus(name, skald) +
      other
    );
  };

  return Object.keys(input.skills)
    .sort()
    .map((name) => {
      const entry = input.skills[name]!;
      const usesPerform =
        vp &&
        (name === "Sense Motive" || name === "Bluff") &&
        !!input.skills["Perform (Sing)"];
      const effective = usesPerform ? input.skills["Perform (Sing)"]! : entry;
      // Legacy quirk: the Versatile Performance recursion omits the acp
      // argument, so (otherBonus + undefined) || 0 collapses the whole
      // "other" term to 0 for the substituted total. Preserved.
      const total = usesPerform
        ? totalFor(effective, "Perform (Sing)", 0)
        : totalFor(entry, name, entry.misc + acp);
      const otherMod =
        global +
        (adjusts[effective.ability] || 0) +
        bardicBonus(name, skald) +
        effective.misc;
      return {
        name,
        ability: effective.ability,
        ranks: effective.ranks,
        classSkill: effective.classSkill,
        total,
        otherMod,
        usesPerform,
      };
    });
}
