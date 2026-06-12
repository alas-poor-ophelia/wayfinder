/**
 * aonprd archetype scraper entry point (dev-time only — the committed JSON
 * under src/data/archetypes/ is the artifact). Class-parameterized:
 *
 *   bun scripts/scrape-archetypes/index.ts Paladin
 *
 * Fetches are rate-limited (1/s) and disk-cached at scripts/.cache/aonprd/
 * (shared with scrape-equipment); delete that directory to force a re-fetch.
 * Output is sorted by id so re-runs produce reviewable diffs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchetypeDef, ClassArchetypeFile } from "../../src/types/archetypes";
import { slugify } from "../scrape-equipment/common";
import { cachedFetch, networkFetchCount } from "../scrape-equipment/fetch";
import { parseArchetypeList } from "./parse-archetype-list";
import { parseArchetypePage } from "./parse-archetype";
import { parseClassTable } from "./parse-class-table";

const BASE = "https://www.aonprd.com/";
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "data",
  "archetypes"
);

const classKey = process.argv[2];
if (!classKey) {
  console.error("usage: bun scripts/scrape-archetypes/index.ts <ClassName>");
  process.exit(1);
}

const t0 = Date.now();

const classHtml = await cachedFetch(
  `${BASE}ClassDisplay.aspx?ItemName=${encodeURIComponent(classKey)}`
);
const baseFeatures = parseClassTable(classHtml, classKey);
console.log(
  `[${classKey}] base features: ${baseFeatures
    .map((f) => `${f.id}@${f.level}`)
    .join(", ")}`
);

const listHtml = await cachedFetch(
  `${BASE}Archetypes.aspx?Class=${encodeURIComponent(classKey)}`
);
const entries = parseArchetypeList(listHtml);
console.log(`[${classKey}] ${entries.length} archetypes listed`);

const archetypes: ArchetypeDef[] = [];
let unmatchedCount = 0;
let refless = 0;
for (const entry of entries) {
  let def: ArchetypeDef | null = null;
  try {
    const html = await cachedFetch(
      `${BASE}ArchetypeDisplay.aspx?FixedName=${encodeURIComponent(entry.fixedName)}`
    );
    def = parseArchetypePage(html, classKey, baseFeatures);
  } catch (err) {
    console.warn(`  [${entry.name}] fetch/parse failed: ${err}`);
  }
  if (!def) {
    console.warn(`  [${entry.name}] no parseable detail block — skipped`);
    continue;
  }
  def.listAffects = entry.affects;

  const unmatched = def.features
    .flatMap((f) => [...f.replaces, ...f.alters])
    .filter((r) => r.unmatched);
  if (unmatched.length > 0) {
    unmatchedCount += unmatched.length;
    console.log(
      `  [${def.id}] unmatched refs: ${unmatched.map((r) => `"${r.raw}"`).join(", ")}`
    );
  }
  const refTotal = def.features.reduce(
    (n, f) => n + f.replaces.length + f.alters.length,
    0
  );
  if (refTotal === 0) {
    refless++;
    console.warn(`  [${def.id}] ZERO parsed replaces/alters refs — review`);
  }
  archetypes.push(def);
}

archetypes.sort((a, b) => a.id.localeCompare(b.id));
const out: ClassArchetypeFile = { classKey, baseFeatures, archetypes };

mkdirSync(OUT_DIR, { recursive: true });
const file = `${slugify(classKey)}.json`;
writeFileSync(join(OUT_DIR, file), `${JSON.stringify(out, null, 2)}\n`);

console.log(
  `wrote ${file}: ${archetypes.length} archetypes, ` +
    `${unmatchedCount} unmatched refs, ${refless} with zero refs, ` +
    `${Math.round((Date.now() - t0) / 1000)}s ` +
    `(${networkFetchCount()} network fetches, rest from cache)`
);
