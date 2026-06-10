/**
 * State tools -- drive the standalone MiniSheet plugin through its
 * window.__minisheet bridge (installed by the plugin on load).
 *
 * All payloads travel base64-encoded (see obsidianEvalWithPayload) so
 * cmd.exe quoting never corrupts them.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  obsidianEvalAwait,
  obsidianEvalJson,
  obsidianEvalWithPayload,
} from "../cli-bridge.js";

const TABS = ["combat", "skills", "spells", "rules", "adjustments"];

/** Wrap bridge access so a missing bridge fails with a clear message. */
const BRIDGE_GUARD =
  `if(!window.__minisheet) throw new Error("window.__minisheet bridge not found -- is the minisheet plugin loaded?"); `;

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], ...(isError ? { isError: true } : {}) };
}

export function registerStateTools(server: McpServer): void {
  server.tool(
    "minisheet_get_state",
    "Get the full MiniSheet plugin state (settings, ui, characters) as JSON via the window.__minisheet bridge.",
    {},
    async () => {
      try {
        const state = await obsidianEvalJson(
          BRIDGE_GUARD + `JSON.stringify(window.__minisheet.getState())`
        );
        return textResult(JSON.stringify(state, null, 2));
      } catch (err: any) {
        return textResult(`Failed to get state: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_set_tab",
    `Switch the MiniSheet plugin view to a named tab. Valid tabs: ${TABS.join(", ")}.`,
    {
      tab: z.string().describe(`Tab name: ${TABS.join(", ")}`),
    },
    async ({ tab }) => {
      const name = tab.toLowerCase();
      if (!TABS.includes(name)) {
        return textResult(`Unknown tab "${tab}". Valid tabs: ${TABS.join(", ")}`, true);
      }
      try {
        await obsidianEvalWithPayload(
          BRIDGE_GUARD +
            `window.__minisheet.setTab(__p.tab); JSON.stringify({ok:true})`,
          { tab: name }
        );
        return textResult(`Switched to tab: ${name}`);
      } catch (err: any) {
        return textResult(`Failed to set tab: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_set_field",
    "Set a (dot-path) field on a character record in plugin state, e.g. path 'hp.current', value '42'. Value is parsed as JSON.",
    {
      characterId: z.string().describe("Character id (see minisheet_get_state)"),
      path: z.string().describe("Dot-separated field path, e.g. 'hp.current' or 'toggles.powerAttack'"),
      value: z.string().describe("New value as JSON (e.g. '42', 'true', '\"Flaming\"', '[1,2]')"),
    },
    async ({ characterId, path, value }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        return textResult(`Value is not valid JSON: ${value}`, true);
      }
      try {
        await obsidianEvalWithPayload(
          BRIDGE_GUARD +
            `window.__minisheet.setCharacterField(__p.id, __p.path, __p.value); JSON.stringify({ok:true})`,
          { id: characterId, path, value: parsed }
        );
        return textResult(`Set ${characterId}.${path} = ${value}`);
      } catch (err: any) {
        return textResult(`Failed to set field: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_get_computed",
    "Get computed values (AC, saves, attacks, skills...) for a character from the plugin's calc pipeline.",
    {
      characterId: z
        .string()
        .optional()
        .describe("Character id; omit for the active character"),
    },
    async ({ characterId }) => {
      try {
        const computed = await obsidianEvalWithPayload(
          BRIDGE_GUARD +
            `JSON.stringify(window.__minisheet.getComputed(__p.id || undefined))`,
          { id: characterId ?? null }
        );
        return textResult(JSON.stringify(computed, null, 2));
      } catch (err: any) {
        return textResult(`Failed to get computed values: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_open_sheet",
    "Open (or reveal) the MiniSheet view in the right sidebar.",
    {},
    async () => {
      try {
        await obsidianEvalAwait(
          BRIDGE_GUARD + `await window.__minisheet.openSheet(); return true;`
        );
        return textResult("MiniSheet view opened.");
      } catch (err: any) {
        return textResult(`Failed to open sheet: ${err.message}`, true);
      }
    }
  );
}
