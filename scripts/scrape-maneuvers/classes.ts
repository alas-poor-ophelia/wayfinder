/**
 * Path of War class progression scraper (dev-time only — the committed
 * src/data/maneuvers/progression.json is the artifact, BUNDLED mechanics the
 * calc needs at runtime, unlike the downloadable maneuver notes).
 *
 *   bun scripts/scrape-maneuvers/classes.ts
 *
 * Each core initiating class page (Warlord/Warder/Stalker) opens with a
 * progression table:  Level | BAB | Fort | Ref | Will | Special |
 * Maneuvers Known | Maneuvers Readied | Stances. We extract the three
 * maneuver columns indexed by level 1–20. The initiating stat + recovery
 * method are hand-authored in src/data/classes/pathofwar.ts (not in the table).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, type HTMLElement } from "node-html-parser";
import { cachedFetch, networkFetchCount } from "../scrape-equipment/fetch";

const CLASSES = ["warlord", "warder", "stalker"] as const;
const BASE =
  "https://www.d20pfsrd.com/alternative-rule-systems/3rd-party-rules-systems/path-of-war/classes/";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "data",
  "maneuvers",
);

export interface ClassProgression {
  known: number[];
  readied: number[];
  stances: number[];
}

function headerCells(table: HTMLElement): string[] {
  const ths = table.querySelectorAll("th");
  if (ths.length) return ths.map((h) => h.text.trim().toLowerCase());
  const first = table.querySelector("tr");
  return first
    ? first.querySelectorAll("td").map((c) => c.text.trim().toLowerCase())
    : [];
}

function parseProgression(html: string, key: string): ClassProgression | null {
  const table = parse(html)
    .querySelectorAll("table")
    .find((t) => headerCells(t).some((h) => /maneuvers known/.test(h)));
  if (!table) {
    console.warn(`  ✗ ${key}: no progression table found`);
    return null;
  }
  const headers = headerCells(table);
  const col = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const lvlC = col(/^level$/);
  const knC = col(/maneuvers known/);
  const rdC = col(/maneuvers readied/);
  const stC = col(/stances?$/);
  if ([lvlC, knC, rdC, stC].some((c) => c < 0)) {
    console.warn(`  ✗ ${key}: missing a column (${headers.join(" | ")})`);
    return null;
  }

  const known: number[] = [];
  const readied: number[] = [];
  const stances: number[] = [];
  for (const tr of table.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td").map((c) => c.text.trim());
    if (tds.length <= Math.max(lvlC, knC, rdC, stC)) continue;
    const lvl = parseInt(tds[lvlC] ?? "", 10); // "1st" -> 1
    if (!lvl || lvl < 1 || lvl > 20) continue;
    const num = (s: string | undefined) => {
      const n = Number((s ?? "").replace(/[^\d]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    known[lvl - 1] = num(tds[knC]);
    readied[lvl - 1] = num(tds[rdC]);
    stances[lvl - 1] = num(tds[stC]);
  }
  if (known.length !== 20) {
    console.warn(`  ⚠ ${key}: parsed ${known.length}/20 levels`);
  }
  return { known, readied, stances };
}

async function run() {
  const out: Record<string, ClassProgression> = {};
  for (const key of CLASSES) {
    const prog = parseProgression(await cachedFetch(`${BASE}${key}`), key);
    if (!prog) continue;
    out[key] = prog;
    console.log(
      `  ✓ ${key}: known ${prog.known.at(0)}..${prog.known.at(-1)}, ` +
        `readied ${prog.readied.at(0)}..${prog.readied.at(-1)}, ` +
        `stances ${prog.stances.at(0)}..${prog.stances.at(-1)}`,
    );
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, "progression.json");
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    `\nwrote progression.json: ${Object.keys(out).length} classes ` +
      `(${networkFetchCount()} network fetches, rest from cache)`,
  );
}

void run();
