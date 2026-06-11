/**
 * computeAll — the single entry point that wires a CharacterRecord through
 * the calc pipeline (conditions → abilities → everything else), mirroring
 * the old sheet's component wiring.
 */

import type { AbilityScores, CharacterRecord } from "../types/character";
import { inventoryTotals } from "../types/inventory";
import { abilityMods, effectiveScores, type AbilityModInput } from "./abilities";
import { computeEncumbrance, type EncumbranceComputed } from "./encumbrance";
import { calculateACValues, type ACValues } from "./ac";
import {
  calculateAttackStrings,
  type AttackStrings,
  type ConditionEffects as AttackConditionEffects,
} from "./attacks";
import { totalBab, totalLevel } from "./class-stats";
import {
  calculateConditionEffects,
  type ConditionEffects,
} from "./conditions";
import { calculateSaves, type SaveValues } from "./saves";
import { calculateSkills, type SkillRow } from "./skills";
import { computeSpellbook, type SpellbookComputed } from "./spells";

export interface ComputedCharacter {
  mods: AbilityScores;
  bab: number;
  totalLevel: number;
  conditionEffects: ConditionEffects;
  ac: ACValues;
  attacks: AttackStrings;
  saves: SaveValues;
  skills: SkillRow[];
  initiative: number;
  /** hp.max plus condition adjustments (negative levels etc.) */
  hpMaxEffective: number;
  /** speed multiplier from conditions (1 = normal) */
  movementMultiplier: number;
  /** present only for characters with a spellbook */
  spellbook?: SpellbookComputed;
  /** present only for characters with an inventory */
  encumbrance?: EncumbranceComputed;
}

function classLevel(character: CharacterRecord, match: string): number {
  return character.classes
    .filter((c) => c.className.toLowerCase().includes(match))
    .reduce((sum, c) => sum + (c.level || 0), 0);
}

export function computeAll(
  character: CharacterRecord,
  master?: CharacterRecord | null
): ComputedCharacter {
  const effects = calculateConditionEffects({
    conditions: character.conditions,
    buffs: character.buffs,
    negativeLevels: character.adjustments.negativeLevels,
    bofChoice: character.bofChoice,
  });

  const abilityInput: AbilityModInput = {
    base: character.baseAbilities,
    adjust: character.adjustments.ability,
    conditionAdjust: {
      str: effects.strAdjust,
      dex: effects.dexAdjust,
      con: effects.conAdjust,
      int: effects.intAdjust,
      wis: effects.wisAdjust,
      cha: effects.chaAdjust,
    },
    drain: character.adjustments.drain,
    damage: character.adjustments.damage,
  };
  const mods = abilityMods(abilityInput);

  const masterBab =
    character.link?.babFromMaster && master
      ? master.babOverride ?? totalBab(master.classes)
      : null;
  const bab = masterBab ?? character.babOverride ?? totalBab(character.classes);
  const paladinLevel = classLevel(character, "paladin");
  const monkLevel = classLevel(character, "monk");
  const skaldLevel = classLevel(character, "skald");

  const ac = calculateACValues({
    dexMod: mods.dex,
    chaMod: mods.cha,
    strMod: mods.str,
    sizeMod: character.ac.sizeMod,
    weaponSong: character.toggles.weaponSong,
    naturalAC: character.ac.natural,
    deflectionAC: character.ac.deflection,
    dodgeAC: character.ac.dodge,
    monkLevel,
    paladinLevel,
    // The old sheet's separate `hasted` flag was never bound (haste works
    // through condition effects), so it stays false here too.
    hasted: false,
    charging: character.toggles.charging,
    fightingDefensively: character.toggles.fightingDefensively,
    craneStyle: character.toggles.craneStyle,
    acAdjust: character.adjustments.ac,
    bab,
    conditionEffects: effects,
  });

  const attacks = calculateAttackStrings({
    strMod: mods.str,
    dexMod: mods.dex,
    chaMod: mods.cha,
    bab,
    paladinLevel,
    monkLevel,
    atkAdjust: character.adjustments.atk,
    dmgAdjust: character.adjustments.dmg,
    rangedAtkAdjust: character.adjustments.rangedAtk,
    rangedDmgAdjust: character.adjustments.rangedDmg,
    unarmedAtkAdjust: character.adjustments.unarmedAtk,
    unarmedDmgAdjust: character.adjustments.unarmedDmg,
    meleeWeaponEnhancement: character.enhancements.meleeWeapon,
    rangedWeaponEnhancement: character.enhancements.rangedWeapon,
    smiteEvil: character.toggles.smiteEvil,
    smiteEvilOutsider: character.toggles.smiteEvilOutsider,
    charging: character.toggles.charging,
    flurryOfBlows: character.toggles.flurryOfBlows,
    fightingDefensively: character.toggles.fightingDefensively,
    craneStyle: character.toggles.craneStyle,
    powerAttack: character.toggles.powerAttack,
    agileWeapon: character.toggles.agileWeapon,
    preciseStrike: character.toggles.preciseStrike,
    doublePreciseStrike: character.toggles.doublePreciseStrike,
    flanking: character.toggles.flanking,
    rangedAttackStyle: character.toggles.rangedAttackStyle,
    weaponSong: character.toggles.weaponSong,
    panachePoints: character.panache.current,
    // attacks' input type carries an index signature; the concrete
    // ConditionEffects interface satisfies it structurally
    conditionEffects: { ...effects } as AttackConditionEffects,
  });

  const saves = calculateSaves({
    classes: character.classes,
    conMod: mods.con,
    dexMod: mods.dex,
    wisMod: mods.wis,
    chaMod: mods.cha,
    resistanceEnhancement: character.enhancements.resistance,
    conditionEffects: effects,
  });

  const skills = calculateSkills({
    skills: character.skills,
    abilityMods: mods,
    globalSkillAdjust: character.adjustments.skill + (effects.skillAdjust || 0),
    abilitySkillAdjusts: {
      str: effects.strSkillAdjust,
      dex: effects.dexSkillAdjust,
      con: effects.conSkillAdjust,
      int: effects.intSkillAdjust,
      wis: effects.wisSkillAdjust,
      cha: effects.chaSkillAdjust,
    },
    skaldLevel,
    versatilePerformance: character.toggles.versatilePerformance,
    armorCheckPenalty: 0,
  });

  const initiative =
    mods.dex +
    character.initiative.miscBonus +
    character.initiative.familiarBonus +
    character.adjustments.init;

  const spellbook = character.spellbook
    ? computeSpellbook({
        spellbook: character.spellbook,
        classes: character.classes,
        mods,
      })
    : undefined;

  // coin weight excluded, matching the legacy weight totals
  const encumbrance = character.inventory
    ? computeEncumbrance(
        effectiveScores(abilityInput).str,
        inventoryTotals(character.inventory.items).totalWeight
      )
    : undefined;

  return {
    mods,
    bab,
    totalLevel: totalLevel(character.classes),
    conditionEffects: effects,
    ac,
    attacks,
    saves,
    skills,
    initiative,
    hpMaxEffective:
      (character.link?.hpMaxFromMaster && master
        ? Math.floor(master.hp.max / 2)
        : character.hp.max) + (effects.hpMaxAdjust || 0),
    movementMultiplier: effects.movementAdjust ?? 1,
    ...(spellbook ? { spellbook } : {}),
    ...(encumbrance ? { encumbrance } : {}),
  };
}
