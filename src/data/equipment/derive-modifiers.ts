/**
 * Heuristic modifier derivation for scraped magic items: turns AoN
 * description prose into typed engine modifiers for the common stat-item
 * phrasings ("+2 enhancement bonus to Strength", "+1 resistance bonus on
 * saving throws", ...). Deliberately conservative — anything ambiguous
 * (wearer's-choice stats, multi-value text without a variant name) derives
 * nothing and the item ships with needsReview instead of a wrong bonus.
 *
 * Pure TS: imported by scripts/scrape-equipment/ at scrape time AND
 * unit-tested directly (tests/unit/data/derive-modifiers.test.ts).
 */
import type { Modifier } from "../../calc/modifiers";
import { STANDARD_SKILLS } from "../../calc/skills";
import type { AbilityKey } from "../../types/character";

const ABILITY_BY_NAME: Record<string, AbilityKey> = {
  strength: "str",
  dexterity: "dex",
  constitution: "con",
  intelligence: "int",
  wisdom: "wis",
  charisma: "cha",
};

const SKILL_BY_LOWER: Record<string, string> = Object.fromEntries(
  Object.keys(STANDARD_SKILLS).map((name) => [name.toLowerCase(), name]),
);

/** "+N" baked into the item name ("Belt of Giant Strength (+2)") wins. */
function nameValue(name: string): number | null {
  const m = /\(\+(\d+)\)\s*$|\+(\d+)\s*$/.exec(name);
  return m ? Number(m[1] ?? m[2]) : null;
}

export function deriveModifiers(name: string, description: string): Modifier[] {
  const mods: Modifier[] = [];
  const text = description.replace(/\s+/g, " ");
  const fromName = nameValue(name);
  const pick = (textValue: string | undefined): number | null =>
    fromName ?? (textValue ? Number(textValue) : null);

  // Wearer's-choice stat items (Belt of Physical Might...) cannot be
  // auto-derived; bail entirely rather than guess one stat.
  if (/abilit(y|ies)[^.]{0,40}of the wearer's choice/i.test(text)) return [];

  // enhancement bonus to <ability> — value from name, "+N ... bonus to X",
  // or "bonus to X of +N" (both word orders appear in the corpus).
  const abilityFwd =
    /\+(\d+)[^.;]{0,60}?enhancement bonus to (?:the wearer's |his |her )?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i.exec(
      text,
    );
  const abilityRev =
    /enhancement bonus to (?:the wearer's |his |her )?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: score)?(?: of)? \+(\d+)/i.exec(
      text,
    );
  const abilityName = abilityFwd?.[2] ?? abilityRev?.[1];
  if (abilityName) {
    const value = pick(abilityFwd?.[1] ?? abilityRev?.[2]);
    const key = ABILITY_BY_NAME[abilityName.toLowerCase()];
    if (value && key) {
      mods.push({
        target: `ability.${key}`,
        type: "enhancement",
        value,
        source: name,
      });
    }
  }

  // +N <type> bonus on (all) saving throws
  const save =
    /\+(\d+)\s+(resistance|luck|insight|morale|competence|sacred|profane)\s+bonus on (?:all )?sav(?:ing|e) throws/i.exec(
      text,
    );
  if (save) {
    const value = pick(save[1]);
    if (value) {
      mods.push({
        target: "save.all",
        type: save[2]!.toLowerCase() as Modifier["type"],
        value,
        source: name,
      });
    }
  }

  // enhancement bonus to natural armor — "+N enhancement bonus to natural
  // armor" or the amulet's "enhancement bonus to his natural armor bonus of
  // from +1 to +5" (value-trailing form).
  const naturalFwd =
    /\+(\d+)\s+enhancement bonus to (?:the wearer's |his |her )?(?:existing )?natural armor/i.exec(
      text,
    );
  const naturalRev =
    /enhancement bonus to (?:the wearer's |his |her )?(?:existing )?natural armor(?: bonus)?(?: of)?(?: from)? \+(\d+)/i.exec(
      text,
    );
  if (naturalFwd || naturalRev) {
    const value = pick(naturalFwd?.[1] ?? naturalRev?.[1]);
    if (value) {
      mods.push({
        target: "ac.natural",
        type: "enhancement",
        value,
        source: name,
      });
    }
  }

  // +N <type> bonus to AC — both word orders ("+1 deflection bonus to AC"
  // and Ring of Protection's "deflection bonus of +1 to AC").
  const acFwd =
    /\+(\d+)\s+(deflection|insight|luck|dodge|sacred|profane)\s+bonus to (?:his |her |the wearer's )?(?:AC|Armor Class)/i.exec(
      text,
    );
  const acRev =
    /(deflection|insight|luck|dodge|sacred|profane)\s+bonus of \+(\d+)(?: to \+\d+)? to (?:his |her |the wearer's )?(?:AC|Armor Class)/i.exec(
      text,
    );
  const acType = acFwd?.[2] ?? acRev?.[1];
  if (acType) {
    const value = pick(acFwd?.[1] ?? acRev?.[2]);
    if (value) {
      mods.push({
        target: "ac.all",
        type: acType.toLowerCase() as Modifier["type"],
        value,
        source: name,
      });
    }
  }

  // +N competence/circumstance bonus on <Skill> checks (single named skill)
  const skill =
    /\+(\d+)\s+(competence|circumstance|insight|luck)\s+bonus on ([A-Za-z ()]+?) (?:skill )?checks/i.exec(
      text,
    );
  if (skill) {
    const value = pick(skill[1]);
    const skillName = SKILL_BY_LOWER[skill[3]!.trim().toLowerCase()];
    if (value && skillName) {
      mods.push({
        target: `skill.${skillName}`,
        type: skill[2]!.toLowerCase() as Modifier["type"],
        value,
        source: name,
      });
    }
  }

  // +N <type> bonus on initiative checks
  const init =
    /\+(\d+)\s+(insight|competence|luck|circumstance)\s+bonus on initiative checks/i.exec(
      text,
    );
  if (init) {
    const value = pick(init[1]);
    if (value) {
      mods.push({
        target: "initiative",
        type: init[2]!.toLowerCase() as Modifier["type"],
        value,
        source: name,
      });
    }
  }

  return mods;
}
