/**
 * Pure parser for the replaces/alters graph in archetype feature text.
 *
 * aonprd ends most feature blocks with template sentences:
 *   "This ability replaces smite evil."
 *   "This replaces the standard paladin's channel positive energy ability."
 *   "This ability replaces divine health and her mercies gained at 3rd, 9th,
 *    and 15th level."
 *   "This ability alters smite evil, aura of courage, aura of resolve, and
 *    aura of righteousness, and it replaces aura of good and divine grace."
 * Some archetypes use prose instead (Chosen One):
 *   "A chosen one does not gain the divine bond class feature."
 *
 * Philosophy: warn-not-fail. Anything that doesn't resolve against the
 * base-class feature table is kept with unmatched: true and its raw text as
 * an audit trail. "modifies" normalizes to alters. Unit fixtures pin REAL
 * scraped sentences — never paraphrase them.
 */
import type { BaseClassFeature, FeatureRef } from "../../src/types/archetypes";
import { slugify } from "../scrape-equipment/common";

export interface ParsedRefs {
  replaces: FeatureRef[];
  alters: FeatureRef[];
}

/** Template sentences: "This/These ... replaces/alters/modifies ... ." */
const TEMPLATE_SENTENCE_RE =
  /\b(?:This|These)[^.]{0,80}?\b(?:replaces?|alters?|modifies|modify)\b[^.]*\./g;

/** Prose suppression: "... does not gain the divine bond class feature." */
const DOES_NOT_GAIN_RE =
  /\b(?:does not|never) gains? (?:the )?([^.]+?) class features?\b/g;

const VERB_RE = /\b(replaces?|alters?|modifies|modify)\b/g;

/** Words stripped from the front of a feature reference. */
const LEAD_NOISE = new Set([
  "the",
  "a",
  "an",
  "her",
  "his",
  "their",
  "its",
  "all",
  "of",
  "standard",
  "associated",
  "both",
  "use",
  "uses",
]);

/** Words stripped from the back of a feature reference. */
const TAIL_NOISE_RE =
  /\s+(?:ability|abilities|class features?|features?|gained|at|levels?)\s*$/;

/** Aliases for features the class table doesn't print verbatim. Applied
 * only when the aliased slug exists in the base feature table. */
const FEATURE_ALIASES: Record<string, string> = {
  spellcasting: "spells",
  "spell-casting": "spells",
  "divine-spellcasting": "spells",
  spell: "spells",
  "channel-energy": "channel-positive-energy",
  // The class tables bake column riders into these slugs: core Monk prints
  // "Ki pool (magic)", unchained Monk "Flurry of blows (bonus attack)".
  "ki-pool": "ki-pool-magic",
  "flurry-of-blows": "flurry-of-blows-bonus-attack",
};

const ORDINAL_RE = /(\d+)(?:st|nd|rd|th)/g;
const ITEM_MARK = "\u0001";

/**
 * Split a verb clause into feature items, protecting ordinal lists
 * ("3rd, 9th, and 15th level") from the comma/and split.
 */
function splitItems(clause: string): string[] {
  const guarded = clause.replace(
    /(\d+(?:st|nd|rd|th))\s*,?\s*(?:and\s+)?(?=\d+(?:st|nd|rd|th))/g,
    `$1${ITEM_MARK} `
  );
  return guarded
    .split(/,|\b(?:and|or)\b/)
    .map((s) => s.replace(new RegExp(ITEM_MARK, "g"), ",").trim())
    .filter(Boolean);
}

/** Strip leading possessives/determiners ("the standard paladin's ...",
 * "the sacred shield's ..."). A possessive in the first few words ends a
 * possessor phrase — drop everything through the last one. */
function stripLead(item: string): string {
  let words = item.split(/\s+/);
  for (let j = Math.min(3, words.length - 2); j >= 0; j--) {
    if (/['’]s$/.test(words[j])) {
      words = words.slice(j + 1);
      break;
    }
  }
  let i = 0;
  while (i < words.length - 1 && LEAD_NOISE.has(words[i].toLowerCase())) {
    i++;
  }
  return words.slice(i).join(" ");
}

function singularize(slug: string): string {
  if (slug.endsWith("ies")) return `${slug.slice(0, -3)}y`; // mercies → mercy
  if (slug.endsWith("s") && !slug.endsWith("ss")) return slug.slice(0, -1);
  return slug;
}

/** Resolve one raw item to a FeatureRef against the base feature table. */
function resolveItem(
  rawItem: string,
  baseSlugs: Set<string>
): FeatureRef | null {
  const raw = rawItem.trim();
  let item = raw.toLowerCase();

  // Extract level qualifiers: "6th-level mercy", "mercies gained at 3rd,
  // 9th, and 15th level". Ordinals only count as levels when "level" is
  // nearby — bare ordinals inside names are left alone.
  let levels: number[] | undefined;
  if (/level/.test(item)) {
    const ords = [...item.matchAll(ORDINAL_RE)].map((m) => Number(m[1]));
    if (ords.length > 0) {
      levels = ords;
      item = item
        .replace(ORDINAL_RE, " ")
        .replace(/[-,]/g, " ")
        .replace(/\b(gained|at|levels?)\b/g, " ");
    }
  }

  item = stripLead(item.replace(/\s+/g, " ").trim());
  // Strip trailing noise repeatedly ("code of conduct and associated
  // abilities" arrives pre-split; "channel positive energy ability" → core).
  let prev = "";
  while (prev !== item) {
    prev = item;
    item = item.replace(TAIL_NOISE_RE, "").trim();
  }
  if (!item) return null;

  let slug = slugify(item);
  if (!baseSlugs.has(slug)) {
    for (const candidate of [
      FEATURE_ALIASES[slug],
      singularize(slug),
      FEATURE_ALIASES[singularize(slug)],
    ]) {
      if (candidate && baseSlugs.has(candidate)) {
        slug = candidate;
        break;
      }
    }
  }

  const matched = baseSlugs.has(slug);
  const ref: FeatureRef = { feature: slug, raw };
  if (levels && levels.length > 0) ref.levels = levels;
  if (!matched) ref.unmatched = true;
  return ref;
}

function dedupe(refs: FeatureRef[]): FeatureRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.feature}:${(r.levels ?? []).join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parse one feature block's text into its replaces/alters refs.
 * Pure; exercised directly by unit fixtures of real scraped sentences.
 */
export function parseFeatureRefs(
  text: string,
  baseFeatures: BaseClassFeature[]
): ParsedRefs {
  const baseSlugs = new Set(baseFeatures.map((f) => f.id));
  const replaces: FeatureRef[] = [];
  const alters: FeatureRef[] = [];

  for (const sentence of text.match(TEMPLATE_SENTENCE_RE) ?? []) {
    const hits = [...sentence.matchAll(VERB_RE)];
    for (let i = 0; i < hits.length; i++) {
      const start = (hits[i].index ?? 0) + hits[i][0].length;
      const end = i + 1 < hits.length ? hits[i + 1].index : sentence.length - 1;
      const clause = sentence
        .slice(start, end)
        .replace(/,?\s*\band\s+(?:it|they|she|he)\s*$/i, "")
        .trim();
      const bucket = hits[i][1].startsWith("replace") ? replaces : alters;
      for (const item of splitItems(clause)) {
        const ref = resolveItem(item, baseSlugs);
        if (ref) bucket.push(ref);
      }
    }
  }

  for (const m of text.matchAll(DOES_NOT_GAIN_RE)) {
    for (const item of splitItems(m[1])) {
      const ref = resolveItem(item, baseSlugs);
      if (ref) replaces.push(ref);
    }
  }

  return { replaces: dedupe(replaces), alters: dedupe(alters) };
}
