import { describe, expect, it } from "vitest";
import {
  carryingCapacity,
  computeEncumbrance,
  loadLevel,
} from "../../../src/calc/encumbrance";

describe("carryingCapacity (PF1e core table — new math, not legacy)", () => {
  it("reproduces table rows", () => {
    expect(carryingCapacity(1)).toEqual({ light: 3, medium: 6, heavy: 10 });
    expect(carryingCapacity(7)).toEqual({ light: 23, medium: 46, heavy: 70 });
    expect(carryingCapacity(10)).toEqual({ light: 33, medium: 66, heavy: 100 });
    expect(carryingCapacity(18)).toEqual({
      light: 100,
      medium: 200,
      heavy: 300,
    });
    expect(carryingCapacity(28)).toEqual({
      light: 400,
      medium: 800,
      heavy: 1200,
    });
    expect(carryingCapacity(29)).toEqual({
      light: 466,
      medium: 933,
      heavy: 1400,
    });
  });

  it("applies the ×4-per-10-STR rule above 29", () => {
    // STR 30 = STR 20 row (400) × 4
    expect(carryingCapacity(30).heavy).toBe(1600);
    // STR 45 = STR 25 row (800) × 16
    expect(carryingCapacity(45).heavy).toBe(12800);
  });

  it("zero or negative STR carries nothing", () => {
    expect(carryingCapacity(0)).toEqual({ light: 0, medium: 0, heavy: 0 });
    expect(carryingCapacity(-2)).toEqual({ light: 0, medium: 0, heavy: 0 });
  });
});

describe("loadLevel boundaries (inclusive maxima)", () => {
  const cap = carryingCapacity(10); // 33 / 66 / 100

  it("classifies at the exact thresholds", () => {
    expect(loadLevel(0, cap)).toBe("light");
    expect(loadLevel(33, cap)).toBe("light");
    expect(loadLevel(33.1, cap)).toBe("medium");
    expect(loadLevel(66, cap)).toBe("medium");
    expect(loadLevel(100, cap)).toBe("heavy");
    expect(loadLevel(100.1, cap)).toBe("over");
  });
});

describe("computeEncumbrance", () => {
  it("bundles capacity, carried, and level", () => {
    const result = computeEncumbrance(14, 90);
    expect(result.capacity.heavy).toBe(175);
    expect(result.carried).toBe(90);
    expect(result.level).toBe("medium");
  });
});
