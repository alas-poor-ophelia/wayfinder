import { useState } from "preact/hooks";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface HPDropletProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  hpMaxEffective: number;
}

/** Blood-droplet HP display. Tap to enter edit mode (amount + heal/damage/temp). */
export function HPDroplet({ store, character, hpMaxEffective }: HPDropletProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(0);
  const hp = character.hp;

  const set = (path: string, value: number) =>
    store.setCharacterField(character.id, path, value);

  const heal = () => {
    set("hp.current", Math.min(hpMaxEffective, hp.current + amount));
    setAmount(0);
  };

  const damage = () => {
    const absorbed = Math.min(hp.temp, amount);
    if (absorbed > 0) set("hp.temp", hp.temp - absorbed);
    const overflow = amount - absorbed;
    if (overflow > 0) set("hp.current", Math.max(0, hp.current - overflow));
    setAmount(0);
  };

  const addTemp = () => {
    set("hp.temp", hp.temp + amount);
    setAmount(0);
  };

  return (
    <div class={`ms-hp${editing ? " is-editing" : ""}`}>
      <button
        class="ms-hp__droplet"
        aria-label="Toggle HP edit mode"
        onClick={() => setEditing(!editing)}
      >
        {hp.current}
        {hp.temp > 0 && <span class="ms-hp__temp">+{hp.temp}</span>}
      </button>
      {editing && (
        <div class="ms-hp__controls">
          <input
            class="ms-hp__amount"
            type="number"
            min={0}
            value={amount}
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n)) setAmount(n);
            }}
          />
          <div class="ms-hp__buttons">
            <button class="ms-hp__btn ms-hp__btn--heal" onClick={heal}>+</button>
            <button class="ms-hp__btn ms-hp__btn--damage" onClick={damage}>−</button>
            <button class="ms-hp__btn ms-hp__btn--temp" onClick={addTemp}>T</button>
          </div>
        </div>
      )}
    </div>
  );
}
