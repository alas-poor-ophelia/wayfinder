import { describe, expect, it } from "vitest";
import {
  filterManeuvers,
  sortManeuvers,
} from "../../src/components/maneuverdb/ManeuverDatabaseApp";
import { DEFAULT_MANEUVER_DB } from "../../src/types/data-file";
import type { ManeuverDbState } from "../../src/types/data-file";
import type { ManeuverDoc } from "../../src/maneuvers/index";
import {
  maneuverId,
  type ManeuverLevel,
  type ManeuverType,
} from "../../src/types/maneuverbook";

function doc(
  name: string,
  discipline: string,
  level: ManeuverLevel,
  type: ManeuverType,
): ManeuverDoc {
  return {
    path: `${discipline}/${name}.md`,
    id: maneuverId(discipline, name),
    name,
    discipline,
    level,
    type,
    action: "",
    range: "",
    target: "",
    duration: "",
    save: "",
    prerequisites: "",
    skill: "",
    source: "Path of War",
  };
}

const DOCS: ManeuverDoc[] = [
  doc("Demoralizing Roar", "Golden Lion", 1, "Boost"),
  doc("Tactical Strike", "Golden Lion", 1, "Strike"),
  doc("Pride Leader's Stance", "Golden Lion", 1, "Stance"),
  doc("Iron Shell", "Iron Tortoise", 3, "Counter"),
  doc("Abyssal Drive", "Black Seraph", 6, "Strike"),
];

const db = (over: Partial<ManeuverDbState> = {}): ManeuverDbState => ({
  ...DEFAULT_MANEUVER_DB,
  ...over,
});

describe("filterManeuvers", () => {
  const empty = new Set<string>();

  it("matches a name substring (case-insensitive)", () => {
    const out = filterManeuvers(DOCS, db({ search: "strike" }), empty);
    expect(out.map((d) => d.name)).toEqual(["Tactical Strike"]);
  });

  it("filters by discipline, type, and tier independently", () => {
    expect(
      filterManeuvers(DOCS, db({ disciplines: ["Iron Tortoise"] }), empty),
    ).toHaveLength(1);
    expect(filterManeuvers(DOCS, db({ types: ["Stance"] }), empty)).toHaveLength(
      1,
    );
    expect(filterManeuvers(DOCS, db({ tiers: [1] }), empty)).toHaveLength(3);
  });

  it("combines filters (AND)", () => {
    const out = filterManeuvers(
      DOCS,
      db({ disciplines: ["Golden Lion"], types: ["Strike"] }),
      empty,
    );
    expect(out.map((d) => d.name)).toEqual(["Tactical Strike"]);
  });

  it("knownOnly keeps only ids in the known set", () => {
    const known = new Set([maneuverId("Golden Lion", "Tactical Strike")]);
    const out = filterManeuvers(DOCS, db({ knownOnly: true }), known);
    expect(out.map((d) => d.name)).toEqual(["Tactical Strike"]);
  });
});

describe("sortManeuvers", () => {
  it("sorts by tier ascending, name as tiebreak", () => {
    const out = sortManeuvers(DOCS, db({ sortKey: "tier" }));
    expect(out.map((d) => d.level)).toEqual([1, 1, 1, 3, 6]);
  });

  it("sorts by name by default", () => {
    const out = sortManeuvers(DOCS, db());
    expect(out[0].name).toBe("Abyssal Drive");
  });
});
