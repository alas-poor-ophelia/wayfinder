/**
 * Spell tools -- drive the spellbook through window.__minisheet.
 * Same base64 payload transport as state-tools.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { obsidianEvalWithPayload } from "../cli-bridge.js";

const BRIDGE_GUARD =
  `if(!window.__minisheet) throw new Error("window.__minisheet bridge not found -- is the minisheet plugin loaded?"); `;

const ACTIONS = [
  "cast",
  "castSla",
  "setRemaining",
  "setSlaRemaining",
  "selectGlobalMetamagic",
  "addGlobalMetamagic",
  "removeGlobalMetamagic",
  "prepare",
  "castPrepared",
  "removePrep",
  "setCastsRemaining",
  "selectLevelMetamagic",
  "addLevelMetamagic",
  "removeLevelMetamagic",
  "reset",
] as const;

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], ...(isError ? { isError: true } : {}) };
}

export function registerSpellTools(server: McpServer): void {
  server.tool(
    "minisheet_get_spellbook",
    "Get a character's spellbook state (spells, level states, SLAs, metamagic) as JSON.",
    {
      characterId: z
        .string()
        .optional()
        .describe("Character id; omit for the active character"),
    },
    async ({ characterId }) => {
      try {
        const spellbook = await obsidianEvalWithPayload(
          BRIDGE_GUARD +
            `JSON.stringify(window.__minisheet.getSpellbook(__p.id || undefined))`,
          { id: characterId ?? null }
        );
        return textResult(JSON.stringify(spellbook, null, 2));
      } catch (err: any) {
        return textResult(`Failed to get spellbook: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_spell_action",
    `Drive a spellbook mutation. Actions: ${ACTIONS.join(", ")}. ` +
      `Payload fields by action: cast/setRemaining/setCastsRemaining take level (0-9) and value; ` +
      `castSla/setSlaRemaining take slaIndex and value; ` +
      `selectGlobalMetamagic/addGlobalMetamagic/selectLevelMetamagic/addLevelMetamagic take metamagic (and level for the level forms); ` +
      `removeGlobalMetamagic/removeLevelMetamagic take index (and level); ` +
      `prepare takes spellId; castPrepared/removePrep take level (STORAGE level) and prepIndex; ` +
      `reset takes resetMetamagics/resetPreparations/resetSLAs booleans.`,
    {
      characterId: z.string().describe("Character id"),
      action: z.enum(ACTIONS).describe("Spell action name"),
      payload: z
        .string()
        .optional()
        .describe('Action payload as JSON, e.g. \'{"level":1}\' or \'{"slaIndex":2,"value":1}\''),
    },
    async ({ characterId, action, payload }) => {
      let parsed: unknown = {};
      if (payload) {
        try {
          parsed = JSON.parse(payload);
        } catch {
          return textResult(`Payload is not valid JSON: ${payload}`, true);
        }
      }
      try {
        await obsidianEvalWithPayload(
          BRIDGE_GUARD +
            `window.__minisheet.spellAction(__p.id, __p.action, __p.payload); JSON.stringify({ok:true})`,
          { id: characterId, action, payload: parsed }
        );
        return textResult(`Spell action ${action} applied to ${characterId}`);
      } catch (err: any) {
        return textResult(`Failed spell action: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_open_spelldb",
    "Open (or reveal) the main-pane spell database view.",
    {},
    async () => {
      try {
        await obsidianEvalWithPayload(
          BRIDGE_GUARD + `window.__minisheet.openSpellDb(); JSON.stringify({ok:true})`,
          {}
        );
        return textResult("Spell database opened.");
      } catch (err: any) {
        return textResult(`Failed to open spell database: ${err.message}`, true);
      }
    }
  );

  server.tool(
    "minisheet_spelldb_state",
    "Get the spell database view state: filters, target character, total/filtered counts, first-page spell names. Also reports spell index stats.",
    {},
    async () => {
      try {
        const state = await obsidianEvalWithPayload(
          BRIDGE_GUARD +
            `JSON.stringify({ db: window.__minisheet.getSpellDbState(), index: window.__minisheet.spellIndexStats() })`,
          {}
        );
        return textResult(JSON.stringify(state, null, 2));
      } catch (err: any) {
        return textResult(`Failed to get spell DB state: ${err.message}`, true);
      }
    }
  );
}
