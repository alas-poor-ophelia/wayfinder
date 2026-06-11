import type { ComponentChildren } from "preact";
import {
  sectionKey,
  setSectionCollapsed,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

/**
 * Port of the legacy collapse-clean callout: borderless section with a
 * centered Norwester title and a fold caret, collapse state persisted in
 * spellbook.sectionCollapsed under the legacy calloutStates key scheme.
 */
export function CollapseSection({
  store,
  character,
  title,
  contextKey = "",
  defaultCollapsed = false,
  variant,
  children,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  title: string;
  contextKey?: string;
  defaultCollapsed?: boolean;
  /** "sub" = the smaller h6-sized variant (legacy collapse-clean|sub) */
  variant?: "sub";
  children: ComponentChildren;
}) {
  const key = sectionKey(title, contextKey);
  const stored = character.spellbook?.sectionCollapsed[key];
  const collapsed = stored ?? defaultCollapsed;

  return (
    <section
      class={`ms-spellbook-callout${variant ? ` ms-spellbook-callout--${variant}` : ""}${collapsed ? " is-collapsed" : ""}`}
    >
      <button
        class="ms-spellbook-callout__title"
        aria-expanded={!collapsed}
        onClick={() => setSectionCollapsed(store, character, key, !collapsed)}
      >
        <span class="ms-spellbook-callout__title-text">{title}</span>
        <svg
          class="ms-spellbook-callout__fold"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {!collapsed && <div class="ms-spellbook-callout__content">{children}</div>}
    </section>
  );
}
