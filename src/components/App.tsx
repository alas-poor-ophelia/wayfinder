import type { MiniSheetStore } from "../state/store";
import { TABS, TAB_LABELS } from "../constants";

interface AppProps {
  store: MiniSheetStore;
  version: string;
}

export function App({ store, version }: AppProps) {
  const data = store.data.value;
  const active = data.ui.selectedTab;
  const character = store.getCharacter();

  return (
    <div class="ms-sheet">
      <header class="ms-header">
        <h1 class="ms-title">{character?.name ?? "MiniSheet"}</h1>
        <div class="ms-subtitle">
          v{version} · {__BUILD_STAMP__}
        </div>
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
        <div class="ms-placeholder">
          <div>{TAB_LABELS[active]} tab</div>
          <div class="ms-muted">scaffold — content lands milestone by milestone</div>
        </div>
      </main>
    </div>
  );
}
