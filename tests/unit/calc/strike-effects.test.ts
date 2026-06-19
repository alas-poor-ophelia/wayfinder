/**
 * Characterization tests for the Path of War armed-Strike one-shot model
 * (schema v16 pendingStrikeId → src/data/strike-effects.ts → computeAll's
 * attack hooks). A strike rides the flat adjust / weapon-song dice / keen /
 * note channels, NEVER the smite channel (ray double-count quirk). Verified
 * against the real seeded strike data, not paraphrase.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultManeuverBook } from "../../../src/types/maneuverbook";
import { seedQuickActionsFromToggles } from "../../../src/data/quick-actions";
import {
  STRIKE_EFFECTS,
  STRIKE_REFERENCE_ONLY,
  strikeEffect,
} from "../../../src/data/strike-effects";

const armed = (id: string) => {
  const base = createDefaultCharacter("t", "T");
  return {
    ...base,
    maneuverbook: {
      ...createDefaultManeuverBook("warlord", "cha"),
      pendingStrikeId: id,
    },
  };
};

describe("armed Strike one-shot riders in computeAll", () => {
  it("a flat-damage strike raises the damage bonus by exactly its value", () => {
    const base = computeAll(createDefaultCharacter("t", "T"));
    // Heavenly Blade of the Scarlet Throne: +100 flat damage
    const hit = computeAll(
      armed("scarlet-throne:heavenly-blade-of-the-scarlet-throne"),
    );
    expect(base.attacks.parts.melee.damage).toBe("1d6+0");
    expect(hit.attacks.parts.melee.damage).toBe("1d6+100");
    // applies weapon-agnostically (ranged + unarmed buckets too)
    expect(hit.attacks.parts.ranged.damage).toBe("1d8+100");
    expect(hit.attacks.parts.unarmed.damage).toBe("1d3+100");
  });

  it("clearing the pending strike restores the baseline damage", () => {
    const base = computeAll(createDefaultCharacter("t", "T"));
    const cleared = computeAll({
      ...createDefaultCharacter("t", "T"),
      maneuverbook: createDefaultManeuverBook("warlord", "cha"), // no pendingStrikeId
    });
    expect(cleared.attacks.parts.melee.damage).toBe(
      base.attacks.parts.melee.damage,
    );
  });

  it("a bonus-dice strike appends its dice to the damage string", () => {
    // Wyrmling's Fang: +1d6
    const hit = computeAll(armed("thrashing-dragon:wyrmling-s-fang"));
    expect(hit.attacks.parts.melee.damage).toBe("1d6+0 +1d6");
  });

  it("strike dice join correctly with weapon-song dice (no clobber)", () => {
    const base = createDefaultCharacter("t", "T");
    const seeded = seedQuickActionsFromToggles({
      ...base.toggles,
      weaponSong: "Flaming", // +1d6 fire
    });
    const withSong = computeAll({
      ...base,
      quickActions: seeded.quickActions,
      quickActionState: seeded.quickActionState,
      maneuverbook: {
        ...createDefaultManeuverBook("warlord", "cha"),
        pendingStrikeId: "thrashing-dragon:wyrmling-s-fang", // +1d6
      },
    });
    expect(withSong.attacks.parts.melee.damage).toBe("1d6+0 +1d6 fire +1d6");
  });

  it("a pure-rider strike adds note text and makes zero numeric change", () => {
    const base = computeAll(createDefaultCharacter("t", "T"));
    // Blade of Perfection: auto-hit / ignores DR — no atk or dmg number
    const hit = computeAll(armed("scarlet-throne:blade-of-perfection"));
    expect(hit.attacks.parts.melee.damage).toBe(
      base.attacks.parts.melee.damage,
    );
    expect(hit.attacks.parts.melee.standard).toBe(
      base.attacks.parts.melee.standard,
    );
    expect(hit.attacks.melee).toContain("**Strike:**");
    expect(hit.attacks.melee).toContain("ignores damage reduction");
  });

  it("an unset pending strike changes nothing", () => {
    const base = computeAll(createDefaultCharacter("t", "T"));
    const unset = computeAll({
      ...createDefaultCharacter("t", "T"),
      maneuverbook: createDefaultManeuverBook("warder", "int"),
    });
    expect(unset.attacks).toEqual(base.attacks);
  });

  it("an unmodelled strike id contributes nothing", () => {
    const base = computeAll(createDefaultCharacter("t", "T"));
    const bogus = computeAll(armed("golden-lion:no-such-strike"));
    expect(bogus.attacks).toEqual(base.attacks);
  });
});

// Structural invariants (CI-safe — no corpus dependency; the corpus
// completeness + transcription cross-check lives in scripts/strike-verify.mjs).
describe("strike-effects registry invariants", () => {
  const entries = Object.entries(STRIKE_EFFECTS);

  it("strikeEffect() resolves known ids and rejects unknown", () => {
    expect(strikeEffect("thrashing-dragon:wyrmling-s-fang")).toBeDefined();
    expect(strikeEffect("nope:nope")).toBeUndefined();
  });

  it("every entry has at least one meaningful field", () => {
    for (const [id, e] of entries) {
      const meaningful =
        typeof e.atkBonus === "number" ||
        typeof e.dmgBonus === "number" ||
        !!e.extraDamageDice ||
        !!e.expandThreat ||
        !!e.riderText;
      expect(meaningful, `${id} has no effect`).toBe(true);
    }
  });

  it("ids are well-formed discipline:slug", () => {
    for (const id of [
      ...Object.keys(STRIKE_EFFECTS),
      ...Object.keys(STRIKE_REFERENCE_ONLY),
    ]) {
      expect(id, id).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/);
    }
  });

  it("extraDamageDice is a well-formed dice rider", () => {
    for (const [id, e] of entries) {
      if (e.extraDamageDice)
        expect(e.extraDamageDice, id).toMatch(/^\+\d+d\d+( [a-z]+)?$/);
    }
  });

  it("no id is both modelled and reference-only", () => {
    const ref = new Set(Object.keys(STRIKE_REFERENCE_ONLY));
    for (const id of Object.keys(STRIKE_EFFECTS))
      expect(ref.has(id), `${id} in both maps`).toBe(false);
  });
});
