import type { ComputedCharacter } from "../../calc";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { InventorySubtab } from "../inventory/InventorySubtab";
import { ACShield } from "./ACShield";
import { AttackBlocks } from "./AttackBlocks";
import { CombatToggles } from "./CombatToggles";
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

export function CombatTab({ store, character, computed }: CombatTabProps) {
  // Hwayoung guard: no inventory -> no subtab bar, always render main.
  // Render-time fallback only — never mutate ui.combatSub during render.
  const hasInventory = !!character.inventory;
  const sub = hasInventory
    ? store.data.value.ui.combatSub ?? "main"
    : "main";

  const subtabBar = hasInventory && (
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
        <InventorySubtab store={store} character={character} computed={computed} />
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
      <InitSpeed character={character} computed={computed} />
      <div class="ms-combat__saves">
        <Saves character={character} saves={computed.saves} />
      </div>
      <Resources store={store} character={character} />
      <AttackBlocks store={store} character={character} attacks={computed.attacks} />
      {character.characterType !== "familiar" && (
        <CombatToggles store={store} character={character} />
      )}
    </div>
  );
}
