import { useState } from "preact/hooks";
import type { ComputedCharacter } from "../../calc";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { DEFAULT_PARTY_INV, type PartyInvState } from "../../types/data-file";
import { createDefaultInventory } from "../../types/inventory";
import { InventoryPanel } from "./InventoryPanel";

/**
 * Sidebar inventory (combat GEAR subtab). Filter state is component-local
 * by design: it's ephemeral (legacy kept it in localStorage, not character
 * data) and persisting per-keystroke search would write data.json every
 * debounce tick.
 */
export function InventorySubtab({
  plugin,
  store,
  character,
  computed,
}: {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}) {
  const [filters, setFilters] = useState<PartyInvState>({
    ...DEFAULT_PARTY_INV,
  });
  return (
    <InventoryPanel
      store={store}
      scope={{ kind: "character", id: character.id }}
      inventory={character.inventory ?? createDefaultInventory()}
      variant="sidebar"
      encumbrance={computed.encumbrance}
      customItems={plugin.customItems.items.value}
      filters={filters}
      onFilters={(patch) => setFilters((f) => ({ ...f, ...patch }))}
    />
  );
}
