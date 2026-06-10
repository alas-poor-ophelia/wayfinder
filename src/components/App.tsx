import type { MiniSheetStore } from "../state/store";
import { TABS, TAB_LABELS } from "../constants";
import { ConfigSurface } from "./config/ConfigSurface";

interface AppProps {
  store: MiniSheetStore;
  version: string;
}

export function App({ store, version }: AppProps) {
  const data = store.data.value;
  const active = data.ui.selectedTab;
  const character = store.getCharacter();

  if (data.ui.configOpen && character) {
    return (
      <div class="ms-sheet">
        <ConfigSurface store={store} character={character} />
      </div>
    );
  }

  return (
    <div class="ms-sheet">
      <header class="ms-header">
        <h1 class="ms-title">{character?.name ?? "MiniSheet"}</h1>
        <div class="ms-subtitle">
          v{version} · {__BUILD_STAMP__}
        </div>
        {character && (
          <button
            class="ms-header__gear"
            aria-label="Configure character"
            onClick={() => store.setConfigOpen(true)}
          >
            ⚙
          </button>
        )}
      </header>
      <nav class="ms-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            class={`ms-tab${tab === active ? " is-active" : ""}`}
            onClick={() => store.setTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>
      <main class="ms-content">
        {character ? (
          <div class="ms-placeholder">
            <div>{TAB_LABELS[active]} tab</div>
            <div class="ms-muted">content lands milestone by milestone</div>
          </div>
        ) : (
          <div class="ms-placeholder">
            <div>No character yet</div>
            <div class="ms-muted">
              Run the “MiniSheet: New character” command to create one
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
