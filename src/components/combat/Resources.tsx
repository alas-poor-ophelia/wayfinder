import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord, ResourcePool } from "../../types/character";

interface ResourcesProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

export function Tracker({
  pool,
  onSet,
}: {
  pool: { id: string; name: string; current: number; max: number; footer?: string };
  onSet: (value: number) => void;
}) {
  if (pool.max <= 0) return null;
  const pips = [];
  for (let i = 1; i <= pool.max; i++) {
    pips.push(
      <button
        key={i}
        class={`ms-pip${i <= pool.current ? " is-filled" : ""}`}
        aria-label={`${pool.name} ${i} of ${pool.max}`}
        onClick={() => onSet(i === pool.current ? i - 1 : i)}
      />
    );
  }
  return (
    <div class={`ms-resource ms-resource--${pool.id.toLowerCase()}`}>
      <div class="ms-resource__label">{pool.name}</div>
      <div class="ms-resource__pips">{pips}</div>
      {pool.footer && <div class="ms-resource__footer">{pool.footer}</div>}
    </div>
  );
}

export function Resources({ store, character }: ResourcesProps) {
  const pools: { pool: ResourcesProps["character"]["resources"][number]; path: string }[] = [];

  if (character.panache.max > 0) {
    pools.push({
      pool: {
        id: "panache",
        name: "Panache",
        current: character.panache.current,
        max: character.panache.max,
      },
      path: "panache.current",
    });
  }
  character.resources.forEach((pool: ResourcePool, idx: number) => {
    // spell slots render on the spells tab, not in the combat resources crease
    if (pool.id.startsWith("spellSlots")) return;
    pools.push({ pool, path: `resources.${idx}.current` });
  });

  if (pools.length === 0) return null;

  return (
    <details class="ms-resources" open>
      <summary class="ms-resources__title">Resources</summary>
      <div class="ms-resources__list">
        {pools.map(({ pool, path }) => (
          <Tracker
            key={pool.id}
            pool={pool}
            onSet={(value) => store.setCharacterField(character.id, path, value)}
          />
        ))}
      </div>
    </details>
  );
}
