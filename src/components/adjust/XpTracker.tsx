import type { ComputedCharacter } from "../../calc";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

/**
 * XP region of the campaign-day header (Adjustments tab). Renders the level
 * row, progress bar, and an absolute-edit XP field (redesign, 2026-06).
 *
 * Two real-data states the hardcoded design sample skipped are preserved:
 *  - PCs with no `xp` field get a "Track XP" entry-point.
 *  - A class-vs-XP level mismatch surfaces a gold dot (display-only — class
 *    levels are never auto-changed).
 * Non-PCs render nothing (the day card shows Rest only).
 */
export function XpTracker({
  store,
  character,
  computed,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}) {
  if (character.characterType !== "pc") return null;

  if (character.xp === undefined) {
    return (
      <div class="ms-adjust__xp ms-adjust__xp--untracked">
        <button
          class="ms-adjust__xp-enable"
          onClick={() => store.setCharacterField(character.id, "xp", 0)}
        >
          Track XP
        </button>
      </div>
    );
  }

  const xp = computed.xp;
  if (!xp) return null;

  const fmt = (n: number) => n.toLocaleString("en-US");
  const atMax = xp.level >= 20;
  const toNext = Math.max(0, xp.xpForNextLevel - (character.xp ?? 0));

  return (
    <div class="ms-adjust__xp">
      <div class="ms-xp__lvlrow">
        <span class="ms-xp__lvl">
          LEVEL <b>{xp.level}</b>
          {xp.mismatch && (
            <span
              class="ms-xp__mismatch"
              title={`XP supports level ${xp.level}; classes total ${xp.classLevelTotal}`}
            />
          )}
        </span>
        <span class="ms-xp__pct">
          {atMax ? "Max level" : `${fmt(toNext)} XP to ${xp.nextLevel}`}
        </span>
      </div>

      <div class="ms-xp__bar">
        <span class="ms-xp__fill" style={`width:${xp.progressPercent}%`} />
      </div>

      <div class="ms-xp__nums">
        <span>
          <input
            class="ms-xp__edit"
            type="number"
            min={0}
            value={character.xp ?? 0}
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              store.setCharacterField(
                character.id,
                "xp",
                Number.isNaN(v) ? 0 : Math.max(0, v),
              );
            }}
          />{" "}
          XP
        </span>
        <span>next {fmt(xp.xpForNextLevel)}</span>
      </div>
    </div>
  );
}
