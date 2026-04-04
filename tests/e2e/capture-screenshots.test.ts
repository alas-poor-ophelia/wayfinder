/**
 * MiniSheet Screenshot Capture
 *
 * Automated screenshot capture for the UI specification document.
 * Each screenshot corresponds to a 📸 placeholder in minisheet-ui-spec.md.
 *
 * Screenshots are saved to tests/e2e/screenshots/ and organized by spec section.
 *
 * Each test gets a fresh Obsidian instance (via OTF). Runtime setup
 * (mobile emulation, pinning, CSS injection) is handled by navigateToNote().
 * Static config (dark mode, properties hidden) is pre-baked in the vault.
 *
 * Usage: npm run screenshots
 */

import { describe } from "vitest";
import {
  test,
  navigateToNote,
  waitForSheetRender,
  waitForHeavyComponents,
  waitForElement,
  setFrontmatter,
  setMultipleFrontmatter,
  captureFullPage,
  captureElement,
  captureCalloutByTitle,
  expandCallouts,
  clickTab,
  NOTES,
} from "./helpers";

// ===========================================
// §2 — Navigation & Tab System
// ===========================================

describe("§2 Tab Bar", () => {
  test("tab bar states", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);

    // Default state — combat tab should be active
    await captureElement(
      page,
      ".mb-input-wrapper.tabbed.mini-sheet",
      "tab-bar-active-combat",
    );

    // Switch to skills tab and capture
    await clickTab(page, "skills");
    await captureElement(
      page,
      ".mb-input-wrapper.tabbed.mini-sheet",
      "tab-bar-active-skills",
    );
  });
});

// ===========================================
// §3 — Sheet Header
// ===========================================

describe("§3 Sheet Header", () => {
  test("sheet swap button — Adarin", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await captureElement(page, ".mb-button.sheet-swap-btn", "sheet-swap-adarin");
  });

  test("sheet swap button — Hwayoung", async ({ page }) => {
    await navigateToNote(page, NOTES.hwayoungSheet);
    await waitForSheetRender(page);
    await captureElement(page, ".mb-button.sheet-swap-btn", "sheet-swap-hwayoung");
  });

  test("banner — Adarin", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await captureElement(
      page,
      ".callout[data-callout='banner'], .pxl-banner, .obsidian-banner",
      "banner-adarin",
    );
  });

  test("banner — Hwayoung", async ({ page }) => {
    await navigateToNote(page, NOTES.hwayoungSheet);
    await waitForSheetRender(page);
    await captureElement(
      page,
      ".callout[data-callout='banner'], .pxl-banner, .obsidian-banner",
      "banner-hwayoung",
    );
  });
});

// ===========================================
// §4 — Conditions & Notes
// ===========================================

describe("§4 Conditions & Notes", () => {
  test("condition notes — active", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Set conditions to trigger condition notes rendering.
    // The condition-buff-calculator computes conditionEffects,
    // then condition-notes-renderer displays the notes.
    await setMultipleFrontmatter(page, {
      conditions: ["shaken", "fatigued"],
    });
    // Wait for the calculation chain: conditions → conditionEffects → notes render
    await waitForElement(page, ".condition-notes, .condition-icon", 10000);
    await page.waitForTimeout(500);

    await captureElement(
      page,
      ".condition-notes, .condition-icon, .buff-notes, .buff-icon",
      "condition-notes-active",
    );

    // Clean up — remove conditions
    await setMultipleFrontmatter(page, { conditions: [] });
  });
});

// ===========================================
// §5 — AC & Defense
// ===========================================

describe("§5 AC & Defense", () => {
  test("AC shield display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // AC shields — union of all three shields for the full AC display
    await captureElement(
      page,
      ".normal-ac, .touch-ac, .flatfooted-ac",
      "ac-shield-touch-ff",
    );

    // Toggle showCMBCMD on → capture CMB/CMD → toggle back
    await setFrontmatter(page, "showCMBCMD", true);
    await waitForElement(page, ".cmb-display, .cmd-display", 5000);
    await captureElement(
      page,
      ".normal-ac, .cmb-display, .cmd-display",
      "ac-shield-cmb-cmd",
    );
    await setFrontmatter(page, "showCMBCMD", false);
  });
});

// ===========================================
// §6 — HP System
// ===========================================

describe("§6 HP System", () => {
  test("HP display states", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // HP blood droplet — the clip-path shape with HP value.
    // Include .temp-hp for the temp HP overlay area.
    await captureElement(
      page,
      ".blood-droplet-view, .temp-hp",
      "hp-full",
      { padding: 8 },
    );
  });
});

// ===========================================
// §7 — Energy Resistance
// ===========================================

describe("§7 Energy Resistance", () => {
  test("energy resistance display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Energy resistance uses .{type}-res pattern (e.g. .cold-res).
    // The inline element itself is tiny (~30x19px), so capture its parent paragraph
    // which includes proper context with the icon ::before pseudo-element.
    await captureElement(
      page,
      "p:has(.cold-res)",
      "energy-res-cold",
    );
  });
});

// ===========================================
// §8 — Initiative & Speed
// ===========================================

describe("§8 Initiative & Speed", () => {
  test("initiative and speed display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Init and speed — union of both inline views
    await captureElement(
      page,
      ".initiative, .speed",
      "init-speed",
    );
  });
});

// ===========================================
// §9 — Saves
// ===========================================

describe("§9 Saves", () => {
  test("saves display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Saves — union of all three save values
    await captureElement(
      page,
      ".fort-save, .ref-save, .will-save",
      "saves-display",
    );
  });
});

// ===========================================
// §10.1 — Resources
// ===========================================

describe("§10.1 Resources", () => {
  test("combat resources tab", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Expand the resources crease callout if collapsed
    await expandCallouts(page, { selector: '.callout[data-callout="crease"]' });

    // Resources use .tracker-group. Capture all visible ones.
    await captureElement(
      page,
      ".tracker-group",
      "resources-combat-tab",
    );
  });

  test("item resources tab", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Expand the resources crease callout if collapsed
    await expandCallouts(page, { selector: '.callout[data-callout="crease"]' });

    // Switch to item resources sub-tab (👜)
    await page.evaluate(() => {
      const sidebar =
        document.querySelector(".workspace-drawer.mod-right") ??
        document.querySelector(".mod-right-split");
      const root = sidebar ?? document;
      // Find the mini-sheet-resources tab control and click the 2nd option (items)
      const tabs = root.querySelectorAll(
        ".mb-input-wrapper.tabbed.mini-sheet-resources .mb-select-input-element",
      );
      if (tabs.length >= 2) {
        (tabs[1] as HTMLElement).click();
      }
    });
    await page.waitForTimeout(500);

    // Capture the item resources — uses the same .tracker-group class
    await captureElement(
      page,
      ".tracker-group",
      "resources-item-tab",
    );
  });
});

// ===========================================
// §10.2 — Attacks
// ===========================================

describe("§10.2 Attacks", () => {
  test("attack blocks — all expanded", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Attack blocks are [!sheet-atk-block]- callouts (foldable, may be collapsed).
    // Expand all of them so we get an exhaustive view of all attack blocks.
    await expandCallouts(page, {
      selector: '.callout[data-callout="sheet-atk-block"]',
    });
    await page.waitForTimeout(500); // Let content render after expand

    await captureElement(
      page,
      ".callout[data-callout='sheet-atk-block']",
      "attack-waveblade",
    );
  });
});

// ===========================================
// §10.3 — Combat Toggles
// ===========================================

describe("§10.3 Combat Toggles", () => {
  test("combat toggles — all off", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");

    // Ensure all combat toggles are in the OFF state
    await setMultipleFrontmatter(page, {
      powerAttack: false,
      fightingDefensively: false,
      charging: false,
      flanking: false,
      flurryOfBlows: false,
      weaponSong: "Off",
      preciseStrike: false,
      doublePreciseStrike: false,
      smiteEvil: false,
      smiteEvilOutsider: false,
    });
    await page.waitForTimeout(500);

    // Capture union of all table cells in the toggle grid.
    // The table itself has collapsed height (font-size:0 + abs-pos children),
    // but individual td cells have correct positions and dimensions.
    await captureElement(
      page,
      "table:has(.combat-toggle) td",
      "combat-toggles-all-off",
      { padding: 2 },
    );
  });
});

// ===========================================
// §10.4 — Inventory
// ===========================================

describe("§10.4 Inventory", () => {
  test("inventory display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Inventory");

    // Inventory is a Datacore JSX component (InventoryManager.jsx).
    // Wait for it to render, then capture the entire component block.
    await waitForElement(page, ".add-button, .charge-button", 15000);
    await page.waitForTimeout(500); // Let full inventory render settle

    // Capture the Datacore JSX block containing the inventory.
    // On the Inventory sub-tab, this is the only .block-language-datacorejsx visible.
    await captureElement(
      page,
      ".block-language-datacorejsx",
      "inventory-main",
    );
  });
});

// ===========================================
// §10.5 — Skills
// ===========================================

describe("§10.5 Skills", () => {
  test("skills list", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "skills");

    // Skills are callouts with data-callout="skill-item"
    await captureElement(
      page,
      ".callout[data-callout='skill-item']",
      "skills-list",
    );
  });
});

// ===========================================
// §10.6 — Spellbook
// ===========================================

describe("§10.6 Spellbook", () => {
  test("spellbook display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "spells");
    await waitForHeavyComponents(page);

    // Spells are in collapse-clean callouts
    await captureElement(
      page,
      ".callout[data-callout='collapse-clean']",
      "spells-overview",
    );
  });
});

// ===========================================
// §10.7 — Reference
// ===========================================

describe("§10.7 Reference", () => {
  test("reference tab", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "reference");

    // Reference sections are "rules" callouts
    await captureElement(
      page,
      ".callout[data-callout='rules']",
      "reference-panache",
    );
  });
});

// ===========================================
// §10.8 — Rest Button
// ===========================================

describe("§10.8 Rest", () => {
  test("rest button", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "adjustments");

    // Rest button is inside the first (non-foldable) sheet-adjustments callout
    // titled "Adjustment Actions"
    await captureCalloutByTitle(page, "Adjustment Actions", "rest-button");
  });
});

// ===========================================
// §10.9 — Conditions & Buffs Selectors
// ===========================================

describe("§10.9 Conditions & Buffs", () => {
  test("conditions selector", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "adjustments");

    // The Conditions callout is a collapsible [!sheet-adjustments]- with title "Conditions".
    // Expand it and capture.
    await captureCalloutByTitle(page, "Conditions", "conditions-selector");
  });

  test("buffs selector", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "adjustments");

    // The Buffs callout is a collapsible [!sheet-adjustments]- with title "Buffs".
    await captureCalloutByTitle(page, "Buffs", "buffs-selector");
  });
});

// ===========================================
// §10.10 — Combat & Stat Adjustments
// ===========================================

describe("§10.10 Adjustments", () => {
  test("combat adjustments", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "adjustments");

    // Expand and capture the "Combat Adjustments" callout specifically
    await captureCalloutByTitle(page, "Combat Adjustments", "combat-adjustments");
  });

  test("stat adjustments", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "adjustments");

    // Stat Adjustments has unique metadata "stat-adjust" — expand and capture.
    // Use captureCalloutByTitle since the title is "Stat Adjustments"
    await captureCalloutByTitle(page, "Stat Adjustments", "stat-adjustments");
  });
});

// ===========================================
// §10.11 — XP Tracker
// ===========================================

describe("§10.11 XP Tracker", () => {
  test("xp tracker display", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "settings");

    // XP Tracker is a Datacore JSX component (XpTracker.jsx) rendered in a
    // .block-language-datacorejsx block. On the settings tab, it's the only
    // Datacore block and sits above the ability scores blank-box callout.
    // Wait for Datacore to finish rendering, then capture.
    await waitForElement(page, ".block-language-datacorejsx", 15000);
    await page.waitForTimeout(1000); // Let Datacore component fully render

    await captureElement(
      page,
      ".block-language-datacorejsx",
      "xp-tracker",
    );
  });
});

// ===========================================
// §10.12 — Base Stats
// ===========================================

describe("§10.12 Base Stats", () => {
  test("ability score inputs", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "settings");

    // Ability scores are in a [!blank-box|taroca] callout
    await captureElement(
      page,
      ".callout[data-callout='blank-box']",
      "base-stats",
    );
  });
});

// ===========================================
// §10.13 — Config Tab
// ===========================================

describe("§10.13 Config", () => {
  test("config displays", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "settings");
    await captureFullPage(page, "config-class-levels");
  });
});

// ===========================================
// Full Sheet Captures (for reference)
// ===========================================

describe("Full Sheet", () => {
  test("Adarin — combat tab full page", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "combat");
    await clickTab(page, "Adventuring");
    await captureFullPage(page, "adarin-full-combat");
  });

  test("Adarin — skills tab full page", async ({ page }) => {
    await navigateToNote(page, NOTES.adarinSheet);
    await waitForSheetRender(page);
    await clickTab(page, "skills");
    await captureFullPage(page, "adarin-full-skills");
  });

  test("Hwayoung — full page", async ({ page }) => {
    await navigateToNote(page, NOTES.hwayoungSheet);
    await waitForSheetRender(page);
    await captureFullPage(page, "hwayoung-full");
  });
});
