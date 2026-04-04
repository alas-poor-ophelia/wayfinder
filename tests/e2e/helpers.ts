/**
 * MiniSheet E2E Test Helpers
 *
 * Navigation, rendering wait, and screenshot utilities for MiniSheet's
 * Meta Bind + JS Engine + Datacore component stack.
 *
 * Key setup requirements:
 * - MiniSheet renders in Reading mode only (not Live Preview)
 * - MiniSheet is designed for the sidebar (right pane), not the main editor
 * - MiniSheet is tablet-optimized — we emulate mobile mode for accurate rendering
 * - Dark mode — the MiniSheet CSS is designed around Obsidian's dark theme
 */

import { test } from "obsidian-testing-framework";
import { doWithApp } from "obsidian-testing-framework/util";
import { expect } from "vitest";

export { test, expect, doWithApp };

// ===========================================
// Constants
// ===========================================

/** MiniSheet notes (vault-relative paths) */
export const NOTES = {
  adarinSheet: "MiniSheet/Adarin/Adarin Mini Sheet.md",
  hwayoungSheet: "MiniSheet/Hwayoung/Hwayoung Mini Sheet.md",
} as const;

/** Screenshot output directory */
export const SCREENSHOT_DIR = "tests/e2e/screenshots";

/**
 * Render timeout — MiniSheet needs Meta Bind to resolve all embeds,
 * JS Engine to execute scripts, and Datacore to render JSX components.
 */
const RENDER_TIMEOUT = 30000;

/** Brief settle time after navigation for Obsidian view switch */
const NAV_SETTLE_MS = 1000;

/** Additional settle time for heavy components (spellbook, inventory) */
const HEAVY_RENDER_MS = 5000;

/**
 * Target window dimensions — iPad CSS pixels (landscape).
 * Native resolution is 2388x1668 at 2x Retina, so CSS pixels = 1194x834.
 * Electron doesn't do Retina scaling, so we use CSS pixel dimensions directly.
 */
const WINDOW_WIDTH = 1194;
const WINDOW_HEIGHT = 834;

// ===========================================
// Error Tracking
// ===========================================

/** Collect MiniSheet-related errors from page */
export function setupErrorTracking(page: any): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err: Error) => {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("minisheet") ||
      msg.includes("meta-bind") ||
      msg.includes("js-engine") ||
      msg.includes("datacore")
    ) {
      errors.push(err.message);
    }
  });
  return errors;
}

// ===========================================
// Obsidian Environment Setup
// ===========================================

/**
 * Close any open settings/modal that might be covering the UI.
 * This handles the community plugins settings page that opens on first vault launch.
 */
export async function dismissSettingsIfOpen(page: any): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const modal = page.locator(".modal-container");
    if (await modal.count() > 0 && await modal.first().isVisible()) {
      console.log(`[Setup] Dismissing settings modal (attempt ${attempt + 1})...`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }
}

/**
 * Enable Obsidian's mobile emulation mode.
 *
 * MiniSheet is designed for iPad sidebar use. Obsidian's mobile mode changes
 * UI chrome, toolbar, navigation, and CSS behavior to match tablet rendering.
 * `app.emulateMobile(true)` toggles this on desktop.
 */
export async function enableMobileMode(page: any): Promise<void> {
  const toggled = await doWithApp(page, async (app: any) => {
    if (!app.isMobile) {
      app.emulateMobile(true);
      return true;
    }
    return false;
  });
  if (toggled) {
    console.log("[Setup] Mobile emulation enabled");
    await page.waitForTimeout(1000); // Let UI reflow
  }
}

/**
 * Pin the right sidebar drawer.
 *
 * On mobile/tablet, Obsidian renders the sidebar as a drawer overlay.
 * Pinning it keeps it permanently visible alongside the main pane,
 * which is how MiniSheet is actually used on iPad.
 * The `minimal-pinned-mobile-right-sidebar.css` snippet targets `.is-pinned`.
 */
export async function pinRightDrawer(page: any): Promise<void> {
  // Inject width + scrollbar CSS early so it's ready once pinning takes effect.
  // Target both .is-pinned and plain .mod-right as a safety net.
  // On real iPad, scrollbars are overlay; desktop Electron uses traditional
  // scrollbars that eat ~15-17px of content width, so we hide them.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--mobile-sidebar-width-pinned", "350px");
    const style = document.createElement("style");
    style.id = "minisheet-test-sidebar";
    style.textContent = `
      .workspace-drawer.mod-right.is-pinned,
      .workspace-drawer.mod-right {
        width: 321px !important;
        min-width: 321px !important;
        max-width: 321px !important;
        flex: 0 0 321px !important;
      }
      .workspace-drawer.mod-right * {
        scrollbar-width: none;
      }
      .workspace-drawer.mod-right *::-webkit-scrollbar {
        width: 0;
        height: 0;
      }
    `;
    document.head.appendChild(style);
  });

  // Attempt pinning with retry loop — sometimes Obsidian's drawer isn't
  // ready immediately after mobile emulation is enabled.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await doWithApp(page, async (app: any) => {
      const rightSplit = app.workspace.rightSplit;
      if (!rightSplit) return { pinned: false, reason: "no rightSplit" };

      // Expand if collapsed
      if (rightSplit.collapsed) {
        rightSplit.expand();
      }

      // Pin the drawer
      if (!rightSplit.pinned) {
        if (typeof rightSplit.togglePinned === "function") {
          rightSplit.togglePinned();
        } else {
          rightSplit.pinned = true;
          rightSplit.containerEl?.classList?.add("is-pinned");
        }
      }

      return {
        pinned: rightSplit.pinned ?? false,
        hasClass: rightSplit.containerEl?.classList?.contains("is-pinned") ?? false,
      };
    });

    await page.waitForTimeout(500);

    // Verify the drawer is actually pinned and at the right width
    const verified = await page.evaluate(() => {
      const drawer = document.querySelector(".workspace-drawer.mod-right") as HTMLElement;
      if (!drawer) return { ok: false, reason: "no drawer element" };
      const isPinned = drawer.classList.contains("is-pinned");
      const width = drawer.offsetWidth;
      return { ok: isPinned && Math.abs(width - 321) < 10, isPinned, width };
    });

    if (verified.ok) {
      console.log(`[Setup] Right drawer pinned and verified (${verified.width}px, attempt ${attempt})`);
      return;
    }

    console.warn(
      `[Setup] Pin attempt ${attempt}/${MAX_ATTEMPTS}: pinned=${verified.isPinned}, width=${verified.width}`
    );

    // On retry, force the class onto the DOM element directly
    if (!verified.isPinned) {
      await page.evaluate(() => {
        const drawer = document.querySelector(".workspace-drawer.mod-right");
        drawer?.classList.add("is-pinned");
      });
    }
  }

  console.error("[Setup] Failed to pin drawer after all attempts — screenshots may be wrong width");
}

/**
 * Enable dark mode.
 * MiniSheet CSS is designed around Obsidian's dark theme.
 */
export async function enableDarkMode(page: any): Promise<void> {
  await doWithApp(page, async (app: any) => {
    // Obsidian uses "obsidian" for dark mode, "moonstone" for light
    app.setTheme("obsidian");
  });
  console.log("[Setup] Dark mode enabled");
  await page.waitForTimeout(300);
}

/**
 * Set the Electron window to tablet-like dimensions.
 */
export async function setWindowSize(page: any): Promise<void> {
  try {
    // Use Electron's BrowserWindow API via the page's context
    await page.evaluate(([w, h]: [number, number]) => {
      // @ts-ignore — Electron global
      const { remote, ipcRenderer } = require("electron");
      const win = remote?.getCurrentWindow?.() ?? null;
      if (win) {
        win.setSize(w, h);
      }
    }, [WINDOW_WIDTH, WINDOW_HEIGHT]);
    console.log(`[Setup] Window size set to ${WINDOW_WIDTH}x${WINDOW_HEIGHT}`);
  } catch {
    // Fallback: try viewport sizing
    try {
      await page.setViewportSize({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT });
      console.log(`[Setup] Viewport size set to ${WINDOW_WIDTH}x${WINDOW_HEIGHT}`);
    } catch {
      console.warn("[Setup] Could not set window/viewport size");
    }
  }
  await page.waitForTimeout(300);
}

/**
 * Verify that critical MiniSheet plugins are loaded.
 * Logs status for diagnostics, warns if any are missing.
 */
export async function verifyPlugins(page: any): Promise<void> {
  const status = await doWithApp(page, async (app: any) => {
    const plugins = app.plugins;
    const required = ["js-engine", "obsidian-meta-bind-plugin", "datacore"];
    const results: Record<string, boolean> = {};
    for (const id of required) {
      results[id] = !!plugins.plugins[id]?.manifest;
    }
    return results;
  });
  console.log("[Plugins]", JSON.stringify(status));

  for (const [id, loaded] of Object.entries(status)) {
    if (!loaded) console.warn(`[Plugins] WARNING: ${id} not loaded!`);
  }
}

/**
 * Log the current environment state for debugging.
 */
export async function logEnvironmentState(page: any): Promise<void> {
  const state = await page.evaluate(() => {
    const body = document.body;
    return {
      isMobile: body.classList.contains("is-mobile"),
      isDark: body.classList.contains("theme-dark"),
      isLight: body.classList.contains("theme-light"),
      hasDrawerRight: document.querySelectorAll(".workspace-drawer.mod-right").length,
      hasDrawerPinned: document.querySelectorAll(".workspace-drawer.mod-right.is-pinned").length,
      drawerWidth: (document.querySelector(".workspace-drawer.mod-right") as HTMLElement)?.offsetWidth ?? 0,
      sidebarCssVar: getComputedStyle(document.documentElement).getPropertyValue("--mobile-sidebar-width-pinned").trim(),
      hasSplitRight: document.querySelectorAll(".workspace-split.mod-right-split").length,
      readingViews: document.querySelectorAll(".markdown-reading-view").length,
      sourceViews: document.querySelectorAll(".markdown-source-view").length,
    };
  });
  console.log("[Environment]", JSON.stringify(state));
}

/**
 * Full environment setup — call once at the start of each test.
 *
 * Pre-baked in vault config (appearance.json / app.json):
 *   - Dark mode ("theme": "obsidian")
 *   - Properties hidden ("propertiesInDocument": "hidden")
 *   - Default view mode ("defaultViewMode": "preview")
 *
 * Runtime-only (must be set here):
 *   - Window sizing (Electron API)
 *   - Mobile emulation (app.emulateMobile)
 *   - Drawer pinning + CSS injection (321px width, scrollbar hiding)
 */
export async function setupEnvironment(page: any): Promise<void> {
  await dismissSettingsIfOpen(page);
  await setWindowSize(page);
  await enableMobileMode(page);
  await pinRightDrawer(page);
  await verifyPlugins(page);
}

// ===========================================
// Navigation
// ===========================================

/**
 * Open a note in the right sidebar in reading mode.
 *
 * MiniSheet is designed to render in the sidebar, not the main pane.
 * This opens a right leaf, navigates to the note, and switches to reading mode.
 *
 * Also handles first-run setup: dismisses any settings modals and enables mobile emulation.
 */
export async function navigateToNote(page: any, notePath: string): Promise<void> {
  // Handle first-run modals and enable mobile mode
  await setupEnvironment(page);

  // Open the note in the right sidebar
  await doWithApp(page, async (app: any, filePath: string) => {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!file) {
      throw new Error(`Note not found: ${filePath}`);
    }

    // Open in the right sidebar leaf
    const leaf = app.workspace.getRightLeaf(false);
    await leaf.openFile(file, { state: { mode: "preview" } });

    // Expand the right sidebar if collapsed
    if (app.workspace.rightSplit?.collapsed) {
      app.workspace.rightSplit.expand();
    }

    // Focus the sidebar leaf so keyboard shortcuts target it
    app.workspace.setActiveLeaf(leaf, { focus: true });
  }, notePath);

  await page.waitForTimeout(NAV_SETTLE_MS);

  // Force reading mode via API — more reliable than openFile state option
  await doWithApp(page, async (app: any) => {
    const leaf = app.workspace.activeLeaf;
    if (!leaf) return;

    const viewState = leaf.getViewState();
    if (viewState?.state?.mode !== "preview") {
      await leaf.setViewState({
        ...viewState,
        state: { ...viewState.state, mode: "preview", source: false },
      });
    }
  });
  await page.waitForTimeout(300);

  // Verify reading mode — check via API, not DOM (more reliable in mobile mode)
  const isReading = await doWithApp(page, async (app: any) => {
    const leaf = app.workspace.activeLeaf;
    return leaf?.getViewState()?.state?.mode === "preview";
  });

  if (!isReading) {
    // Last resort: Ctrl+E on the focused leaf
    console.log("[Nav] Reading mode not set via API, toggling with Ctrl+E...");
    // Make sure sidebar leaf is focused first
    await doWithApp(page, async (app: any) => {
      const leaf = app.workspace.activeLeaf;
      if (leaf) app.workspace.setActiveLeaf(leaf, { focus: true });
    });
    await page.waitForTimeout(200);
    await page.keyboard.press("Control+e");
    await page.waitForTimeout(500);
  } else {
    console.log("[Nav] Reading mode confirmed via API");
  }

  // Log final state for debugging
  await logEnvironmentState(page);
}

// ===========================================
// Render Waiting
// ===========================================

/**
 * Wait for the MiniSheet to fully render.
 *
 * MiniSheet rendering involves multiple async phases:
 * 1. Obsidian opens the note and renders markdown
 * 2. Meta Bind resolves INPUT/VIEW fields and embeds
 * 3. JS Engine executes code blocks (AC renderer, attack calculator, etc.)
 * 4. Datacore renders JSX components (XP tracker, inventory)
 *
 * We detect completion by waiting for the markdown reading view
 * and then checking for MiniSheet-specific CSS classes.
 */
export async function waitForSheetRender(page: any, timeout: number = RENDER_TIMEOUT): Promise<void> {
  // First, wait for any reading view to exist (check both desktop and mobile selectors)
  const readingView = page.locator(".markdown-reading-view");
  try {
    await readingView.first().waitFor({ state: "visible", timeout: 10000 });
  } catch {
    // In mobile mode, the view might be inside a drawer — check more broadly
    console.warn("[MiniSheet] Reading view not found via locator, checking via DOM...");
    const hasView = await page.evaluate(() => document.querySelectorAll(".markdown-reading-view").length > 0);
    if (!hasView) {
      throw new Error("Markdown reading view never appeared — is the note open in reading mode?");
    }
  }

  // Check for Datacore "getting ready" / "Indexing vault" state
  const startTime = Date.now();
  let datacoreReadyLogged = false;

  while (Date.now() - startTime < timeout) {
    // Check for "Indexing vault..." banner (Datacore's indexing notification)
    const indexingBanner = page.locator('text=/Indexing vault/i');
    const datacoreReady = page.locator('text=/Datacore is getting ready/i');
    if (await indexingBanner.count() > 0 || await datacoreReady.count() > 0) {
      if (!datacoreReadyLogged) {
        console.log("[MiniSheet] Waiting for Datacore to finish indexing...");
        datacoreReadyLogged = true;
      }
      await page.waitForTimeout(1000);
      continue;
    }

    // Check for Datacore error boxes (loading states, not real errors)
    const errorBox = page.locator(".datacore-error-box");
    if (await errorBox.count() > 0 && await errorBox.first().isVisible()) {
      try {
        const errorText = await errorBox.first().innerText({ timeout: 500 });
        const trimmed = errorText?.trim() || "";
        if (trimmed.includes("View is rendering") || trimmed.includes("Loading") || trimmed.includes("getting ready")) {
          await page.waitForTimeout(500);
          continue;
        }
      } catch {
        // Transient — continue
      }
    }

    // Look for MiniSheet content indicators — meta-bind renders inputs,
    // JS Engine renders calculated values
    const metaBindEl = page.locator(".mb-input, .mb-view, [class*='minisheet'], [class*='ms-']");
    if (await metaBindEl.count() > 0) {
      // Content is rendering — give it a bit more time to finish
      await page.waitForTimeout(1500);
      return;
    }

    await page.waitForTimeout(200);
  }

  // Timed out — capture diagnostic screenshot and continue
  console.warn(`[MiniSheet] Render wait timed out after ${timeout}ms — proceeding with partial render`);
  const screenshotPath = `${SCREENSHOT_DIR}/render-timeout-${Date.now()}.png`;
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[MiniSheet] Diagnostic screenshot: ${screenshotPath}`);
  } catch {
    // Ignore screenshot failure
  }
}

/**
 * Wait for heavy components (spellbook, inventory) that load asynchronously
 * after the initial sheet render.
 */
export async function waitForHeavyComponents(page: any): Promise<void> {
  await page.waitForTimeout(HEAVY_RENDER_MS);
}

// ===========================================
// Screenshot Capture
// ===========================================

/**
 * Get the sidebar container element for scoped screenshots.
 * In mobile mode: `.workspace-drawer.mod-right`
 * In desktop mode: `.workspace-split.mod-right-split`
 */
async function getSidebarLocator(page: any): Promise<any | null> {
  // Mobile mode uses drawers
  const drawer = page.locator(".workspace-drawer.mod-right");
  if (await drawer.count() > 0 && await drawer.first().isVisible()) {
    return drawer.first();
  }

  // Desktop fallback
  const split = page.locator(".workspace-split.mod-right-split, .mod-right-split");
  if (await split.count() > 0 && await split.first().isVisible()) {
    return split.first();
  }

  return null;
}

/**
 * Capture a screenshot of the sidebar content (where MiniSheet renders).
 * Falls back to full-page if the sidebar can't be isolated.
 */
export async function captureFullPage(page: any, name: string): Promise<string> {
  const screenshotPath = `${SCREENSHOT_DIR}/${name}.png`;

  const sidebar = await getSidebarLocator(page);
  if (sidebar) {
    try {
      await sidebar.screenshot({ path: screenshotPath });
      console.log(`[Screenshot] ${screenshotPath} (sidebar)`);
      return screenshotPath;
    } catch {
      // Fall through
    }
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[Screenshot] ${screenshotPath} (full page)`);
  return screenshotPath;
}

/**
 * Capture a screenshot of a specific element by CSS selector.
 * Tries both Playwright locators and page.evaluate for elements inside CodeMirror.
 * Falls back to sidebar screenshot if element not found.
 */
export async function captureElement(
  page: any,
  selector: string,
  name: string,
  opts: { padding?: number; minWidth?: number; minHeight?: number } = {},
): Promise<string> {
  const screenshotPath = `${SCREENSHOT_DIR}/${name}.png`;
  const padding = opts.padding ?? 4;

  // Strategy:
  // 1. Find all matching elements in the sidebar DOM
  // 2. Scroll the first match into view so the group is on-screen
  // 3. Compute the union bounding box of all visible matches
  // 4. Clamp to the scroll container viewport as a safety net
  //
  // This handles both single-element and multi-element captures
  // (e.g. ".normal-ac, .touch-ac, .flatfooted-ac" for the full AC display).
  try {
    // Step 1: Scroll the first matching element into view
    const hasElements = await page.evaluate((sel: string) => {
      const sidebar =
        document.querySelector(".workspace-drawer.mod-right") ??
        document.querySelector(".mod-right-split");
      const root = sidebar ?? document;

      const selectors = sel.split(",").map((s: string) => s.trim());
      for (const s of selectors) {
        const el = root.querySelector(s);
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: "instant", block: "center" });
          return true;
        }
      }
      return false;
    }, selector);

    if (!hasElements) {
      // Retry once after a longer wait — tab content may still be loading
      console.log(`[Screenshot] Elements not found yet for ${name}, retrying after 1500ms...`);
      await page.waitForTimeout(1500);

      const retryHasElements = await page.evaluate((sel: string) => {
        const sidebar =
          document.querySelector(".workspace-drawer.mod-right") ??
          document.querySelector(".mod-right-split");
        const root = sidebar ?? document;
        const selectors = sel.split(",").map((s: string) => s.trim());
        for (const s of selectors) {
          const el = root.querySelector(s);
          if (el) {
            (el as HTMLElement).scrollIntoView({ behavior: "instant", block: "center" });
            return true;
          }
        }
        return false;
      }, selector);

      if (!retryHasElements) {
        console.warn(`[Screenshot] Element not found after retry: ${selector} — capturing sidebar for ${name}`);
        return captureFullPage(page, name);
      }
    }

    // Step 2: Let the scroll settle and any lazy content load
    await page.waitForTimeout(300);

    // Step 3: Compute the union bounding box, clamped to the scroll viewport
    const box = await page.evaluate((sel: string) => {
      const sidebar =
        document.querySelector(".workspace-drawer.mod-right") ??
        document.querySelector(".mod-right-split");
      const root = sidebar ?? document;

      // Get the scroll container's visible bounds to clamp element rects.
      const scrollContainer =
        (sidebar as Element | null)?.querySelector(".view-content") ?? sidebar;
      const viewport = scrollContainer
        ? (scrollContainer as Element).getBoundingClientRect()
        : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let found = 0;

      const selectors = sel.split(",").map((s: string) => s.trim());
      for (const s of selectors) {
        const matches = root.querySelectorAll(s);
        for (const el of matches) {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;

          // Clamp to the scroll container's visible area
          const clampedX = Math.max(rect.x, viewport.x);
          const clampedY = Math.max(rect.y, viewport.y);
          const clampedRight = Math.min(rect.x + rect.width, viewport.x + viewport.width);
          const clampedBottom = Math.min(rect.y + rect.height, viewport.y + viewport.height);

          // Skip elements fully outside the viewport
          if (clampedRight <= clampedX || clampedBottom <= clampedY) continue;

          minX = Math.min(minX, clampedX);
          minY = Math.min(minY, clampedY);
          maxX = Math.max(maxX, clampedRight);
          maxY = Math.max(maxY, clampedBottom);
          found++;
        }
      }

      if (found === 0) return null;
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, count: found };
    }, selector);

    if (box && box.width > 0 && box.height > 0) {
      // Apply minimum dimensions — handles elements whose getBoundingClientRect
      // underreports size (e.g. tables with absolutely-positioned children and
      // font-size:0 causing layout collapse).
      let clipW = box.width;
      let clipH = box.height;
      if (opts.minWidth && clipW < opts.minWidth) {
        console.log(`[Screenshot] Expanding ${name} width from ${Math.round(clipW)}px to minWidth=${opts.minWidth}px`);
        clipW = opts.minWidth;
      }
      if (opts.minHeight && clipH < opts.minHeight) {
        console.log(`[Screenshot] Expanding ${name} height from ${Math.round(clipH)}px to minHeight=${opts.minHeight}px`);
        clipH = opts.minHeight;
      }

      // Warn about suspiciously thin captures (after min-dimension expansion)
      if (clipW < 20 || clipH < 20) {
        console.warn(
          `[Screenshot] WARNING: thin capture for ${name} — ${Math.round(clipW)}x${Math.round(clipH)}px ` +
          `(${box.count} match${box.count > 1 ? "es" : ""}). Consider targeting a parent container or using minWidth/minHeight.`
        );
      }

      await page.screenshot({
        path: screenshotPath,
        clip: {
          x: Math.max(0, box.x - padding),
          y: Math.max(0, box.y - padding),
          width: clipW + padding * 2,
          height: clipH + padding * 2,
        },
      });
      console.log(
        `[Screenshot] ${screenshotPath} — ${Math.round(clipW)}x${Math.round(clipH)}px ` +
        `(${box.count} match${box.count > 1 ? "es" : ""}: ${selector})`
      );
      return screenshotPath;
    }
  } catch (e: any) {
    console.warn(`[Screenshot] evaluate failed for ${selector}: ${e.message}`);
  }

  // Fallback: sidebar screenshot
  console.warn(`[Screenshot] Element not found: ${selector} — capturing sidebar for ${name}`);
  return captureFullPage(page, name);
}

/**
 * Capture a screenshot of an element matched by text content.
 */
export async function captureByText(
  page: any,
  text: string,
  name: string,
  options?: { exact?: boolean; parentSelector?: string },
): Promise<string> {
  const screenshotPath = `${SCREENSHOT_DIR}/${name}.png`;

  try {
    let locator;
    if (options?.parentSelector) {
      locator = page.locator(options.parentSelector).filter({ hasText: text }).first();
    } else {
      locator = page.getByText(text, { exact: options?.exact ?? false }).first();
    }
    await locator.waitFor({ state: "visible", timeout: 5000 });

    const box = await locator.boundingBox();
    if (box) {
      await page.screenshot({
        path: screenshotPath,
        clip: {
          x: Math.max(0, box.x - 10),
          y: Math.max(0, box.y - 10),
          width: box.width + 20,
          height: box.height + 20,
        },
      });
      console.log(`[Screenshot] ${screenshotPath} (text: "${text}")`);
    }
  } catch {
    console.warn(`[Screenshot] Text not found: "${text}" — capturing sidebar for ${name}`);
    return captureFullPage(page, name);
  }

  return screenshotPath;
}

/**
 * Capture a region of the page by scroll position.
 * Useful for sections that don't have unique selectors.
 */
export async function captureRegion(
  page: any,
  clip: { x: number; y: number; width: number; height: number },
  name: string,
): Promise<string> {
  const screenshotPath = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path: screenshotPath, clip });
  console.log(`[Screenshot] ${screenshotPath} (region ${clip.x},${clip.y} ${clip.width}x${clip.height})`);
  return screenshotPath;
}

/**
 * Scroll to a section of the sheet and wait for any lazy content to load.
 * Uses page.evaluate for reliable scrolling inside CodeMirror/mobile views.
 */
export async function scrollToSection(page: any, selector: string): Promise<void> {
  const scrolled = await page.evaluate((sel: string) => {
    const sidebar =
      document.querySelector(".workspace-drawer.mod-right") ??
      document.querySelector(".mod-right-split");
    const root = sidebar ?? document;
    const selectors = sel.split(",").map(s => s.trim());
    for (const s of selectors) {
      const el = root.querySelector(s);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "center" });
        return true;
      }
    }
    return false;
  }, selector);

  if (scrolled) {
    await page.waitForTimeout(500);
  } else {
    console.warn(`[Scroll] Could not find section: ${selector}`);
  }
}

// ===========================================
// Element Waiting (Windrose-style polling)
// ===========================================

/**
 * Wait for a specific element to appear in the sidebar DOM.
 *
 * Adapted from Windrose's `waitForContainer` pattern — polls for the selector
 * with Datacore error detection. Use this for elements rendered by Datacore JSX
 * or lazy Meta Bind embeds that may not exist immediately after tab switches.
 *
 * @returns true if element was found, false if timed out
 */
export async function waitForElement(
  page: any,
  selector: string,
  timeout: number = 10000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const found = await page.evaluate((sel: string) => {
      const sidebar =
        document.querySelector(".workspace-drawer.mod-right") ??
        document.querySelector(".mod-right-split");
      const root = sidebar ?? document;

      const selectors = sel.split(",").map((s: string) => s.trim());
      for (const s of selectors) {
        const el = root.querySelector(s);
        if (el) return true;
      }
      return false;
    }, selector);

    if (found) return true;

    // Check for Datacore loading states — wait through them
    const dcLoading = await page.evaluate(() => {
      const errorBox = document.querySelector(".datacore-error-box");
      if (!errorBox) return false;
      const text = errorBox.textContent?.trim() || "";
      return text.includes("View is rendering") ||
        text.includes("Loading") ||
        text.includes("getting ready");
    });

    if (dcLoading) {
      await page.waitForTimeout(500);
      continue;
    }

    await page.waitForTimeout(200);
  }

  console.warn(`[Wait] Element not found after ${timeout}ms: ${selector}`);
  return false;
}

/**
 * Set a frontmatter field on the currently active note.
 *
 * Uses Obsidian's `processFrontMatter` API to update values.
 * Waits briefly after write for Meta Bind / JS Engine to re-render.
 */
export async function setFrontmatter(
  page: any,
  key: string,
  value: any,
): Promise<void> {
  await doWithApp(page, async (app: any, args: { key: string; value: any }) => {
    const leaf = app.workspace.activeLeaf;
    if (!leaf?.view?.file) throw new Error("No active file");
    const file = leaf.view.file;

    await app.fileManager.processFrontMatter(file, (fm: any) => {
      fm[args.key] = args.value;
    });
  }, { key, value });

  console.log(`[Frontmatter] Set ${key} = ${JSON.stringify(value)}`);
  await page.waitForTimeout(500); // Let bindings re-evaluate
}

/**
 * Set multiple frontmatter fields at once on the currently active note.
 * More efficient than calling setFrontmatter repeatedly.
 */
export async function setMultipleFrontmatter(
  page: any,
  updates: Record<string, any>,
): Promise<void> {
  await doWithApp(page, async (app: any, data: Record<string, any>) => {
    const leaf = app.workspace.activeLeaf;
    if (!leaf?.view?.file) throw new Error("No active file");
    const file = leaf.view.file;

    await app.fileManager.processFrontMatter(file, (fm: any) => {
      for (const [key, value] of Object.entries(data)) {
        fm[key] = value;
      }
    });
  }, updates);

  console.log(`[Frontmatter] Set ${Object.keys(updates).length} values: ${Object.keys(updates).join(", ")}`);
  await page.waitForTimeout(500);
}

// ===========================================
// Callout Expansion
// ===========================================

/**
 * Expand collapsed callouts in the sidebar.
 *
 * Obsidian callouts with fold markers (`+` or `-`) can be collapsed.
 * Collapsed callouts have `.is-collapsed` and a `.callout-fold` toggle.
 *
 * @param options.titleText - Expand callouts whose title contains this text
 * @param options.selector - Expand callouts matching this CSS selector
 * @param options.all - Expand all collapsed callouts
 * @returns Number of callouts expanded
 */
export async function expandCallouts(
  page: any,
  options: { titleText?: string; selector?: string; all?: boolean } = {},
): Promise<number> {
  const expanded = await page.evaluate(
    (opts: { titleText?: string; selector?: string; all?: boolean }) => {
      const sidebar =
        document.querySelector(".workspace-drawer.mod-right") ??
        document.querySelector(".mod-right-split");
      const root = sidebar ?? document;

      const targets: Set<Element> = new Set();

      if (opts.all) {
        root.querySelectorAll(".callout.is-collapsed").forEach((c) => targets.add(c));
      }

      if (opts.selector) {
        root.querySelectorAll(opts.selector).forEach((el) => {
          const callout = el.closest(".callout") ?? el;
          if (callout.classList.contains("is-collapsed")) targets.add(callout);
        });
      }

      if (opts.titleText) {
        root.querySelectorAll(".callout.is-collapsed").forEach((c) => {
          const title = c.querySelector(".callout-title-inner");
          if (title?.textContent?.trim().includes(opts.titleText!)) {
            targets.add(c);
          }
        });
      }

      let count = 0;
      for (const callout of targets) {
        const fold = callout.querySelector(".callout-fold") as HTMLElement;
        if (fold) {
          fold.click();
          count++;
        }
      }
      return count;
    },
    options,
  );

  if (expanded > 0) {
    console.log(`[Callout] Expanded ${expanded} callout(s)`);
    await page.waitForTimeout(300);
  }
  return expanded;
}

/**
 * Capture a screenshot of a callout identified by its title text.
 *
 * Expands the callout if collapsed, scrolls it into view, and captures it.
 * Falls back to sidebar screenshot if the callout isn't found.
 */
export async function captureCalloutByTitle(
  page: any,
  titleText: string,
  name: string,
  opts: { padding?: number } = {},
): Promise<string> {
  const screenshotPath = `${SCREENSHOT_DIR}/${name}.png`;
  const padding = opts.padding ?? 4;

  // Expand if collapsed
  await expandCallouts(page, { titleText });
  await page.waitForTimeout(300);

  // Find the callout, scroll into view, get bounding box
  const box = await page.evaluate((title: string) => {
    const sidebar =
      document.querySelector(".workspace-drawer.mod-right") ??
      document.querySelector(".mod-right-split");
    const root = sidebar ?? document;

    const callouts = root.querySelectorAll(".callout");
    for (const callout of callouts) {
      const titleEl = callout.querySelector(".callout-title-inner");
      if (titleEl?.textContent?.trim().includes(title)) {
        (callout as HTMLElement).scrollIntoView({ behavior: "instant", block: "center" });
        const rect = callout.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
    }
    return null;
  }, titleText);

  if (box && box.width > 0 && box.height > 0) {
    await page.waitForTimeout(300); // Let scroll settle
    // Re-measure after scroll settle
    const finalBox = await page.evaluate((title: string) => {
      const sidebar =
        document.querySelector(".workspace-drawer.mod-right") ??
        document.querySelector(".mod-right-split");
      const root = sidebar ?? document;
      const callouts = root.querySelectorAll(".callout");
      for (const callout of callouts) {
        const titleEl = callout.querySelector(".callout-title-inner");
        if (titleEl?.textContent?.trim().includes(title)) {
          const rect = callout.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }
      }
      return null;
    }, titleText);

    const b = finalBox ?? box;
    await page.screenshot({
      path: screenshotPath,
      clip: {
        x: Math.max(0, b.x - padding),
        y: Math.max(0, b.y - padding),
        width: b.width + padding * 2,
        height: b.height + padding * 2,
      },
    });
    console.log(
      `[Screenshot] ${screenshotPath} — ${Math.round(b.width)}x${Math.round(b.height)}px (callout: "${titleText}")`,
    );
    return screenshotPath;
  }

  console.warn(`[Screenshot] Callout "${titleText}" not found — capturing sidebar for ${name}`);
  return captureFullPage(page, name);
}

// ===========================================
// Interaction Helpers
// ===========================================

/**
 * Main tab bar value mapping.
 * Values correspond to the `data-value` attribute on `.mb-select-input-element`.
 */
const MAIN_TABS: Record<string, string> = {
  "combat": "1",
  "skills": "2",
  "spells": "3",
  "reference": "4",
  "adjustments": "5",
  "settings": "6",
};

/**
 * Click a tab in the MiniSheet tab bar.
 *
 * MiniSheet tabs are Meta Bind select inputs rendered as clickable divs.
 * Main tabs: `.mb-input-wrapper.tabbed.mini-sheet .mb-select-input-element`
 * Sub-tabs: `.mb-input-wrapper.tabbed .mb-select-input-element`
 *
 * Uses page.evaluate for reliable clicking inside CodeMirror/mobile views.
 *
 * @param tabLabel - A main tab name (e.g. "combat", "skills") or sub-tab text ("Adventuring", "Inventory")
 */
export async function clickTab(page: any, tabLabel: string): Promise<void> {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 600;

  // Check if this is a main tab name
  const mainTabValue = MAIN_TABS[tabLabel.toLowerCase()];
  if (mainTabValue) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const clicked = await page.evaluate((val: string) => {
        const el = document.querySelector(`.mb-input-wrapper.tabbed.mini-sheet .mb-select-input-element[data-value="${val}"]`) as HTMLElement;
        if (el) {
          el.click();
          return true;
        }
        return false;
      }, mainTabValue);

      if (!clicked) {
        console.warn(`[Tab] Main tab "${tabLabel}" (value=${mainTabValue}) not found in DOM`);
        return;
      }

      await page.waitForTimeout(300);

      // Verify the tab actually changed by checking data-internal-value
      const currentValue = await page.evaluate(() => {
        const wrapper = document.querySelector(".mb-input-wrapper.tabbed.mini-sheet") as HTMLElement;
        return wrapper?.dataset?.internalValue ?? null;
      });

      if (currentValue === mainTabValue) {
        console.log(`[Tab] Clicked main tab "${tabLabel}" (value=${mainTabValue})${attempt > 1 ? ` — took ${attempt} attempts` : ""}`);
        await page.waitForTimeout(300);
        return;
      }

      console.warn(`[Tab] Main tab click didn't take (attempt ${attempt}/${MAX_RETRIES}): expected value=${mainTabValue}, got ${currentValue}`);
      await page.waitForTimeout(RETRY_DELAY);
    }

    console.error(`[Tab] Main tab "${tabLabel}" failed after ${MAX_RETRIES} attempts`);
    return;
  }

  // Otherwise, try matching by text in any tabbed select (for sub-tabs)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const subClicked = await page.evaluate((label: string) => {
      const elements = document.querySelectorAll(".mb-input-wrapper.tabbed .mb-select-input-element");
      for (const el of elements) {
        if (el.textContent?.includes(label)) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, tabLabel);

    if (!subClicked) {
      console.warn(`[Tab] Could not find sub-tab: "${tabLabel}"`);
      return;
    }

    await page.waitForTimeout(300);

    // For sub-tabs, verify by checking if the clicked element is now selected.
    // Sub-tab wrappers also use data-internal-value but we match by text,
    // so just re-check that the element's parent wrapper reflects the change.
    const verified = await page.evaluate((label: string) => {
      const elements = document.querySelectorAll(".mb-input-wrapper.tabbed .mb-select-input-element");
      for (const el of elements) {
        if (el.textContent?.includes(label)) {
          const wrapper = el.closest(".mb-input-wrapper.tabbed") as HTMLElement;
          const current = wrapper?.dataset?.internalValue;
          const expected = (el as HTMLElement).dataset?.value;
          return current === expected;
        }
      }
      return false;
    }, tabLabel);

    if (verified) {
      console.log(`[Tab] Clicked sub-tab "${tabLabel}"${attempt > 1 ? ` — took ${attempt} attempts` : ""}`);
      await page.waitForTimeout(300);
      return;
    }

    console.warn(`[Tab] Sub-tab click didn't take (attempt ${attempt}/${MAX_RETRIES})`);
    await page.waitForTimeout(RETRY_DELAY);
  }

  console.error(`[Tab] Sub-tab "${tabLabel}" failed after ${MAX_RETRIES} attempts`);
}

/**
 * Toggle a meta-bind toggle by its label text.
 * Uses page.evaluate for reliable interaction.
 */
export async function clickToggle(page: any, label: string): Promise<void> {
  const clicked = await page.evaluate((lbl: string) => {
    // Find toggles by their label text
    const wrappers = document.querySelectorAll(".mb-input-wrapper.mb-input-type-toggle");
    for (const wrapper of wrappers) {
      const parent = wrapper.closest(".mb-input");
      if (parent?.textContent?.includes(lbl)) {
        const toggle = wrapper.querySelector('[role="switch"]') as HTMLElement;
        if (toggle) {
          toggle.click();
          return true;
        }
      }
    }
    return false;
  }, label);

  if (clicked) {
    console.log(`[Toggle] Clicked toggle "${label}"`);
    await page.waitForTimeout(300);
  } else {
    console.warn(`[Toggle] Could not find toggle: "${label}"`);
  }
}
