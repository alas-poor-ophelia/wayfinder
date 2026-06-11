import { computeAll } from "../calc";
import { TABS, TAB_LABELS } from "../constants";
import type MiniSheetPlugin from "../main";
import type { MiniSheetStore } from "../state/store";
import { Banner } from "./combat/Banner";
import { CombatTab } from "./combat/CombatTab";
import { AdjustmentsTab } from "./adjust/AdjustmentsTab";
import { ConfigSurface } from "./config/ConfigSurface";
import { RulesTab } from "./rules/RulesTab";
import { SkillsTab } from "./skills/SkillsTab";
import { SpellsTab } from "./spells/SpellsTab";

interface AppProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
}

export function App({ plugin, store }: AppProps) {
  const data = store.data.value;
  const active = data.ui.selectedTab;
  const character = store.getCharacter();

  if (data.ui.configOpen && character) {
    return (
      <div class="ms-sheet">
        <ConfigSurface plugin={plugin} store={store} character={character} />
      </div>
    );
  }

  if (!character) {
    return (
      <div class="ms-sheet">
        <main class="ms-content">
          <div class="ms-placeholder">
            <div>No character yet</div>
            <div class="ms-muted">
              Run the “MiniSheet: New character” command to create one
            </div>
          </div>
        </main>
      </div>
    );
  }

  const master = character.link ? store.getCharacter(character.link.masterId) : null;
  const computed = computeAll(character, master);

  return (
    <div class="ms-sheet ms-sheet--with-banner">
      <Banner plugin={plugin} store={store} character={character} />
      <nav class="ms-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            class={`ms-tab ms-tab--${tab}${tab === active ? " is-active" : ""}`}
            aria-label={TAB_LABELS[tab]}
            onClick={() => store.setTab(tab)}
          />
        ))}
        <button
          class="ms-tab ms-tab--config"
          aria-label="Configure character"
          onClick={() => store.setConfigOpen(true)}
        />
      </nav>
      <main class="ms-content">
        {active === "combat" ? (
          <CombatTab
            plugin={plugin}
            store={store}
            character={character}
            computed={computed}
          />
        ) : active === "skills" ? (
          <SkillsTab computed={computed} />
        ) : active === "adjustments" ? (
          <AdjustmentsTab store={store} character={character} computed={computed} />
        ) : active === "rules" ? (
          <RulesTab plugin={plugin} store={store} character={character} />
        ) : (
          <SpellsTab
            plugin={plugin}
            store={store}
            character={character}
            computed={computed}
          />
        )}
      </main>
    </div>
  );
}
