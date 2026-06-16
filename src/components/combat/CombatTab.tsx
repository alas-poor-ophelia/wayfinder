import type { ComputedCharacter } from "../../calc";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { InventorySubtab } from "../inventory/InventorySubtab";
import { ACShield } from "./ACShield";
import { AttackBlocks } from "./AttackBlocks";
import { ClassCounts } from "./ClassCounts";
import { QuickActions } from "./QuickActions";
import { ConditionNotes } from "./ConditionNotes";
import { EnergyRes } from "./EnergyRes";
import { HPDroplet } from "./HPDroplet";
import { InitSpeed } from "./InitSpeed";
import { Resources } from "./Resources";
import { Saves } from "./Saves";

interface CombatTabProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}

export function CombatTab({
  plugin,
  store,
  character,
  computed,
}: CombatTabProps) {
  const sub = store.data.value.ui.combatSub ?? "main";

  const subtabBar = (
    <nav class="ms-subtab-bar">
      <button
        class={`ms-subtab${sub === "main" ? " is-active" : ""}`}
        onClick={() => store.setCombatSub("main")}
      >
        Main
      </button>
      <button
        class={`ms-subtab${sub === "inventory" ? " is-active" : ""}`}
        onClick={() => store.setCombatSub("inventory")}
      >
        Gear
      </button>
    </nav>
  );

  if (sub === "inventory") {
    return (
      <div class="ms-combat">
        {subtabBar}
        <InventorySubtab
          plugin={plugin}
          store={store}
          character={character}
          computed={computed}
        />
      </div>
    );
  }

  return (
    <div class="ms-combat">
      {subtabBar}
      <ConditionNotes
        store={store}
        character={character}
        effects={computed.conditionEffects}
      />
      <div class="ms-combat__vitals">
        <ACShield
          store={store}
          character={character}
          ac={computed.ac}
          flatFooted={computed.conditionEffects.flatFooted}
        />
        <HPDroplet
          store={store}
          character={character}
          hpMaxEffective={computed.hpMaxEffective}
        />
      </div>
      <div class="ms-combat__energy">
        <EnergyRes character={character} />
      </div>
      <InitSpeed computed={computed} />
      <div class="ms-combat__saves">
        <Saves
          character={character}
          saves={computed.saves}
          racialNotes={computed.racial?.saveNotes}
        />
      </div>
      {computed.modifierReport && (
        <details class="ms-modifier-notes">
          <summary class="ms-modifier-notes__title">
            Modifiers (
            {computed.modifierReport.conditional.length +
              computed.modifierReport.suppressed.length}
            )
          </summary>
          {computed.modifierReport.conditional.map((note) => (
            <div key={note} class="ms-modifier-notes__line">
              {note}
            </div>
          ))}
          {computed.modifierReport.suppressed.map((note) => (
            <div key={note} class="ms-modifier-notes__line is-suppressed">
              {note} — suppressed
            </div>
          ))}
        </details>
      )}
      <Resources
        store={store}
        character={character}
        resourceMaxes={computed.resourceMaxes}
        resourceFooters={computed.resourceFooters}
      />
      <ClassCounts featureCounts={computed.featureCounts} />
      <AttackBlocks
        store={store}
        character={character}
        attacks={computed.attacks}
        profiles={computed.attackProfiles}
      />
      {character.characterType !== "familiar" && (
        <QuickActions store={store} character={character} />
      )}
    </div>
  );
}
