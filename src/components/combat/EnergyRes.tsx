import type { CharacterRecord } from "../../types/character";

export function EnergyRes({ character }: { character: CharacterRecord }) {
  const entries = Object.entries(character.energyRes).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  return (
    <div class="ms-energy">
      {entries.map(([kind, value]) => (
        <span class={`ms-energy__item ms-energy__item--${kind}`} key={kind}>
          {value}
        </span>
      ))}
    </div>
  );
}
