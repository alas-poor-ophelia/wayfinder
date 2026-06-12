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
    const stonestrike = fx.addedResources.find((r) => r.def.id === "stonestrike");
    expect(stonestrike).toBeDefined();
    expect(stonestrike!.def.max(7, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 })).toBe(7);
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
    expect([...fx.classSkillAdds].sort()).toEqual(["Bluff", "Disguise", "Intimidate"]);
  });

  it("chosen-one: divine grace delayed to 4, not removed", () => {
    const fx = resolveArchetypeEffects([pal(3, "chosen-one")]);
    expect(fx.divineGraceMinLevel).toBe(4);
    expect(fx.suppressedResources[0].has("smiteEvil")).toBe(true);
    expect(fx.addedResources.find((r) => r.def.id === "smiteEvil")?.def.minLevel).toBe(2);
  });

  it("virtuous-bravo: bravo AC, panache+preciseStrike, spellcasting traded via graph", () => {
    const fx = resolveArchetypeEffects([pal(7, "virtuous-bravo")]);
    expect(fx.grantsBravoAC).toBe(true);
    expect(fx.removedSpellcastingClassKeys.has("Paladin")).toBe(true);
    expect(fx.addedResources.find((r) => r.def.id === "panache")?.def.minLevel).toBe(4);
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
    expect(loh!.def.max(8, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 })).toBe(9);
  });

  it("multiple archetypes on one class union their effects", () => {
    const fx = resolveArchetypeEffects([pal(7, "warrior-of-the-holy-light", "chosen-one")]);
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

describe("catalog surface", () => {
  it("lists 47 Paladin archetypes, none for unknown classes", () => {
    expect(listArchetypes("Paladin")).toHaveLength(47);
    expect(listArchetypes("Wizard")).toHaveLength(0);
  });

  it("partial-mechanics flag: curated five are full, others partial", () => {
    for (const id of [
      "chosen-one",
      "virtuous-bravo",
      "stonelord",
      "gray-paladin",
      "warrior-of-the-holy-light",
    ]) {
      expect(isPartialMechanics(id), `${id} should be full`).toBe(false);
    }
    expect(isPartialMechanics("hospitaler")).toBe(true);
    expect(isPartialMechanics("divine-hunter")).toBe(true);
  });
});
