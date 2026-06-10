import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface CombatTogglesProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

const WEAPON_SONGS = [
  "Enhancement",
  "Defending",
  "Distance",
  "Flaming",
  "Frost",
  "Ghost Touch",
  "Keen",
  "Mighty Cleaving",
  "Returning",
  "Shock",
  "Seeking",
];

export function CombatToggles({ store, character }: CombatTogglesProps) {
  const t = character.toggles;
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);

  const simple = (key: keyof typeof t, cls: string) => (
    <button
      class={`ms-toggle ms-toggle--${cls}${t[key] ? " is-on" : ""}`}
      aria-label={cls}
      aria-pressed={Boolean(t[key])}
      onClick={() => set(`toggles.${key}`, !t[key])}
    />
  );

  // three-state: off -> on -> on+double -> off
  const cycleThree = (onKey: string, doubleKey: string, on: boolean, dbl: boolean) => {
    if (!on) {
      set(`toggles.${onKey}`, true);
    } else if (!dbl) {
      set(`toggles.${doubleKey}`, true);
    } else {
      set(`toggles.${onKey}`, false);
      set(`toggles.${doubleKey}`, false);
    }
  };

  const songOn = t.weaponSong !== "Off";

  return (
    <div class="ms-toggles-area">
      <div class="ms-toggles">
        {simple("powerAttack", "power-attack")}
        {simple("fightingDefensively", "fighting-defensively")}
        {simple("charging", "charge")}
        {simple("flanking", "flank")}
        {simple("flurryOfBlows", "flurry")}
        <button
          class={`ms-toggle ms-toggle--weapon-song${songOn ? " is-on" : ""}`}
          aria-label="weapon song"
          aria-pressed={songOn}
          onClick={() => set("toggles.weaponSong", songOn ? "Off" : "Enhancement")}
        />
        <button
          class={`ms-toggle ms-toggle--precise-strike${t.preciseStrike ? " is-on" : ""}${t.doublePreciseStrike ? " is-double" : ""}`}
          aria-label="precise strike"
          aria-pressed={t.preciseStrike}
          onClick={() =>
            cycleThree(
              "preciseStrike",
              "doublePreciseStrike",
              t.preciseStrike,
              t.doublePreciseStrike
            )
          }
        />
        <button
          class={`ms-toggle ms-toggle--smite${t.smiteEvil ? " is-on" : ""}${t.smiteEvilOutsider ? " is-double" : ""}`}
          aria-label="smite evil"
          aria-pressed={t.smiteEvil}
          onClick={() =>
            cycleThree("smiteEvil", "smiteEvilOutsider", t.smiteEvil, t.smiteEvilOutsider)
          }
        />
      </div>
      {songOn && (
        <select
          class="ms-toggle-song-select dropdown"
          value={t.weaponSong}
          onChange={(e) =>
            set("toggles.weaponSong", (e.target as HTMLSelectElement).value)
          }
        >
          {WEAPON_SONGS.map((song) => (
            <option key={song} value={song} selected={song === t.weaponSong}>
              {song}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
