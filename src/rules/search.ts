import { prepareFuzzySearch } from "obsidian";
import type { RuleDoc } from "./index";

export interface RuleSearchResult {
  doc: RuleDoc;
  score: number;
}

/**
 * Two-tier search: fuzzy match on titles/headings (high scores), plus a
 * scored substring match across cached body text.
 */
export function searchRules(docs: RuleDoc[], query: string): RuleSearchResult[] {
  const q = query.trim();
  if (!q) return docs.map((doc) => ({ doc, score: 0 }));

  const fuzzy = prepareFuzzySearch(q);
  const lower = q.toLowerCase();
  const results: RuleSearchResult[] = [];

  for (const doc of docs) {
    let score = -Infinity;
    const titleMatch = fuzzy(doc.title);
    if (titleMatch) score = Math.max(score, titleMatch.score + 10);
    for (const heading of doc.headings) {
      const m = fuzzy(heading);
      if (m) score = Math.max(score, m.score + 5);
    }
    const idx = doc.body.toLowerCase().indexOf(lower);
    if (idx >= 0) {
      // earlier hits and shorter docs score a bit higher
      score = Math.max(score, -idx / 100 - doc.body.length / 100000);
    }
    if (score > -Infinity) results.push({ doc, score });
  }

  return results.sort((a, b) => b.score - a.score);
}
