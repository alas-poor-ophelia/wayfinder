/**
 * Triage aid for stance/boost authoring (Epic B). Like strike-triage but for
 * any maneuver type: emits id (discipline:slug) + level + verbatim modifier-
 * relevant sentences + signal tags (bonus type/target, IL-scaling, aura).
 *
 * Usage: bun scripts/maneuver-triage.mjs <Type> [disciplineSlug]
 *   e.g. bun scripts/maneuver-triage.mjs Stance
 *        bun scripts/maneuver-triage.mjs Boost golden-lion
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "C:/Dev/wayfinder-rules/maneuvers";
const TYPE = process.argv[2] || "Stance";
const ONLY = process.argv[3];
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
  t.replace(/^---\n[\s\S]*?\n---\n?/, "").replace(/^#\s+.*\n?/, "").trim();

function mechSentences(b) {
  const KW =
    /\bbonus\b|\bpenalty\b|\bAC\b|armor class|\bsave\b|saving throw|\bCMD\b|\bCMB\b|\bDR\b|damage reduction|resistance|\breach\b|\bspeed\b|initiative|\bregeneration\b|fast healing|concealment|\bmiss chance\b|\battack rolls?\b|damage rolls?\b/i;
  return b
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && KW.test(s));
}

const signals = (b) => ({
  scaling: /per (every )?\w+ (initiator|character) levels?|every (two|three|four|five) (initiator|character) levels|for (every|each) \w+ (initiator|character) levels?|\+1 (per|for every)/i.test(
    b,
  ),
  aura: /\ballies?\b|\bwithin \d+ ?-?(ft|feet)\b/i.test(b),
  bonusTypes: [
    ...new Set(
      [
        ...b.matchAll(
          /\b(dodge|insight|morale|luck|sacred|profane|competence|circumstance|enhancement|deflection|natural|resistance|untyped|shield|armor|size)\b\s+bonus/gi,
        ),
      ].map((m) => m[1].toLowerCase()),
    ),
  ],
});

const disciplines = readdirSync(ROOT).filter((d) => {
  try {
    return statSync(join(ROOT, d)).isDirectory() && (!ONLY || d === ONLY);
  } catch {
    return false;
  }
});

let count = 0;
for (const disc of disciplines) {
  const dir = join(ROOT, disc);
  const rows = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const text = readFileSync(join(dir, f), "utf-8");
    const fm = frontmatter(text);
    if (fm.type !== TYPE) continue;
    const name = f.replace(/\.md$/, "");
    const id = `${slug(fm.discipline || disc)}:${slug(name)}`;
    const b = bodyOf(text);
    rows.push({
      id,
      level: fm.level,
      sig: signals(b),
      mech: mechSentences(b),
      body: b,
    });
  }
  if (!rows.length) continue;
  rows.sort((a, b) => Number(a.level) - Number(b.level));
  count += rows.length;
  console.log(`\n######## ${disc} — ${TYPE} (${rows.length}) ########`);
  for (const r of rows) {
    const tags = [
      r.sig.scaling ? "SCALING" : "",
      r.sig.aura ? "AURA" : "",
      r.sig.bonusTypes.length ? `types=${r.sig.bonusTypes.join("|")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`\n[L${r.level}] ${r.id}  ${tags}`);
    if (r.mech.length) for (const m of r.mech) console.log(`   · ${m}`);
    else console.log(`   ~ ${r.body.replace(/\s+/g, " ").slice(0, 300)}`);
  }
}
console.log(`\n==== total ${TYPE}: ${count} ====`);
