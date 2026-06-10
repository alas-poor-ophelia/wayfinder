import type { ComputedCharacter } from "../../calc";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
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
  return (
    <div class="ms-combat">
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
      <div class="ms-combat__statline">
        <InitSpeed character={character} computed={computed} />
        <EnergyRes character={character} />
      </div>
      <div class="ms-combat__saves">
        <Saves character={character} saves={computed.saves} />
      </div>
      <Resources store={store} character={character} />
      <AttackBlocks store={store} character={character} attacks={computed.attacks} />
      <CombatToggles store={store} character={character} />
    </div>
  );
}
