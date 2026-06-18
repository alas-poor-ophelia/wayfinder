import { computeAll } from "../calc";
import { TABS, TAB_LABELS } from "../constants";
import { eitrEnabled } from "../types/data-file";
import type MiniSheetPlugin from "../main";
import type { MiniSheetStore } from "../state/store";
import { getCarrelApi } from "../util/carrel";
import { Banner } from "./combat/Banner";
import { CombatTab } from "./combat/CombatTab";
import { AdjustmentsTab } from "./adjust/AdjustmentsTab";
import { BarebonesReferences } from "./rules/BarebonesReferences";
import { CarrelEmbed } from "./rules/CarrelEmbed";
import { SkillsTab } from "./skills/SkillsTab";
import { SpellsTab } from "./spells/SpellsTab";
import { ManeuversTab } from "./maneuvers/ManeuversTab";

interface AppProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
}

export function App({ plugin, store }: AppProps) {
  const data = store.data.value;
  const active = data.ui.selectedTab;
  const character = store.getCharacter();
  const charactersReady = store.charactersReady.value;

  if (!character) {
    return (
      <div class="ms-sheet">
        <main class="ms-content">
          <div class="ms-placeholder">
            {charactersReady ? (
              <>
                <div>No character yet</div>
                <div class="ms-muted">
                  Run the “Wayfinder: New character” command to create one
                </div>
              </>
            ) : (
              // vault storage mode: character file(s) still loading from disk —
              // don't flash the empty state (or let a save clobber the roster)
              <div class="ms-muted">Loading characters…</div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const master = character.link
    ? store.getCharacter(character.link.masterId)
    : null;
  const computed = computeAll(character, master, {
    elephantInTheRoom: eitrEnabled(store.data.value.settings),
  });

  // References tab: use Carrel's board when the user opted in AND Carrel is
  // installed; otherwise fall back to the barebones flat list.
  const carrelApi = data.settings.useCarrelReferences
    ? getCarrelApi(plugin.app)
    : null;

  return (
    <div class="ms-sheet ms-sheet--with-banner">
      <Banner plugin={plugin} store={store} character={character} />
      <nav class="ms-tab-bar">
        {TABS.filter(
          // Maneuvers is a Path of War (opt-in) tab — hidden unless the
          // character is an initiator, like the Spells tab gates its content.
          (tab) => tab !== "maneuvers" || !!character.maneuverbook,
        ).map((tab) => (
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
          onClick={() => void plugin.activateConfigView()}
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
          <AdjustmentsTab
            store={store}
            character={character}
            computed={computed}
          />
        ) : active === "maneuvers" ? (
          <ManeuversTab
            plugin={plugin}
            store={store}
            character={character}
            computed={computed}
          />
        ) : active === "rules" ? (
          carrelApi ? (
            <CarrelEmbed api={carrelApi} characterId={character.id} />
          ) : (
            <BarebonesReferences plugin={plugin} character={character} />
          )
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
