// Copies the compiled plugin into the MiniSheet Dev vault.
// Build first (`bun run deploy` chains build + this script).

import { copyFileSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VAULT_PLUGIN_DIR =
  "C:/Users/whipl/OneDrive/Documents/MiniSheet Dev/.obsidian/plugins/minisheet";
const FILES = ["main.js", "styles.css", "manifest.json"];

// Tripwire: deploys only reach other devices (iPad) through Obsidian Sync.
// A vault config reset once silently disabled the sync core plugin and the
// iPad quietly fell behind — warn loudly if that ever happens again.
try {
  const corePlugins = JSON.parse(
    readFileSync(
      path.resolve(VAULT_PLUGIN_DIR, "../..", "core-plugins.json"),
      "utf8"
    )
  );
  if (corePlugins.sync !== true) {
    console.warn(
      "\n  *** WARNING: the vault's Sync core plugin is DISABLED — this deploy" +
        "\n  *** will NOT reach other devices. Re-enable Sync in Obsidian settings" +
        "\n  *** (and keep all syncing options on).\n"
    );
  }
} catch {
  // unreadable config is not a deploy failure; the copy below still matters
}

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
