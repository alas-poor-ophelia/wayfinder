export const PLUGIN_ID = "minisheet";
export const VIEW_TYPE_MINISHEET = "minisheet-view";
export const VIEW_TYPE_SPELL_DB = "minisheet-spell-db";
export const VIEW_TYPE_PARTY_INV = "minisheet-party-inventory";
export const VIEW_TYPE_CONFIG = "minisheet-config";
export const VIEW_TYPE_EQUIP_DB = "minisheet-equipment-db";

/** Tab order for the sheet. Config opens its own main-pane view, not a tab. */
export const TABS = ["combat", "skills", "spells", "rules", "adjustments"] as const;
export type TabName = (typeof TABS)[number];

export const TAB_LABELS: Record<TabName, string> = {
  combat: "Combat",
  skills: "Skills",
  spells: "Spells",
  rules: "Rules",
  adjustments: "Adjust",
};
