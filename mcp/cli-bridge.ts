/**
 * CLI Bridge -- wraps Obsidian CLI (Obsidian.com) for programmatic control.
 *
 * All MiniSheet operations go through `ob eval` which executes JS
 * in the Obsidian window context with access to `app`.
 *
 * Non-eval operations use dedicated CLI commands (screenshot, errors, etc).
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";

const execAsync = promisify(exec);

const OBSIDIAN_CLI = path.join(
  process.env.LOCALAPPDATA || "",
  "Programs",
  "obsidian",
  "Obsidian.com"
);

const VAULT = "MiniSheet Dev";

/** Default timeout for CLI commands (ms) */
const DEFAULT_TIMEOUT = 15_000;

/** Longer timeout for eval (code execution may be slow) */
const EVAL_TIMEOUT = 30_000;

/** Quote a string for shell use */
function shellQuote(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

/**
 * Execute a raw Obsidian CLI command.
 * Uses exec (shell) instead of execFile because bun's execFile
 * doesn't handle .com executables on Windows.
 */
export async function cli(...args: string[]): Promise<string> {
  const cmd = [
    shellQuote(OBSIDIAN_CLI),
    shellQuote(`vault=${VAULT}`),
    ...args.map(shellQuote),
  ].join(" ");

  try {
    const { stdout } = await execAsync(cmd, { timeout: DEFAULT_TIMEOUT });
    return stdout.trim();
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error(
        `Obsidian CLI not found at ${OBSIDIAN_CLI}. Is Obsidian installed?`
      );
    }
    if (err.killed) {
      throw new Error(`CLI command timed out: ${args.join(" ")}`);
    }
    throw new Error(`CLI error: ${err.message}`);
  }
}

/**
 * Evaluate JavaScript in the Obsidian window context.
 * Returns the stringified result.
 */
export async function obsidianEval(code: string): Promise<string> {
  const cmd = [
    shellQuote(OBSIDIAN_CLI),
    shellQuote(`vault=${VAULT}`),
    "eval",
    shellQuote(`code=${code}`),
  ].join(" ");

  const { stdout } = await execAsync(cmd, { timeout: EVAL_TIMEOUT });
  // Obsidian CLI prefixes eval output with "=> "
  const result = stdout.trim();
  return result.startsWith("=> ") ? result.slice(3) : result;
}

/**
 * Evaluate JS and parse the result as JSON.
 */
export async function obsidianEvalJson<T = unknown>(code: string): Promise<T> {
  const raw = await obsidianEval(code);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse eval result as JSON: ${raw.slice(0, 200)}`);
  }
}

/**
 * Evaluate JS with a structured payload, passed base64-encoded to sidestep
 * cmd.exe quoting entirely. The payload is available to `code` as `__p`.
 */
export async function obsidianEvalWithPayload<T = unknown>(
  code: string,
  payload: unknown
): Promise<T> {
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return obsidianEvalJson<T>(payloadPrelude(b64) + code);
}

function payloadPrelude(b64: string): string {
  return (
    `var __p=JSON.parse(new TextDecoder().decode(` +
    `Uint8Array.from(atob("${b64}"),function(c){return c.charCodeAt(0)}))); `
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Evaluate an ASYNC body in Obsidian. Top-level `await` is rejected by the
 * CLI eval context, so the body is wrapped in an async IIFE whose settled
 * result is stashed on `window.__msAsync[id]` and polled for.
 *
 * `body` is the inside of an async function: use `await` and `return` freely.
 * If `payload` is given it's available as `__p` (base64-transported).
 */
export async function obsidianEvalAwait<T = unknown>(
  body: string,
  payload?: unknown,
  timeoutMs = 20_000
): Promise<T> {
  const id = Math.random().toString(36).slice(2);
  const prelude =
    payload === undefined
      ? ""
      : payloadPrelude(
          Buffer.from(JSON.stringify(payload), "utf8").toString("base64")
        );
  const start =
    prelude +
    `window.__msAsync = window.__msAsync || {}; ` +
    `(async function(){ ${body} })().then(` +
    `function(r){ window.__msAsync["${id}"] = JSON.stringify({ok:true, value: r === undefined ? null : r}); }, ` +
    `function(e){ window.__msAsync["${id}"] = JSON.stringify({ok:false, error: String(e && e.message || e)}); }); ` +
    `"started"`;
  await obsidianEval(start);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const raw = await obsidianEval(
      `(function(){ var r = window.__msAsync && window.__msAsync["${id}"]; ` +
        `if (r) delete window.__msAsync["${id}"]; return r || "null"; })()`
    );
    if (raw !== "null") {
      const settled = JSON.parse(raw) as
        | { ok: true; value: T }
        | { ok: false; error: string };
      if (!settled.ok) throw new Error(`Eval (async) failed: ${settled.error}`);
      return settled.value;
    }
    await sleep(250);
  }
  throw new Error(`Eval (async) timed out after ${timeoutMs}ms`);
}

/**
 * Take a screenshot of the current Obsidian window.
 * Returns the path to the saved screenshot.
 */
export async function obsidianScreenshot(outputPath: string): Promise<string> {
  // Obsidian CLI expects a Windows-style path
  const winPath = outputPath.replace(/\//g, "\\");
  await cli("dev:screenshot", `path=${winPath}`);
  return outputPath;
}

/**
 * Get console errors from Obsidian.
 */
export async function obsidianErrors(): Promise<string> {
  return cli("dev:errors");
}

/**
 * Reload a plugin by ID.
 */
export async function obsidianReloadPlugin(pluginId: string): Promise<string> {
  return cli("plugin:reload", `id=${pluginId}`);
}

/**
 * Open a note file in Obsidian.
 */
export async function obsidianOpen(notePath: string): Promise<string> {
  return cli("open", `path=${notePath}`);
}

/**
 * Get Obsidian version (also serves as a connectivity check).
 */
export async function obsidianVersion(): Promise<string> {
  return cli("version");
}
