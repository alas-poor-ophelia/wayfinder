/**
 * Build-time rules scraper. Fetches the curated manifest (or a single --url)
 * from aonprd.com, converts each page to a markdown note, and writes it into a
 * target Reference folder. Reuses the equipment scraper's polite cached fetch,
 * so re-runs are free and never re-hit the network.
 *
 *   bun scripts/scrape-rules/index.ts --out "<vault>/Rules"
 *   bun scripts/scrape-rules/index.ts --url "https://www.aonprd.com/Rules.aspx?Name=Trip&Category=Combat" --out ./out
 *
 * Existing notes are never overwritten (protects hand-authored notes and makes
 * re-runs idempotent).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cachedFetch, networkFetchCount } from "../scrape-equipment/fetch";
import { extractNote, type ScrapedNote } from "./convert";
import { MANIFEST, ruleUrl, type RuleSource } from "./manifest";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function yamlEscape(s: string): string {
  return /[:#"']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function noteFile(note: ScrapedNote): string {
  const fm = ["---", `category: ${yamlEscape(note.category)}`];
  if (note.source) fm.push(`source: ${yamlEscape(note.source)}`);
  if (note.summary) fm.push(`summary: ${yamlEscape(note.summary)}`);
  fm.push("---", "");
  return `${fm.join("\n")}# ${note.title}\n\n${note.markdown}\n`;
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "-").trim();
}

async function run() {
  const outDir = arg("--out") ?? join("scripts", "scrape-rules", "out");
  mkdirSync(outDir, { recursive: true });

  const single = arg("--url");
  const sources: { url: string; src?: RuleSource }[] = single
    ? [{ url: single }]
    : MANIFEST.map((src) => ({ url: ruleUrl(src), src }));

  let written = 0;
  let skipped = 0;
  let failed = 0;
  for (const { url, src } of sources) {
    let note: ScrapedNote | null = null;
    try {
      note = extractNote(await cachedFetch(url), src?.name);
    } catch (err) {
      console.warn(`  ✗ fetch failed: ${src?.name ?? url} (${err})`);
      failed++;
      continue;
    }
    if (!note || !note.markdown) {
      console.warn(`  ✗ no content: ${src?.name ?? url}`);
      failed++;
      continue;
    }
    // honor the manifest's intended category over a noisy breadcrumb
    if (src) note.category = src.category;
    const path = join(outDir, `${safeName(note.title)}.md`);
    if (existsSync(path)) {
      console.log(`  · skip (exists): ${note.title}`);
      skipped++;
      continue;
    }
    writeFileSync(path, noteFile(note), "utf-8");
    console.log(`  ✓ ${note.title}  [${note.category}]  ${note.markdown.length}c`);
    written++;
  }

  console.log(
    `\nDone. ${written} written, ${skipped} skipped, ${failed} failed. ` +
      `${networkFetchCount()} network fetches (rest from cache). -> ${outDir}`
  );
}

void run();
