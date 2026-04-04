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
} from "../cli-bridge.js";

const SCREENSHOT_DIR = path.resolve(
  import.meta.dirname || ".",
  "..",
  "screenshots"
);

/** MiniSheet plugin IDs that can be reloaded */
const PLUGIN_IDS = ["datacore", "obsidian-meta-bind-plugin", "js-engine"];

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
    "Reload one or all MiniSheet plugins (datacore, meta-bind, js-engine)",
    {
      pluginId: z
        .string()
        .optional()
        .describe(
          "Specific plugin ID to reload (datacore, obsidian-meta-bind-plugin, js-engine). Omit to reload all."
        ),
    },
    async ({ pluginId }) => {
      const ids = pluginId ? [pluginId] : PLUGIN_IDS;
      const results: string[] = [];
      for (const id of ids) {
        try {
          const result = await obsidianReloadPlugin(id);
          results.push(`${id}: ${result || "OK"}`);
        } catch (err: any) {
          results.push(`${id}: ERROR - ${err.message}`);
        }
      }
      return {
        content: [{ type: "text" as const, text: results.join("\n") }],
      };
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
