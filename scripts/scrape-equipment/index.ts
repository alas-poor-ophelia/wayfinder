/**
 * aonprd equipment scraper entry point (dev-time only — the committed JSON
 * under src/data/equipment/ is the artifact).
 *
 *   bun scripts/scrape-equipment/index.ts [weapons|armor|all]
 *
 * Fetches are rate-limited (1/s) and disk-cached at scripts/.cache/aonprd/;
 * delete that directory to force a re-fetch. Output is sorted by id so
 * re-runs produce reviewable diffs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { networkFetchCount } from "./fetch";
import { scrapeArmor } from "./parse-armor";
import { scrapeWeapons } from "./parse-weapons";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "data",
  "equipment"
);

function writeJson(file: string, data: unknown[]): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, file);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${file}: ${data.length} entries`);
}

const what = process.argv[2] ?? "all";
const t0 = Date.now();

if (what === "weapons" || what === "all") {
  console.log("scraping weapons...");
  writeJson("weapons.json", await scrapeWeapons());
}
if (what === "armor" || what === "all") {
  console.log("scraping armor...");
  writeJson("armor.json", await scrapeArmor());
}
if (!["weapons", "armor", "all"].includes(what)) {
  console.error(`unknown target "${what}" — use weapons|armor|all`);
  process.exit(1);
}

console.log(
  `done in ${Math.round((Date.now() - t0) / 1000)}s ` +
    `(${networkFetchCount()} network fetches, rest from cache)`
);
