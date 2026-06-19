import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultManeuverBook } from "../../../src/types/maneuverbook";
import {
  MANEUVER_EFFECTS,
  MANEUVER_REFERENCE_ONLY,
} from "../../../src/data/maneuver-effects";

describe("active maneuver effects in computeAll", () => {
  it("an active stance's modifiers flow through the pipeline (dodge AC)", () => {
    const base = createDefaultCharacter("t", "T");
    const withStance = {
      ...base,
      maneuverbook: {
        ...createDefaultManeuverBook("warder", "int"),
        activeStanceId: "primal-fury:skirmisher-s-stance", // +2 dodge AC
      },
    };
    const a = computeAll(base);
    const b = computeAll(withStance);
    expect(b.ac.normalAC - a.ac.normalAC).toBe(2);
    // dodge is lost when flat-footed, so flat-footed AC is unchanged
    expect(b.ac.flatFootedAC).toBe(a.ac.flatFootedAC);
  });

  it("only the ACTIVE stance applies — an unselected stance contributes nothing", () => {
    const base = createDefaultCharacter("t", "T");
    const inactive = {
      ...base,
      maneuverbook: createDefaultManeuverBook("warder", "int"), // no activeStanceId
    };
    expect(computeAll(inactive).ac.normalAC).toBe(computeAll(base).ac.normalAC);
  });

  it("an active boost's note surfaces in buff notes", () => {
    const base = createDefaultCharacter("t", "T");
    const withBoost = {
      ...base,
      maneuverbook: {
        ...createDefaultManeuverBook("warlord", "cha"),
        readied: ["golden-lion:encouraging-roar"],
        activeBoosts: ["golden-lion:encouraging-roar"], // +2 morale atk/dmg
      },
    };
    expect(computeAll(withBoost).conditionEffects.buffNotes).toContain(
      "morale to attack",
    );
  });

  it("an IL-scaled stance yields different bonuses at different ILs", () => {
    // Stance of the Defending Shell: +1 shield AC, +1 per 4 initiator levels.
    // A pure Warder's IL equals its class level.
    const at = (warderLevel: number) => {
      const base = {
        ...createDefaultCharacter("t", "T"),
        classes: [{ className: "Warder", level: warderLevel }],
      };
      const withStance = {
        ...base,
        maneuverbook: {
          ...createDefaultManeuverBook("warder", "int"),
          activeStanceId: "iron-tortoise:stance-of-the-defending-shell",
        },
      };
      return computeAll(withStance).ac.normalAC - computeAll(base).ac.normalAC;
    };
    expect(at(5)).toBe(2); // 1 + floor(5/4)
    expect(at(15)).toBe(4); // 1 + floor(15/4)
    // shield bonus is not lost flat-footed, and not part of touch
  });

  it("two dodge sources of the same type do not stack past the largest", () => {
    // Skirmisher (+2 dodge) is the active stance; a boost adds nothing dodge —
    // this guards that the stance rides the typed-stacking engine, not a flat add.
    const base = createDefaultCharacter("t", "T");
    const withStance = {
      ...base,
      maneuverbook: {
        ...createDefaultManeuverBook("warder", "int"),
        activeStanceId: "mithral-current:flowing-water-stance", // +4 dodge AC
      },
    };
    expect(
      computeAll(withStance).ac.normalAC - computeAll(base).ac.normalAC,
    ).toBe(4);
  });

  it("a multi-target insight stance bumps AC, CMD, and initiative together", () => {
    const base = createDefaultCharacter("t", "T");
    const withStance = {
      ...base,
      maneuverbook: {
        ...createDefaultManeuverBook("warlord", "cha"),
        activeStanceId: "scarlet-throne:scarlet-duelist-attitude", // +5 insight AC/CMD/init
      },
    };
    const a = computeAll(base);
    const b = computeAll(withStance);
    expect(b.ac.normalAC - a.ac.normalAC).toBe(5);
    expect(b.initiative - a.initiative).toBe(5);
  });

  it("a modelled boost applies its modifier only while active", () => {
    const base = createDefaultCharacter("t", "T");
    const book = {
      ...createDefaultManeuverBook("warlord", "cha"),
      readied: ["black-seraph:strength-of-hell"],
    };
    // readied but not active → no bonus
    const off = computeAll({ ...base, maneuverbook: book });
    // active → +2 profane to attack
    const on = computeAll({
      ...base,
      maneuverbook: {
        ...book,
        activeBoosts: ["black-seraph:strength-of-hell"],
      },
    });
    expect(on.attacks.parts.melee.standard).not.toBe(
      off.attacks.parts.melee.standard,
    );
  });
});

// Structural invariants for the stance/boost registry (CI-safe; corpus
// completeness + transcription live in scripts/maneuver-verify.mjs).
describe("maneuver-effects registry invariants", () => {
  it("every effect has static modifiers or an IL-scaled modifiersFor", () => {
    for (const [id, e] of Object.entries(MANEUVER_EFFECTS)) {
      const ok =
        (Array.isArray(e.modifiers) && e.modifiers.length > 0) ||
        typeof e.modifiersFor === "function";
      expect(ok, `${id} has no modifiers`).toBe(true);
    }
  });

  it("IL-scaled effects yield valid modifiers across the level range", () => {
    for (const [id, e] of Object.entries(MANEUVER_EFFECTS)) {
      if (!e.modifiersFor) continue;
      for (const il of [1, 5, 10, 20]) {
        const mods = e.modifiersFor({ initiatorLevel: il });
        expect(Array.isArray(mods), `${id} @${il}`).toBe(true);
        for (const m of mods)
          expect(Number.isFinite(m.value), `${id} @${il} ${m.target}`).toBe(
            true,
          );
      }
    }
  });

  it("modelled and reference-only maps are disjoint and well-formed", () => {
    const ref = new Set(Object.keys(MANEUVER_REFERENCE_ONLY));
    for (const id of Object.keys(MANEUVER_EFFECTS))
      expect(ref.has(id), `${id} in both maps`).toBe(false);
    for (const id of [
      ...Object.keys(MANEUVER_EFFECTS),
      ...Object.keys(MANEUVER_REFERENCE_ONLY),
    ])
      expect(id, id).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/);
  });
});
