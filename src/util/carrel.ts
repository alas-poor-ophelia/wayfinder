import type { App, Plugin } from "obsidian";
import type { CarrelApi } from "../types/carrel-api";

// app.plugins is an internal (untyped) Obsidian API; this is the one place
// MiniSheet reaches into it, to detect + consume the Carrel plugin's API.
interface PluginsApi {
  getPlugin(id: string): (Plugin & { api?: CarrelApi }) | null;
}

/** True when the Carrel plugin is installed + loaded. */
export function isCarrelInstalled(app: App): boolean {
  return !!(app as unknown as { plugins?: PluginsApi }).plugins?.getPlugin(
    "carrel",
  );
}

/** Carrel's public API when present + compatible, else null (feature-detect). */
export function getCarrelApi(app: App): CarrelApi | null {
  const plugin = (
    app as unknown as { plugins?: PluginsApi }
  ).plugins?.getPlugin("carrel");
  const api = plugin?.api;
  return api && typeof api.mountReferences === "function" ? api : null;
}
