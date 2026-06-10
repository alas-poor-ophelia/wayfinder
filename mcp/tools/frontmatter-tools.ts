/**
 * Frontmatter tools -- MiniSheet-specific frontmatter manipulation.
 *
 * MiniSheet UI state is driven by frontmatter properties (via Meta Bind).
 * Setting frontmatter keys like `selectedTab` changes the visible tab.
 * Uses `app.fileManager.processFrontMatter()` -- the same pattern as
 * the existing E2E test helpers.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  obsidianEvalAwait,
  obsidianEvalJson,
} from "../cli-bridge.js";

/** Tab name to frontmatter number mapping */
const TAB_MAP: Record<string, number> = {
  combat: 1,
  skills: 2,
  spells: 3,
  reference: 4,
  adjustments: 5,
  settings: 6,
};

const TAB_NAMES = Object.keys(TAB_MAP).join(", ");

/** Wait time (ms) after frontmatter changes for Meta Bind to re-evaluate */
const META_BIND_SETTLE_MS = 500;

/**
 * Build an async eval body (for obsidianEvalAwait) that sets a single
 * frontmatter key on the active file, with a Meta Bind settle delay.
 */
function buildSetFrontmatterBody(key: string, value: unknown): string {
  const valueStr = JSON.stringify(value);
  return `var f=app.workspace.getActiveFile(); if(!f) throw new Error("No active file"); await app.fileManager.processFrontMatter(f, function(fm) { fm[${JSON.stringify(key)}] = ${valueStr}; }); await new Promise(function(r){ setTimeout(r, ${META_BIND_SETTLE_MS}); }); return {ok: true};`;
}

export function registerFrontmatterTools(server: McpServer): void {
  server.tool(
    "minisheet_legacy_set_tab",
    `LEGACY (old Meta Bind sheet only): switch tab by writing selectedTab frontmatter. Valid tabs: ${TAB_NAMES}. For the standalone plugin use minisheet_set_tab instead.`,
    {
      tab: z
        .string()
        .describe(`Tab name: ${TAB_NAMES}`),
    },
    async ({ tab }) => {
      const tabNum = TAB_MAP[tab.toLowerCase()];
      if (tabNum === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tab "${tab}". Valid tabs: ${TAB_NAMES}`,
            },
          ],
          isError: true,
        };
      }

      try {
        await obsidianEvalAwait(buildSetFrontmatterBody("selectedTab", tabNum));
        return {
          content: [
            {
              type: "text" as const,
              text: `Switched to tab: ${tab} (selectedTab=${tabNum})`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text" as const, text: `Failed to set tab: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "minisheet_get_frontmatter",
    "Read the current frontmatter from the active note as JSON",
    {},
    async () => {
      try {
        const code = `var f=app.workspace.getActiveFile(); if(!f) throw new Error("No active file"); var cache=app.metadataCache.getFileCache(f); JSON.stringify(cache?.frontmatter || {})`;
        const fm = await obsidianEvalJson(code);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(fm, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to read frontmatter: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "minisheet_set_frontmatter",
    "Set a single frontmatter key/value on the active note. Waits for Meta Bind to re-render.",
    {
      key: z.string().describe("Frontmatter key to set"),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .describe("Value to set"),
    },
    async ({ key, value }) => {
      try {
        await obsidianEvalAwait(buildSetFrontmatterBody(key, value));
        return {
          content: [
            {
              type: "text" as const,
              text: `Set frontmatter: ${key} = ${JSON.stringify(value)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to set frontmatter: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "minisheet_set_frontmatter_batch",
    "Set multiple frontmatter keys atomically on the active note. Waits for Meta Bind to re-render.",
    {
      data: z
        .string()
        .describe(
          'JSON object of key-value pairs to set (e.g. \'{"selectedTab": 3, "selectedAdventuringTab": 1}\')'
        ),
    },
    async ({ data: dataJson }) => {
      try {
        const data: Record<string, string | number | boolean> = JSON.parse(dataJson);
        const dataStr = JSON.stringify(data);
        const body = `var f=app.workspace.getActiveFile(); if(!f) throw new Error("No active file"); var d=${dataStr}; await app.fileManager.processFrontMatter(f, function(fm) { for (var k in d) fm[k] = d[k]; }); await new Promise(function(r){ setTimeout(r, ${META_BIND_SETTLE_MS}); }); return {ok: true};`;
        await obsidianEvalAwait(body);
        return {
          content: [
            {
              type: "text" as const,
              text: `Set frontmatter: ${Object.entries(data).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to set frontmatter: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
