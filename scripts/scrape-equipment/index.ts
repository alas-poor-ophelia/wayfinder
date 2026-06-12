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
import { scrapeArmorAbilities, scrapeWeaponAbilities } from "./parse-abilities";
import { scrapeArmor } from "./parse-armor";
import { scrapeMagicItems } from "./parse-magic";
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
if (what === "abilities" || what === "all") {
  console.log("scraping weapon/armor special abilities...");
  writeJson("weapon-abilities.json", await scrapeWeaponAbilities());
  writeJson("armor-abilities.json", await scrapeArmorAbilities());
}
if (what === "magic" || what === "all") {
  console.log("scraping magic items (wondrous/rings/rods)...");
  writeJson("magic-items.json", await scrapeMagicItems());
}
if (!["weapons", "armor", "abilities", "magic", "all"].includes(what)) {
  console.error(`unknown target "${what}" — use weapons|armor|abilities|magic|all`);
  process.exit(1);
}

console.log(
  `done in ${Math.round((Date.now() - t0) / 1000)}s ` +
    `(${networkFetchCount()} network fetches, rest from cache)`
);
