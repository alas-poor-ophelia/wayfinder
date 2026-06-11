import { useState } from "preact/hooks";
import { resolvePool, type ResolvedPool } from "../../state/links";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface ResourcesProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

// The old sheet split the resource crease into class resources (swirl tab)
// and item resources (backpack tab); membership was hardcoded per note.
const ITEM_POOL_IDS = new Set(["plumeOfPanache", "quickrunners", "avengingBracers"]);

export function Tracker({ pool }: { pool: ResolvedPool }) {
  if (pool.max <= 0) return null;
  const pips = [];
  for (let i = 1; i <= pool.max; i++) {
    pips.push(
      <button
        key={i}
        class={`ms-pip${i <= pool.current ? " is-filled" : ""}`}
        aria-label={`${pool.name} ${i} of ${pool.max}`}
        onClick={() => pool.set(i === pool.current ? i - 1 : i)}
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
  const [group, setGroup] = useState<"combat" | "items">("combat");
  const pools: ResolvedPool[] = [];

  if (character.panache.max > 0) {
    pools.push({
      id: "panache",
      name: "Panache",
      current: character.panache.current,
      max: character.panache.max,
      set: (value) => store.setCharacterField(character.id, "panache.current", value),
    });
  }
  character.resources.forEach((pool, idx) => {
    // spell slots render on the spells tab, not in the combat resources crease
    if (pool.id.startsWith("spellSlots")) return;
    pools.push(resolvePool(store, character, pool, idx));
  });

  if (pools.length === 0) return null;

  const itemPools = pools.filter((p) => ITEM_POOL_IDS.has(p.id));
  const combatPools = pools.filter((p) => !ITEM_POOL_IDS.has(p.id));
  const hasBoth = itemPools.length > 0 && combatPools.length > 0;
  const shown = hasBoth ? (group === "items" ? itemPools : combatPools) : pools;

  return (
    <details class="ms-resources" open>
      <summary class="ms-resources__toggle" aria-label="Toggle resources" />
      {hasBoth && (
        <div class="ms-resources__groups">
          <button
            class={`ms-resources__group ms-resources__group--combat${group === "combat" ? " is-active" : ""}`}
            aria-label="Class resources"
            aria-pressed={group === "combat"}
            onClick={() => setGroup("combat")}
          />
          <button
            class={`ms-resources__group ms-resources__group--items${group === "items" ? " is-active" : ""}`}
            aria-label="Item resources"
            aria-pressed={group === "items"}
            onClick={() => setGroup("items")}
          />
        </div>
      )}
      <div class="ms-resources__list">
        {shown.map((pool) => (
          <Tracker key={pool.id} pool={pool} />
        ))}
      </div>
    </details>
  );
}
