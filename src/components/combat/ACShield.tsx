import type { ACValues } from "../../calc/ac";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface ACShieldProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  ac: ACValues;
  flatFooted: boolean;
}

/** Dark-red shield with AC centered; Touch/FF (or CMB/CMD) to the right.
 *  Tapping the shield toggles the side display mode. */
export function ACShield({ store, character, ac, flatFooted }: ACShieldProps) {
  const showCMBCMD = character.ac.showCMBCMD;
  return (
    <div class="ms-ac">
      {flatFooted && <div class="ms-ac__ff-indicator" aria-label="Flat-footed" />}
      <button
        class="ms-ac__shield"
        aria-label="Toggle CMB/CMD display"
        onClick={() =>
          store.setCharacterField(character.id, "ac.showCMBCMD", !showCMBCMD)
        }
      >
        {ac.normalAC}
      </button>
      <div class="ms-ac__side">
        {showCMBCMD ? (
          <>
            <span class="ms-ac__row ms-ac__row--cmb">
              {ac.cmb >= 0 ? `+${ac.cmb}` : ac.cmb}
            </span>
            <span class="ms-ac__row ms-ac__row--cmd">{ac.cmd}</span>
          </>
        ) : (
          <>
            <span class="ms-ac__row ms-ac__row--touch">{ac.touchAC}</span>
            <span class="ms-ac__row ms-ac__row--ff">{ac.flatFootedAC}</span>
          </>
        )}
      </div>
    </div>
  );
}
