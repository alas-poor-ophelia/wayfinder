/**
 * computeAll — the single entry point that wires a CharacterRecord through
 * the calc pipeline (conditions → abilities → everything else), mirroring
 * the old sheet's component wiring.
 */

import { ABILITY_KEYS, type AbilityScores, type CharacterRecord } from "../types/character";
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
import { computeXp, type XpComputed } from "./xp";
import {
  conditionalNotes,
  describeModifier,
  resolveAcModifiers,
  resolveModifiers,
  splitEnhancement,
  type BonusType,
  type Modifier,
  type ModifierTarget,
} from "./modifiers";
import { getRaceData, racialAbilityMods } from "../data/races";
import type { RaceData } from "../data/types";

export interface ComputedCharacter {
  mods: AbilityScores;
  /** effective ability scores (post adjust/drain/damage) — resource
   *  formulas with source "abilityScore" read these */
  scores: AbilityScores;
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
  /** present only for characters tracking XP */
  xp?: XpComputed;
  /** present only when the character has a raceKey — race data plus the
   *  situational racial modifiers that never auto-sum ("vs poison" etc.) */
  racial?: {
    race: RaceData;
    notes: string[];
    /** situational save modifiers, pre-formatted for the save tooltips */
    saveNotes: { fort: string[]; ref: string[]; will: string[] };
  };
  /** present when any typed modifiers (racial/gear/config) are in play —
   *  situational riders and same-type-suppressed bonuses, pre-formatted */
  modifierReport?: {
    conditional: string[];
    suppressed: string[];
  };
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

  // Racial contributions are opt-in via raceKey: characters without it
  // (all legacy saves) compute byte-for-byte as before.
  const race = character.raceKey ? getRaceData(character.raceKey) : null;
  const racialMods = race ? race.modifiers : [];

  // Equipped gear: typed modifiers from inventory items. Persisted data —
  // tolerate and skip malformed entries.
  const gearMods: Modifier[] = [];
  for (const item of character.inventory?.items ?? []) {
    if (!item.equipped || !Array.isArray(item.modifiers)) continue;
    for (const m of item.modifiers) {
      if (!m || typeof m.value !== "number" || !m.target || !m.type) continue;
      gearMods.push({ ...m, source: m.source || item.name });
    }
  }

  // The legacy loose config fields participate in RAW stacking as typed
  // modifiers (zero values skipped — no report noise, byte-parity when
  // nothing else targets the same stat).
  const configMods: Modifier[] = [];
  const cfg = (target: ModifierTarget, type: BonusType, value: number) => {
    if (value) configMods.push({ target, type, value, source: "Config" });
  };
  cfg("ac.natural", "natural", Number(character.ac.natural) || 0);
  cfg("ac.all", "deflection", Number(character.ac.deflection) || 0);
  cfg("ac.all", "dodge", Number(character.ac.dodge) || 0);
  cfg("attack.melee", "enhancement", Number(character.enhancements.meleeWeapon) || 0);
  cfg("attack.ranged", "enhancement", Number(character.enhancements.rangedWeapon) || 0);
  cfg("save.all", "resistance", Number(character.enhancements.resistance) || 0);

  const combined = [...racialMods, ...gearMods, ...configMods];
  const combinedFor = (target: string): number =>
    combined.length ? resolveModifiers(combined, target).total : 0;

  // ability.* modifiers (belts, headbands...) resolve through the engine
  // and ride a dedicated offset channel into the ability math
  const typedAbility = combined.length
    ? Object.fromEntries(
        ABILITY_KEYS.map((k) => [k, resolveModifiers(combined, `ability.${k}`).total])
      )
    : undefined;

  const abilityInput: AbilityModInput = {
    base: character.baseAbilities,
    racial: race ? racialAbilityMods(race, character.raceAbilityChoice) : undefined,
    typed: typedAbility,
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
  const scores = effectiveScores(abilityInput);

  const masterBab =
    character.link?.babFromMaster && master
      ? master.babOverride ?? totalBab(master.classes)
      : null;
  const bab = masterBab ?? character.babOverride ?? totalBab(character.classes);
  const paladinLevel = classLevel(character, "paladin");
  const monkLevel = classLevel(character, "monk");
  const skaldLevel = classLevel(character, "skald");

  // One stacking pass over every AC-targeted modifier, partitioned into
  // the legacy input buckets (naturalAC: excluded from touch; deflectionAC:
  // applies everywhere; dodgeAC: lost flat-footed).
  const acResolved = resolveAcModifiers(combined);

  const ac = calculateACValues({
    dexMod: mods.dex,
    chaMod: mods.cha,
    strMod: mods.str,
    sizeMod: character.ac.sizeMod,
    weaponSong: character.toggles.weaponSong,
    naturalAC: acResolved.naturalLike,
    deflectionAC: acResolved.deflectionLike,
    dodgeAC: acResolved.dodge,
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

  // Attack/damage modifiers: surviving weapon enhancement rides the legacy
  // enhancement inputs (which feed damage + weapon-song interplay); every
  // other type rides the adjust inputs. Unarmed has no enhancement input,
  // so its attack total flows whole; damage uses .rest so an explicit
  // enhancement-typed damage modifier can't double-count with the input.
  const meleeAtk = splitEnhancement(resolveModifiers(combined, "attack.melee"));
  const rangedAtk = splitEnhancement(resolveModifiers(combined, "attack.ranged"));
  const meleeDmg = splitEnhancement(resolveModifiers(combined, "damage.melee"));
  const rangedDmg = splitEnhancement(resolveModifiers(combined, "damage.ranged"));

  const attacks = calculateAttackStrings({
    strMod: mods.str,
    dexMod: mods.dex,
    chaMod: mods.cha,
    bab,
    paladinLevel,
    monkLevel,
    atkAdjust: character.adjustments.atk + meleeAtk.rest,
    dmgAdjust: character.adjustments.dmg + meleeDmg.rest,
    rangedAtkAdjust: character.adjustments.rangedAtk + rangedAtk.rest,
    rangedDmgAdjust: character.adjustments.rangedDmg + rangedDmg.rest,
    unarmedAtkAdjust:
      character.adjustments.unarmedAtk + combinedFor("attack.unarmed"),
    unarmedDmgAdjust:
      character.adjustments.unarmedDmg + combinedFor("damage.unarmed"),
    meleeWeaponEnhancement: meleeAtk.enhancement,
    rangedWeaponEnhancement: rangedAtk.enhancement,
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
    // schema v4: panache is a resources[] pool; the optional field is the
    // pre-migration fallback
    panachePoints:
      character.resources.find((r) => r.id === "panache")?.current ??
      character.panache?.current ??
      0,
    // attacks' input type carries an index signature; the concrete
    // ConditionEffects interface satisfies it structurally
    conditionEffects: { ...effects } as AttackConditionEffects,
  });

  // Resistance now stacks in the engine (config field + cloaks take max),
  // so the legacy resistanceEnhancement input stays 0 and the resolved
  // per-save totals are added on top — same math when only one source.
  const fortR = resolveModifiers(combined, "save.fort");
  const refR = resolveModifiers(combined, "save.ref");
  const willR = resolveModifiers(combined, "save.will");
  const baseSaves = calculateSaves({
    classes: character.classes,
    conMod: mods.con,
    dexMod: mods.dex,
    wisMod: mods.wis,
    chaMod: mods.cha,
    resistanceEnhancement: 0,
    conditionEffects: effects,
  });
  const saves: SaveValues = {
    fort: baseSaves.fort + fortR.total,
    ref: baseSaves.ref + refR.total,
    will: baseSaves.will + willR.total,
  };

  const baseSkills = calculateSkills({
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
  const skills = combined.length
    ? baseSkills.map((row) => {
        const bonus = combinedFor(`skill.${row.name}`);
        return bonus
          ? { ...row, total: row.total + bonus, otherMod: row.otherMod + bonus }
          : row;
      })
    : baseSkills;

  const initiative =
    mods.dex +
    character.initiative.miscBonus +
    character.initiative.familiarBonus +
    character.adjustments.init +
    combinedFor("initiative");

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
        scores.str,
        inventoryTotals(character.inventory.items).totalWeight
      )
    : undefined;

  const xp =
    character.xp !== undefined
      ? computeXp(character.xp, character.classes)
      : undefined;

  // Situational riders + same-type-suppressed bonuses across the targets
  // computeAll actually resolves, pre-formatted for UI note lines.
  let modifierReport: ComputedCharacter["modifierReport"];
  if (combined.length) {
    const suppressedNotes = new Set<string>(
      acResolved.suppressed.map(describeModifier)
    );
    const reportTargets = [
      "attack.melee", "attack.ranged", "attack.unarmed",
      "damage.melee", "damage.ranged", "damage.unarmed",
      "save.fort", "save.ref", "save.will", "initiative",
      ...ABILITY_KEYS.map((k) => `ability.${k}`),
    ];
    for (const target of reportTargets) {
      for (const m of resolveModifiers(combined, target).suppressed) {
        suppressedNotes.add(describeModifier(m));
      }
    }
    const conditional = conditionalNotes(combined);
    const suppressed = [...suppressedNotes];
    if (conditional.length || suppressed.length) {
      modifierReport = { conditional, suppressed };
    }
  }

  return {
    mods,
    scores,
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
    ...(xp ? { xp } : {}),
    ...(modifierReport ? { modifierReport } : {}),
    ...(race
      ? {
          racial: {
            race,
            notes: conditionalNotes(racialMods),
            saveNotes: {
              fort: resolveModifiers(racialMods, "save.fort").conditional.map(describeModifier),
              ref: resolveModifiers(racialMods, "save.ref").conditional.map(describeModifier),
              will: resolveModifiers(racialMods, "save.will").conditional.map(describeModifier),
            },
          },
        }
      : {}),
  };
}
