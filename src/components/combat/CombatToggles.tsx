import { Menu } from "obsidian";
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

  // Native <select> popups clip at the 45px control width; an Obsidian
  // Menu renders the song choices properly and feels right on touch.
  const openSongMenu = (e: MouseEvent) => {
    const menu = new Menu();
    for (const song of ["Off", ...WEAPON_SONGS]) {
      menu.addItem((item) =>
        item
          .setTitle(song)
          .setChecked(song === t.weaponSong)
          .onClick(() => set("toggles.weaponSong", song))
      );
    }
    menu.showAtMouseEvent(e);
  };

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
          title={songOn ? `Weapon Song: ${t.weaponSong}` : "Weapon Song"}
          onClick={(e) => openSongMenu(e as unknown as MouseEvent)}
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
        <button
          class="ms-toggle-song-label"
          onClick={(e) => openSongMenu(e as unknown as MouseEvent)}
        >
          {t.weaponSong}
        </button>
      )}
    </div>
  );
}
