import type MiniSheetPlugin from "../../main";
import { InventoryPanel } from "../inventory/InventoryPanel";

/**
 * Party inventory root: 2-column layout (currency + filters rail left,
 * summary + list right; single column under ~700px via CSS). Owner
 * choices come from the plugin's characters; the editor's datalist also
 * accepts free text for party members who aren't plugin characters.
 */
export function PartyInventoryApp({ plugin }: { plugin: MiniSheetPlugin }) {
  const store = plugin.store;
  const inventory = store.getPartyInventory();
  const ownerChoices = store.data.value.characters.map((c) => c.name);
  return (
    <InventoryPanel
      store={store}
      scope={{ kind: "party" }}
      inventory={inventory}
      variant="party"
      ownerChoices={ownerChoices}
      filters={store.partyInv()}
      onFilters={(patch) => store.updatePartyInv(patch)}
    />
  );
}
