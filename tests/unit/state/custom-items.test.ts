/**
 * Custom-items file format tests: round-trip, tolerant parsing (the
 * vault-root file is user-editable and sync-exposed — garbage must parse
 * to null so the store NEVER overwrites a file it can't read), and the
 * rename-follow rule for name-based tracking.
 */
import { describe, expect, it } from "vitest";
import {
  CUSTOM_ITEMS_SCHEMA_VERSION,
  parseCustomItemsFile,
  renamedFileName,
  serializeCustomItemsFile,
  type CustomItemDef,
} from "../../../src/types/custom-items";

const sword: CustomItemDef = {
  id: "ci_abc123def",
  name: "+1 Flaming Longsword",
  kind: "weapon",
  baseId: "longsword",
  enhancement: 1,
  abilityIds: ["flaming"],
  priceGp: 8315,
  weightLbs: 4,
  modifiers: [
    { target: "attack.melee", type: "enhancement", value: 1, source: "+1 Flaming Longsword" },
  ],
  note: "Flaming: +1d6 fire damage",
  createdAt: "2026-06-12T00:00:00.000Z",
  modifiedAt: "2026-06-12T00:00:00.000Z",
};

describe("custom items file round-trip", () => {
  it("serialize → parse preserves every field", () => {
    const text = serializeCustomItemsFile([sword]);
    const parsed = parseCustomItemsFile(text);
    expect(parsed).toEqual({
      schemaVersion: CUSTOM_ITEMS_SCHEMA_VERSION,
      items: [sword],
    });
  });

  it("serializes human-readably (indented, trailing newline)", () => {
    const text = serializeCustomItemsFile([sword]);
    expect(text).toMatch(/\n {2}"items"/);
    expect(text.endsWith("\n")).toBe(true);
  });
});

describe("tolerant parsing", () => {
  it("returns null for non-JSON garbage (never overwrite)", () => {
    expect(parseCustomItemsFile("not json {{{")).toBeNull();
  });

  it("returns null for JSON that is not a custom-items file", () => {
    expect(parseCustomItemsFile('"a string"')).toBeNull();
    expect(parseCustomItemsFile("[1,2,3]")).toBeNull();
    expect(parseCustomItemsFile('{"someoneElses": "config"}')).toBeNull();
  });

  it("drops malformed entries but keeps well-formed ones", () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      items: [sword, { id: 42 }, "nope", { id: "x", name: "No Kind", kind: "ring" }],
    });
    const parsed = parseCustomItemsFile(text);
    expect(parsed?.items).toEqual([sword]);
  });

  it("drops malformed modifiers but keeps well-formed ones", () => {
    const text = JSON.stringify({
      items: [
        {
          ...sword,
          modifiers: [
            sword.modifiers[0],
            { target: "attack.melee" }, // no type/value
            "garbage",
            null,
            { target: 7, type: "enhancement", value: 1 }, // wrong target type
          ],
        },
      ],
    });
    const parsed = parseCustomItemsFile(text);
    expect(parsed?.items[0].modifiers).toEqual(sword.modifiers);
  });

  it("defaults missing optional fields on lenient entries", () => {
    const text = JSON.stringify({
      items: [{ id: "ci_x", name: "Mystery Blade", kind: "weapon" }],
    });
    const parsed = parseCustomItemsFile(text);
    expect(parsed?.items[0]).toMatchObject({
      id: "ci_x",
      enhancement: 1,
      abilityIds: [],
      modifiers: [],
      priceGp: 0,
      note: "",
    });
  });
});

describe("renamedFileName (name-based tracking)", () => {
  it("path-only move keeps the setting (returns null)", () => {
    expect(
      renamedFileName("minisheet-items.json", "Gear/minisheet-items.json")
    ).toBeNull();
    expect(
      renamedFileName("A/B/minisheet-items.json", "minisheet-items.json")
    ).toBeNull();
  });

  it("basename change returns the new name to store", () => {
    expect(renamedFileName("minisheet-items.json", "party-forge.json")).toBe(
      "party-forge.json"
    );
    expect(
      renamedFileName("Gear/minisheet-items.json", "Gear/forge.json")
    ).toBe("forge.json");
  });
});
