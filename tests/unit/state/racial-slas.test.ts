import { describe, expect, it } from "vitest";
import {
  computeRacialSpellbook,
  ensureRacialSpellbook,
  racialBooksEqual,
  type SpellResolver,
} from "../../../src/state/racial-slas";
import { createDefaultCharacter } from "../../../src/types/character";
import { createDefaultSpellbook } from "../../../src/types/spellbook";
import type { SpellDoc } from "../../../src/spells";

/** Minimal SpellDoc with a deterministic id derived from the name. */
function doc(name: string): SpellDoc {
  return {
    path: `Spells/${name}.md`,
    id: `id_${name.toLowerCase().replace(/[^a-z]/g, "")}`,
    name,
    spellLevelRaw: "wizard 1",
    parsed: { classes: ["wizard"], levels: { wizard: 1 } },
    school: "evocation",
    source: "PFRPG Core",
    range: "close (25 ft)",
    castingTime: "1 standard action",
    components: "V, S",
    targets: "",
    duration: "instantaneous",
    saveType: "Will negates",
    sr: "yes",
  };
}

/** A resolver that knows every named spell (case-insensitive). */
function resolverFor(...names: string[]): SpellResolver {
  const byName = new Map<string, SpellDoc>();
  for (const n of names) byName.set(n.toLowerCase(), doc(n));
  return { byName };
}

describe("computeRacialSpellbook", () => {
  it("returns no book when there are no SLAs", () => {
    expect(
      computeRacialSpellbook(undefined, resolverFor(), undefined).book,
    ).toBe(undefined);
    expect(computeRacialSpellbook([], resolverFor(), undefined).book).toBe(
      undefined,
    );
  });

  it("seeds an SLA entry per resolved spell with the right casts", () => {
    const { book, unresolved } = computeRacialSpellbook(
      [
        { name: "Darkness", perDay: 1 },
        { name: "Detect Undead", perDay: 3 },
      ],
      resolverFor("Darkness", "Detect Undead"),
      undefined,
    );
    expect(unresolved).toEqual([]);
    expect(book?.castingClass).toBe("");
    expect(book?.slas.map((s) => s.casts)).toEqual([1, 3]);
    // every SLA references a KnownSpell present in the book, flagged known:false
    for (const sla of book!.slas) {
      const spell = book!.spells.find((s) => s.id === sla.spellId);
      expect(spell).toBeDefined();
      expect(spell!.known).toBe(false);
    }
  });

  it("at-will SLAs (perDay 0) carry casts 0", () => {
    const { book } = computeRacialSpellbook(
      [{ name: "Nondetection", perDay: 0 }],
      resolverFor("Nondetection"),
      undefined,
    );
    expect(book?.slas[0]?.casts).toBe(0);
  });

  it("reports unresolved spells and omits them; undefined when none resolve", () => {
    const r = computeRacialSpellbook(
      [
        { name: "Darkness", perDay: 1 },
        { name: "Made Up Spell", perDay: 1 },
      ],
      resolverFor("Darkness"),
      undefined,
    );
    expect(r.unresolved).toEqual(["Made Up Spell"]);
    expect(r.book?.slas).toHaveLength(1);

    const none = computeRacialSpellbook(
      [{ name: "Made Up Spell", perDay: 1 }],
      resolverFor("Darkness"),
      undefined,
    );
    expect(none.book).toBe(undefined);
    expect(none.unresolved).toEqual(["Made Up Spell"]);
  });

  it("preserves remaining uses for an SLA already present", () => {
    const first = computeRacialSpellbook(
      [{ name: "Darkness", perDay: 1 }],
      resolverFor("Darkness"),
      undefined,
    ).book!;
    // simulate the user having spent the daily use
    first.slas[0].castsRemaining = 0;
    const again = computeRacialSpellbook(
      [{ name: "Darkness", perDay: 1 }],
      resolverFor("Darkness"),
      first,
    ).book!;
    expect(again.slas[0]?.castsRemaining).toBe(0);
  });

  it("resets remaining when the per-day count changes", () => {
    const prev = createDefaultSpellbook("", "cha");
    prev.slas = [{ spellId: "id_darkness", casts: 1, castsRemaining: 0 }];
    const { book } = computeRacialSpellbook(
      [{ name: "Darkness", perDay: 3 }],
      resolverFor("Darkness"),
      prev,
    );
    expect(book?.slas[0]?.casts).toBe(3);
    expect(book?.slas[0]?.castsRemaining).toBe(3);
  });
});

describe("ensureRacialSpellbook (race + heritage resolution)", () => {
  it("seeds a base race's unconditional SLAs (drow → 3)", () => {
    const c = createDefaultCharacter("c", "C");
    c.raceKey = "drow";
    const { book } = ensureRacialSpellbook(
      c,
      resolverFor("Dancing Lights", "Darkness", "Faerie Fire"),
    );
    expect(book?.slas).toHaveLength(3);
  });

  it("heritage SLA overrides the base race SLA (tiefling darkness → demon-spawn shatter)", () => {
    const c = createDefaultCharacter("c", "C");
    c.raceKey = "tiefling";
    c.raceHeritageKey = "demon-spawn";
    const resolver = resolverFor("Darkness", "Shatter");
    const { book } = ensureRacialSpellbook(c, resolver);
    const spellNames = book!.slas.map(
      (s) => book!.spells.find((sp) => sp.id === s.spellId)?.name,
    );
    expect(spellNames).toEqual(["Shatter"]);
    expect(spellNames).not.toContain("Darkness");
  });

  it("no race → no book", () => {
    const c = createDefaultCharacter("c", "C");
    expect(ensureRacialSpellbook(c, resolverFor()).book).toBe(undefined);
  });

  it("race without slaSpells (human) → no book", () => {
    const c = createDefaultCharacter("c", "C");
    c.raceKey = "human";
    expect(ensureRacialSpellbook(c, resolverFor()).book).toBe(undefined);
  });
});

describe("racialBooksEqual", () => {
  it("treats structurally identical books as equal", () => {
    const a = computeRacialSpellbook(
      [{ name: "Darkness", perDay: 1 }],
      resolverFor("Darkness"),
      undefined,
    ).book;
    const b = computeRacialSpellbook(
      [{ name: "Darkness", perDay: 1 }],
      resolverFor("Darkness"),
      undefined,
    ).book;
    expect(racialBooksEqual(a, b)).toBe(true);
  });

  it("detects different SLA sets", () => {
    const a = computeRacialSpellbook(
      [{ name: "Darkness", perDay: 1 }],
      resolverFor("Darkness"),
      undefined,
    ).book;
    const b = computeRacialSpellbook(
      [{ name: "Shatter", perDay: 1 }],
      resolverFor("Shatter"),
      undefined,
    ).book;
    expect(racialBooksEqual(a, b)).toBe(false);
    expect(racialBooksEqual(a, undefined)).toBe(false);
  });
});
