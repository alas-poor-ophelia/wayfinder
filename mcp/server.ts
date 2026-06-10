/**
 * MiniSheet MCP Server
 *
 * Provides programmatic control of MiniSheet inside Obsidian.
 * Enables agents to inspect/screenshot the existing MiniSheet UI,
 * switch tabs via frontmatter, and drive the rewrite to Datacore.
 *
 * Usage:
 *   bun run mcp/server.ts        (stdio transport for Claude Code)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerViewTools } from "./tools/view-tools.js";
import { registerFrontmatterTools } from "./tools/frontmatter-tools.js";
import { registerStateTools } from "./tools/state-tools.js";

const server = new McpServer({
  name: "minisheet",
  version: "0.2.0",
});

// Register tool groups
registerViewTools(server);
registerFrontmatterTools(server); // legacy old-sheet tools; retire after fixtures capture
registerStateTools(server);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
