/**
 * Hand-authored Sorcerer archetype mechanics (curated set). Formulas are
 * transcribed from the scraped feature text in ../sorcerer.json — each entry
 * cites the governing sentence. The Sorcerer has no base pools/quick actions
 * the sheet tracks (bloodlines aren't modeled), so unlike Paladin/Monk these
 * archetypes ADD rather than suppress — and Crossblooded's only modeled
 * footprint is a save penalty, expressed as a typed modifier.
 */
import type { ArchetypeMechanics } from "../../types";

export const SORCERER_ARCHETYPE_MECHANICS: Record<string, ArchetypeMechanics> =
  {
    // "Tinkering: ... a seeker gains Disable Device as a class skill ... A
    // seeker can use Disable Device to disarm magical traps." (The +1/2 level
    // bonus to trap-finding Perception and Disable Device is a conditional
    // rider, carried by the scraped feature text, not auto-summed.) For a
    // sorcerer, Tinkering replaces the bonus Eschew Materials feat (not
    // modeled), so there is nothing to suppress.
    seeker: {
      key: "seeker",
      classKey: "Sorcerer",
      classSkills: { add: ["Disable Device"] },
    },

    // "Pesh Touch: ... A sorcerer of sleep can use pesh touch a number of
    // times per day equal to 3 + her Charisma modifier. This ability replaces
    // the 1st-level bloodline power." The replaced bloodline power isn't
    // modeled, so this is a pure add.
    "sorcerer-of-sleep": {
      key: "sorcerer-of-sleep",
      classKey: "Sorcerer",
      addsResources: [
        {
          id: "peshTouch",
          name: "Pesh Touch",
          max: (_level, mods) => Math.max(0, 3 + mods.cha),
          footer: "uses/day",
          describe: "3 + Cha mod",
        },
      ],
    },

    // "Create Spell Tattoo: At 7th level, a tattooed sorcerer can create a
    // spell tattoo ... once per day ... She can use this ability twice per day
    // at 11th level, and three times per day at 15th level. This ability
    // replaces the bloodline feat gained at 7th level." (The familiar tattoo
    // arcane bond isn't modeled — it replaces the 1st-level bloodline power.)
    "tattooed-sorcerer": {
      key: "tattooed-sorcerer",
      classKey: "Sorcerer",
      addsResources: [
        {
          id: "createSpellTattoo",
          name: "Create Spell Tattoo",
          minLevel: 7,
          max: (level) => (level >= 15 ? 3 : level >= 11 ? 2 : 1),
          footer: "uses/day",
          describe: "1/day (2 at 11th, 3 at 15th)",
        },
      ],
    },

    // "False Piety: At 1st level, a Razmiran priest gains Knowledge (religion)
    // and Perform as class skills, but loses Appraise and Fly as class skills
    // ... this ability replaces the priest's Eschew Materials bonus feat."
    "razmiran-priest": {
      key: "razmiran-priest",
      classKey: "Sorcerer",
      classSkills: {
        add: ["Knowledge (religion)", "Perform (any)"],
        remove: ["Appraise", "Fly"],
      },
    },

    // "Drawbacks: ... A crossblooded sorcerer always takes a -2 penalty on
    // Will saves." The dual-bloodline benefits and the -1 spell known per
    // level aren't modeled; the Will penalty rides the typed-modifier engine.
    crossblooded: {
      key: "crossblooded",
      classKey: "Sorcerer",
      addsModifiers: [
        {
          target: "save.will",
          type: "untyped",
          value: -2,
          source: "Crossblooded",
        },
      ],
    },
  };
