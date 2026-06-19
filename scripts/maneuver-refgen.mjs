/**
 * Generate the MANEUVER_REFERENCE_ONLY skeleton for Epic B: every corpus
 * Stance/Boost id NOT modelled in MANEUVER_EFFECTS, with a coarse reason
 * auto-derived from the note text. Output is pasted into maneuver-effects.ts.
 * One-off authoring aid (not part of the build).
 *
 * Usage: bun scripts/maneuver-refgen.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MANEUVER_EFFECTS } from "../src/data/maneuver-effects.ts";

const ROOT = "C:/Dev/wayfinder-rules/maneuvers";
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const modelled = new Set(Object.keys(MANEUVER_EFFECTS));

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
const body = (t) =>
  t.replace(/^---\n[\s\S]*?\n---\n?/, "").replace(/^#\s+.*\n?/, "");

function reason(b) {
  const t = b.toLowerCase();
  if (/\ballies?\b|each ally|your allies/.test(t)) return "ally aura / coordination";
  if (/\dd\d+ points of (?:\w+ )?damage|additional \dd\d/.test(t))
    return "bonus damage dice (not a Modifier)";
  if (/heal|hit points to|fast healing|temporary hit points/.test(t))
    return "healing / utility";
  if (/teleport|free .{0,12}(move|step)|move up to|charge|fly speed|difficult terrain|base speed/.test(t))
    return "movement / positioning";
  if (/will save|fortitude save|reflex save|cursed|demoraliz|shaken|frightened|dazed|stagger|taunt|intimidat/.test(t))
    return "control / debuff (enemy-targeted)";
  if (/blindsight|scent|the .* feat|uncanny dodge|spell resistance|damage reduction|maximum dexterity|armor check|reach|threaten/.test(t))
    return "non-modifier ability";
  if (/extra attack|additional .{0,12}attack|two-weapon|full attack|dirty trick|disarm|trip|grapple|sunder|bull rush/.test(t))
    return "extra attack / maneuver";
  return "situational / non-modeled bonus";
}

const lines = [];
for (const disc of readdirSync(ROOT)) {
  const dir = join(ROOT, disc);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const text = readFileSync(join(dir, f), "utf-8");
    const t = fm(text).type;
    if (t !== "Stance" && t !== "Boost") continue;
    const id = `${slug(fm(text).discipline || disc)}:${slug(f.replace(/\.md$/, ""))}`;
    if (modelled.has(id)) continue;
    lines.push(`  "${id}": "${t.toLowerCase()}: ${reason(body(text))}",`);
  }
}
lines.sort();
console.log(lines.join("\n"));
console.log(`\n// ${lines.length} reference-only stance/boost dispositions`);
