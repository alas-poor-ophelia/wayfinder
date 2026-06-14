/**
 * searchRules — ranked subsequence search over RuleDoc, with non-contiguous
 * title-highlight positions. Mirrors the design prototype's scorer.
 */
import { describe, expect, it } from "vitest";
import { searchRules } from "../../../src/rules/search";
import type { RuleDoc } from "../../../src/rules/model";

function doc(partial: Partial<RuleDoc> & { title: string }): RuleDoc {
  return {
    path: partial.title + ".md",
    title: partial.title,
    category: partial.category ?? "General",
    headings: [],
    body: partial.body ?? "",
    type: partial.type ?? "reference",
    icon: "book",
    summary: partial.summary ?? "",
    meta: [],
    blocks: partial.blocks ?? [],
  };
}

const docs: RuleDoc[] = [
  doc({ title: "Aura of Courage", category: "Paladin", summary: "Immune to fear." }),
  doc({ title: "Smite Evil", category: "Paladin", summary: "Add Cha to hit." }),
  doc({
    title: "Detect Evil",
    category: "Paladin",
    summary: "Read the aura of one creature.",
    blocks: [{ t: "p", text: "courage is not the absence of fear." }],
  }),
];

describe("searchRules", () => {
  it("ranks a fuzzy title acronym above an incidental body match", () => {
    const r = searchRules(docs, "aoc");
    expect(r[0].doc.title).toBe("Aura of Courage");
    // "Detect Evil" mentions "courage" in body so it also matches, but lower
    expect(r.map((x) => x.doc.title)).toContain("Detect Evil");
    expect(r[0].score).toBeGreaterThan(r[r.length - 1].score);
  });

  it("returns non-contiguous title highlight positions", () => {
    const r = searchRules([docs[1]], "smev");
    // greedy subsequence over "smite evil": s0 m1, first e4, then v7
    expect(r[0].titlePos).toEqual([0, 1, 4, 7]);
  });

  it("treats multiple words as AND across fields", () => {
    const both = searchRules(docs, "evil paladin");
    expect(both.map((x) => x.doc.title).sort()).toEqual(["Detect Evil", "Smite Evil"]);
    const none = searchRules(docs, "evil wizard");
    expect(none).toHaveLength(0);
  });

  it("empty query returns all docs in incoming order with score 0", () => {
    const r = searchRules(docs, "  ");
    expect(r).toHaveLength(3);
    expect(r[0].doc.title).toBe("Aura of Courage");
    expect(r.every((x) => x.score === 0)).toBe(true);
  });
});
