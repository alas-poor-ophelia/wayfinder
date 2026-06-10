// Copies the compiled plugin into the MiniSheet Dev vault.
// Build first (`bun run deploy` chains build + this script).

import { copyFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VAULT_PLUGIN_DIR =
  "C:/Users/whipl/OneDrive/Documents/MiniSheet Dev/.obsidian/plugins/minisheet";
const FILES = ["main.js", "styles.css", "manifest.json"];

mkdirSync(VAULT_PLUGIN_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const file of FILES) {
  const src = path.join(repoRoot, file);
  const dest = path.join(VAULT_PLUGIN_DIR, file);
  try {
    copyFileSync(src, dest);
  } catch (err) {
    // OneDrive can briefly lock files mid-sync; retry once.
    if (err.code === "EBUSY" || err.code === "EPERM") {
      await sleep(1000);
      copyFileSync(src, dest);
    } else {
      throw err;
    }
  }
  console.log(`  ${file} -> ${dest}`);
}

console.log("Deployed to vault.");
