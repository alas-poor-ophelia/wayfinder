/**
 * resolveArchetypeEffects merge-semantics tests: graph-driven suppression
 * through the feature map, mechanics removes/adds, gate OR/max across
 * archetypes, and per-entry scoping. Legality of combinations is
 * deliberately NOT enforced — union semantics throughout.
 */
import { describe, expect, it } from "vitest";
import {
  isPartialMechanics,
  listArchetypes,
  resolveArchetypeEffects,
} from "../../../src/data/archetypes";

const pal = (level: number, ...archetypeKeys: string[]) => ({
  className: "Paladin",
  level,
  ...(archetypeKeys.length ? { archetypeKeys } : {}),
});

describe("resolveArchetypeEffects", () => {
  it("no archetypes: inert effects, any=false", () => {
    const fx = resolveArchetypeEffects([pal(7)]);
    expect(fx.any).toBe(false);
    expect(fx.suppressedResources[0].size).toBe(0);
    expect(fx.divineGraceMinLevel).toBe(0);
    expect(fx.grantsBravoAC).toBe(false);
  });

  it("stonelord: graph suppresses smite pool+QA, hand-set spell removal, stonestrike added", () => {
    const fx = resolveArchetypeEffects([pal(7, "stonelord")]);
    expect(fx.suppressedResources[0].has("smiteEvil")).toBe(true);
    expect(fx.suppressedQuickActions[0].has("smiteEvil")).toBe(true);
    // Heartstone replaces divine grace → gate from the graph
    expect(fx.divineGraceMinLevel).toBe(Number.POSITIVE_INFINITY);
    // Defensive Stance prose (hand-authored): no spellcasting
    expect(fx.removedSpellcastingClassKeys.has("Paladin")).toBe(true);
    const stonestrike = fx.addedResources.find(
      (r) => r.def.id === "stonestrike",
    );
    expect(stonestrike).toBeDefined();
    expect(
      stonestrike!.def.max(7, {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
      }),
    ).toBe(7);
    expect(stonestrike!.label).toBe("Paladin (Stonelord)");
  });

  it("gray-paladin: alters never suppress; smite re-added delayed; divine grace removed via never-gains", () => {
    const fx = resolveArchetypeEffects([pal(5, "gray-paladin")]);
    // smiteEvil suppression comes from mechanics.removesResources (the
    // graph ref is alters-only), and the same id is re-added with minLevel 2
    expect(fx.suppressedResources[0].has("smiteEvil")).toBe(true);
    const smite = fx.addedResources.find((r) => r.def.id === "smiteEvil");
    expect(smite?.def.minLevel).toBe(2);
    // smite quick action survives (pool still exists)
    expect(fx.suppressedQuickActions[0].has("smiteEvil")).toBe(false);
    expect(fx.divineGraceMinLevel).toBe(Number.POSITIVE_INFINITY);
    expect(fx.removedSpellcastingClassKeys.size).toBe(0);
    expect([...fx.classSkillAdds].sort()).toEqual([
      "Bluff",
      "Disguise",
      "Intimidate",
    ]);
  });

  it("chosen-one: divine grace delayed to 4, not removed", () => {
    const fx = resolveArchetypeEffects([pal(3, "chosen-one")]);
    expect(fx.divineGraceMinLevel).toBe(4);
    expect(fx.suppressedResources[0].has("smiteEvil")).toBe(true);
    expect(
      fx.addedResources.find((r) => r.def.id === "smiteEvil")?.def.minLevel,
    ).toBe(2);
  });

  it("virtuous-bravo: bravo AC, panache+preciseStrike, spellcasting traded via graph", () => {
    const fx = resolveArchetypeEffects([pal(7, "virtuous-bravo")]);
    expect(fx.grantsBravoAC).toBe(true);
    expect(fx.removedSpellcastingClassKeys.has("Paladin")).toBe(true);
    expect(
      fx.addedResources.find((r) => r.def.id === "panache")?.def.minLevel,
    ).toBe(4);
    expect(fx.addedQuickActions).toContainEqual({
      id: "preciseStrike",
      minLevel: 4,
      level: 7,
    });
  });

  it("warrior-of-the-holy-light: lay on hands re-added augmented, spells gone via graph", () => {
    const fx = resolveArchetypeEffects([pal(8, "warrior-of-the-holy-light")]);
    expect(fx.removedSpellcastingClassKeys.has("Paladin")).toBe(true);
    expect(fx.suppressedResources[0].has("layOnHands")).toBe(true);
    const loh = fx.addedResources.find((r) => r.def.id === "layOnHands");
    // level 8, cha +3: base floor(8/2)+3 = 7, plus 1 + floor((8-4)/4) = 2 → 9
    expect(
      loh!.def.max(8, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 }),
    ).toBe(9);
  });

  it("multiple archetypes on one class union their effects", () => {
    const fx = resolveArchetypeEffects([
      pal(7, "warrior-of-the-holy-light", "chosen-one"),
    ]);
    expect(fx.suppressedResources[0].has("layOnHands")).toBe(true);
    expect(fx.suppressedResources[0].has("smiteEvil")).toBe(true);
    expect(fx.divineGraceMinLevel).toBe(4);
    expect(fx.removedSpellcastingClassKeys.has("Paladin")).toBe(true);
  });

  it("suppression scopes to its own class entry", () => {
    const fx = resolveArchetypeEffects([
      pal(5, "stonelord"),
      { className: "Bard", level: 3 },
    ]);
    expect(fx.suppressedResources[0].has("smiteEvil")).toBe(true);
    expect(fx.suppressedResources[1].size).toBe(0);
    expect(fx.suppressedQuickActions[1].size).toBe(0);
  });

  it("unknown archetype key on a class is inert (warn-not-fail philosophy)", () => {
    const fx = resolveArchetypeEffects([pal(5, "not-a-real-archetype")]);
    expect(fx.any).toBe(true);
    expect(fx.suppressedResources[0].size).toBe(0);
    expect(fx.addedResources).toHaveLength(0);
  });
});

const monkU = (level: number, ...archetypeKeys: string[]) => ({
  className: "Monk (Unchained)",
  level,
  ...(archetypeKeys.length ? { archetypeKeys } : {}),
});

const ZERO = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

describe("monk archetypes", () => {
  it("scaled-fist (unchained): AC stat gate, ki pool re-added Cha-based", () => {
    const fx = resolveArchetypeEffects([monkU(5, "scaled-fist")]);
    expect(fx.scaledFistAC).toBe(true);
    expect(fx.suppressedResources[0].has("kiPool")).toBe(true);
    const ki = fx.addedResources.find((r) => r.def.id === "kiPool");
    expect(ki?.def.minLevel).toBe(3);
    // Draconic Might: floor(5/2) + CHA 4 = 6 — WIS is ignored entirely
    expect(ki!.def.max(5, { ...ZERO, wis: 3, cha: 4 })).toBe(6);
    expect(ki!.label).toBe("Monk (Unchained) (Scaled Fist)");
  });

  it("scaled-fist on a CORE monk: unchained mechanics are class-guarded off; graph still runs", () => {
    const fx = resolveArchetypeEffects([
      { className: "Monk", level: 5, archetypeKeys: ["scaled-fist"] },
    ]);
    // the core catalog lists the same id, but the mechanics carry the
    // unchained ki timing/formula — partial graph suppression only
    expect(fx.scaledFistAC).toBe(false);
    expect(fx.addedResources).toHaveLength(0);
    expect(fx.suppressedResources[0].has("kiPool")).toBe(false);
  });

  it("kata-master (core): panache added, stunning fist suppressed via graph, ki alters-ref inert", () => {
    const fx = resolveArchetypeEffects([
      { className: "Monk", level: 4, archetypeKeys: ["kata-master"] },
    ]);
    expect(fx.suppressedResources[0].has("stunningFist")).toBe(true);
    const panache = fx.addedResources.find((r) => r.def.id === "panache");
    expect(panache!.def.max(4, { ...ZERO, cha: 3 })).toBe(3);
    expect(panache!.def.max(4, { ...ZERO, cha: -2 })).toBe(1); // minimum 1
    // "This ability modifies ki pool" — alters never suppress
    expect(fx.suppressedResources[0].has("kiPool")).toBe(false);
  });

  it("master-of-many-styles (partial, core): flurry quick action auto-suppressed by the graph", () => {
    const fx = resolveArchetypeEffects([
      { className: "Monk", level: 3, archetypeKeys: ["master-of-many-styles"] },
    ]);
    expect(fx.suppressedQuickActions[0].has("flurryOfBlows")).toBe(true);
    expect(fx.addedResources).toHaveLength(0);
  });

  it("black-asp (partial, unchained): stunning fist pool auto-suppressed by the graph", () => {
    const fx = resolveArchetypeEffects([monkU(3, "black-asp")]);
    expect(fx.suppressedResources[0].has("stunningFist")).toBe(true);
  });

  it("legacy class strings resolve against the LONGEST catalog key", () => {
    // contains both "Monk" and "Monk (Unchained)" — must hit the latter
    const fx = resolveArchetypeEffects([
      {
        className: "Monk (Unchained) variant",
        level: 5,
        archetypeKeys: ["scaled-fist"],
      },
    ]);
    expect(fx.scaledFistAC).toBe(true);
  });
});

describe("skald archetypes", () => {
  const skald = (level: number, ...archetypeKeys: string[]) => ({
    className: "Skald",
    level,
    ...(archetypeKeys.length ? { archetypeKeys } : {}),
  });

  it("spell-warrior: raging song re-keyed to the weapon-song pool, QA granted", () => {
    const fx = resolveArchetypeEffects([skald(3, "spell-warrior")]);
    expect(fx.suppressedResources[0].has("ragingSong")).toBe(true);
    const song = fx.addedResources.find((r) => r.def.id === "weaponSongRounds");
    expect(song).toBeDefined();
    // Adarin's exact numbers: skald 3, cha +6 → 3 + 6 + 2·2 = 13
    expect(song!.def.max(3, { ...ZERO, cha: 6 })).toBe(13);
    expect(fx.addedQuickActions).toContainEqual({ id: "weaponSong", level: 3 });
    // Greater Counterspell replaces spell kenning, NOT the spells feature
    expect(fx.removedSpellcastingClassKeys.size).toBe(0);
  });

  it("elegist (partial): whole raging-song pool auto-suppressed by the graph", () => {
    const fx = resolveArchetypeEffects([skald(4, "elegist")]);
    expect(fx.suppressedResources[0].has("ragingSong")).toBe(true);
    expect(fx.addedResources).toHaveLength(0);
  });

  it("bacchanal (partial): versatile performance QA auto-suppressed by the graph", () => {
    const fx = resolveArchetypeEffects([skald(4, "bacchanal")]);
    expect(fx.suppressedQuickActions[0].has("versatilePerformance")).toBe(true);
    // raging song untouched — bacchanal keeps it
    expect(fx.suppressedResources[0].has("ragingSong")).toBe(false);
  });

  it("inspired-rage refs never suppress the rounds pool (song types are not the pool)", () => {
    // twilight-speaker replaces inspired rage (unmatched ref) but keeps
    // raging song itself
    const fx = resolveArchetypeEffects([skald(4, "twilight-speaker")]);
    expect(fx.suppressedResources[0].has("ragingSong")).toBe(false);
  });
});

describe("swashbuckler archetypes", () => {
  const swash = (level: number, ...archetypeKeys: string[]) => ({
    className: "Swashbuckler",
    level,
    ...(archetypeKeys.length ? { archetypeKeys } : {}),
  });

  it("inspired-blade: panache re-keyed to Cha+Int, grants Weapon Finesse", () => {
    const fx = resolveArchetypeEffects([swash(5, "inspired-blade")]);
    expect(fx.grantsWeaponFinesse).toBe(true);
    // alters-ref never auto-suppresses; mechanics removes + re-adds the pool
    expect(fx.suppressedResources[0].has("panache")).toBe(true);
    const panache = fx.addedResources.find((r) => r.def.id === "panache");
    expect(panache!.def.max(5, { ...ZERO, cha: 3, int: 2 })).toBe(5);
    // each term has its own minimum of 1
    expect(panache!.def.max(5, { ...ZERO, cha: -1, int: -1 })).toBe(2);
  });

  it("azatariel: charmed life suppressed via graph, mercy pool added at 4th", () => {
    const fx = resolveArchetypeEffects([swash(8, "azatariel")]);
    expect(fx.suppressedResources[0].has("charmedLife")).toBe(true);
    const mercy = fx.addedResources.find(
      (r) => r.def.id === "affectionOfElysium",
    );
    expect(mercy!.def.minLevel).toBe(4);
    expect(mercy!.def.max(8, { ...ZERO, cha: 3 })).toBe(7);
  });

  it("daring-infiltrator: class-skill swap, charmed life suppressed via graph", () => {
    const fx = resolveArchetypeEffects([swash(6, "daring-infiltrator")]);
    expect(fx.suppressedResources[0].has("charmedLife")).toBe(true);
    expect([...fx.classSkillAdds].sort()).toEqual(["Disguise", "Stealth"]);
    expect([...fx.classSkillRemoves].sort()).toEqual([
      "Diplomacy",
      "Perform (any)",
      "Profession (any)",
    ]);
  });

  it("picaroon: grants Weapon Finesse, panache alter leaves the pool intact", () => {
    const fx = resolveArchetypeEffects([swash(3, "picaroon")]);
    expect(fx.grantsWeaponFinesse).toBe(true);
    expect(fx.suppressedResources[0].has("panache")).toBe(false);
    expect(fx.addedResources).toHaveLength(0);
  });

  it("noble-fencer (partial): charmed life auto-suppressed, nothing added", () => {
    const fx = resolveArchetypeEffects([swash(7, "noble-fencer")]);
    expect(fx.suppressedResources[0].has("charmedLife")).toBe(true);
    expect(fx.addedResources).toHaveLength(0);
  });
});

describe("sorcerer archetypes", () => {
  const sorc = (level: number, ...archetypeKeys: string[]) => ({
    className: "Sorcerer",
    level,
    ...(archetypeKeys.length ? { archetypeKeys } : {}),
  });

  it("seeker: adds Disable Device as a class skill", () => {
    const fx = resolveArchetypeEffects([sorc(3, "seeker")]);
    expect([...fx.classSkillAdds]).toEqual(["Disable Device"]);
  });

  it("sorcerer-of-sleep: pesh touch pool (3 + Cha)/day", () => {
    const fx = resolveArchetypeEffects([sorc(5, "sorcerer-of-sleep")]);
    const pesh = fx.addedResources.find((r) => r.def.id === "peshTouch");
    expect(pesh!.def.max(5, { ...ZERO, cha: 4 })).toBe(7);
  });

  it("tattooed-sorcerer: spell-tattoo pool scales 1/2/3 from 7th/11th/15th", () => {
    const fx = resolveArchetypeEffects([sorc(11, "tattooed-sorcerer")]);
    const tat = fx.addedResources.find((r) => r.def.id === "createSpellTattoo");
    expect(tat!.def.minLevel).toBe(7);
    expect(tat!.def.max(7, ZERO)).toBe(1);
    expect(tat!.def.max(11, ZERO)).toBe(2);
    expect(tat!.def.max(15, ZERO)).toBe(3);
  });

  it("razmiran-priest: class-skill swap (religion/perform for appraise/fly)", () => {
    const fx = resolveArchetypeEffects([sorc(9, "razmiran-priest")]);
    expect([...fx.classSkillAdds].sort()).toEqual([
      "Knowledge (religion)",
      "Perform (any)",
    ]);
    expect([...fx.classSkillRemoves].sort()).toEqual(["Appraise", "Fly"]);
  });

  it("crossblooded: -2 Will penalty added as a typed modifier", () => {
    const fx = resolveArchetypeEffects([sorc(7, "crossblooded")]);
    expect(fx.addedModifiers).toContainEqual({
      target: "save.will",
      type: "untyped",
      value: -2,
      source: "Crossblooded",
    });
  });
});

describe("arcanist archetypes", () => {
  const arc = (level: number, ...archetypeKeys: string[]) => ({
    className: "Arcanist",
    level,
    ...(archetypeKeys.length ? { archetypeKeys } : {}),
  });

  it("occultist: planar contact pool + the stripped exploit slots [1,7]", () => {
    const fx = resolveArchetypeEffects([arc(7, "occultist")]);
    const pc = fx.addedResources.find((r) => r.def.id === "planarContact");
    expect(pc!.def.minLevel).toBe(7);
    expect(pc!.def.max(7, ZERO)).toBe(1);
    // level-scoped exploit refs enumerate the removed slots (graph-driven)
    expect([...fx.featureCountRemovals.arcanistExploits].sort()).toEqual([
      1, 7,
    ]);
  });

  it("graph-driven exploit removals: school-savant, blood-arcanist, eldritch-font", () => {
    expect(
      resolveArchetypeEffects([arc(7, "school-savant")]).featureCountRemovals
        .arcanistExploits,
    ).toEqual([1, 3, 7]);
    expect(
      resolveArchetypeEffects([arc(15, "blood-arcanist")]).featureCountRemovals
        .arcanistExploits,
    ).toEqual([1, 3, 9, 15]);
    expect(
      resolveArchetypeEffects([arc(13, "eldritch-font")]).featureCountRemovals
        .arcanistExploits,
    ).toEqual([3, 7, 13]);
  });

  it("eldritch-font: spellcasting reshape (+1 cast/-1 prepared per level)", () => {
    const fx = resolveArchetypeEffects([arc(7, "eldritch-font")]);
    expect(fx.spellcastingAdjust).toEqual({
      classKey: "Arcanist",
      preparedPerLevel: -1,
      castsPerLevel: 1,
    });
  });

  it("blood-arcanist (partial): bloodline/exploit swap adds no pools or modifiers", () => {
    const fx = resolveArchetypeEffects([arc(9, "blood-arcanist")]);
    expect(fx.addedResources).toHaveLength(0);
    expect(fx.addedModifiers).toHaveLength(0);
  });
});

describe("cleric archetypes", () => {
  const cleric = (level: number, ...archetypeKeys: string[]) => ({
    className: "Cleric",
    level,
    ...(archetypeKeys.length ? { archetypeKeys } : {}),
  });

  it("blossoming-light: channel-energy count override via remove + re-add same id", () => {
    const fx = resolveArchetypeEffects([cleric(7, "blossoming-light")]);
    // alters (not replaces) channel energy, so the graph leaves the base pool
    // — mechanics removes it and re-adds the boosted count under the same id
    expect(fx.suppressedResources[0].has("channelEnergy")).toBe(true);
    const ce = fx.addedResources.find((r) => r.def.id === "channelEnergy");
    // 5 + Cha 5 + floor(7/2)=3 → 13
    expect(ce!.def.max(7, { ...ZERO, cha: 5 })).toBe(13);
    expect(ce!.def.max(1, ZERO)).toBe(5); // floor(1/2)=0
  });

  it("forgemaster: channel energy auto-suppressed via graph, runeforger added (3 + Int)", () => {
    const fx = resolveArchetypeEffects([cleric(8, "forgemaster")]);
    expect(fx.suppressedResources[0].has("channelEnergy")).toBe(true);
    const rune = fx.addedResources.find((r) => r.def.id === "runeforger");
    expect(rune!.def.max(8, { ...ZERO, int: 3 })).toBe(6);
  });

  it("foundation-of-faith: bare 'does not gain channel energy' suppressed by mechanics, nothing added", () => {
    const fx = resolveArchetypeEffects([cleric(8, "foundation-of-faith")]);
    expect(fx.suppressedResources[0].has("channelEnergy")).toBe(true);
    expect(fx.addedResources).toHaveLength(0);
  });

  it("sacred-attendant: nurture-grace added (3 + Wis); Channel Beauty alters, so the pool survives", () => {
    const fx = resolveArchetypeEffects([cleric(5, "sacred-attendant")]);
    expect(fx.suppressedResources[0].has("channelEnergy")).toBe(false);
    const ng = fx.addedResources.find((r) => r.def.id === "nurtureGrace");
    expect(ng!.def.max(5, { ...ZERO, wis: 4 })).toBe(7);
  });

  it("cardinal: adds four political class skills", () => {
    const fx = resolveArchetypeEffects([cleric(5, "cardinal")]);
    expect([...fx.classSkillAdds].sort()).toEqual([
      "Bluff",
      "Intimidate",
      "Knowledge (geography)",
      "Knowledge (local)",
    ]);
  });

  it("triadic-priest: bonded-unity pool (3 + Wis) from 8th", () => {
    const fx = resolveArchetypeEffects([cleric(8, "triadic-priest")]);
    const bu = fx.addedResources.find((r) => r.def.id === "bondedUnity");
    expect(bu!.def.minLevel).toBe(8);
    expect(bu!.def.max(8, { ...ZERO, wis: 4 })).toBe(7);
  });

  it("elder-mythos-cultist: maddening-gaze scales 1/day at 5th, +1 per 3 levels; tier-increase refs never suppress", () => {
    const fx = resolveArchetypeEffects([cleric(11, "elder-mythos-cultist")]);
    // replaces only the channel-energy tier INCREASES (level-scoped) — base survives
    expect(fx.suppressedResources[0].has("channelEnergy")).toBe(false);
    const mg = fx.addedResources.find((r) => r.def.id === "maddeningGaze");
    expect(mg!.def.minLevel).toBe(5);
    expect(mg!.def.max(5, ZERO)).toBe(1);
    expect(mg!.def.max(11, ZERO)).toBe(3); // 1 + floor(6/3)
  });

  it("hidden-priest: unseen-devotion scales 1/day at 8th, +1 per 4 levels", () => {
    const fx = resolveArchetypeEffects([cleric(12, "hidden-priest")]);
    const ud = fx.addedResources.find((r) => r.def.id === "unseenDevotion");
    expect(ud!.def.minLevel).toBe(8);
    expect(ud!.def.max(8, ZERO)).toBe(1);
    expect(ud!.def.max(12, ZERO)).toBe(2);
  });

  it("scroll-scholar: flash-of-insight 1/2/3 from 10th/15th/20th", () => {
    const fx = resolveArchetypeEffects([cleric(20, "scroll-scholar")]);
    const fi = fx.addedResources.find((r) => r.def.id === "flashOfInsight");
    expect(fi!.def.minLevel).toBe(10);
    expect(fi!.def.max(10, ZERO)).toBe(1);
    expect(fi!.def.max(15, ZERO)).toBe(2);
    expect(fi!.def.max(20, ZERO)).toBe(3);
  });
});

describe("oracle archetypes", () => {
  const oracle = (level: number, ...archetypeKeys: string[]) => ({
    className: "Oracle",
    level,
    ...(archetypeKeys.length ? { archetypeKeys } : {}),
  });

  it("shigenjo: ki pool (1/3 level + Cha) from 7th, plus Survival-for-Diplomacy skill swap", () => {
    const fx = resolveArchetypeEffects([oracle(9, "shigenjo")]);
    const ki = fx.addedResources.find((r) => r.def.id === "kiPool");
    expect(ki!.def.minLevel).toBe(7);
    expect(ki!.def.max(9, { ...ZERO, cha: 5 })).toBe(8); // floor(9/3)=3 + 5
    expect([...fx.classSkillAdds]).toEqual(["Survival"]);
    expect([...fx.classSkillRemoves]).toEqual(["Diplomacy"]);
  });

  it("warsighted: martial-flexibility pool (3 + 1/2 level)", () => {
    const fx = resolveArchetypeEffects([oracle(10, "warsighted")]);
    const mf = fx.addedResources.find((r) => r.def.id === "martialFlexibility");
    expect(mf!.def.max(10, ZERO)).toBe(8); // 3 + floor(10/2)
    expect(mf!.def.max(1, ZERO)).toBe(3);
  });

  it("pei-zin-practitioner: healer's way pool (1 + Cha)", () => {
    const fx = resolveArchetypeEffects([oracle(5, "pei-zin-practitioner")]);
    const hw = fx.addedResources.find((r) => r.def.id === "healersWay");
    expect(hw!.def.max(5, { ...ZERO, cha: 5 })).toBe(6);
  });

  it("purifier: sacred-scourge pool (1 + Cha) from 5th", () => {
    const fx = resolveArchetypeEffects([oracle(6, "purifier")]);
    const ss = fx.addedResources.find((r) => r.def.id === "sacredScourge");
    expect(ss!.def.minLevel).toBe(5);
    expect(ss!.def.max(6, { ...ZERO, cha: 5 })).toBe(6);
  });

  it("ocean-s-echo: inspiring-song rounds/day (level + Cha, min 1) plus four class skills", () => {
    const fx = resolveArchetypeEffects([oracle(8, "ocean-s-echo")]);
    const song = fx.addedResources.find((r) => r.def.id === "inspiringSong");
    expect(song!.def.footer).toBe("rounds/day");
    expect(song!.def.max(8, { ...ZERO, cha: 5 })).toBe(13);
    expect(song!.def.max(1, { ...ZERO, cha: -5 })).toBe(1); // minimum 1
    expect([...fx.classSkillAdds].sort()).toEqual([
      "Bluff",
      "Intimidate",
      "Knowledge (nature)",
      "Perform (any)",
    ]);
  });

  it("stargazer: three concrete class skills, no pools", () => {
    const fx = resolveArchetypeEffects([oracle(3, "stargazer")]);
    expect(fx.addedResources).toHaveLength(0);
    expect([...fx.classSkillAdds].sort()).toEqual([
      "Knowledge (nature)",
      "Perception",
      "Survival",
    ]);
  });
});

describe("catalog surface", () => {
  it("lists 47 Paladin archetypes, none for unknown classes", () => {
    expect(listArchetypes("Paladin")).toHaveLength(47);
    expect(listArchetypes("Wizard")).toHaveLength(0);
  });

  it("lists both monk catalogs independently", () => {
    expect(listArchetypes("Monk")).toHaveLength(56);
    expect(listArchetypes("Monk (Unchained)")).toHaveLength(14);
  });

  it("lists 26 Skald archetypes", () => {
    expect(listArchetypes("Skald")).toHaveLength(26);
  });

  it("lists the newly-scraped catalogs", () => {
    expect(listArchetypes("Swashbuckler")).toHaveLength(20);
    expect(listArchetypes("Sorcerer")).toHaveLength(13);
    expect(listArchetypes("Arcanist")).toHaveLength(15);
  });

  it("lists the Cleric and Oracle catalogs", () => {
    expect(listArchetypes("Cleric")).toHaveLength(35);
    expect(listArchetypes("Oracle")).toHaveLength(26);
  });

  it("Cleric/Oracle curated picks are full mechanics, swaps are partial", () => {
    for (const [id, cls] of [
      ["forgemaster", "Cleric"],
      ["blossoming-light", "Cleric"],
      ["shigenjo", "Oracle"],
      ["purifier", "Oracle"],
    ] as const) {
      expect(isPartialMechanics(id, cls), `${id} should be full`).toBe(false);
    }
    // revelation/mystery swaps with no hand-authored mechanics stay partial
    expect(isPartialMechanics("crusader", "Cleric")).toBe(true);
    expect(isPartialMechanics("hermit", "Oracle")).toBe(true);
  });

  it("new curated picks report as full mechanics, swaps as partial", () => {
    for (const [id, cls] of [
      ["inspired-blade", "Swashbuckler"],
      ["azatariel", "Swashbuckler"],
      ["crossblooded", "Sorcerer"],
      ["sorcerer-of-sleep", "Sorcerer"],
      ["occultist", "Arcanist"],
    ] as const) {
      expect(isPartialMechanics(id, cls), `${id} should be full`).toBe(false);
    }
    expect(isPartialMechanics("noble-fencer", "Swashbuckler")).toBe(true);
    expect(isPartialMechanics("blood-arcanist", "Arcanist")).toBe(true);
  });

  it("partial-mechanics flag: curated five are full, others partial", () => {
    for (const id of [
      "chosen-one",
      "virtuous-bravo",
      "stonelord",
      "gray-paladin",
      "warrior-of-the-holy-light",
    ]) {
      expect(isPartialMechanics(id, "Paladin"), `${id} should be full`).toBe(
        false,
      );
    }
    expect(isPartialMechanics("hospitaler", "Paladin")).toBe(true);
    expect(isPartialMechanics("divine-hunter", "Paladin")).toBe(true);
  });

  it("partial-mechanics flag is class-scoped: scaled-fist is curated for the unchained monk only", () => {
    expect(isPartialMechanics("scaled-fist", "Monk (Unchained)")).toBe(false);
    // the core Monk catalog lists the same id, but the mechanics (unchained
    // ki timing/formula) were not authored for it
    expect(isPartialMechanics("scaled-fist", "Monk")).toBe(true);
    expect(isPartialMechanics("kata-master", "Monk")).toBe(false);
  });
});
