/**
 * Spell frontmatter parsing — pure TS ports of the legacy
 * SpellGenerator.jsx helpers (parseSpellLevel and friends, plus
 * transformSpellForSpellbook). No obsidian imports; characterized
 * against every distinct spellLevel string captured from the vault.
 */

import type { KnownSpell, SpellLevel } from "../types/spellbook";

export interface ParsedSpellLevel {
  classes: string[];
  levels: Record<string, number>;
}

/** "sorcerer/wizard 3, magus 3" → {classes, levels} (legacy parseSpellLevel). */
export function parseSpellLevel(spellLevelStr: string): ParsedSpellLevel {
  if (!spellLevelStr) return { classes: [], levels: {} };
  const entries = spellLevelStr.split(",").map((s) => s.trim());
  const result: ParsedSpellLevel = { classes: [], levels: {} };
  for (const entry of entries) {
    const match = entry.match(/^(.+?)\s+(\d+)$/);
    if (match) {
      const [, classNames, level] = match;
      const classes = classNames.split("/").map((c) => c.trim());
      for (const cls of classes) {
        if (!result.classes.includes(cls)) result.classes.push(cls);
        result.levels[cls] = parseInt(level);
      }
    }
  }
  return result;
}

export function getAllLevels(spellLevelStr: string): number[] {
  if (!spellLevelStr) return [];
  return [...new Set(Object.values(parseSpellLevel(spellLevelStr).levels))];
}

export function getLowestLevel(spellLevelStr: string): number {
  if (!spellLevelStr) return 0;
  const levels = getAllLevels(spellLevelStr);
  return levels.length > 0 ? Math.min(...levels) : 0;
}

/** Unique levels ascending, joined: "3, 4". */
export function formatLevelsForDisplay(spellLevelStr: string): string {
  if (!spellLevelStr) return "";
  const unique = [
    ...new Set(Object.values(parseSpellLevel(spellLevelStr).levels)),
  ].sort((a, b) => a - b);
  return unique.join(", ");
}

/** "3 (sorcerer/wizard), 4 (magus)" for the level-cell tooltip. */
export function formatLevelsWithClassesForTooltip(
  spellLevelStr: string,
): string {
  if (!spellLevelStr) return "";
  const parsed = parseSpellLevel(spellLevelStr);
  const groups: Record<string, string[]> = {};
  for (const [className, level] of Object.entries(parsed.levels)) {
    (groups[level] ??= []).push(className);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([level, classes]) => `${level} (${classes.join("/")})`)
    .join(", ");
}

/** True when no material component costs more than 1 gp. */
export function isEschewMaterialsCompatible(components: string): boolean {
  if (!components || typeof components !== "string") return true;
  const gpMatches = components.match(/(\d+(?:,\d+)*)\s*gp/gi);
  if (!gpMatches) return true;
  for (const match of gpMatches) {
    const cost = parseInt(match.replace(/[^\d,]/g, "").replace(/,/g, ""));
    if (cost > 1) return false;
  }
  return true;
}

/** Legacy school color pills (the one visual carried over from the old DB). */
export function getSchoolColors(school: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    abjuration: { bg: "#4A90E2", text: "#FFFFFF" },
    conjuration: { bg: "#7B68EE", text: "#FFFFFF" },
    divination: { bg: "#FFB347", text: "#000000" },
    enchantment: { bg: "#FF69B4", text: "#FFFFFF" },
    evocation: { bg: "#FF4500", text: "#FFFFFF" },
    illusion: { bg: "#9370DB", text: "#FFFFFF" },
    necromancy: { bg: "#2F4F4F", text: "#FFFFFF" },
    transmutation: { bg: "#32CD32", text: "#000000" },
    universal: { bg: "#708090", text: "#FFFFFF" },
  };
  return (
    colors[(school || "").toLowerCase()] ?? { bg: "#6B7280", text: "#FFFFFF" }
  );
}

/**
 * Per-school "ink" hue (Spell DB redesign). The school pill renders as
 * color: ink, background: ink @ 15% (ink+"26"), border: ink @ ~45% (ink+"73").
 * These are categorical data colors, intentionally separate from the brand
 * gold/red accent seam (which routes through --ms-accent-*).
 */
const SCHOOL_INK: Record<string, string> = {
  abjuration: "#6aa6ef",
  conjuration: "#9b86f2",
  divination: "#e0a64e",
  enchantment: "#ef74b3",
  evocation: "#ef6a4e",
  illusion: "#b48cf0",
  necromancy: "#6f9a93",
  transmutation: "#6cc26a",
  universal: "#98a4b4",
};

export function getSchoolInk(school: string): string {
  return SCHOOL_INK[(school || "").toLowerCase()] ?? "#98a4b4";
}

export interface SpellDocLike {
  id: string;
  name: string;
  spellLevelRaw: string;
  range: string;
  castingTime: string;
  components: string;
  saveType: string;
  sr: string;
  duration: string;
  school: string;
  source: string;
}

/**
 * Database record → KnownSpell, exactly like the legacy add-to-spellbook
 * transform: composite id when a specific level/classes pairing was picked
 * (`${id}_L${n}_${classes}`), range trimmed at "(", "standard action" →
 * "std", duration kept raw.
 */
export function transformSpellForSpellbook(
  doc: SpellDocLike,
  selectedLevel: number | null = null,
  selectedClasses: string[] | null = null,
): KnownSpell {
  const baseLevel = (
    selectedLevel !== null ? selectedLevel : getLowestLevel(doc.spellLevelRaw)
  ) as SpellLevel;
  const uniqueId =
    selectedLevel !== null && selectedClasses
      ? `${doc.id}_L${selectedLevel}_${selectedClasses.join("_").replace(/[^a-zA-Z0-9]/g, "")}`
      : doc.id;
  const processedRange = (doc.range || "").split("(")[0].trim();
  const processedCastingTime = (doc.castingTime || "")
    .replace(/standard/gi, "std")
    .replace(/\s*action\s*/gi, "")
    .toLowerCase()
    .trim();
  const spell: KnownSpell = {
    id: uniqueId,
    originalId: doc.id,
    name: doc.name,
    baseLevel,
    known: true,
    range: processedRange,
    castingTime: processedCastingTime,
    components: doc.components || "",
    saveType: doc.saveType || "",
    sr: doc.sr || "",
    duration: doc.duration || "",
    school: doc.school || "",
    source: doc.source || "",
  };
  if (selectedLevel !== null && selectedClasses) {
    spell.classes = selectedClasses;
  }
  return spell;
}
