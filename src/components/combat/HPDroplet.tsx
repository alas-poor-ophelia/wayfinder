import { useRef, useState } from "preact/hooks";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { useOutsideClose } from "../common/useOutsideClose";

interface HPDropletProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  hpMaxEffective: number;
}

/**
 * Blood-droplet HP display. Tap to open the adjust panel (anchored
 * overlay, effects-panel pattern): current/max readout, amount input,
 * Heal / Dmg / Temp actions. Closes on outside pointerdown.
 */
export function HPDroplet({ store, character, hpMaxEffective }: HPDropletProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  useOutsideClose(rootRef, editing, () => setEditing(false));
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
    <div class="ms-hp" ref={rootRef}>
      <button
        class="ms-hp__droplet"
        aria-label="Toggle HP edit mode"
        onClick={() => setEditing(!editing)}
      >
        {hp.current}
        {hp.temp > 0 && <span class="ms-hp__temp">+{hp.temp}</span>}
      </button>
      {editing && (
        <div class="ms-hp__panel">
          <div class="ms-hp__stat">
            {hp.current} / {hpMaxEffective}
            {hp.temp > 0 && ` · +${hp.temp} temp`}
          </div>
          <input
            class="ms-hp__amount"
            type="number"
            min={0}
            value={amount}
            aria-label="HP adjustment amount"
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n)) setAmount(n);
            }}
          />
          <div class="ms-hp__buttons">
            <button class="ms-hp__btn ms-hp__btn--heal" onClick={heal}>
              Heal
            </button>
            <button class="ms-hp__btn ms-hp__btn--damage" onClick={damage}>
              Dmg
            </button>
            <button class="ms-hp__btn ms-hp__btn--temp" onClick={addTemp}>
              Temp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
