import { describe, expect, it } from "vitest";
import {
  conditionalNotes,
  describeModifier,
  resolveModifiers,
  type Modifier,
} from "../../../src/calc/modifiers";

const m = (over: Partial<Modifier>): Modifier => ({
  target: "save.fort",
  type: "untyped",
  value: 1,
  source: "test",
  ...over,
});

describe("resolveModifiers", () => {
  it("same-type bonuses do not stack — highest wins", () => {
    const r = resolveModifiers(
      [
        m({ type: "enhancement", value: 2, source: "a" }),
        m({ type: "enhancement", value: 4, source: "b" }),
      ],
      "save.fort"
    );
    expect(r.total).toBe(4);
    expect(r.applied).toHaveLength(1);
    expect(r.suppressed).toHaveLength(1);
    expect(r.suppressed[0].source).toBe("a");
  });

  it("first-seen wins ties (stable suppression)", () => {
    const r = resolveModifiers(
      [
        m({ type: "morale", value: 2, source: "first" }),
        m({ type: "morale", value: 2, source: "second" }),
      ],
      "save.fort"
    );
    expect(r.total).toBe(2);
    expect(r.applied[0].source).toBe("first");
  });

  it("dodge, circumstance, and untyped bonuses stack", () => {
    const r = resolveModifiers(
      [
        m({ type: "dodge", value: 1 }),
        m({ type: "dodge", value: 1 }),
        m({ type: "circumstance", value: 2 }),
        m({ type: "circumstance", value: 2 }),
        m({ type: "untyped", value: 1 }),
        m({ type: "untyped", value: 1 }),
      ],
      "save.fort"
    );
    expect(r.total).toBe(8);
    expect(r.suppressed).toHaveLength(0);
  });

  it("penalties always stack, including with same-type bonuses", () => {
    const r = resolveModifiers(
      [
        m({ type: "enhancement", value: 4 }),
        m({ type: "enhancement", value: -2 }),
        m({ type: "enhancement", value: -1 }),
      ],
      "save.fort"
    );
    expect(r.total).toBe(1);
  });

  it("conditional modifiers are excluded from the total but reported", () => {
    const r = resolveModifiers(
      [
        m({ type: "racial", value: 2, condition: "vs poison" }),
        m({ type: "luck", value: 1 }),
      ],
      "save.fort"
    );
    expect(r.total).toBe(1);
    expect(r.conditional).toHaveLength(1);
  });

  it("group targets: save.all applies to save.fort queries", () => {
    const r = resolveModifiers(
      [m({ target: "save.all", type: "luck", value: 1 })],
      "save.fort"
    );
    expect(r.total).toBe(1);
  });

  it("group targets do not leak across families", () => {
    const r = resolveModifiers(
      [m({ target: "save.all", type: "luck", value: 1 })],
      "skill.Perception"
    );
    expect(r.total).toBe(0);
    expect(r.applied).toHaveLength(0);
  });

  it("unrelated targets are ignored", () => {
    const r = resolveModifiers(
      [m({ target: "skill.Climb", value: 2 })],
      "skill.Perception"
    );
    expect(r.total).toBe(0);
  });
});

describe("describeModifier / conditionalNotes", () => {
  it("formats bonuses with type, condition, and source", () => {
    expect(
      describeModifier(
        m({ type: "racial", value: 2, condition: "vs poison", source: "Dwarf: Hardy" })
      )
    ).toBe("+2 racial bonus vs poison (Dwarf: Hardy)");
  });

  it("formats untyped penalties without a type word", () => {
    expect(describeModifier(m({ value: -2, source: "x" }))).toBe("-2 penalty (x)");
  });

  it("collects only conditional modifiers, deduped", () => {
    const cond = m({ type: "racial", value: 2, condition: "vs fear", source: "s" });
    expect(conditionalNotes([cond, cond, m({})])).toHaveLength(1);
  });
});
