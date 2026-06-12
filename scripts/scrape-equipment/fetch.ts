/**
 * Polite cached fetcher for aonprd.com: 1 request/second, one retry,
 * identifying User-Agent, and a disk cache at scripts/.cache/aonprd/ so
 * re-runs and parser iteration never re-fetch.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CACHE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".cache",
  "aonprd"
);
const USER_AGENT =
  "MiniSheet-Plugin-DataScraper/1.0 (Obsidian plugin; OGL content; contact: whiplord@gmail.com)";
const MIN_GAP_MS = 1000;

let lastFetchAt = 0;
let fetchCount = 0;

export function networkFetchCount(): number {
  return fetchCount;
}

export async function cachedFetch(url: string): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = createHash("sha1").update(url).digest("hex");
  const file = join(CACHE_DIR, `${key}.html`);
  if (existsSync(file)) return readFileSync(file, "utf-8");
  const html = await politeFetch(url);
  writeFileSync(file, html);
  return html;
}

async function politeFetch(url: string, attempt = 0): Promise<string> {
  const wait = lastFetchAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();
  fetchCount++;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 1) throw new Error(`fetch failed: ${url} (${err})`);
    await new Promise((r) => setTimeout(r, 2000));
    return politeFetch(url, attempt + 1);
  }
}
