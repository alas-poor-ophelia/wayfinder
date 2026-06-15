import type MiniSheetPlugin from "../../main";
import { ConfigSurface } from "./ConfigSurface";

/**
 * Config pane root: renders the active character's ConfigSurface and
 * follows the sidebar's active-character selection (signals re-render
 * the pane when it changes).
 */
export function ConfigApp({
  plugin,
  onClose,
}: {
  plugin: MiniSheetPlugin;
  onClose: () => void;
}) {
  const store = plugin.store;
  const character = store.getCharacter();

  if (!character) {
    return (
      <div class="ms-placeholder">
        <div>No character yet</div>
        <div class="ms-muted">
          Run the “Wayfinder: New character” command to create one
        </div>
      </div>
    );
  }

  return (
    <ConfigSurface
      plugin={plugin}
      store={store}
      character={character}
      onClose={onClose}
    />
  );
}
