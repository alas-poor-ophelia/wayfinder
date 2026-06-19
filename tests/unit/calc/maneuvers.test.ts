import { describe, expect, it } from "vitest";
import { computeManeuvers } from "../../../src/calc/maneuvers";
import { createDefaultCharacter } from "../../../src/types/character";
import type { AbilityScores } from "../../../src/types/character";
import {
  createDefaultManeuverBook,
  maneuverId,
  type KnownManeuver,
  type ManeuverType,
} from "../../../src/types/maneuverbook";
import type { ClassEntry } from "../../../src/types/character";

const mods = (over: Partial<AbilityScores> = {}): AbilityScores => ({
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
  ...over,
});

function warlord(level: number, others: ClassEntry[] = []) {
  const c = createDefaultCharacter("t", "Tester");
  c.classes = [{ className: "Warlord", level }, ...others];
  c.maneuverbook = createDefaultManeuverBook("warlord", "cha");
  return c;
}

function km(name: string, type: ManeuverType): KnownManeuver {
  return {
    id: maneuverId("Golden Lion", name),
    name,
    discipline: "Golden Lion",
    level: 1,
    type,
    action: "",
    range: "",
    target: "",
    duration: "",
    save: "",
    prerequisites: "",
    skill: "Diplomacy",
    source: "Path of War",
  };
}

describe("computeManeuvers", () => {
  it("returns null for a character with no maneuverbook", () => {
    const c = createDefaultCharacter("t", "T");
    expect(computeManeuvers(c, mods())).toBeNull();
  });

  it("single-class Warlord 10: IL=class level, tier 5, table limits, recovery = Cha mod", () => {
    const m = computeManeuvers(warlord(10), mods({ cha: 4 }))!;
    expect(m.classLevel).toBe(10);
    expect(m.initiatorLevel).toBe(10);
    expect(m.maxManeuverLevel).toBe(5); // IL 9–10 → tier 5
    expect(m.limits).toEqual({ known: 11, readied: 7, stances: 4 });
    expect(m.recoveryCount).toBe(4);
    expect(m.initMod).toBe(4);
  });

  it("multiclass IL = initiating levels + half others; limits track CLASS level, not IL", () => {
    // Warlord 6 / Fighter 4 → IL 6 + ⌊4/2⌋ = 8 (tier 4); limits at Warlord 6
    const m = computeManeuvers(
      warlord(6, [{ className: "Fighter", level: 4 }]),
      mods({ cha: 2 }),
    )!;
    expect(m.classLevel).toBe(6);
    expect(m.initiatorLevel).toBe(8);
    expect(m.maxManeuverLevel).toBe(4);
    expect(m.limits).toEqual({ known: 9, readied: 6, stances: 3 });
  });

  it("recovery count floors at 2 even with a low/negative initiating mod", () => {
    const m = computeManeuvers(warlord(1), mods({ cha: -1 }))!;
    expect(m.recoveryCount).toBe(2);
  });

  it("counts stances separately from maneuvers known", () => {
    const c = warlord(5);
    c.maneuverbook!.maneuvers = [
      km("Demoralizing Roar", "Boost"),
      km("Tactical Strike", "Strike"),
      km("Golden Lion Charger", "Stance"),
    ];
    c.maneuverbook!.readied = [maneuverId("Golden Lion", "Tactical Strike")];
    const m = computeManeuvers(c, mods({ cha: 1 }))!;
    expect(m.counts).toEqual({ known: 2, readied: 1, stances: 1, expended: 0 });
  });

  it("the three base classes report the abilityMod recovery kind", () => {
    expect(computeManeuvers(warlord(5), mods({ cha: 3 }))!.recoveryKind).toBe(
      "abilityMod",
    );
  });
});

function initiator(
  className: string,
  classKey: string,
  stat: "int" | "wis" | "cha",
  level: number,
) {
  const c = createDefaultCharacter("t", "Tester");
  c.classes = [{ className, level }];
  c.maneuverbook = createDefaultManeuverBook(classKey, stat);
  return c;
}

describe("Expanded classes (Harbinger / Mystic / Zealot)", () => {
  it("Harbinger: Int-based abilityMod recovery + table limits", () => {
    const m = computeManeuvers(
      initiator("Harbinger", "harbinger", "int", 11),
      mods({ int: 4 }),
    )!;
    expect(m.className).toBe("Harbinger");
    expect(m.initiatorLevel).toBe(11);
    expect(m.recoveryKind).toBe("abilityMod");
    expect(m.recoveryCount).toBe(4); // Int mod
    expect(m.limits).toEqual({ known: 11, readied: 7, stances: 5 });
  });

  it("Zealot: Cha-based abilityMod recovery, floors at 2", () => {
    const m = computeManeuvers(
      initiator("Zealot", "zealot", "cha", 1),
      mods({ cha: -1 }),
    )!;
    expect(m.recoveryKind).toBe("abilityMod");
    expect(m.recoveryCount).toBe(2);
    expect(m.limits).toEqual({ known: 5, readied: 3, stances: 1 });
  });

  it("Mystic: stochastic recovery (granted/turn, independent of Wis mod)", () => {
    const m = computeManeuvers(
      initiator("Mystic", "mystic", "wis", 20),
      mods({ wis: 6 }),
    )!;
    expect(m.recoveryKind).toBe("stochastic");
    expect(m.recoveryCount).toBe(2); // grantedPerTurn — NOT the Wis mod of 6
    expect(m.limits).toEqual({ known: 21, readied: 12, stances: 7 });
    // DC math still uses the initiating stat
    expect(m.initMod).toBe(6);
  });
});
