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
import { obsidianEval, obsidianEvalJson } from "../cli-bridge.js";

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
 * Build eval code to set a single frontmatter key on the active file.
 * Includes a settle delay for Meta Bind re-evaluation.
 */
function buildSetFrontmatterCode(key: string, value: unknown): string {
  const valueStr = JSON.stringify(value);
  return `var f=app.workspace.getActiveFile(); if(!f) throw new Error("No active file"); await app.fileManager.processFrontMatter(f, (fm) => { fm[${JSON.stringify(key)}] = ${valueStr}; }); await new Promise(r => setTimeout(r, ${META_BIND_SETTLE_MS})); JSON.stringify({ok: true, key: ${JSON.stringify(key)}, value: ${valueStr}})`;
}

export function registerFrontmatterTools(server: McpServer): void {
  server.tool(
    "minisheet_set_tab",
    `Switch the MiniSheet to a named tab. Valid tabs: ${TAB_NAMES}. Sets the selectedTab frontmatter property and waits for Meta Bind to re-render.`,
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
        await obsidianEval(buildSetFrontmatterCode("selectedTab", tabNum));
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
        await obsidianEval(buildSetFrontmatterCode(key, value));
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
        const code = `var f=app.workspace.getActiveFile(); if(!f) throw new Error("No active file"); var d=${dataStr}; await app.fileManager.processFrontMatter(f, (fm) => { for (var k in d) fm[k] = d[k]; }); await new Promise(r => setTimeout(r, ${META_BIND_SETTLE_MS})); JSON.stringify({ok: true, keys: Object.keys(d)})`;
        await obsidianEval(code);
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
