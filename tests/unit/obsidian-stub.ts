// Minimal `obsidian` stub for unit tests. Production code imports a few values
// from "obsidian" (Notice, TFile, normalizePath, ...) that have no npm entry
// point — the real module only exists inside the Obsidian app. The unit tests
// exercise pure logic in the default "plugin" storage mode, where these vault
// APIs are never invoked, so cheap stand-ins are enough. vitest.unit.config.ts
// aliases "obsidian" to this file.

export class Notice {
  constructor(_message?: string) {}
  setMessage(): this {
    return this;
  }
  hide(): void {}
}

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";
  parent: { path: string } | null = null;
}

export class TFolder {
  path = "";
  name = "";
  children: unknown[] = [];
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}
