/**
 * Characterization tests for the archetype replaces/alters sentence parser.
 * Every input string is REAL scraped aonprd text (captured from the first
 * Paladin scrape run) — never paraphrase these; the equipment scrape taught
 * us that hand-written approximations pass while the real corpus fails.
 */
import { describe, expect, it } from "vitest";
import { parseFeatureRefs } from "../../../scripts/scrape-archetypes/parse-replaces";
import paladinJson from "../../../src/data/archetypes/paladin.json";

const BASE = paladinJson.baseFeatures;

describe("parseFeatureRefs: aonprd Paladin corpus", () => {
  it("simple template (Stonelord: Stonestrike)", () => {
    const { replaces, alters } = parseFeatureRefs(
      "Once per day per paladin level, a stonelord can draw upon the power of the living rock. This ability replaces smite evil.",
      BASE
    );
    expect(replaces).toEqual([{ feature: "smite-evil", raw: "smite evil" }]);
    expect(alters).toEqual([]);
  });

  it("compound with multi-level mercies (Stonelord: Stoneblood)", () => {
    const { replaces } = parseFeatureRefs(
      "This ability replaces divine health and her mercies gained at 3rd, 9th, and 15th level.",
      BASE
    );
    expect(replaces).toEqual([
      { feature: "divine-health", raw: "divine health" },
      {
        feature: "mercy",
        levels: [3, 9, 15],
        // raw is the post-split audit echo; the ordinal guard normalizes
        // ", and " separators to plain commas.
        raw: "her mercies gained at 3rd, 9th, 15th level",
      },
    ]);
  });

  it("single level-qualified mercy (Stonelord: Phase Strike)", () => {
    const { replaces } = parseFeatureRefs(
      "This ability replaces her 12th-level mercy.",
      BASE
    );
    expect(replaces).toEqual([
      { feature: "mercy", levels: [12], raw: "her 12th-level mercy" },
    ]);
  });

  it("'the standard paladin's X ability' (Hospitaler)", () => {
    const { replaces } = parseFeatureRefs(
      "This replaces the standard paladin’s channel positive energy ability.",
      BASE
    );
    expect(replaces).toEqual([
      {
        feature: "channel-positive-energy",
        raw: "the standard paladin’s channel positive energy ability",
      },
    ]);
  });

  it("unmodeled feature stays unmatched (Divine Hunter)", () => {
    const { replaces } = parseFeatureRefs(
      "This ability replaces her Heavy Armor Proficiency.",
      BASE
    );
    expect(replaces).toEqual([
      {
        feature: "heavy-armor-proficiency",
        raw: "her Heavy Armor Proficiency",
        unmatched: true,
      },
    ]);
  });

  it("mixed alters+replaces plus never-gains prose (Gray Paladin: Weakened Grace)", () => {
    const { replaces, alters } = parseFeatureRefs(
      "A gray paladin’s loosened code weakens her connection to the power that grants her paladin abilities. She gains her first use of smite evil at 2nd level, instead of 1st, though she still gains further uses of smite evil at the rate listed on Table 3–11 of the Core Rulebook . She never gains the aura of good or divine grace class features. Her aura of courage does not make her immune to fear, her aura of resolve does not make her immune to charms, and her aura of righteousness does not make her immune to compulsions. This ability alters smite evil, aura of courage, aura of resolve, and aura of righteousness, and it replaces aura of good and divine grace.",
      BASE
    );
    expect(replaces.map((r) => r.feature).sort()).toEqual([
      "aura-of-good",
      "divine-grace",
    ]);
    expect(replaces.every((r) => !r.unmatched)).toBe(true);
    expect(alters.map((r) => r.feature)).toEqual([
      "smite-evil",
      "aura-of-courage",
      "aura-of-resolve",
      "aura-of-righteousness",
    ]);
  });

  it("does-not-gain prose without a template sentence (Chosen One: Bondless)", () => {
    const { replaces, alters } = parseFeatureRefs(
      "A chosen one does not gain the divine bond class feature.",
      BASE
    );
    expect(replaces).toEqual([
      { feature: "divine-bond", raw: "divine bond" },
    ]);
    expect(alters).toEqual([]);
  });

  it("spellcasting aliases to the synthetic spells feature (Virtuous Bravo: Panache and Deeds)", () => {
    const { replaces } = parseFeatureRefs(
      "At 4th level, a virtuous bravo gains the swashbuckler’s panache class feature along with the following swashbuckler deeds: dodging panache, menacing swordplay, opportune parry and riposte, precise strike, and swashbuckler initiative. The virtuous bravo’s paladin levels stack with any swashbuckler levels when using these deeds. This ability replaces the paladin’s spellcasting.",
      BASE
    );
    expect(replaces).toEqual([
      { feature: "spells", raw: "the paladin’s spellcasting" },
    ]);
  });

  it("level-scoped refs never lose their levels to the whole-feature form (Gray Paladin: Smite Foe)", () => {
    const { replaces, alters } = parseFeatureRefs(
      "At 4th level, a gray paladin can spend two uses of smite evil in order to smite a nongood creature that is not evil and gain her full benefits. This ability replaces channel positive energy and alters smite evil.",
      BASE
    );
    expect(replaces).toEqual([
      { feature: "channel-positive-energy", raw: "channel positive energy" },
    ]);
    expect(alters).toEqual([{ feature: "smite-evil", raw: "smite evil" }]);
  });
});

describe("scraped paladin.json integrity", () => {
  it("has all 47 archetypes with unique ids", () => {
    expect(paladinJson.archetypes).toHaveLength(47);
    const ids = paladinJson.archetypes.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("base feature table pins the canonical levels", () => {
    const byId = new Map(BASE.map((f) => [f.id, f.level]));
    expect(byId.get("smite-evil")).toBe(1);
    expect(byId.get("divine-grace")).toBe(2);
    expect(byId.get("lay-on-hands")).toBe(2);
    expect(byId.get("channel-positive-energy")).toBe(4);
    expect(byId.get("spells")).toBe(4);
    expect(byId.get("divine-bond")).toBe(5);
  });

  it("every archetype parsed at least one replaces/alters ref", () => {
    for (const a of paladinJson.archetypes) {
      const refs = a.features.reduce(
        (n, f) => n + f.replaces.length + f.alters.length,
        0
      );
      expect(refs, `${a.id} should have refs`).toBeGreaterThan(0);
    }
  });
});
