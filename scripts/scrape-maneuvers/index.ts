/**
 * Build-time Path of War maneuver scraper (dev-time only — the committed
 * markdown notes under the wayfinder-rules repo's maneuvers/ folder are the
 * artifact). Mirrors scripts/scrape-rules: reuses the equipment scraper's
 * polite cached fetch, so re-runs are free and never re-hit the network.
 *
 *   bun scripts/scrape-maneuvers/index.ts --out "<repo>/maneuvers"
 *   bun scripts/scrape-maneuvers/index.ts --only "Golden Lion" --out ./out
 *
 * One markdown note per maneuver: frontmatter carries the mechanical fields the
 * ManeuverIndex reads (discipline, level, type, action, range, target,
 * duration, save, prereqs, skill, source); the body is the full prose. Existing
 * notes are never overwritten (protects hand-edited variants; idempotent).
 *
 * TODO(license): before publishing to the wayfinder-rules repo, copy the OGL
 * text already bundled at LICENSES/OGL-1.0a.txt alongside the notes, and add a
 * "Path of War, (c) 2014, Dreamscarred Press" line to the OGL Section 15 chain
 * (LICENSES/NOTICE.md currently lists Paizo/d20 SRD but not PoW — verify the
 * author line against the printed book). Path-of-War maneuver mechanics are
 * Open Game Content; the notes carry no artwork/trade dress (Product Identity).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cachedFetch, networkFetchCount } from "../scrape-equipment/fetch";
import { slugify } from "../scrape-equipment/common";
import { DISCIPLINES, disciplineUrl, type Discipline } from "./disciplines";
import {
  extractManeuvers,
  extractManeuverDetail,
  maneuverDetailLinks,
  type ManeuverRecord,
} from "./extract";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function yamlEscape(s: string): string {
  return /[:#"'[\]{}]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function noteFile(rec: ManeuverRecord, d: Discipline): string {
  const fm: string[] = ["---", "category: Maneuver"];
  fm.push(`discipline: ${yamlEscape(rec.discipline)}`);
  fm.push(`level: ${rec.level}`);
  fm.push(`type: ${rec.type}`);
  if (rec.action) fm.push(`action: ${yamlEscape(rec.action)}`);
  if (rec.range) fm.push(`range: ${yamlEscape(rec.range)}`);
  if (rec.target) fm.push(`target: ${yamlEscape(rec.target)}`);
  if (rec.duration) fm.push(`duration: ${yamlEscape(rec.duration)}`);
  if (rec.save) fm.push(`save: ${yamlEscape(rec.save)}`);
  if (rec.prerequisites) fm.push(`prerequisites: ${yamlEscape(rec.prerequisites)}`);
  fm.push(`skill: ${yamlEscape(d.skill)}`);
  fm.push("source: Path of War");
  fm.push("---", "");
  return `${fm.join("\n")}# ${rec.name}\n\n${rec.markdown}\n`;
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "-").trim();
}

async function run() {
  const outDir = arg("--out") ?? join("scripts", "scrape-maneuvers", "out");
  const only = arg("--only");
  mkdirSync(outDir, { recursive: true });

  const targets = only
    ? DISCIPLINES.filter((d) => d.name.toLowerCase() === only.toLowerCase())
    : DISCIPLINES;
  if (!targets.length) {
    console.error(`unknown discipline "${only}"`);
    process.exit(1);
  }

  let written = 0;
  let skipped = 0;
  let failed = 0;
  for (const d of targets) {
    let recs: ManeuverRecord[] = [];
    let indexHtml: string;
    try {
      indexHtml = await cachedFetch(disciplineUrl(d));
      recs = extractManeuvers(indexHtml, d.name);
    } catch (err) {
      console.warn(`  ✗ fetch failed: ${d.name} (${err})`);
      failed++;
      continue;
    }
    // "link-only" disciplines (e.g. Black Seraph) inline nothing — the index
    // just lists detail-page links. Fall back to fetching each detail page.
    if (!recs.length) {
      const links = maneuverDetailLinks(indexHtml, slugify(d.name));
      for (const url of links) {
        try {
          const rec = extractManeuverDetail(await cachedFetch(url), d.name);
          if (rec) recs.push(rec);
        } catch (err) {
          console.warn(`    ✗ detail fetch failed: ${url} (${err})`);
        }
      }
    }
    if (!recs.length) {
      console.warn(`  ✗ no maneuvers parsed: ${d.name}`);
      failed++;
      continue;
    }
    const dir = join(outDir, slugify(d.name));
    mkdirSync(dir, { recursive: true });
    for (const rec of recs) {
      const path = join(dir, `${safeName(rec.name)}.md`);
      if (existsSync(path)) {
        skipped++;
        continue;
      }
      writeFileSync(path, noteFile(rec, d), "utf-8");
      written++;
    }
    console.log(`  ✓ ${d.name}: ${recs.length} maneuvers`);
  }

  console.log(
    `\nDone. ${written} written, ${skipped} skipped, ${failed} disciplines failed. ` +
      `${networkFetchCount()} network fetches (rest from cache). -> ${outDir}`,
  );
}

void run();
