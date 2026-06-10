/**
 * View tools -- generic Obsidian operations for MiniSheet.
 * Ping, open note, screenshot, reload plugins, get errors, eval.
 */

import { z } from "zod";
import * as path from "node:path";
import { mkdirSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  obsidianVersion,
  obsidianErrors,
  obsidianOpen,
  obsidianScreenshot,
  obsidianReloadPlugin,
  obsidianEval,
  obsidianEvalAwait,
} from "../cli-bridge.js";

const SCREENSHOT_DIR = path.resolve(
  import.meta.dirname || ".",
  "..",
  "screenshots"
);

/** The standalone plugin's manifest id (= reload id) */
const MINISHEET_PLUGIN_ID = "minisheet";

/** Legacy plugin IDs (the old Meta Bind sheet), reloadable by explicit id */
const LEGACY_PLUGIN_IDS = ["datacore", "obsidian-meta-bind-plugin", "js-engine"];

export function registerViewTools(server: McpServer): void {
  server.tool(
    "minisheet_ping",
    "Check if Obsidian is running. Returns version and active file.",
    {},
    async () => {
      try {
        const version = await obsidianVersion();
        const info = await obsidianEval(
          `JSON.stringify({activeFile: app.workspace.getActiveFile()?.path || null})`
        );
        const parsed = JSON.parse(info);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { obsidian: version, activeFile: parsed.activeFile },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Obsidian not reachable: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "minisheet_open",
    "Open a note by vault-relative path in Obsidian",
    {
      notePath: z
        .string()
        .describe(
          "Vault-relative path to the note (e.g. 'MiniSheet/Adarin/Adarin Mini Sheet.md')"
        ),
    },
    async ({ notePath }) => {
      await obsidianOpen(notePath);
      return {
        content: [{ type: "text" as const, text: `Opened: ${notePath}` }],
      };
    }
  );

  server.tool(
    "minisheet_screenshot",
    "Take a screenshot of the current Obsidian window. Returns the file path.",
    {
      filename: z
        .string()
        .optional()
        .describe(
          "Screenshot filename (default: mcp-screenshot-{timestamp}.png)"
        ),
    },
    async ({ filename }) => {
      const name = filename || `mcp-screenshot-${Date.now()}.png`;
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      const outputPath = path.join(SCREENSHOT_DIR, name);
      await obsidianScreenshot(outputPath);
      return {
        content: [
          { type: "text" as const, text: `Screenshot saved: ${outputPath}` },
        ],
      };
    }
  );

  server.tool(
    "minisheet_reload",
    "Reload the minisheet plugin from disk, verifying via buildStamp that the RUNNING code actually changed. Pass a legacy pluginId (datacore, obsidian-meta-bind-plugin, js-engine) to reload the old stack instead.",
    {
      pluginId: z
        .string()
        .optional()
        .describe(
          "Omit to reload the minisheet plugin (with buildStamp verification). Or a legacy id: datacore, obsidian-meta-bind-plugin, js-engine."
        ),
    },
    async ({ pluginId }) => {
      // Legacy path: plain CLI reload for the old Meta Bind stack.
      if (pluginId && pluginId !== MINISHEET_PLUGIN_ID) {
        if (!LEGACY_PLUGIN_IDS.includes(pluginId)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Unknown plugin id "${pluginId}". Omit for minisheet, or use: ${LEGACY_PLUGIN_IDS.join(", ")}`,
              },
            ],
            isError: true,
          };
        }
        try {
          const result = await obsidianReloadPlugin(pluginId);
          return {
            content: [
              { type: "text" as const, text: `${pluginId}: ${result || "OK"}` },
            ],
          };
        } catch (err: any) {
          return {
            content: [
              { type: "text" as const, text: `${pluginId}: ERROR - ${err.message}` },
            ],
            isError: true,
          };
        }
      }

      // Minisheet path: full unload/load from disk + buildStamp proof.
      // plugin:reload / enable+disable do NOT reliably re-read main.js,
      // and a "successful" reload running stale code is a known failure.
      try {
        const result = await obsidianEvalAwait<{
          before: string | null;
          after: string | null;
        }>(
          `var before = window.__minisheet ? window.__minisheet.buildStamp : null; ` +
            `await app.plugins.unloadPlugin("${MINISHEET_PLUGIN_ID}"); ` +
            `await app.plugins.loadPlugin("${MINISHEET_PLUGIN_ID}"); ` +
            `var after = window.__minisheet ? window.__minisheet.buildStamp : null; ` +
            `return {before: before, after: after};`
        );
        if (!result.after) {
          return {
            content: [
              {
                type: "text" as const,
                text: `RELOAD FAILED: plugin did not come back up (no window.__minisheet after load). Check minisheet_errors.`,
              },
            ],
            isError: true,
          };
        }
        if (result.before !== null && result.after === result.before) {
          return {
            content: [
              {
                type: "text" as const,
                text: `RELOAD STALE: buildStamp unchanged (${result.after}). The running code did NOT change -- did you run \`bun run deploy\` after building?`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Reloaded minisheet. buildStamp ${result.before ?? "(none)"} -> ${result.after} (verified fresh code).`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text" as const, text: `Reload error: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "minisheet_errors",
    "Get console errors from Obsidian (useful for debugging after changes)",
    {},
    async () => {
      const errors = await obsidianErrors();
      return {
        content: [{ type: "text" as const, text: errors }],
      };
    }
  );

  server.tool(
    "minisheet_eval",
    "Evaluate arbitrary JavaScript in the Obsidian window context. Has access to `app`, `window`, etc.",
    {
      code: z
        .string()
        .describe(
          "JavaScript code to evaluate in Obsidian. Has access to app, window, etc."
        ),
    },
    async ({ code }) => {
      try {
        const result = await obsidianEval(code);
        return {
          content: [{ type: "text" as const, text: result || "(no output)" }],
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text" as const, text: `Eval error: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
