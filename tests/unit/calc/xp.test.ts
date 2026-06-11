import { describe, expect, it } from "vitest";
import { XP_BREAKPOINTS, computeXp, getLevelFromXP } from "../../../src/calc/xp";

// Characterization vs the legacy XpTracker.jsx table (PF1e Medium track).
// Tests written from the legacy source quote BEFORE the module (H-547).

describe("XP_BREAKPOINTS (legacy table is the contract)", () => {
  it("matches the legacy array verbatim", () => {
    expect([...XP_BREAKPOINTS]).toEqual([
      0, 2000, 5000, 9000, 15000, 23000, 35000, 51000, 75000, 105000, 155000,
      220000, 315000, 445000, 635000, 890000, 1300000, 1800000, 2550000,
      3600000,
    ]);
  });
});

describe("getLevelFromXP (legacy backward scan)", () => {
  it("threshold spot checks", () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(1999)).toBe(1);
    expect(getLevelFromXP(2000)).toBe(2);
    expect(getLevelFromXP(9000)).toBe(4);
    expect(getLevelFromXP(51000)).toBe(8);
    expect(getLevelFromXP(3599999)).toBe(19);
    expect(getLevelFromXP(3600000)).toBe(20);
    expect(getLevelFromXP(99999999)).toBe(20);
  });

  it("negative xp floors at level 1 (legacy returns 1 below all thresholds)", () => {
    expect(getLevelFromXP(-500)).toBe(1);
  });
});

describe("computeXp", () => {
  const noClasses: { className: string; level: number }[] = [];

  it("progress is 0% at a level floor", () => {
    const r = computeXp(51000, noClasses);
    expect(r.level).toBe(8);
    expect(r.nextLevel).toBe(9);
    expect(r.xpForCurrentLevel).toBe(51000);
    expect(r.xpForNextLevel).toBe(75000);
    expect(r.progressPercent).toBe(0);
  });

  it("mid-level progress (60000 between 51000 and 75000 = 37.5%)", () => {
    expect(computeXp(60000, noClasses).progressPercent).toBeCloseTo(37.5);
  });

  it("clamps progress to [0, 100]", () => {
    expect(computeXp(-100, noClasses).progressPercent).toBe(0);
  });

  it("level 20 pins: next stays 20, both floors are the L20 threshold", () => {
    const r = computeXp(4000000, noClasses);
    expect(r.level).toBe(20);
    expect(r.nextLevel).toBe(20);
    expect(r.xpForNextLevel).toBe(3600000);
    expect(r.progressPercent).toBe(100);
  });

  it("mismatch flags XP level vs class total (the new hint)", () => {
    const classes = [
      { className: "Paladin", level: 4 },
      { className: "Skald", level: 1 },
    ];
    expect(computeXp(15000, classes).mismatch).toBe(false); // level 5 = 5
    const drifted = computeXp(23000, classes); // level 6 vs 5
    expect(drifted.level).toBe(6);
    expect(drifted.classLevelTotal).toBe(5);
    expect(drifted.mismatch).toBe(true);
  });
});
