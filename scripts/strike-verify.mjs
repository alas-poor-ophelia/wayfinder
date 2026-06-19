/**
 * Verification backstop for Story A6 strike authoring. Imports the authored
 * registry (bun can import .ts) and cross-checks it against the wayfinder-rules
 * corpus:
 *   1. completeness — every corpus Strike id is modelled OR reference-only;
 *   2. disjoint — no id is in both maps;
 *   3. no phantoms — every authored/reference id exists in the corpus;
 *   4. transcription — each entry's extraDamageDice / dmgBonus value appears
 *      among the note's regex-detected damage signals.
 *
 * NOT part of the build (the corpus is a separate repo). Run on demand:
 *   bun scripts/strike-verify.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  STRIKE_EFFECTS,
  STRIKE_REFERENCE_ONLY,
} from "../src/data/strike-effects.ts";

const ROOT = "C:/Dev/wayfinder-rules/maneuvers";
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (m)
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  return fm;
}
const bodyOf = (t) =>
  t.replace(/^---\n[\s\S]*?\n---\n?/, "").replace(/^#\s+.*\n?/, "");

// gather corpus strikes: id -> { dice:Set, flat:Set }
const corpus = new Map();
for (const disc of readdirSync(ROOT)) {
  const dir = join(ROOT, disc);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const text = readFileSync(join(dir, f), "utf-8");
    const fm = frontmatter(text);
    if (fm.type !== "Strike") continue;
    const id = `${slug(fm.discipline || disc)}:${slug(f.replace(/\.md$/, ""))}`;
    const b = bodyOf(text);
    const dice = new Set(
      [...b.matchAll(/(\d*)d(\d+)/gi)].map(
        (m) => `${m[1] || "1"}d${m[2]}`,
      ),
    );
    const flat = new Set(
      [...b.matchAll(/additional (\d+) points of/gi)].map((m) => m[1]),
    );
    // a "+N bonus to ... damage roll(s)" is a damage bonus, not "additional N
    // points" — track it separately so dmgBonus entries from buff-style strikes
    // (e.g. a luck/circumstance bonus to damage) verify too.
    const bonus = new Set(
      [...b.matchAll(/(\d+)\s+(?:\w+\s+)?bonus[^.]*damage/gi)].map((m) => m[1]),
    );
    corpus.set(id, { dice, flat, bonus });
  }
}

const problems = [];
const ids = new Set(corpus.keys());
const modelled = new Set(Object.keys(STRIKE_EFFECTS));
const refOnly = new Set(Object.keys(STRIKE_REFERENCE_ONLY));

// 1. completeness
for (const id of ids)
  if (!modelled.has(id) && !refOnly.has(id))
    problems.push(`UNTRIAGED: ${id}`);
// 2. disjoint
for (const id of modelled)
  if (refOnly.has(id)) problems.push(`IN BOTH MAPS: ${id}`);
// 3. no phantoms
for (const id of modelled)
  if (!ids.has(id)) problems.push(`PHANTOM (not in corpus): ${id}`);
for (const id of refOnly)
  if (!ids.has(id)) problems.push(`PHANTOM ref (not in corpus): ${id}`);
// 4. transcription
for (const [id, eff] of Object.entries(STRIKE_EFFECTS)) {
  const c = corpus.get(id);
  if (!c) continue;
  if (eff.extraDamageDice) {
    const die = eff.extraDamageDice.match(/(\d+d\d+)/)?.[1];
    if (die && !c.dice.has(die))
      problems.push(
        `DICE MISMATCH: ${id} authored ${die}, note has {${[...c.dice].join(",")}}`,
      );
  }
  if (typeof eff.dmgBonus === "number") {
    const n = String(eff.dmgBonus);
    if (!c.flat.has(n) && !c.bonus.has(n))
      problems.push(
        `FLAT MISMATCH: ${id} authored ${eff.dmgBonus}, note flats {${[...c.flat].join(",")}} bonuses {${[...c.bonus].join(",")}}`,
      );
  }
}

console.log(
  `corpus strikes: ${ids.size} | modelled: ${modelled.size} | reference-only: ${refOnly.size}`,
);
if (problems.length) {
  console.log(`\n❌ ${problems.length} problem(s):`);
  for (const p of problems.sort()) console.log("  - " + p);
  process.exit(1);
} else {
  console.log("✅ all strikes triaged; dice/flat transcription matches notes.");
}
