/**
 * One-off triage aid for Path of War strike authoring (Story A6).
 * Walks the wayfinder-rules maneuvers corpus, and for every type:Strike note
 * emits the id (discipline:slug, matching maneuverId) + level + the VERBATIM
 * mechanical sentences (those mentioning damage / saves / riders), plus
 * regex-detected signal flags. NOT part of the build — a transcription source
 * so the registry is authored from real text, never paraphrase.
 *
 * Usage: bun scripts/strike-triage.mjs [disciplineSlug]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "C:/Dev/wayfinder-rules/maneuvers";

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const only = process.argv[2];

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return fm;
}

function body(text) {
  const after = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
  return after.replace(/^#\s+.*\n?/, "").trim();
}

/** Split into sentences, keep those with mechanical keywords. */
function mechSentences(b) {
  const sents = b
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const KW =
    /\b(damage|d\d|save|prone|blind|stagger|sicken|nausea|dazed?|stun|bleed|fatigu|exhaust|paraliz|grapple|push|knock|disarm|trip|deafen|entangle|shaken|frighten|panic|cower|automatically hits?|ignores?|threat|critical|drained?|negative level)\b/i;
  return sents.filter((s) => KW.test(s));
}

const signals = (b) => ({
  dice: [...b.matchAll(/(\d*d\d+)\s+(?:points of\s+)?([a-z]+\s+)?damage/gi)].map(
    (m) => (m[1].startsWith("d") ? "1" + m[1] : m[1]) + (m[2] ? " " + m[2].trim() : ""),
  ),
  flat: [...b.matchAll(/additional (\d+) points of damage/gi)].map((m) => m[1]),
  autoHit: /automatically hits?/i.test(b),
  threat: /threat range|confirm (?:this )?critical|treated? as .*keen/i.test(b),
  toHit: /bonus (?:on|to) (?:his |the |your )?attack roll/i.test(b),
});

const disciplines = readdirSync(ROOT).filter((d) => {
  try {
    return statSync(join(ROOT, d)).isDirectory() && (!only || d === only);
  } catch {
    return false;
  }
});

for (const disc of disciplines) {
  const dir = join(ROOT, disc);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const rows = [];
  for (const f of files) {
    const text = readFileSync(join(dir, f), "utf-8");
    const fm = frontmatter(text);
    if (fm.type !== "Strike") continue;
    const name = f.replace(/\.md$/, "");
    const id = `${slug(fm.discipline || disc)}:${slug(name)}`;
    const b = body(text);
    rows.push({ id, level: fm.level, name, sig: signals(b), mech: mechSentences(b) });
  }
  rows.sort((a, b) => Number(a.level) - Number(b.level));
  console.log(`\n######## ${disc} (${rows.length} strikes) ########`);
  for (const r of rows) {
    const s = r.sig;
    const tags = [
      s.dice.length ? `dice=${s.dice.join("|")}` : "",
      s.flat.length ? `flat=${s.flat.join("|")}` : "",
      s.autoHit ? "AUTOHIT" : "",
      s.threat ? "THREAT" : "",
      s.toHit ? "TOHIT" : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`\n[L${r.level}] ${r.id}  ${tags}`);
    for (const m of r.mech) console.log(`   · ${m}`);
  }
}
