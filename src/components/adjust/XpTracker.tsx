import { useState } from "preact/hooks";
import type { ComputedCharacter } from "../../calc";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

/**
 * XP tracker — port of the legacy Datacore XpTracker.jsx (lived on the old
 * sheet's Settings tab; relocated to the Adjustments tab). PCs only.
 * Without an `xp` field the character shows a "Track XP" entry point; the
 * mismatch dot on the level label is new UX (display-only — class levels
 * are never auto-changed).
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
  const [input, setInput] = useState("");
  if (character.characterType !== "pc") return null;

  if (character.xp === undefined) {
    return (
      <div class="ms-xp ms-xp--untracked">
        <button
          class="ms-xp__enable"
          onClick={() => store.setCharacterField(character.id, "xp", 0)}
        >
          Track XP
        </button>
      </div>
    );
  }

  const xp = computed.xp;
  if (!xp) return null;

  // legacy modifyXP: parseInt(x) || 0, no-op on 0, clamp result >= 0
  const modify = (sign: 1 | -1) => {
    const amount = parseInt(input, 10) || 0;
    if (amount === 0) return;
    store.setCharacterField(
      character.id,
      "xp",
      Math.max(0, (character.xp ?? 0) + sign * amount)
    );
    setInput("");
  };

  return (
    <div class="ms-xp">
      <div class="ms-xp__current">{(character.xp ?? 0).toLocaleString("en-US")} XP</div>
      <div class="ms-xp__levels">
        <span
          class={`ms-xp__level${xp.mismatch ? " has-mismatch" : ""}`}
          title={
            xp.mismatch
              ? `XP supports level ${xp.level}; classes total ${xp.classLevelTotal}`
              : undefined
          }
        >
          LVL {xp.level}
        </span>
        <span class="ms-xp__level ms-xp__level--next">LVL {xp.nextLevel}</span>
      </div>
      <div class="ms-xp__bar">
        <div class="ms-xp__fill" style={`width:${xp.progressPercent}%`} />
        <span class="ms-xp__percent">{xp.progressPercent.toFixed(1)}%</span>
      </div>
      <div class="ms-xp__next">
        Next: {xp.xpForNextLevel.toLocaleString("en-US")} XP
      </div>
      <div class="ms-xp__controls">
        <button class="ms-xp__minus" aria-label="Subtract XP" onClick={() => modify(-1)}>
          −
        </button>
        <input
          type="number"
          class="ms-xp__input"
          placeholder="XP"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") modify(1);
          }}
        />
        <button class="ms-xp__plus" aria-label="Add XP" onClick={() => modify(1)}>
          +
        </button>
      </div>
    </div>
  );
}
