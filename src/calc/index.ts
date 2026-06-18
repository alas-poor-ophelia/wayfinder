/**
 * computeAll — the single entry point that wires a CharacterRecord through
 * the calc pipeline (conditions → abilities → everything else), mirroring
 * the old sheet's component wiring.
 */

import {
  ABILITY_KEYS,
  type AbilityScores,
  type CharacterRecord,
} from "../types/character";
import { inventoryTotals } from "../types/inventory";
import {
  abilityMods,
  effectiveScores,
  type AbilityModInput,
} from "./abilities";
import { computeEncumbrance, type EncumbranceComputed } from "./encumbrance";
import { calculateACValues, type ACValues } from "./ac";
import {
  calculateAttackStrings,
  type AttackStrings,
  type AttackParts,
  type ConditionEffects as AttackConditionEffects,
} from "./attacks";
import { totalBab, totalLevel } from "./class-stats";
import { calculateConditionEffects, type ConditionEffects } from "./conditions";
import { calculateSaves, classBaseSaves, type SaveValues } from "./saves";
import { calculateSkills, type SkillRow } from "./skills";
import {
  castingClassMatches,
  computeSpellbook,
  type SpellbookComputed,
} from "./spells";
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
import { resolveArchetypeEffects } from "../data/archetypes";
import { classResources } from "../data/classes";
import { evaluateFooterFormula, evaluateResourceFormula } from "./resources";
import { getBuffDef } from "../data/buffs";
import {
  applyHeritage,
  getHeritage,
  getRaceData,
  racialAbilityMods,
} from "../data/races";
import { companionRow } from "../data/companion";
import type { RaceData } from "../data/types";
import { resolveQuickActions } from "./quick-actions";
import { computeManeuvers, type ManeuverComputed } from "./maneuvers";

/** One equipped weapon's rendered attack text for a combat-tab block. */
export interface AttackProfileText {
  /** the inventory item id */
  id: string;
  name: string;
  text: string;
  /** Structured pieces driving the two-row layout; text is kept for notes. */
  parts: AttackParts;
}

export interface ComputedCharacter {
  mods: AbilityScores;
  /** effective ability scores (post adjust/drain/damage) — resource
   *  formulas with source "abilityScore" read these */
  scores: AbilityScores;
  /** Live maxima for class/archetype-granted resource pools, keyed by pool
   *  id, derived each compute from current level + ability mods. The combat
   *  resources UI and current-clamping read these for class pools; custom
   *  (non-catalog) pools keep their stored max. (Route A — syncClassResources
   *  now only seeds pool entries and snapshots these values.) */
  resourceMaxes: Record<string, number>;
  /** id -> human-readable formula for class-derived pools (read-only display) */
  resourceFormulas: Record<string, string>;
  /** build-stat counts that aren't daily pools (e.g. arcanistExploits =
   *  exploits known, net of archetype removals). Empty for most characters. */
  featureCounts: Record<string, number>;
  /** Path of War maneuver block: Initiator Level, max tier, known/readied/
   *  stances-known limits, recovery count. null for non-initiators. */
  maneuvers: ManeuverComputed | null;
  /** id -> live composed footer string for pools with a footerFormula */
  resourceFooters: Record<string, string>;
  bab: number;
  totalLevel: number;
  conditionEffects: ConditionEffects;
  ac: ACValues;
  attacks: AttackStrings;
  /** per-equipped-weapon attack text; empty arrays = nothing equipped
   *  (the combat tab falls back to the legacy generic blocks) */
  attackProfiles: { melee: AttackProfileText[]; ranged: AttackProfileText[] };
  saves: SaveValues;
  skills: SkillRow[];
  initiative: number;
  /** Per-energy-type resistance for the combat tab: the max of the manually
   *  entered character.energyRes and any racial/gear energyRes.* modifiers.
   *  PF energy resistance does not stack, so the highest source wins (not a
   *  sum). Only positive values are kept. */
  energyRes: Record<string, number>;
  /** hp.max plus condition adjustments (negative levels etc.) */
  hpMaxEffective: number;
  /** speed multiplier from conditions (1 = normal) */
  movementMultiplier: number;
  /** movement speed: race-derived (character.speed === "") or the manual
   *  string, plus unconditional "speed" modifiers, times movementMultiplier.
   *  notes carries conditional speed riders (never auto-summed). */
  speed: { base: number; total: number; text: string; notes: string[] };
  /** present only for characters with a spellbook */
  spellbook?: SpellbookComputed;
  /** present only for characters with an inventory */
  encumbrance?: EncumbranceComputed;
  /** present only for characters tracking XP */
  xp?: XpComputed;
  /** present only when the character has a raceKey — race data plus the
   *  situational racial modifiers that never auto-sum ("vs poison" etc.) */
  racial?: {
    /** the EFFECTIVE race — heritage-transformed when one is selected */
    race: RaceData;
    notes: string[];
    /** situational save modifiers, pre-formatted for the save tooltips */
    saveNotes: { fort: string[]; ref: string[]; will: string[] };
    /** present when a variant heritage is applied */
    heritage?: { key: string; name: string; source: string };
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

export interface ComputeOptions {
  /** Elephant in the Room houserule. Defaults to ON when omitted, matching
   *  MiniSheetSettings' default and the legacy Dex-to-CMB behaviour every
   *  captured fixture was built on (see eitrEnabled / archetype-parity). */
  elephantInTheRoom?: boolean;
}

export function computeAll(
  character: CharacterRecord,
  master?: CharacterRecord | null,
  options?: ComputeOptions,
): ComputedCharacter {
  const eitr = options?.elephantInTheRoom ?? true;
  // Archetype gates + contributions: divine grace timing/removal, traded-away
  // spellcasting, the Virtuous Bravo AC bonus, and static typed modifiers
  // (e.g. Crossblooded's -2 Will). Resolved up front so addedModifiers can
  // join the base modifier set below. No archetypes selected → all inert.
  const archEffects = resolveArchetypeEffects(character.classes);
  const effects = calculateConditionEffects({
    conditions: character.conditions,
    buffs: character.buffs,
    negativeLevels: character.adjustments.negativeLevels,
    bofChoice: character.bofChoice,
  });

  // Racial contributions are opt-in via raceKey: characters without it
  // (all legacy saves) compute byte-for-byte as before. A variant heritage
  // transforms the base race into an effective RaceData (swapped ability
  // mods / Skilled bonuses / SLA) — everything downstream reads `race`.
  const baseRace = character.raceKey ? getRaceData(character.raceKey) : null;
  const race = baseRace
    ? applyHeritage(baseRace, character.raceHeritageKey)
    : null;
  const heritage = baseRace
    ? getHeritage(baseRace.key, character.raceHeritageKey ?? "")
    : null;
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
  cfg(
    "attack.melee",
    "enhancement",
    Number(character.enhancements.meleeWeapon) || 0,
  );
  cfg(
    "attack.ranged",
    "enhancement",
    Number(character.enhancements.rangedWeapon) || 0,
  );
  cfg("save.all", "resistance", Number(character.enhancements.resistance) || 0);

  // Active buffs: registry entries (typed modifiers + display notes) and
  // user-defined custom buffs. Special machinery (enlarge, BoF, haste's
  // speed/extra attack) already flowed through calculateConditionEffects.
  const buffMods: Modifier[] = [];
  const buffNoteLines: string[] = [];
  for (const key of character.buffs) {
    const def = getBuffDef(key);
    if (def) {
      buffMods.push(...def.modifiers);
      if (def.note) buffNoteLines.push(def.note);
      continue;
    }
    const custom = character.customBuffs?.find((b) => b.id === key);
    if (custom) {
      for (const m of custom.modifiers) {
        if (!m || typeof m.value !== "number" || !m.target || !m.type) continue;
        buffMods.push({ ...m, source: m.source || custom.name });
      }
    }
  }
  if (buffNoteLines.length) {
    effects.buffNotes = [effects.buffNotes, ...buffNoteLines]
      .filter(Boolean)
      .join("\n");
  }

  // Animal companion: the Base Statistics table contributes a natural-armor
  // bonus and a Str/Dex increase on top of the user-entered base animal.
  // (BAB and base saves are applied separately below.) The table only fires
  // for characterType "companion"; PCs/familiars get an empty set.
  const compRow =
    character.characterType === "companion"
      ? companionRow(character.companionLevel ?? 1)
      : null;
  const companionMods: Modifier[] = [];
  if (compRow) {
    if (compRow.strDex) {
      companionMods.push(
        {
          target: "ability.str",
          type: "untyped",
          value: compRow.strDex,
          source: "Animal Companion",
        },
        {
          target: "ability.dex",
          type: "untyped",
          value: compRow.strDex,
          source: "Animal Companion",
        },
      );
    }
    if (compRow.natArmor) {
      companionMods.push({
        target: "ac.natural",
        type: "natural",
        value: compRow.natArmor,
        source: "Animal Companion",
      });
    }
  }

  const baseMods = [
    ...racialMods,
    ...gearMods,
    ...configMods,
    ...buffMods,
    ...companionMods,
    ...archEffects.addedModifiers,
  ];

  // ability.* modifiers (belts, headbands...) resolve through the engine
  // and ride a dedicated offset channel into the ability math
  const abilityInputFor = (modSet: Modifier[]): AbilityModInput => ({
    base: character.baseAbilities,
    racial: race
      ? racialAbilityMods(race, character.raceAbilityChoice)
      : undefined,
    typed: modSet.length
      ? Object.fromEntries(
          ABILITY_KEYS.map((k) => [
            k,
            resolveModifiers(modSet, `ability.${k}`).total,
          ]),
        )
      : undefined,
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
  });

  const masterBab =
    character.link?.babFromMaster && master
      ? (master.babOverride ?? totalBab(master.classes))
      : null;
  const bab =
    (compRow ? compRow.bab : null) ??
    masterBab ??
    character.babOverride ??
    totalBab(character.classes);
  const paladinLevel = classLevel(character, "paladin");
  const monkLevel = classLevel(character, "monk");
  const skaldLevel = classLevel(character, "skald");

  // Quick Actions resolve against PRE-action mods (race/gear/config/buffs
  // applied) — no legacy toggle ever modified an ability score, so legacy
  // parity is exact. Records without quickActions (pre-v6, mid-session)
  // fall back to the deprecated toggle fields below.
  const qa = character.quickActions
    ? (() => {
        const input0 = abilityInputFor(baseMods);
        return resolveQuickActions(
          character.quickActions,
          character.quickActionState ?? {},
          {
            classes: character.classes,
            bab,
            totalLevel: totalLevel(character.classes),
            mods: abilityMods(input0),
            scores: effectiveScores(input0),
            resources: character.resources,
          },
        );
      })()
    : null;
  if (qa && qa.sheetNotes.length) {
    effects.buffNotes = [effects.buffNotes, ...qa.sheetNotes]
      .filter(Boolean)
      .join("\n");
  }
  // condition channels + quick-action channels, merged (conditions first —
  // legacy extra-attack ordering)
  const qaEffects = qa
    ? {
        ...effects,
        acAdjust: (effects.acAdjust || 0) + qa.acChannels.normal,
        touchAcAdjust: (effects.touchAcAdjust || 0) + qa.acChannels.touch,
        ffAcAdjust: (effects.ffAcAdjust || 0) + qa.acChannels.ff,
        extraAttacks: [...(effects.extraAttacks || []), ...qa.extraAttacks],
      }
    : effects;

  const combined = qa ? [...baseMods, ...qa.modifiers] : baseMods;
  const combinedFor = (target: string): number =>
    combined.length ? resolveModifiers(combined, target).total : 0;

  const abilityInput = abilityInputFor(combined);
  const mods = abilityMods(abilityInput);
  const scores = effectiveScores(abilityInput);
  const maneuvers = computeManeuvers(character, mods);

  // One stacking pass over every AC-targeted modifier, partitioned into
  // the legacy input buckets (naturalAC: excluded from touch; deflectionAC:
  // applies everywhere; dodgeAC: lost flat-footed).
  const acResolved = resolveAcModifiers(combined);

  // Size: derived from race when raceKey is set (small = +1), with an
  // explicit override; characters without a raceKey keep the manual
  // ac.sizeMod path untouched. The same value feeds AC, CMB, and CMD
  // (same-sign legacy quirk preserved — see calculateACValues).
  const sizeMod =
    character.ac.sizeModOverride ??
    (race ? (race.size === "small" ? 1 : 0) : character.ac.sizeMod);

  // Weapon Finesse is active when a quick action / class grant turns it on.
  // Under EitR it's automatic for finesse weapons, so the attack calc OR's
  // this with the houserule (passed as elephantInTheRoom below).
  const weaponFinesseActive =
    (qa ? qa.weaponFinesse : false) || archEffects.grantsWeaponFinesse;

  // CMB ability. The legacy sheet used Dex unconditionally — an Elephant in
  // the Room artifact (finesse weapons grant Dex to CMB, and these are
  // finesse characters). EitR owns that: on → Dex (reproducing the quirk
  // every fixture froze), off → Str (RAW). It is NOT made weapon-conditional
  // here: stamped weapon items only ever carry finesse=true, so a legacy item
  // and a non-finesse one are indistinguishable, and forcing Str on the
  // ambiguous case would silently regress existing characters' CMB.
  const cmbAbility: "str" | "dex" = eitr ? "dex" : "str";

  const ac = calculateACValues({
    dexMod: mods.dex,
    chaMod: mods.cha,
    strMod: mods.str,
    wisMod: mods.wis,
    sizeMod,
    cmbAbility,
    weaponSong: qa ? "Off" : character.toggles.weaponSong,
    naturalAC: acResolved.naturalLike,
    deflectionAC: acResolved.deflectionLike,
    dodgeAC: acResolved.dodge,
    monkLevel,
    scaledFist: archEffects.scaledFistAC,
    bravoLevel: archEffects.grantsBravoAC ? paladinLevel : 0,
    // The old sheet's separate `hasted` flag was never bound (haste works
    // through condition effects), so it stays false here too.
    hasted: false,
    charging: qa ? false : character.toggles.charging,
    fightingDefensively: qa ? false : character.toggles.fightingDefensively,
    craneStyle: qa ? false : character.toggles.craneStyle,
    acAdjust: character.adjustments.ac,
    bab,
    conditionEffects: qaEffects,
  });

  // Attack/damage modifiers: surviving weapon enhancement rides the legacy
  // enhancement inputs (which feed damage + weapon-song interplay); every
  // other type rides the adjust inputs. Unarmed has no enhancement input,
  // so its attack total flows whole; damage uses .rest so an explicit
  // enhancement-typed damage modifier can't double-count with the input.
  const meleeAtk = splitEnhancement(resolveModifiers(combined, "attack.melee"));
  const rangedAtk = splitEnhancement(
    resolveModifiers(combined, "attack.ranged"),
  );
  const meleeDmg = splitEnhancement(resolveModifiers(combined, "damage.melee"));
  const rangedDmg = splitEnhancement(
    resolveModifiers(combined, "damage.ranged"),
  );

  const attackInput = {
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
    // With quick actions resolved, the legacy toggle booleans are fed
    // dead-false and the QA channels carry everything instead. The
    // toggle reads below are the pre-v6 fallback only.
    smiteEvil: qa ? false : character.toggles.smiteEvil,
    smiteEvilOutsider: qa ? false : character.toggles.smiteEvilOutsider,
    charging: qa ? false : character.toggles.charging,
    flurryOfBlows: qa ? qa.flurry !== null : character.toggles.flurryOfBlows,
    fightingDefensively: qa ? false : character.toggles.fightingDefensively,
    craneStyle: qa ? false : character.toggles.craneStyle,
    powerAttack: qa ? false : character.toggles.powerAttack,
    agileWeapon: qa ? qa.agileWeapon : character.toggles.agileWeapon,
    weaponFinesse: weaponFinesseActive,
    elephantInTheRoom: eitr,
    preciseStrike: qa ? false : character.toggles.preciseStrike,
    doublePreciseStrike: qa ? false : character.toggles.doublePreciseStrike,
    flanking: qa ? false : character.toggles.flanking,
    // touch modes: ranged rides the legacy Ray entry, melee its meleeTouch
    // twin — touch attack, bonus-only damage (smite double-count quirk
    // included in both)
    rangedAttackStyle: character.toggles.rangedTouch
      ? "Ray"
      : character.toggles.rangedAttackStyle,
    meleeTouch: character.toggles.meleeTouch ?? false,
    weaponSong: qa ? "Off" : character.toggles.weaponSong,
    ...(qa
      ? {
          ...(qa.smiteOverride ? { smiteOverride: qa.smiteOverride } : {}),
          ...(qa.preciseStrikeOverride !== null
            ? { preciseStrikeOverride: qa.preciseStrikeOverride }
            : {}),
          ...(qa.flurry ? { flurryAttacks: qa.flurry.attacks } : {}),
          extraDamageDice: qa.extraDamageDice,
          keen: qa.keen,
          ...(qa.attackNoteLines.length
            ? {
                attackNoteBlock:
                  "\n\n**Weapon Song Effects:**\n" +
                  qa.attackNoteLines.join("\n"),
              }
            : {}),
        }
      : {}),
    // schema v4: panache is a resources[] pool; the optional field is the
    // pre-migration fallback
    panachePoints:
      character.resources.find((r) => r.id === "panache")?.current ??
      character.panache?.current ??
      0,
    // attacks' input type carries an index signature; the concrete
    // ConditionEffects interface satisfies it structurally
    conditionEffects: { ...qaEffects } as AttackConditionEffects,
  };
  const attacks = calculateAttackStrings(attackInput);

  // Attack profiles derive from equipped weapon items (item.weapon stats
  // stamped from the catalog) — same shared input, per-weapon dice. The
  // stored character.weapons list is dormant.
  const equippedWeapons = (character.inventory?.items ?? []).filter(
    (i) => i.type === "Weapon" && i.equipped && i.weapon,
  );
  const attackProfiles: ComputedCharacter["attackProfiles"] = {
    // per-weapon profiles always show the WEAPON math: touch mode is
    // forced off (touch overrides meleeWeapon; ranged is immune already —
    // rangedWeapon takes precedence over the Ray style)
    melee: equippedWeapons
      .filter((i) => i.weapon!.kind === "melee")
      .map((i) => {
        const r = calculateAttackStrings({
          ...attackInput,
          meleeTouch: false,
          meleeWeapon: i.weapon!,
        });
        return { id: i.id, name: i.name, text: r.melee, parts: r.parts.melee };
      }),
    ranged: equippedWeapons
      .filter((i) => i.weapon!.kind === "ranged")
      .map((i) => {
        const r = calculateAttackStrings({
          ...attackInput,
          rangedWeapon: i.weapon!,
        });
        return {
          id: i.id,
          name: i.name,
          text: r.ranged,
          parts: r.parts.ranged,
        };
      }),
  };

  // Resistance now stacks in the engine (config field + cloaks take max),
  // so the legacy resistanceEnhancement input stays 0 and the resolved
  // per-save totals are added on top — same math when only one source.
  const fortR = resolveModifiers(combined, "save.fort");
  const refR = resolveModifiers(combined, "save.ref");
  const willR = resolveModifiers(combined, "save.will");
  // Linked-creature base saves, added on top of the creature's OWN ability
  // mods inside calculateSaves (via per-save max with its own base, which is
  // 0 for a classless familiar/companion):
  //  - familiar: the master's base saves if better (PF1e rule)
  //  - companion: the Animal Companion Base Statistics table saves
  const masterBaseSaves =
    character.characterType === "familiar" && master
      ? classBaseSaves(master.classes)
      : compRow
        ? { fort: compRow.fort, ref: compRow.ref, will: compRow.will }
        : undefined;
  const baseSaves = calculateSaves({
    classes: character.classes,
    conMod: mods.con,
    dexMod: mods.dex,
    wisMod: mods.wis,
    chaMod: mods.cha,
    resistanceEnhancement: 0,
    conditionEffects: effects,
    suppressDivineGrace: paladinLevel < archEffects.divineGraceMinLevel,
    masterBaseSaves,
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
    versatilePerformance: qa
      ? qa.versatilePerformance
      : character.toggles.versatilePerformance,
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

  // An archetype that trades spellcasting away suppresses the COMPUTED
  // spellbook only — the persisted SpellbookState is untouched, so
  // unchecking the archetype restores everything.
  const spellcastingRemoved =
    character.spellbook !== undefined &&
    [...archEffects.removedSpellcastingClassKeys].some((classKey) =>
      castingClassMatches(character.spellbook!.castingClass, classKey),
    );
  // Eldritch Font (and future spellcasting-reshape archetypes): only when the
  // adjust's class matches this spellbook's casting class.
  const spellAdjust =
    archEffects.spellcastingAdjust &&
    character.spellbook &&
    castingClassMatches(
      character.spellbook.castingClass,
      archEffects.spellcastingAdjust.classKey,
    )
      ? {
          preparedPerLevel: archEffects.spellcastingAdjust.preparedPerLevel,
          castsPerLevel: archEffects.spellcastingAdjust.castsPerLevel,
        }
      : undefined;
  const spellbook =
    character.spellbook && !spellcastingRemoved
      ? computeSpellbook({
          spellbook: character.spellbook,
          classes: character.classes,
          mods,
          ...(spellAdjust ? { adjust: spellAdjust } : {}),
        })
      : undefined;

  // coin weight excluded, matching the legacy weight totals
  const encumbrance = character.inventory
    ? computeEncumbrance(
        scores.str,
        inventoryTotals(character.inventory.items).totalWeight,
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
      acResolved.suppressed.map(describeModifier),
    );
    const reportTargets = [
      "attack.melee",
      "attack.ranged",
      "attack.unarmed",
      "damage.melee",
      "damage.ranged",
      "damage.unarmed",
      "save.fort",
      "save.ref",
      "save.will",
      "initiative",
      "speed",
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

  // Speed: race-derived when character.speed is "" (raceKey set), else the
  // manual string. Unconditional "speed" modifiers add pre-multiplier;
  // conditional ones (Catfolk Sprinter) surface as notes, never summed.
  // text preserves the manual string verbatim when nothing changes it —
  // byte-parity with the old InitSpeed rendering, freeform strings included.
  const speedResolved = combined.length
    ? resolveModifiers(combined, "speed")
    : null;
  const movementMultiplier = effects.movementAdjust ?? 1;
  const speedBase = character.speed
    ? parseInt(character.speed) || 0
    : (race?.speed ?? 30);
  const speedTotal = Math.floor(
    (speedBase + (speedResolved?.total ?? 0)) * movementMultiplier,
  );
  const speed = {
    base: speedBase,
    total: speedTotal,
    text:
      character.speed && speedTotal === (parseInt(character.speed) || 0)
        ? character.speed
        : `${speedTotal}ft`,
    notes: speedResolved ? speedResolved.conditional.map(describeModifier) : [],
  };

  // Derive class/archetype pool maxima from current level + effective mods,
  // so they auto-track level-ups and ability changes (no manual sync needed).
  // classResources already applies archetype suppression/adds and minLevel.
  // Build-stat counts (not daily pools). Arcanist exploits: gained at odd
  // levels 1,3,5..19 → ceil(level/2) known, minus the slots archetypes strip
  // (the graph enumerates the removed levels through featureCountRemovals).
  const arcanistLevel = classLevel(character, "arcanist");
  const featureCounts: Record<string, number> = {};
  if (arcanistLevel > 0) {
    const removed = (
      archEffects.featureCountRemovals.arcanistExploits ?? []
    ).filter((lv) => lv <= arcanistLevel).length;
    featureCounts.arcanistExploits = Math.max(
      0,
      Math.ceil(arcanistLevel / 2) - removed,
    );
  }

  const resourceMaxes: Record<string, number> = {};
  const resourceFormulas: Record<string, string> = {};
  const classPoolIds = new Set<string>();
  for (const pool of classResources(character.classes, mods)) {
    resourceMaxes[pool.id] = pool.max;
    if (pool.describe) resourceFormulas[pool.id] = pool.describe;
    classPoolIds.add(pool.id);
  }
  // User formulas apply ONLY to non-class pools. A class/archetype pool's
  // derived closure always wins, so a stale stored formula can't shadow it
  // (e.g. a leftover {characterLevel} formula dragging Weapon Song to 11).
  // Mirror syncClassResources' precedence so combat + config show one max.
  const resCtx = { classes: character.classes, mods, scores };
  const resourceFooters: Record<string, string> = {};
  for (const pool of character.resources) {
    if (pool.formula && !classPoolIds.has(pool.id)) {
      resourceMaxes[pool.id] = evaluateResourceFormula(pool.formula, resCtx);
    }
    if (pool.footerFormula) {
      resourceFooters[pool.id] = evaluateFooterFormula(
        pool.footerFormula,
        resCtx,
      );
    }
  }

  // Energy resistance: merge the manually-entered values with any racial/gear
  // energyRes.* modifiers by MAX (PF energy resistance never stacks). Kinds
  // come from both the stored map and the modifier targets present.
  const energyRes: Record<string, number> = {};
  const energyKinds = new Set<string>(Object.keys(character.energyRes));
  for (const m of combined) {
    if (m.target.startsWith("energyRes.")) {
      energyKinds.add(m.target.slice("energyRes.".length));
    }
  }
  for (const kind of energyKinds) {
    const fromMods = combined.length
      ? resolveModifiers(combined, `energyRes.${kind}`).total
      : 0;
    const value = Math.max(character.energyRes[kind] ?? 0, fromMods);
    if (value > 0) energyRes[kind] = value;
  }

  return {
    mods,
    scores,
    resourceMaxes,
    resourceFormulas,
    resourceFooters,
    featureCounts,
    maneuvers,
    bab,
    totalLevel: totalLevel(character.classes),
    conditionEffects: effects,
    ac,
    attacks,
    attackProfiles,
    saves,
    skills,
    initiative,
    energyRes,
    hpMaxEffective:
      (character.link?.hpMaxFromMaster && master
        ? Math.floor(master.hp.max / 2)
        : character.hp.max) + (effects.hpMaxAdjust || 0),
    movementMultiplier,
    speed,
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
              fort: resolveModifiers(racialMods, "save.fort").conditional.map(
                describeModifier,
              ),
              ref: resolveModifiers(racialMods, "save.ref").conditional.map(
                describeModifier,
              ),
              will: resolveModifiers(racialMods, "save.will").conditional.map(
                describeModifier,
              ),
            },
            ...(heritage
              ? {
                  heritage: {
                    key: heritage.key,
                    name: heritage.name,
                    source: heritage.source,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}
