/**
 * Verification backstop for Epic B (stances + boosts). Proves every corpus
 * Stance/Boost is triaged — modelled in MANEUVER_EFFECTS or recorded in
 * MANEUVER_REFERENCE_ONLY — with disjoint maps and no phantom ids.
 * Not part of the build (corpus is a separate repo): bun scripts/maneuver-verify.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  MANEUVER_EFFECTS,
  MANEUVER_REFERENCE_ONLY,
} from "../src/data/maneuver-effects.ts";

const ROOT = "C:/Dev/wayfinder-rules/maneuvers";
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function fm(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const o = {};
  if (m)
    for (const l of m[1].split("\n")) {
      const i = l.indexOf(":");
      if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    }
  return o;
}

const ids = new Set();
for (const disc of readdirSync(ROOT)) {
  const dir = join(ROOT, disc);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const o = fm(readFileSync(join(dir, f), "utf-8"));
    if (o.type !== "Stance" && o.type !== "Boost") continue;
    ids.add(`${slug(o.discipline || disc)}:${slug(f.replace(/\.md$/, ""))}`);
  }
}

const modelled = new Set(Object.keys(MANEUVER_EFFECTS));
const ref = new Set(Object.keys(MANEUVER_REFERENCE_ONLY));
const problems = [];

for (const id of ids)
  if (!modelled.has(id) && !ref.has(id)) problems.push(`UNTRIAGED: ${id}`);
for (const id of modelled)
  if (ref.has(id)) problems.push(`IN BOTH MAPS: ${id}`);
// MANEUVER_EFFECTS also holds the original 6 + B-modelled; every key must be a
// real corpus stance/boost id.
for (const id of modelled)
  if (!ids.has(id)) problems.push(`PHANTOM modelled (not a corpus stance/boost): ${id}`);
for (const id of ref)
  if (!ids.has(id)) problems.push(`PHANTOM ref (not in corpus): ${id}`);

console.log(
  `corpus stances+boosts: ${ids.size} | modelled: ${modelled.size} | reference-only: ${ref.size}`,
);
if (problems.length) {
  console.log(`\n❌ ${problems.length} problem(s):`);
  for (const p of problems.sort()) console.log("  - " + p);
  process.exit(1);
} else {
  console.log("✅ every corpus stance/boost is triaged; maps disjoint; no phantoms.");
}
