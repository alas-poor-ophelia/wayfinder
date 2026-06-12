import { Menu } from "obsidian";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type { QuickActionDef, QuickActionState } from "../../types/quick-actions";
import { Icon } from "../common/Icon";

/**
 * The combat tab's Quick Action bar — data-driven replacement for the old
 * hardcoded CombatToggles. Renders character.quickActions in order (hidden
 * defs skipped), centered flex flow capped at 4 per row (.ms-toggles).
 * Tap cycles stages (off -> 1 -> ... -> off); defs with variants open an
 * Obsidian Menu instead (proper rendering + touch feel at 45px widths).
 */

interface QuickActionsProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

export function QuickActions({ store, character }: QuickActionsProps) {
  const defs = (character.quickActions ?? []).filter((d) => !d.hidden && d.stages.length > 0);
  const stateOf = (def: QuickActionDef): QuickActionState =>
    character.quickActionState?.[def.id] ?? { stage: 0 };

  const openVariantMenu = (def: QuickActionDef, e: MouseEvent) => {
    const state = stateOf(def);
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle("Off")
        .setChecked(state.stage === 0)
        .onClick(() => store.setQuickActionVariant(character.id, def.id, null))
    );
    for (const variant of def.variants ?? []) {
      menu.addItem((item) =>
        item
          .setTitle(variant.name)
          .setChecked(state.stage > 0 && state.variantId === variant.id)
          .onClick(() => store.setQuickActionVariant(character.id, def.id, variant.id))
      );
    }
    menu.showAtMouseEvent(e);
  };

  const button = (def: QuickActionDef) => {
    const state = stateOf(def);
    const on = state.stage > 0;
    const stage = on ? def.stages[Math.min(state.stage, def.stages.length) - 1] : undefined;
    const variant = on ? def.variants?.find((v) => v.id === state.variantId) : undefined;
    const hasVariants = (def.variants?.length ?? 0) > 0;
    const title =
      def.name +
      (stage?.name ? ` — ${stage.name}` : "") +
      (variant ? `: ${variant.name}` : "");
    return (
      <button
        key={def.id}
        class={`ms-toggle${on ? " is-on" : ""}${stage?.emphasized ? " is-double" : ""}`}
        aria-label={def.name}
        aria-pressed={on}
        title={title}
        onClick={(e) =>
          hasVariants
            ? openVariantMenu(def, e as unknown as MouseEvent)
            : store.cycleQuickAction(character.id, def.id)
        }
      >
        <Icon id={variant?.icon ?? stage?.icon ?? def.icon} />
      </button>
    );
  };

  // active variant captions below the grid (legacy weapon-song label)
  const captions = defs
    .filter((def) => (def.variants?.length ?? 0) > 0 && stateOf(def).stage > 0)
    .map((def) => {
      const variant = def.variants!.find((v) => v.id === stateOf(def).variantId);
      return variant ? { def, label: variant.name } : null;
    })
    .filter((c): c is { def: QuickActionDef; label: string } => c !== null);

  if (defs.length === 0) return null;

  return (
    <div class="ms-toggles-area">
      <div class="ms-toggles">{defs.map(button)}</div>
      {captions.map(({ def, label }) => (
        <button
          key={`caption-${def.id}`}
          class="ms-toggle-song-label"
          title={def.name}
          onClick={(e) => openVariantMenu(def, e as unknown as MouseEvent)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
