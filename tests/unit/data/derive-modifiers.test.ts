/**
 * Heuristic modifier-derivation tests. Description strings are taken from
 * the actual AoN/Ultimate Equipment item text (the corpus the parser runs
 * against at scrape time); expected modifier shapes are hand-derived from
 * the plan's canonical emission table.
 */
import { describe, expect, it } from "vitest";
import { deriveModifiers } from "../../../src/data/equipment/derive-modifiers";

describe("deriveModifiers: stat-item phrasings", () => {
  it("Belt of Giant Strength: enhancement to Strength, value from name", () => {
    const mods = deriveModifiers(
      "Belt of Giant Strength (+2)",
      "This belt grants the wearer an enhancement bonus to Strength of +2, +4, or +6.",
    );
    expect(mods).toEqual([
      {
        target: "ability.str",
        type: "enhancement",
        value: 2,
        source: "Belt of Giant Strength (+2)",
      },
    ]);
  });

  it("name value wins over first value in shared variant text", () => {
    const mods = deriveModifiers(
      "Belt of Giant Strength (+4)",
      "This belt grants the wearer an enhancement bonus to Strength of +2, +4, or +6.",
    );
    expect(mods[0]).toMatchObject({ target: "ability.str", value: 4 });
  });

  it("Headband of Vast Intelligence: enhancement to Intelligence", () => {
    const mods = deriveModifiers(
      "Headband of Vast Intelligence (+2)",
      "This intricate gold headband is decorated with several small blue and deep purple gemstones. The headband grants the wearer an enhancement bonus to Intelligence of +2, +4, or +6.",
    );
    expect(mods).toEqual([
      {
        target: "ability.int",
        type: "enhancement",
        value: 2,
        source: "Headband of Vast Intelligence (+2)",
      },
    ]);
  });

  it("Cloak of Resistance: resistance bonus on all saves", () => {
    const mods = deriveModifiers(
      "Cloak of Resistance (+1)",
      "These garments offer magic protection in the form of a +1 to +5 resistance bonus on all saving throws (Fortitude, Reflex, and Will).",
    );
    expect(mods).toEqual([
      {
        target: "save.all",
        type: "resistance",
        value: 1,
        source: "Cloak of Resistance (+1)",
      },
    ]);
  });

  it("Ring of Protection: deflection bonus of +1 to +5 to AC (range form)", () => {
    const mods = deriveModifiers(
      "Ring of Protection (+1)",
      "This ring offers continual magical protection in the form of a deflection bonus of +1 to +5 to AC.",
    );
    expect(mods).toEqual([
      {
        target: "ac.all",
        type: "deflection",
        value: 1,
        source: "Ring of Protection (+1)",
      },
    ]);
  });

  it("Amulet of Natural Armor: enhancement to natural armor (ac.natural)", () => {
    const mods = deriveModifiers(
      "Amulet of Natural Armor (+1)",
      "This amulet, usually crafted from bone or beast scales, toughens the wearer's body and flesh, giving him an enhancement bonus to his natural armor bonus of from +1 to +5, depending on the kind of amulet.",
    );
    expect(mods).toEqual([
      {
        target: "ac.natural",
        type: "enhancement",
        value: 1,
        source: "Amulet of Natural Armor (+1)",
      },
    ]);
  });

  it("competence bonus on a named standard skill", () => {
    const mods = deriveModifiers(
      "Eyes of the Eagle",
      "These crystal lenses fit over the user's eyes, granting a +5 competence bonus on Perception checks.",
    );
    expect(mods).toEqual([
      {
        target: "skill.Perception",
        type: "competence",
        value: 5,
        source: "Eyes of the Eagle",
      },
    ]);
  });
});

describe("deriveModifiers: conservative refusals", () => {
  it("wearer's-choice stat items derive nothing", () => {
    const mods = deriveModifiers(
      "Belt of Physical Might (+2)",
      "This belt grants the wearer an enhancement bonus to two physical ability scores of the wearer's choice (Strength, Dexterity, or Constitution).",
    );
    expect(mods).toEqual([]);
  });

  it("flavor text without bonus phrasing derives nothing", () => {
    const mods = deriveModifiers(
      "Bag of Holding (Type I)",
      "This appears to be a common cloth sack about 2 feet by 4 feet in size. The bag of holding opens into a nondimensional space: its inside is larger than its outside dimensions.",
    );
    expect(mods).toEqual([]);
  });

  it("a wrong-value mutation would be caught (value comes from name)", () => {
    const mods = deriveModifiers(
      "Cloak of Resistance (+3)",
      "These garments offer magic protection in the form of a +1 to +5 resistance bonus on all saving throws.",
    );
    expect(mods[0]).toMatchObject({ value: 3 });
  });
});
