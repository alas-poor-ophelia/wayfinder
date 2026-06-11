import { CONDITION_NAMES } from "../../calc/conditions";
import { BUFF_DEFS } from "../../data/buffs";
import type { ComputedCharacter } from "../../calc";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { ABILITY_KEYS } from "../../types/character";
import { NumberField } from "../common/fields";
import { XpTracker } from "./XpTracker";

interface AdjustmentsTabProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}

export function AdjustmentsTab({ store, character, computed }: AdjustmentsTabProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);

  const toggleIn = (field: "conditions" | "buffs", name: string) => {
    const list = character[field];
    set(
      field,
      list.includes(name) ? list.filter((x) => x !== name) : [...list, name]
    );
  };

  const rest = () => {
    set("hp.current", Math.min(computed.hpMaxEffective, character.hp.current + computed.totalLevel));
    // panache refills with the rest of the pools (a resources[] entry since v4)
    character.resources.forEach((pool, idx) => {
      set(`resources.${idx}.current`, pool.max);
    });
  };

  return (
    <div class="ms-adjust">
      <button class="ms-adjust__rest" onClick={rest}>
        Rest
      </button>

      <details class="ms-adjust__section">
        <summary class="ms-adjust__title">Conditions</summary>
        <div class="ms-adjust__chips">
          {CONDITION_NAMES.map((name) => (
            <button
              key={name}
              class={`ms-chip${character.conditions.includes(name) ? " is-on" : ""}`}
              onClick={() => toggleIn("conditions", name)}
            >
              {name}
            </button>
          ))}
        </div>
        <NumberField
          label="Negative levels"
          value={character.adjustments.negativeLevels}
          min={0}
          onChange={(v) => set("adjustments.negativeLevels", v)}
        />
      </details>

      <details class="ms-adjust__section">
        <summary class="ms-adjust__title">Buffs</summary>
        <div class="ms-adjust__chips">
          {BUFF_DEFS.map((def) => (
            <button
              key={def.key}
              class={`ms-chip${character.buffs.includes(def.key) ? " is-on" : ""}`}
              onClick={() => toggleIn("buffs", def.key)}
            >
              {def.key}
            </button>
          ))}
          {(character.customBuffs ?? []).map((buff) => (
            <button
              key={buff.id}
              class={`ms-chip ms-chip--custom${character.buffs.includes(buff.id) ? " is-on" : ""}`}
              onClick={() => toggleIn("buffs", buff.id)}
            >
              {buff.name}
            </button>
          ))}
        </div>
      </details>

      <details class="ms-adjust__section" open>
        <summary class="ms-adjust__title">Combat adjustments</summary>
        <div class="ms-adjust__row">
          <NumberField
            label="Attack"
            value={character.adjustments.atk}
            onChange={(v) => set("adjustments.atk", v)}
          />
          <NumberField
            label="Damage"
            value={character.adjustments.dmg}
            onChange={(v) => set("adjustments.dmg", v)}
          />
          <NumberField
            label="AC"
            value={character.adjustments.ac}
            onChange={(v) => set("adjustments.ac", v)}
          />
        </div>
      </details>

      <details class="ms-adjust__section">
        <summary class="ms-adjust__title">Stat adjustments</summary>
        {ABILITY_KEYS.map((key) => (
          <div class="ms-adjust__stat-row" key={key}>
            <span class="ms-adjust__stat-label">{key.toUpperCase()}</span>
            <input
              class="ms-adjust__stat-input"
              type="number"
              placeholder="Other"
              value={character.adjustments.ability[key] ?? ""}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                set(`adjustments.ability.${key}`, v === "" ? 0 : Number(v));
              }}
            />
            <input
              class="ms-adjust__stat-input"
              type="number"
              placeholder="Drain"
              value={character.adjustments.drain[key] ?? ""}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                set(`adjustments.drain.${key}`, v === "" ? 0 : Number(v));
              }}
            />
            <input
              class="ms-adjust__stat-input"
              type="number"
              placeholder="Damage"
              value={character.adjustments.damage[key] ?? ""}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                set(`adjustments.damage.${key}`, v === "" ? 0 : Number(v));
              }}
            />
          </div>
        ))}
      </details>

      <XpTracker store={store} character={character} computed={computed} />
    </div>
  );
}
