/**
 * THE Quick Action conversion proof.
 *
 * tests/unit/fixtures/quick-action-parity.json was captured by running
 * computeAll at the PRE-conversion HEAD (toggle-driven calc) across the
 * matrix in qa-parity-matrix.ts — 41 cases covering every legacy toggle
 * alone, the two-stage toggles at each stage, class-level edges (paladin
 * 0/5/11, monk 0/10/11), panache gating, all 11 weapon songs, ranged
 * styles (Longbow/Shuriken/Ray), and stacking-trap combos (enhancement
 * weapon + Enhancement song; haste + flurry + power attack).
 *
 * Both post-conversion paths must reproduce those outputs byte-for-byte:
 *  1. the pre-v6 fallback (quickActions absent -> toggles drive the calc)
 *  2. the converted path (toggles seeded into quick actions, then zeroed)
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { seedQuickActionsFromToggles } from "../../../src/data/quick-actions";
import { defaultToggles, type CharacterRecord } from "../../../src/types/character";
import { buildMatrix, snapshot, type ParitySnapshot } from "../fixtures/qa-parity-matrix";
import fixture from "../fixtures/quick-action-parity.json";

const FIXTURE = fixture as Record<string, ParitySnapshot>;
const MATRIX = buildMatrix();

/**
 * RAW FIX (2026-06, approved): Weapon Song "Enhancement" is a true
 * enhancement bonus, so it no longer stacks with weapon enhancement (the
 * legacy code added it flat on top). Exactly one matrix case diverges from
 * the frozen fixture; its RAW behavior is pinned in the dedicated describe
 * block below. The fixture file itself stays untouched — it remains the
 * frozen pre-conversion truth for every other case.
 *
 * Note the divergence applies ONLY to the converted path: the pre-v6
 * fallback still runs the legacy weaponSong channel and stays byte-exact.
 */
const RAW_DELTA_CASES = new Set(["song enhancement + magic weapon enh2"]);

function fallbackRecord(record: CharacterRecord): CharacterRecord {
  const clone = structuredClone(record);
  delete clone.quickActions;
  delete clone.quickActionState;
  return clone;
}

function convertedRecord(record: CharacterRecord): CharacterRecord {
  const clone = structuredClone(record);
  const seeded = seedQuickActionsFromToggles(clone.toggles);
  clone.quickActions = seeded.quickActions;
  clone.quickActionState = seeded.quickActionState;
  clone.toggles = {
    ...defaultToggles(),
    rangedAttackStyle: clone.toggles.rangedAttackStyle,
  };
  return clone;
}

it("fixture and matrix cover the same cases", () => {
  expect(MATRIX.map((c) => c.name).sort()).toEqual(Object.keys(FIXTURE).sort());
});

describe("pre-v6 fallback path (toggles drive the calc) — byte parity", () => {
  for (const { name, record } of MATRIX) {
    it(name, () => {
      expect(snapshot(computeAll(fallbackRecord(record)))).toEqual(FIXTURE[name]);
    });
  }
});

describe("converted path (seeded quick actions, toggles zeroed) — byte parity", () => {
  for (const { name, record } of MATRIX) {
    if (RAW_DELTA_CASES.has(name)) continue;
    it(name, () => {
      expect(snapshot(computeAll(convertedRecord(record)))).toEqual(FIXTURE[name]);
    });
  }
});

describe("approved RAW deltas (converted path only)", () => {
  it("song Enhancement does not stack with a +2 magic weapon — the larger applies", () => {
    const { record } = MATRIX.find((c) => c.name === "song enhancement + magic weapon enh2")!;
    const out = computeAll(convertedRecord(record));
    const legacy = FIXTURE["song enhancement + magic weapon enh2"];

    // legacy melee was 2 (weapon) + 1 (song, flat) = +3 attack/+3 damage;
    // RAW takes max(2, 1) = +2/+2 — one point lower on both.
    const legacyMelee = /Standard Attack:\*\* \+(\d+) \(1d6\+(\d+)\)/.exec(legacy.melee)!;
    const rawMelee = /Standard Attack:\*\* \+(\d+) \(1d6\+(\d+)\)/.exec(out.attacks.melee)!;
    expect(Number(rawMelee[1])).toBe(Number(legacyMelee[1]) - 1);
    expect(Number(rawMelee[2])).toBe(Number(legacyMelee[2]) - 1);

    // ranged has no weapon enhancement, so the song's +1 still applies
    // unchanged there — byte-identical to the fixture.
    expect(out.attacks.ranged).toBe(legacy.ranged);
    // unarmed never had song effects
    expect(out.attacks.unarmed).toBe(legacy.unarmed);

    // the losing song bonus surfaces as suppressed in the modifier report
    expect(
      out.modifierReport?.suppressed.some((s) => s.includes("Weapon Song"))
    ).toBe(true);
  });

  it("song Enhancement WITHOUT a magic weapon still grants +1 attack/+1 damage (byte parity holds — covered in the main pass)", () => {
    // documented here for the reader: "song Enhancement" stays in the
    // byte-parity matrix above because max(0, 1) = 1 matches the legacy
    // flat +1 exactly when no other enhancement bonus exists.
    expect(RAW_DELTA_CASES.has("song Enhancement")).toBe(false);
  });
});
