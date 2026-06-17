// Plugin runtime code uses `window.setTimeout` / `window.clearTimeout` for
// Obsidian popout-window compatibility (obsidianmd/prefer-window-timers). The
// unit tests run in Node, which has no `window`, so alias it to globalThis —
// the timer functions there are the same Node implementations.
const g = globalThis as Record<string, unknown>;
g.window ??= globalThis;
