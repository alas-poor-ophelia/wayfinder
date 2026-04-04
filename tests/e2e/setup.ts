/**
 * E2E Test Setup
 *
 * Creates symlinks in the test vault to MiniSheet source files and required plugins.
 * Follows the same pattern as Windrose's test setup.
 */

import { existsSync, symlinkSync, unlinkSync, mkdirSync, cpSync } from "fs";
import path from "path";

const TEST_VAULT = path.resolve(__dirname, "../fixtures/test-vault");
const MAIN_VAULT = "C:\\Users\\whipl\\OneDrive\\Documents\\Absalom";

interface SymlinkConfig {
  source: string;
  target: string;
  type: "file" | "dir";
}

const symlinks: SymlinkConfig[] = [
  // MiniSheet source files — the actual character sheet vault directory
  {
    source: path.join(MAIN_VAULT, "MiniSheet"),
    target: path.join(TEST_VAULT, "MiniSheet"),
    type: "dir",
  },
  // Plugins required by MiniSheet
  {
    source: path.join(MAIN_VAULT, ".obsidian", "plugins", "datacore"),
    target: path.join(TEST_VAULT, ".obsidian", "plugins", "datacore"),
    type: "dir",
  },
  {
    source: path.join(MAIN_VAULT, ".obsidian", "plugins", "obsidian-meta-bind-plugin"),
    target: path.join(TEST_VAULT, ".obsidian", "plugins", "obsidian-meta-bind-plugin"),
    type: "dir",
  },
  {
    source: path.join(MAIN_VAULT, ".obsidian", "plugins", "js-engine"),
    target: path.join(TEST_VAULT, ".obsidian", "plugins", "js-engine"),
    type: "dir",
  },
  {
    source: path.join(MAIN_VAULT, ".obsidian", "plugins", "pexels-banner"),
    target: path.join(TEST_VAULT, ".obsidian", "plugins", "pexels-banner"),
    type: "dir",
  },
  {
    source: path.join(MAIN_VAULT, ".obsidian", "plugins", "obsidian-style-settings"),
    target: path.join(TEST_VAULT, ".obsidian", "plugins", "obsidian-style-settings"),
    type: "dir",
  },
  // CSS snippets — symlink entire directory
  {
    source: path.join(MAIN_VAULT, ".obsidian", "snippets"),
    target: path.join(TEST_VAULT, ".obsidian", "snippets"),
    type: "dir",
  },
  // ITS Theme — MiniSheet is styled against this theme
  {
    source: path.join(MAIN_VAULT, ".obsidian", "themes", "ITS Theme"),
    target: path.join(TEST_VAULT, ".obsidian", "themes", "ITS Theme"),
    type: "dir",
  },
];

export async function setup() {
  console.log("Setting up MiniSheet test vault...");

  // Clean up debug screenshots from previous test runs
  const screenshotsDir = path.resolve(__dirname, "screenshots");
  if (existsSync(screenshotsDir)) {
    const fs = await import("fs/promises");
    try {
      const files = await fs.readdir(screenshotsDir);
      if (files.length > 0) {
        for (const file of files) {
          await fs.unlink(path.join(screenshotsDir, file));
        }
        console.log(`  Cleaned ${files.length} screenshots from previous run`);
      }
    } catch {
      // Ignore errors
    }
  } else {
    mkdirSync(screenshotsDir, { recursive: true });
  }

  // Ensure themes directory exists
  const themesDir = path.join(TEST_VAULT, ".obsidian", "themes");
  if (!existsSync(themesDir)) {
    mkdirSync(themesDir, { recursive: true });
  }

  // Create symlinks
  for (const link of symlinks) {
    // Remove existing symlink/file if present
    if (existsSync(link.target)) {
      try {
        unlinkSync(link.target);
      } catch {
        const fs = await import("fs/promises");
        await fs.rm(link.target, { recursive: true, force: true });
      }
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(link.target);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    // Create symlink
    if (existsSync(link.source)) {
      try {
        if (link.type === "dir") {
          symlinkSync(link.source, link.target, "junction");
        } else {
          symlinkSync(link.source, link.target, "file");
        }
        console.log(`  Linked: ${link.target} -> ${link.source}`);
      } catch (e: any) {
        // Fallback: copy instead of symlink
        console.warn(`  Symlink failed, copying instead: ${e.message}`);
        if (link.type === "dir") {
          cpSync(link.source, link.target, { recursive: true });
        } else {
          cpSync(link.source, link.target);
        }
        console.log(`  Copied: ${link.source} -> ${link.target}`);
      }
    } else {
      console.warn(`  Source not found, skipping: ${link.source}`);
    }
  }

  console.log("MiniSheet test vault setup complete.");
}

export async function teardown() {
  console.log("Cleaning up test artifacts...");

  // Clean up obsidian-test-* temp directories created by obsidian-testing-framework
  const os = await import("os");
  const fs = await import("fs/promises");
  const tempDir = os.tmpdir();

  try {
    const entries = await fs.readdir(tempDir);
    const testDirs = entries.filter(name => name.startsWith("obsidian-test-"));

    if (testDirs.length > 0) {
      console.log(`  Found ${testDirs.length} obsidian-test-* directories to clean`);
      for (const dir of testDirs) {
        try {
          await fs.rm(path.join(tempDir, dir), { recursive: true, force: true });
        } catch {
          // Ignore — may be in use
        }
      }
      console.log("  Cleanup complete");
    }
  } catch {
    // Ignore
  }
}
