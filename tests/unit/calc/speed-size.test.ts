/**
 * Speed and size derivation in computeAll. Speed: manual string for
 * no-raceKey characters; race-derived when speed === ""; "speed" modifiers
 * resolve (unconditional add, conditional → notes); movementMultiplier
 * applies. Size: race-derived (small = +1) feeding AC/CMB/CMD, with override.
 */
import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import {
  createDefaultCharacter,
  type CharacterRecord,
} from "../../../src/types/character";
import type { Modifier } from "../../../src/calc/modifiers";

function fixture(): CharacterRecord {
  const c = createDefaultCharacter("test", "Test");
  c.classes = [{ className: "Fighter", level: 4 }];
  c.baseAbilities = { str: 14, dex: 14, con: 12, int: 10, wis: 10, cha: 10 };
  return c;
}

describe("speed derivation", () => {
  it("no raceKey: parses the manual string", () => {
    const c = fixture(); // default speed "30ft"
    expect(computeAll(c).speed).toMatchObject({
      base: 30,
      total: 30,
      text: "30FT".toLowerCase(),
    });
    expect(computeAll(c).speed.text).toBe("30ft");
  });

  it("raceKey + empty speed: derives from race", () => {
    const c = fixture();
    c.raceKey = "dwarf"; // 20 ft
    c.speed = "";
    expect(computeAll(c).speed).toMatchObject({
      base: 20,
      total: 20,
      text: "20ft",
    });
  });

  it("manual override wins over race speed", () => {
    const c = fixture();
    c.raceKey = "dwarf";
    c.speed = "40ft";
    expect(computeAll(c).speed.total).toBe(40);
  });

  it("movementMultiplier applies with legacy floor", () => {
    const c = fixture();
    c.conditions = ["entangled"]; // half speed
    expect(computeAll(c).speed.total).toBe(15);
  });

  it("unconditional speed modifier adds before the multiplier", () => {
    const c = fixture();
    c.customBuffs = [
      {
        id: "boots",
        name: "Boots",
        modifiers: [
          {
            target: "speed",
            type: "enhancement",
            value: 10,
            source: "Boots",
          } as Modifier,
        ],
      },
    ];
    c.buffs = ["boots"];
    expect(computeAll(c).speed.total).toBe(40);
  });

  it("conditional speed modifier lands in notes, not the total", () => {
    const c = fixture();
    c.raceKey = "catfolk"; // Sprinter: +10 speed when charging/running (conditional)
    c.speed = "";
    const computed = computeAll(c);
    expect(computed.speed.total).toBe(30); // not 40
    expect(computed.speed.notes.some((n) => /Sprinter|speed/i.test(n))).toBe(
      true,
    );
  });

  it("freeform override string passes through verbatim", () => {
    const c = fixture();
    c.speed = "30ft (fly 60ft)";
    expect(computeAll(c).speed.text).toBe("30ft (fly 60ft)");
  });
});

describe("size derivation", () => {
  it("small race adds +1 to AC, CMB, and CMD (same-sign legacy quirk)", () => {
    const base = computeAll(fixture());
    const c = fixture();
    c.raceKey = "halfling"; // small; also +2 Dex -2 Str +2 Cha — isolate size below
    // halfling ability mods would move dex/str; compare against a medium
    // reference by using gnome? Instead assert the delta against the same
    // ability scores by zeroing racial ability influence is hard — assert
    // absolute size contribution via a small race with no relevant skew:
    const small = computeAll(c);
    // Halfling: +2 Dex (14→16, +1 mod), -2 Str (14→12, -1 mod), small +1
    // AC: 10 + dex(3) + size(1) = base 10 + dex(2) = +1 dex +1 size = +2
    expect(small.ac.normalAC).toBe(base.ac.normalAC + 2);
    // CMB uses DEX (preserved legacy quirk, not RAW Str): +1 dex + size +1 = +2
    expect(small.ac.cmb).toBe(base.ac.cmb + 2);
    // CMD uses str+dex: +1 dex, -1 str, +1 size = +1 over base
    expect(small.ac.cmd).toBe(base.ac.cmd + 1);
  });

  it("sizeModOverride wins over the race-derived value", () => {
    const c = fixture();
    c.raceKey = "halfling";
    c.ac.sizeModOverride = 0; // force medium-style size despite small race
    const computed = computeAll(c);
    const noSize = fixture();
    noSize.raceKey = "halfling";
    noSize.ac.sizeModOverride = 1;
    // override 0 vs 1 → AC differs by exactly 1
    expect(computeAll(noSize).ac.normalAC).toBe(computed.ac.normalAC + 1);
  });

  it("no raceKey: ac.sizeMod is the only size input (Hwayoung-shaped +2)", () => {
    const c = fixture();
    c.ac.sizeMod = 2; // Tiny familiar, no raceKey
    const big = computeAll(c);
    c.ac.sizeMod = 0;
    const med = computeAll(c);
    expect(big.ac.normalAC).toBe(med.ac.normalAC + 2);
  });
});
