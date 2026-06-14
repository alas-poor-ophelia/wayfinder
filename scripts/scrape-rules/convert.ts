/**
 * The HTML→markdown converter now lives in src/rules/scrape.ts so it can be
 * shared with the in-Obsidian importer. Re-exported here so the CLI scraper's
 * existing `./convert` imports keep working.
 */
export { extractNote, type ScrapedNote } from "../../src/rules/scrape";
