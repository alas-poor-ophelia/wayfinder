/**
 * Quick Actions surface (config Effects category) — the redesign.
 *
 *  - QuickActionsSection: a tight squircle grid that mirrors the combat-tab
 *    toggles, split into two zones (On your sheet / Bench & library) with
 *    pointer-drag to show/hide/reorder and tap-to-edit. Catalog actions not
 *    yet added render dimmed in the bench; tapping one adds it.
 *  - QAEditor: centered Simple/Advanced modal editing the real QuickActionDef
 *    (stages, variants, effects, gate, requires).
 *  - QAAddModal: catalog picker + "build a custom action" launcher.
 *  - QAWizard: 3-step Name → Effect → Done custom-action builder.
 *
 * All edits write through store.setCharacterField(id, "quickActions", ...);
 * the prototype's flat `spends`/`showFor` map to the real gate/requires.
 */
export { QuickActionsSection } from "./section";
export { QAEditor } from "./editor";
export { QAAddModal, QAWizard } from "./modals";
