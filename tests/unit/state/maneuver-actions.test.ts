/**
 * Behavior tests for the Path of War armed-Strike lifecycle in
 * maneuver-actions: arming/clearing the pending strike and the guards/
 * clearing rules that keep it from going stale (expend, recover, unready).
 */
import {
  recoverAll,
  setPendingStrike,
  toggleExpended,
  toggleReadied,
} from "../../../src/state/maneuver-actions";
import type { MiniSheetStore } from "../../../src/state/store";
import {
  createDefaultCharacter,
  type CharacterRecord,
} from "../../../src/types/character";
import {
  createDefaultManeuverBook,
  type KnownManeuver,
  type ManeuverBookState,
} from "../../../src/types/maneuverbook";

/** Minimal store double: one character + the real dot-path set semantics. */
function fakeStore(character: CharacterRecord) {
  const store = {
    getCharacter: () => character,
    setCharacterField: (_id: string, dotPath: string, value: unknown) => {
      const keys = dotPath.split(".");
      let cursor = character as unknown as Record<string, unknown>;
      for (const key of keys.slice(0, -1)) {
        if (typeof cursor[key] !== "object" || cursor[key] === null) {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[keys[keys.length - 1]] = value;
    },
  };
  return store as unknown as MiniSheetStore;
}

const strike = (id: string, name: string): KnownManeuver => ({
  id,
  name,
  discipline: id.split(":")[0],
  level: 1,
  type: "Strike",
  action: "",
  range: "",
  target: "",
  duration: "",
  save: "",
  prerequisites: "",
  skill: "",
  source: "",
});

const WYRMLING = "thrashing-dragon:wyrmling-s-fang"; // modelled
const PYRITE = "golden-lion:pyrite-strike"; // modelled
const UNMODELLED = "golden-lion:no-such-strike"; // readied but no strikeEffect

function withBook(book: Partial<ManeuverBookState>): {
  character: CharacterRecord;
  store: MiniSheetStore;
} {
  const character = {
    ...createDefaultCharacter("t", "T"),
    maneuverbook: { ...createDefaultManeuverBook("warlord", "cha"), ...book },
  };
  return { character, store: fakeStore(character) };
}

const pending = (c: CharacterRecord) => c.maneuverbook?.pendingStrikeId;

describe("armed-strike lifecycle (maneuver-actions)", () => {
  it("arms a readied, modelled strike", () => {
    const { character, store } = withBook({
      maneuvers: [strike(WYRMLING, "Wyrmling's Fang")],
      readied: [WYRMLING],
    });
    setPendingStrike(store, character, WYRMLING);
    expect(pending(character)).toBe(WYRMLING);
  });

  it("arming a second strike replaces the first", () => {
    const { character, store } = withBook({
      maneuvers: [
        strike(WYRMLING, "Wyrmling's Fang"),
        strike(PYRITE, "Pyrite Strike"),
      ],
      readied: [WYRMLING, PYRITE],
      pendingStrikeId: WYRMLING,
    });
    setPendingStrike(store, character, PYRITE);
    expect(pending(character)).toBe(PYRITE);
  });

  it("expending the armed strike clears the pending slot", () => {
    const { character, store } = withBook({
      maneuvers: [strike(WYRMLING, "Wyrmling's Fang")],
      readied: [WYRMLING],
      pendingStrikeId: WYRMLING,
    });
    toggleExpended(store, character, WYRMLING);
    expect(character.maneuverbook?.expended).toContain(WYRMLING);
    expect(pending(character)).toBeUndefined();
  });

  it("arming an unreadied strike is a no-op", () => {
    const { character, store } = withBook({
      maneuvers: [strike(WYRMLING, "Wyrmling's Fang")],
      readied: [], // not readied
    });
    setPendingStrike(store, character, WYRMLING);
    expect(pending(character)).toBeUndefined();
  });

  it("arming a readied but unmodelled strike is a no-op", () => {
    const { character, store } = withBook({
      maneuvers: [strike(UNMODELLED, "Phantom")],
      readied: [UNMODELLED],
    });
    setPendingStrike(store, character, UNMODELLED);
    expect(pending(character)).toBeUndefined();
  });

  it("clearing with undefined disarms", () => {
    const { character, store } = withBook({
      maneuvers: [strike(WYRMLING, "Wyrmling's Fang")],
      readied: [WYRMLING],
      pendingStrikeId: WYRMLING,
    });
    setPendingStrike(store, character, undefined);
    expect(pending(character)).toBeUndefined();
  });

  it("recoverAll and unreadying both drop an armed strike", () => {
    const a = withBook({
      maneuvers: [strike(WYRMLING, "Wyrmling's Fang")],
      readied: [WYRMLING],
      pendingStrikeId: WYRMLING,
    });
    recoverAll(a.store, a.character);
    expect(pending(a.character)).toBeUndefined();

    const b = withBook({
      maneuvers: [strike(WYRMLING, "Wyrmling's Fang")],
      readied: [WYRMLING],
      pendingStrikeId: WYRMLING,
    });
    toggleReadied(b.store, b.character, WYRMLING); // unready
    expect(pending(b.character)).toBeUndefined();
  });
});
