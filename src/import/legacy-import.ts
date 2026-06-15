/**
 * Legacy import — converts the old Meta Bind sheet's frontmatter (sheet
 * note + config note) into a CharacterRecord. Lenient by design: the old
 * data carries empty strings, string numbers, missing tuple elements, and
 * fields that disagree between the two notes. Conflicts are resolved
 * toward the value the user most likely intends (the config note's class
 * levels match the character's XP; the sheet's were stale) and every
 * resolution is surfaced as a warning.
 */

import { num } from "../calc/abilities";
import { listArchetypes } from "../data/archetypes";
import type {
  AbilityKey,
  CharacterRecord,
  ClassEntry,
  ResourcePool,
  SkillEntry,
} from "../types/character";
import { seedQuickActionsFromToggles } from "../data/quick-actions";
import {
  ABILITY_KEYS,
  createDefaultCharacter,
  defaultToggles,
} from "../types/character";
import type { InventoryItem, InventoryState } from "../types/inventory";
import {
  NOTE_MAX_LENGTH,
  WAND_MAX_CHARGES,
  createDefaultInventory,
  newItemId,
  normalizeItemType,
} from "../types/inventory";
import type {
  KnownSpell,
  SlaEntry,
  SpellbookState,
  SpellLevel,
  SpellPreparation,
} from "../types/spellbook";
import {
  createDefaultSpellbook,
  createSlotOnlySpellbook,
  getSpellLevelKey,
  SPELL_LEVELS,
} from "../types/spellbook";

export interface LegacyImportInput {
  id: string;
  name: string;
  characterType: "pc" | "familiar";
  sheet: Record<string, unknown>;
  config: Record<string, unknown>;
  /** frontmatter of the legacy `<Name>SpellBook.md` note, when one exists */
  spellbook?: Record<string, unknown>;
}

export interface LegacyImportResult {
  record: CharacterRecord;
  warnings: string[];
}

/** "paladin (unchained)" -> "paladinunchained", matching the old safe-name scheme. */
function safeName(className: string): string {
  return className.toLowerCase().replace(/\s+/g, "").replace(/[()]/g, "");
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** Coerce a legacy scalar (string/number/boolean) to text; objects → "". */
function scalarText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** Old select values occasionally hold the whole option list ("A|B|C"). */
function selectValue(
  value: unknown,
  fallback: string,
  warnings: string[],
  field: string,
): string {
  const s = str(value, fallback);
  if (s.includes("|")) {
    const first = s.split("|")[0];
    warnings.push(`${field} held an option list ("${s}"); took "${first}"`);
    return first;
  }
  return s;
}

function importSkills(
  raw: unknown,
  warnings: string[],
): Record<string, SkillEntry> {
  const out: Record<string, SkillEntry> = {};
  if (!raw || typeof raw !== "object") {
    warnings.push("No skills found on the sheet note");
    return out;
  }
  for (const [name, tuple] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(tuple) || tuple.length < 3) {
      warnings.push(`Skill "${name}" has an unrecognized shape; skipped`);
      continue;
    }
    const [ability, ranks, a, b] = tuple as unknown[];
    // 4-element form: [ability, ranks, otherBonus, isClassSkill];
    // 3-element form drops otherBonus.
    const hasOther = typeof a === "number";
    out[name] = {
      ability: String(ability).toLowerCase() as AbilityKey,
      ranks: num(ranks),
      misc: hasOther ? num(a) : 0,
      classSkill: bool(hasOther ? b : a),
    };
  }
  return out;
}

interface PoolSpec {
  id: string;
  name: string;
  currentKeys: string[];
  maxKeys: string[];
  /** item-granted pools render on the Items tab (schema v4 pool.kind) */
  kind?: "item";
  footer?: (
    sheet: Record<string, unknown>,
    config: Record<string, unknown>,
  ) => string | undefined;
}

const POOL_SPECS: PoolSpec[] = [
  {
    id: "layOnHands",
    name: "Lay on Hands",
    currentKeys: ["layOnHandsCurrent"],
    maxKeys: ["layOnHandsMax"],
    footer: (s, c) => {
      const n = num(c.lohAmount ?? s.lohAmount);
      return n ? `${n}d6 (+4 self)` : undefined;
    },
  },
  {
    id: "channelEnergy",
    name: "Channel Energy",
    currentKeys: ["channelEnergyCurrent"],
    maxKeys: ["channelEnergyMax"],
    footer: (s, c) => {
      const n = num(c.ceAmount ?? s.ceAmount);
      return n ? `${n}d6 (+4 self)` : undefined;
    },
  },
  {
    id: "smiteEvil",
    name: "Smite Evil",
    currentKeys: ["smiteEvilCurrent"],
    maxKeys: ["smiteEvilMax"],
  },
  {
    id: "weaponSongRounds",
    name: "Weapon Song",
    currentKeys: ["weaponSongRoundsCurrent"],
    maxKeys: ["weaponSongRoundsMax"],
  },
  {
    id: "plumeOfPanache",
    name: "Plume of Panache",
    currentKeys: ["plumeofPanacheCurrent", "plumeOfPanacheCurrent"],
    maxKeys: ["plumeOfPanacheMax"],
    kind: "item",
  },
  {
    id: "quickrunners",
    name: "Quickrunner's Shirt",
    currentKeys: ["quickrunnersCurrent"],
    maxKeys: ["quickrunnersMax"],
    kind: "item",
  },
  {
    id: "layOnPaws",
    name: "Lay on Paws",
    currentKeys: ["layOnPawsCurrent"],
    maxKeys: ["layOnPawsMax"],
  },
];

/**
 * Resolve a numeric field that may exist on both notes. The config note
 * wins (its values matched the rendered display); disagreement warns.
 */
function dual(
  field: string,
  sheet: Record<string, unknown>,
  config: Record<string, unknown>,
  warnings: string[],
): number | undefined {
  const inConfig =
    field in config && config[field] !== "" && config[field] != null;
  const inSheet = field in sheet && sheet[field] !== "" && sheet[field] != null;
  if (!inConfig && !inSheet) return undefined;
  const cv = inConfig ? num(config[field]) : undefined;
  const sv = inSheet ? num(sheet[field]) : undefined;
  if (cv !== undefined && sv !== undefined && cv !== sv) {
    warnings.push(
      `${field}: config note says ${cv}, sheet note says ${sv}; used ${cv}`,
    );
  }
  return cv ?? sv;
}

function clampSpellLevel(value: unknown): SpellLevel {
  const n = Math.min(Math.max(num(value), 0), 9);
  return n as SpellLevel;
}

function importKnownSpells(raw: unknown, warnings: string[]): KnownSpell[] {
  if (!Array.isArray(raw)) {
    warnings.push("spellbook: no spells[] array found");
    return [];
  }
  const out: KnownSpell[] = [];
  for (const entry of raw as Record<string, unknown>[]) {
    if (
      !entry ||
      typeof entry !== "object" ||
      entry.id === undefined ||
      !entry.name
    ) {
      warnings.push(
        `spellbook: spell entry without id/name skipped (${JSON.stringify(entry).slice(0, 60)})`,
      );
      continue;
    }
    const spell: KnownSpell = {
      id: scalarText(entry.id),
      name: scalarText(entry.name),
      baseLevel: clampSpellLevel(entry.baseLevel),
      known: entry.known === true || entry.known === "true",
      range: str(entry.range),
      castingTime: str(entry.castingTime),
      components: str(entry.components),
      saveType: str(entry.saveType),
      // legacy mixes booleans and strings like "yes (harmless)" — keep raw
      sr:
        typeof entry.sr === "boolean" || typeof entry.sr === "string"
          ? entry.sr
          : false,
    };
    if (typeof entry.originalId === "string")
      spell.originalId = entry.originalId;
    if (typeof entry.duration === "string") spell.duration = entry.duration;
    if (typeof entry.school === "string") spell.school = entry.school;
    if (typeof entry.source === "string") spell.source = entry.source;
    if (Array.isArray(entry.classes)) spell.classes = entry.classes.map(String);
    out.push(spell);
  }
  return out;
}

function importPreparations(
  raw: unknown,
  level: SpellLevel,
  warnings: string[],
): SpellPreparation[] {
  if (!Array.isArray(raw)) return [];
  const out: SpellPreparation[] = [];
  for (const entry of raw as Record<string, unknown>[]) {
    if (!entry || typeof entry !== "object" || entry.spellId === undefined) {
      warnings.push(
        `spellbook: malformed preparation at level ${level} skipped`,
      );
      continue;
    }
    out.push({
      spellId: scalarText(entry.spellId),
      adjustedLevel:
        entry.adjustedLevel === undefined
          ? level
          : clampSpellLevel(entry.adjustedLevel),
      metamagic: Array.isArray(entry.metamagic)
        ? entry.metamagic.map(String)
        : [],
      count: Math.max(num(entry.count), 1),
    });
  }
  return out;
}

/**
 * Convert the legacy spellbook note's frontmatter into SpellbookState.
 * Lenient like the rest of the importer: malformed entries warn and skip,
 * derived values (castingStatBonus, slot maxima) are checked against the
 * stored legacy values but never stored.
 */
export function importSpellbook(
  raw: Record<string, unknown>,
  record: CharacterRecord,
  warnings: string[],
): SpellbookState {
  const castingClass = str(raw.castingClass);
  if (!castingClass) {
    warnings.push("spellbook: no castingClass; defaulted to wizard");
  }
  const klass = (castingClass || "wizard").toLowerCase();

  let castingStat = str(raw.castingStat).toLowerCase();
  if (!ABILITY_KEYS.includes(castingStat as AbilityKey)) {
    warnings.push(
      `spellbook: castingStat "${castingStat}" unrecognized; defaulted to int`,
    );
    castingStat = "int";
  }

  const sb = createDefaultSpellbook(klass, castingStat as AbilityKey);

  // casterLevel: stored as an override only when it disagrees with the
  // matching class entry (the class level is the derived default)
  if (
    raw.casterLevel !== undefined &&
    raw.casterLevel !== "" &&
    raw.casterLevel !== null
  ) {
    const storedCL = num(raw.casterLevel);
    const classCL = record.classes
      .filter((c) => c.className.toLowerCase().includes(klass))
      .reduce((sum, c) => sum + (c.level || 0), 0);
    if (classCL !== storedCL) {
      sb.casterLevelOverride = storedCL;
      warnings.push(
        `spellbook: casterLevel ${storedCL} disagrees with ${klass} class level ${classCL}; kept as override`,
      );
    }
  }

  // castingStatBonus is derived from abilities now (reacts to damage/buffs);
  // the legacy stored value is only checked for drift
  if (
    raw.castingStatBonus !== undefined &&
    raw.castingStatBonus !== "" &&
    raw.castingStatBonus !== null
  ) {
    const stored = num(raw.castingStatBonus);
    const base = record.baseAbilities[castingStat as AbilityKey];
    const derived = Math.floor((base - 10) / 2);
    if (stored !== derived) {
      warnings.push(
        `spellbook: stored castingStatBonus ${stored} differs from derived ${castingStat} mod ${derived}; the derived value wins`,
      );
    }
  }

  sb.spells = importKnownSpells(raw.spells, warnings);

  // --- per-level settings ---
  const sls =
    raw.spellLevelSettings && typeof raw.spellLevelSettings === "object"
      ? (raw.spellLevelSettings as Record<string, unknown>)
      : undefined;
  if (sls) {
    for (const level of SPELL_LEVELS) {
      const entry = sls[getSpellLevelKey(level)];
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      // vestigial keys (spellSlots, totalPrepared) are dropped: the legacy
      // code never read them and maxima are derived
      sb.levels[getSpellLevelKey(level)] = {
        remaining:
          typeof e.totalRemaining === "number" ? e.totalRemaining : null,
        castsRemaining:
          typeof e.totalCastsRemaining === "number"
            ? e.totalCastsRemaining
            : null,
        selectedMetamagic: str(e.selectedMetamagic),
        activeMetamagics: Array.isArray(e.activeMetamagics)
          ? e.activeMetamagics.map(String)
          : [],
      };
    }
    if (Array.isArray(sls.globalActiveMetamagics)) {
      sb.globalMetamagic.active = sls.globalActiveMetamagics.map(String);
    }
  }

  // Metamagic feats: legacy had no concept of "owned" feats (all 5 options
  // were always offered). Derive the owned set from every metamagic the
  // file actually mentions so the existing UI state stays reachable.
  const featMentions = new Set<string>();
  for (const levelState of Object.values(sb.levels)) {
    if (levelState.selectedMetamagic)
      featMentions.add(levelState.selectedMetamagic);
    for (const m of levelState.activeMetamagics) featMentions.add(m);
  }
  if (sls) {
    const nested = str(sls.selectedGlobalMetamagic);
    if (nested) featMentions.add(nested);
    if (Array.isArray(sls.globalActiveMetamagics)) {
      for (const m of sls.globalActiveMetamagics) featMentions.add(String(m));
    }
  }
  const rootSel = str(raw.selectedMetamagic);
  if (rootSel) featMentions.add(rootSel);
  sb.metamagicFeats = [...featMentions];
  if (sb.metamagicFeats.length > 0) {
    warnings.push(
      `spellbook: metamagic feats derived from the metamagics the legacy file mentions (${sb.metamagicFeats.length}); adjust in the spellbook config`,
    );
  }

  // Global selected metamagic: the legacy dropdown and its "+" button bind
  // spellLevelSettings.selectedGlobalMetamagic — that key wins. (A root
  // selectedMetamagic key also exists, read only by a dead accessor.)
  const nestedSelected = str(sls?.selectedGlobalMetamagic);
  const rootSelected = str(raw.selectedMetamagic);
  sb.globalMetamagic.selected = nestedSelected || rootSelected;
  if (nestedSelected && rootSelected && nestedSelected !== rootSelected) {
    warnings.push(
      `spellbook: root selectedMetamagic ("${rootSelected}") differs from the UI-bound spellLevelSettings.selectedGlobalMetamagic ("${nestedSelected}"); the UI binding wins`,
    );
  }

  // --- preparations + SLAs (both live under spellPreparations) ---
  const preps =
    raw.spellPreparations && typeof raw.spellPreparations === "object"
      ? (raw.spellPreparations as Record<string, unknown>)
      : undefined;
  if (preps) {
    for (const level of SPELL_LEVELS) {
      sb.preparations[getSpellLevelKey(level)] = importPreparations(
        preps[getSpellLevelKey(level)],
        level,
        warnings,
      );
    }
    if (Array.isArray(preps.sla)) {
      const slas: SlaEntry[] = [];
      for (const entry of preps.sla as Record<string, unknown>[]) {
        if (
          !entry ||
          typeof entry !== "object" ||
          entry.spellId === undefined
        ) {
          warnings.push("spellbook: malformed SLA entry skipped");
          continue;
        }
        const spellId = scalarText(entry.spellId);
        const linked = sb.spells.find((s) => s.id === spellId);
        if (!linked) {
          warnings.push(
            `spellbook: SLA references spell id ${spellId} not in spells[]`,
          );
        } else if (
          typeof entry.spellName === "string" &&
          entry.spellName !== linked.name
        ) {
          warnings.push(
            `spellbook: SLA name "${entry.spellName}" drifted from spell ${spellId} ("${linked.name}"); the spells[] name wins`,
          );
        }
        slas.push({
          spellId,
          casts: num(entry.casts),
          castsRemaining: num(entry.castsRemaining),
        });
      }
      sb.slas = slas;
    }
  }

  // --- collapse state (legacy calloutStates, mixed key forms kept as-is) ---
  if (raw.calloutStates && typeof raw.calloutStates === "object") {
    for (const [key, value] of Object.entries(
      raw.calloutStates as Record<string, unknown>,
    )) {
      sb.sectionCollapsed[key] = value === true || value === "true";
    }
  }

  return sb;
}

export function importLegacy(input: LegacyImportInput): LegacyImportResult {
  const { sheet, config } = input;
  const warnings: string[] = [];
  const record = createDefaultCharacter(input.id, input.name);
  record.characterType = input.characterType;

  // --- identity ---
  const race = config.race as Record<string, unknown> | undefined;
  record.race = str(config.raceChoice, str(race?.type));
  const baseSpeed = str(race?.base_speed, "30");
  record.speed = `${baseSpeed}ft`;
  if (typeof sheet.banner === "string") record.bannerImage = sheet.banner;

  // --- abilities ---
  record.baseAbilities = {
    str: num(sheet.str),
    dex: num(sheet.dex),
    con: num(sheet.con),
    int: num(sheet.int),
    wis: num(sheet.wis),
    cha: num(sheet.cha),
  };

  // --- classes: names from config.classes, levels from `${safeName}Level`.
  // Both notes carry level keys and historically disagree; the config note
  // matches the character's XP, so it wins (warned).
  const classes: ClassEntry[] = [];
  const classNames = Array.isArray(config.classes)
    ? (config.classes as string[])
    : [];
  for (const className of classNames) {
    const key = `${safeName(className)}Level`;
    const level = dual(key, sheet, config, warnings);
    // Legacy class strings embed the archetype in a parenthetical
    // ("Paladin (Virtuous Bravo)"); translate recognized ones into
    // archetypeKeys so archetype-gated math (bravo AC, divine grace,
    // spellcasting trades) applies to imported characters.
    const paren = /\(([^)]+)\)/.exec(className);
    const archetype = paren
      ? listArchetypes(className).find(
          (a) => a.name.toLowerCase() === paren[1].trim().toLowerCase(),
        )
      : undefined;
    if (archetype) {
      warnings.push(
        `Class "${className}": recognized archetype "${archetype.name}"`,
      );
    }
    classes.push({
      className,
      level: level ?? 0,
      ...(archetype ? { archetypeKeys: [archetype.id] } : {}),
    });
  }
  // The legacy AC renderer hardcoded the Scaled Fist CHA-to-AC bonus for
  // every monk (its only monk WAS a scaled fist), so a legacy monk with no
  // recorded archetype can only have meant one — infer it to keep imported
  // math equal to the live capture (same reasoning as the Virtuous Bravo
  // panache inference below). Both monk catalogs carry the "scaled-fist" id.
  for (const entry of classes) {
    if (!/\bmonk\b/i.test(entry.className) || entry.archetypeKeys) continue;
    if (!entry.level) continue;
    entry.archetypeKeys = ["scaled-fist"];
    warnings.push(
      `Class "${entry.className}": inferred the Scaled Fist archetype ` +
        `(the old sheet hardcoded its CHA-to-AC bonus for all monks)`,
    );
  }
  record.classes = classes;
  if (classNames.length === 0 && input.characterType === "familiar") {
    const bab = dual("bab", sheet, config, warnings);
    if (bab !== undefined) {
      record.babOverride = bab;
      warnings.push(
        `No classes; babOverride set to ${bab} (master-synced value)`,
      );
    }
  }

  // --- hp ---
  record.hp = {
    current: num(sheet.hp),
    max: num(sheet.hpMax),
    temp: num(sheet.tmpHp),
  };

  // --- ac ---
  record.ac = {
    natural: num(sheet.naturalAC),
    dodge: num(sheet.dodgeAC),
    deflection: num(sheet.deflectionAC),
    sizeMod: num(sheet.sizeMod),
    showCMBCMD: bool(sheet.showCMBCMD),
  };

  // --- energy resistance ---
  if (sheet.energyRes && typeof sheet.energyRes === "object") {
    for (const [kind, value] of Object.entries(
      sheet.energyRes as Record<string, unknown>,
    )) {
      record.energyRes[kind] = num(value);
    }
  }

  // --- initiative ---
  record.initiative = {
    miscBonus: num(sheet.initOther),
    familiarBonus: num(sheet.initFamilarBonus),
  };

  // --- toggles → quick actions (v6) ---
  // The frontmatter toggle booleans seed the default Quick Action catalog;
  // only rangedAttackStyle survives as a real toggle field.
  const importedToggles = {
    powerAttack: bool(sheet.powerAttack),
    fightingDefensively: bool(sheet.fightingDefensively),
    craneStyle: bool(sheet.craneStyle),
    agileWeapon: bool(sheet.agileWeapon),
    flurryOfBlows: bool(sheet.flurryOfBlows),
    flanking: bool(sheet.flanking),
    charging: bool(sheet.charging),
    smiteEvil: bool(sheet.smiteEvil),
    smiteEvilOutsider: bool(sheet.smiteEvilOutsider),
    preciseStrike: bool(sheet.preciseStrike),
    doublePreciseStrike: bool(sheet.doublePreciseStrike),
    versatilePerformance: bool(sheet.versatilePerformance),
    weaponSong: selectValue(sheet.weaponSong, "Off", warnings, "weaponSong"),
  };
  const seeded = seedQuickActionsFromToggles(importedToggles);
  record.quickActions = seeded.quickActions;
  record.quickActionState = seeded.quickActionState;
  const importedStyle = selectValue(
    sheet.rangedAttackStyle,
    "Longbow",
    warnings,
    "rangedAttackStyle",
  );
  record.toggles = {
    ...defaultToggles(),
    rangedAttackStyle: importedStyle,
    // the old "Ray" style is now the touch toggle on the ranged block
    ...(importedStyle === "Ray" ? { rangedTouch: true } : {}),
  };

  // --- enhancements ---
  record.enhancements = {
    meleeWeapon: num(sheet.meleeWeaponEnhancement),
    rangedWeapon: num(sheet.rangedWeaponEnhancement),
    resistance: num(sheet.resistanceEnhancement),
  };

  // --- adjustments ---
  record.adjustments = {
    atk: num(sheet.atkAdjust),
    dmg: num(sheet.dmgAdjust),
    rangedAtk: num(sheet.rangedAtkAdjust),
    rangedDmg: num(sheet.rangedDmgAdjust),
    unarmedAtk: num(sheet.unarmedAtkAdjust),
    unarmedDmg: num(sheet.unarmedDmgAdjust),
    ac: num(sheet.acAdjust),
    init: num(sheet.initAdjust),
    skill: num(sheet.skillAdjust),
    ability: {
      str: num(sheet.strAdjust),
      dex: num(sheet.dexAdjust),
      con: num(sheet.conAdjust),
      int: num(sheet.intAdjust),
      wis: num(sheet.wisAdjust),
      cha: num(sheet.chaAdjust),
    },
    drain: {
      str: num(sheet.strDrain),
      dex: num(sheet.dexDrain),
      con: num(sheet.conDrain),
    },
    damage: {
      str: num(sheet.strDamage),
      dex: num(sheet.dexDamage),
    },
    negativeLevels: num(sheet.negativeLevels),
  };

  // --- save notes (hardcoded text in the old MiniSheetSaves block) ---
  if (input.characterType === "pc") {
    record.saveNotes = {
      fort: "- +2 against death effects",
      ref: "- +2 against death effects\n- Evasion",
      will: "- +2 against death effects",
    };
  }

  // --- conditions / buffs ---
  record.conditions = Array.isArray(sheet.conditions)
    ? (sheet.conditions as string[])
    : [];
  record.buffs = Array.isArray(sheet.buffs) ? (sheet.buffs as string[]) : [];
  record.bofChoice = str(sheet.bofChoice);

  // --- skills ---
  record.skills = importSkills(sheet.skills, warnings);

  // --- resources ---
  const resources: ResourcePool[] = [];

  // panache (split across notes with disagreeing values) — a resources[]
  // pool since schema v4, rendered first like the legacy crease
  const panacheCurrent = dual("panacheCurrent", sheet, config, warnings);
  const panachePoints = dual("panachePoints", sheet, config, warnings);
  const panacheMax = dual("panacheMax", sheet, config, warnings);
  if (
    panacheCurrent !== undefined &&
    panachePoints !== undefined &&
    panacheCurrent !== panachePoints
  ) {
    warnings.push(
      `panacheCurrent (${panacheCurrent}) and panachePoints (${panachePoints}) disagree; used ${panacheCurrent}`,
    );
  }
  if (
    panacheMax !== undefined ||
    panacheCurrent !== undefined ||
    panachePoints !== undefined
  ) {
    resources.push({
      id: "panache",
      name: "Panache",
      current: panacheCurrent ?? panachePoints ?? 0,
      max: panacheMax ?? 0,
      footer: "points",
    });
    // Panache on a paladin with no swashbuckler levels can only mean
    // Virtuous Bravo — the legacy sheet never recorded the archetype
    // (its AC renderer hardcoded the Nimble bonus for every paladin), so
    // infer it here to keep imported math equal to the live capture.
    const hasSwashbuckler = record.classes.some((c) =>
      c.className.toLowerCase().includes("swashbuckler"),
    );
    const paladinEntry = record.classes.find((c) =>
      c.className.toLowerCase().includes("paladin"),
    );
    if (!hasSwashbuckler && paladinEntry && !paladinEntry.archetypeKeys) {
      paladinEntry.archetypeKeys = ["virtuous-bravo"];
      warnings.push(
        `Panache pool on a paladin: inferred the Virtuous Bravo archetype ` +
          `(the old sheet hardcoded its AC bonus for all paladins)`,
      );
    }
  }

  for (const spec of POOL_SPECS) {
    let current: number | undefined;
    for (const key of spec.currentKeys) {
      current = current ?? dual(key, sheet, config, warnings);
    }
    let max: number | undefined;
    for (const key of spec.maxKeys) {
      max = max ?? dual(key, sheet, config, warnings);
    }
    if (max === undefined && current === undefined) continue;
    resources.push({
      id: spec.id,
      name: spec.name,
      current: current ?? 0,
      max: max ?? 0,
      ...(spec.kind ? { kind: spec.kind } : {}),
      footer: spec.footer?.(sheet, config),
    });
  }
  record.resources = resources;

  // A weapon-song pool on a skald can only mean Spell Warrior (weapon song
  // IS that archetype's raging song; the legacy sheet never recorded the
  // archetype) — infer it so a later class-resource sync re-keys this pool
  // instead of granting the inspired-rage ragingSong pool she traded away.
  if (resources.some((r) => r.id === "weaponSongRounds")) {
    const skaldEntry = record.classes.find((c) =>
      c.className.toLowerCase().includes("skald"),
    );
    if (skaldEntry && !skaldEntry.archetypeKeys) {
      skaldEntry.archetypeKeys = ["spell-warrior"];
      warnings.push(
        `Weapon Song pool on a skald: inferred the Spell Warrior archetype ` +
          `(weapon song is that archetype's raging song)`,
      );
    }
  }

  // --- spell slots ---
  // With a spellbook note, the full spellbook replaces the old fallback
  // pools (slot maxima are computed, remaining counts live in the
  // spellbook state). Without one, build a slot-only spellbook (schema v5
  // home of the old spellSlotsL* resource pools).
  if (input.spellbook) {
    record.spellbook = importSpellbook(input.spellbook, record, warnings);
  } else {
    // minimal: the old spellbook computed maxima; only current counts live
    // in frontmatter, so max defaults to current
    const slots: { level: SpellLevel; current: number; max: number }[] = [];
    for (const [key, value] of Object.entries(sheet)) {
      const m = key.match(/^level(\d+)SpellSlotsCurrent$/);
      if (!m) continue;
      const lvl = clampSpellLevel(Number(m[1]));
      const current = num(value);
      slots.push({ level: lvl, current, max: Math.max(current, 1) });
      warnings.push(
        `Spell slot max for level ${lvl} is not stored in frontmatter; defaulted to ${Math.max(current, 1)} — adjust in config`,
      );
    }
    if (slots.length > 0) {
      record.spellbook = createSlotOnlySpellbook(slots);
    }
  }

  // --- weapons ---
  record.weapons = [
    {
      id: "melee",
      name: input.characterType === "familiar" ? "Bite" : "Waveblade",
      kind: "melee",
      damageDie: "1d6",
      critRange: "18-20",
      critMult: "2",
    },
  ];

  return { record, warnings };
}

export interface InventoryImportResult {
  inventory: InventoryState;
  warnings: string[];
}

/**
 * Import legacy `inventory` + `currency` frontmatter keys (the shape the
 * Datacore InventoryManager(-Party).jsx scripts read/write). Lenient like
 * the sheet import; every coercion is surfaced as a warning.
 *
 * H-546 guard: the legacy UIs bind specific notes (the per-character
 * manager hardcodes the *MiniSheetConfig note; the party manager's host
 * note lives only in the play vault) — an empty source very likely means
 * the wrong note was picked, so that warning leads.
 */
export function importLegacyInventory(
  raw: Record<string, unknown>,
  opts: { scope: "character" | "party" },
): InventoryImportResult {
  const warnings: string[] = [];
  const inventory = createDefaultInventory();

  const cur = raw.currency;
  if (cur && typeof cur === "object") {
    const c = cur as Record<string, unknown>;
    inventory.currency = {
      copper: Math.max(0, num(c.copper)),
      silver: Math.max(0, num(c.silver)),
      gold: Math.max(0, num(c.gold)),
      platinum: Math.max(0, num(c.platinum)),
    };
  } else {
    warnings.push("No currency found on the note; coins start at 0");
  }

  const rawItems = Array.isArray(raw.inventory) ? raw.inventory : [];
  if (!Array.isArray(raw.inventory)) {
    warnings.push("No inventory array found on the note");
  }

  const items: InventoryItem[] = [];
  for (const [index, entry] of rawItems.entries()) {
    if (!entry || typeof entry !== "object") {
      warnings.push(`Item ${index + 1}: not an object; skipped`);
      continue;
    }
    const it = entry as Record<string, unknown>;
    const name = str(it.name).trim();
    if (!name) {
      warnings.push(`Item ${index + 1}: missing name; skipped`);
      continue;
    }
    let id = str(it.id);
    if (!id) {
      id = newItemId();
      warnings.push(`"${name}": missing id; generated ${id}`);
    }
    const rawType = str(it.type, "Other");
    let type = normalizeItemType(rawType);
    if (!type) {
      warnings.push(`"${name}": unknown type "${rawType}"; imported as Other`);
      type = "Other";
    }
    let note =
      typeof it.note === "string" && it.note.trim() ? it.note.trim() : null;
    if (note && note.length > NOTE_MAX_LENGTH) {
      note = note.slice(0, NOTE_MAX_LENGTH);
      warnings.push(
        `"${name}": note truncated to ${NOTE_MAX_LENGTH} characters`,
      );
    }
    let charges: number | null = null;
    if (type === "Wand") {
      charges = Math.min(Math.max(0, num(it.charges)), WAND_MAX_CHARGES);
    } else if (
      it.charges !== null &&
      it.charges !== undefined &&
      num(it.charges) > 0
    ) {
      warnings.push(
        `"${name}": charges on a non-wand (${scalarText(it.charges)}); dropped`,
      );
    }
    items.push({
      id,
      name,
      type,
      count: Math.max(1, Math.floor(num(it.count) || 1)),
      weight: Math.max(0, num(it.weight)),
      value: Math.max(0, num(it.value)),
      containerId:
        typeof it.containerId === "string" && it.containerId
          ? it.containerId
          : null,
      note,
      charges,
      ...(opts.scope === "party"
        ? {
            owner:
              typeof it.owner === "string" && it.owner.trim()
                ? it.owner.trim()
                : null,
          }
        : {}),
    });
  }

  // orphaned container references -> top level
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    if (item.containerId && !ids.has(item.containerId)) {
      warnings.push(
        `"${item.name}": container "${item.containerId}" not in import; moved to top level`,
      );
      item.containerId = null;
    }
  }

  if (items.length === 0) {
    warnings.unshift(
      "0 items found on this note — verify it is the note the legacy inventory UI binds " +
        "(the dev vault's AdarinMiniSheetConfig.md is empty; live data may sit on a different note)",
    );
  }

  inventory.items = items;
  return { inventory, warnings };
}
