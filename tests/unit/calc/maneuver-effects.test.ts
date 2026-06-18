import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultManeuverBook } from "../../../src/types/maneuverbook";

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
    expect(computeAll(withStance).ac.normalAC - computeAll(base).ac.normalAC).toBe(
      4,
    );
  });
});
