import { useState } from "preact/hooks";
import { resolvePool, type ResolvedPool } from "../../state/links";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface ResourcesProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  /** live class-pool maxima (computed.resourceMaxes) — passed through to
   *  resolvePool so class pools render their derived max, not a stored one */
  resourceMaxes: Record<string, number>;
}

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

export function Resources({ store, character, resourceMaxes }: ResourcesProps) {
  const [group, setGroup] = useState<"combat" | "items">("combat");
  // The crease is held permanently open natively (content stays rendered for
  // the grid-rows fold ease); `expanded` is the visual fold, driven from the
  // toggle click. Session-local — matches the old native crease, which always
  // reopened on reload.
  const [expanded, setExpanded] = useState(true);
  const pools: ResolvedPool[] = [];

  character.resources.forEach((pool, idx) => {
    pools.push(resolvePool(store, character, pool, idx, resourceMaxes));
  });

  if (pools.length === 0) return null;

  // The old sheet split the crease into class resources (swirl tab) and
  // item resources (backpack tab); membership now rides on pool.kind.
  const itemPools = pools.filter((p) => p.kind === "item");
  const combatPools = pools.filter((p) => p.kind !== "item");
  const hasBoth = itemPools.length > 0 && combatPools.length > 0;
  const shown = hasBoth ? (group === "items" ? itemPools : combatPools) : pools;

  return (
    <details
      class={`ms-resources${expanded ? " is-open" : ""}`}
      open
      onClick={(e: MouseEvent) => {
        // Only the crease caret toggles; pip/group clicks (inside .ms-fold)
        // fall through to their own handlers.
        const target = e.target;
        if (target instanceof Element && target.closest(".ms-resources__toggle")) {
          e.preventDefault(); // suppress the native <details> open/close
          setExpanded((v) => !v);
        }
      }}
    >
      <summary class="ms-resources__toggle" aria-label="Toggle resources" />
      <div class="ms-fold">
        <div class="ms-fold__inner">
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
        </div>
      </div>
    </details>
  );
}
