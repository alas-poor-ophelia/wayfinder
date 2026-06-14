/**
 * aonprd metamagic feat scraper (dev-time only — the committed
 * src/data/feats/metamagic.json is the artifact).
 *
 *   bun scripts/scrape-metamagic/index.ts
 *
 * Fetches are rate-limited (1/s) and disk-cached at scripts/.cache/aonprd/
 * (shared with the equipment scraper); delete that directory to force a
 * re-fetch. Output is sorted by id so re-runs produce reviewable diffs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { networkFetchCount } from "../scrape-equipment/fetch";
import { scrapeMetamagic } from "./parse";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "data",
  "feats"
);

const t0 = Date.now();
console.log("scraping metamagic feats...");
const feats = await scrapeMetamagic();
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "metamagic.json"),
  `${JSON.stringify(feats, null, 2)}\n`
);
const variable = feats.filter((f) => f.adj === "var").length;
console.log(`wrote metamagic.json: ${feats.length} feats (${variable} variable adj)`);
console.log(
  `done in ${Math.round((Date.now() - t0) / 1000)}s ` +
    `(${networkFetchCount()} network fetches, rest from cache)`
);
