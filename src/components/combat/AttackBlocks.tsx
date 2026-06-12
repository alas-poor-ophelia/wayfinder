import type { AttackProfileText } from "../../calc";
import type { AttackStrings } from "../../calc/attacks";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface AttackBlocksProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  attacks: AttackStrings;
  profiles: { melee: AttackProfileText[]; ranged: AttackProfileText[] };
}

const RANGED_STYLES = ["Shuriken", "Longbow", "Ray"];

/** Render "**Bold:** rest" lines from the calculator's markdown-ish strings. */
function AttackText({ text }: { text: string }) {
  return (
    <div class="ms-atk-block__body">
      {text.split("\n").map((line, i) => {
        const m = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
        if (m) {
          return (
            <div key={i}>
              <strong>{m[1]}:</strong> {m[2]}
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} class="ms-atk-block__gap" />;
        const bold = line.match(/^\*\*(.+?)\*\*$/);
        if (bold) {
          return (
            <div key={i}>
              <strong>{bold[1]}</strong>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

/**
 * Attack blocks derive from EQUIPPED weapon items (computed.attackProfiles).
 * Per-bucket display pref (character.attackBlocks): "single" = one block
 * with a weapon selector, "separate" = one block per weapon. With nothing
 * equipped, the legacy generic blocks render (melee = old Waveblade math).
 */
export function AttackBlocks({ store, character, attacks, profiles }: AttackBlocksProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);
  const prefs = character.attackBlocks ?? { melee: "single", ranged: "single" };

  // ---- melee ----
  let meleeBlocks;
  if (profiles.melee.length === 0) {
    meleeBlocks = (
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">Melee</summary>
        <AttackText text={attacks.melee} />
      </details>
    );
  } else if (prefs.melee === "separate") {
    meleeBlocks = profiles.melee.map((p) => (
      <details class="ms-atk-block" key={p.id}>
        <summary class="ms-atk-block__title">{p.name}</summary>
        <AttackText text={p.text} />
      </details>
    ));
  } else {
    const active =
      profiles.melee.find((p) => p.id === character.toggles.activeMeleeWeaponId) ??
      profiles.melee[0];
    meleeBlocks = (
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">{active.name}</summary>
        {profiles.melee.length > 1 && (
          <div class="ms-atk-block__picker">
            <select
              class="dropdown"
              value={active.id}
              onChange={(e) =>
                set(
                  "toggles.activeMeleeWeaponId",
                  (e.target as HTMLSelectElement).value
                )
              }
            >
              {profiles.melee.map((p) => (
                <option key={p.id} value={p.id} selected={p.id === active.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <AttackText text={active.text} />
      </details>
    );
  }

  // ---- ranged ----
  // The built-in styles (Ray etc.) stay available: as the dedicated style
  // block in separate mode, or merged into the selector in single mode.
  const styleDropdown = (
    <select
      class="dropdown"
      value={character.toggles.rangedAttackStyle}
      onChange={(e) =>
        set("toggles.rangedAttackStyle", (e.target as HTMLSelectElement).value)
      }
    >
      {RANGED_STYLES.map((style) => (
        <option
          key={style}
          value={style}
          selected={style === character.toggles.rangedAttackStyle}
        >
          {style}
        </option>
      ))}
    </select>
  );

  let rangedBlocks;
  if (profiles.ranged.length === 0) {
    rangedBlocks = (
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">Ranged</summary>
        <div class="ms-atk-block__picker">{styleDropdown}</div>
        <AttackText text={attacks.ranged} />
      </details>
    );
  } else if (prefs.ranged === "separate") {
    rangedBlocks = (
      <>
        {profiles.ranged.map((p) => (
          <details class="ms-atk-block" key={p.id}>
            <summary class="ms-atk-block__title">{p.name}</summary>
            <AttackText text={p.text} />
          </details>
        ))}
        <details class="ms-atk-block">
          <summary class="ms-atk-block__title">Ranged (style)</summary>
          <div class="ms-atk-block__picker">{styleDropdown}</div>
          <AttackText text={attacks.ranged} />
        </details>
      </>
    );
  } else {
    const activeWeapon = profiles.ranged.find(
      (p) => p.id === character.toggles.activeRangedWeaponId
    );
    // selector mixes equipped weapons with the built-in styles; a style
    // pick clears the weapon selection and falls through to legacy text
    rangedBlocks = (
      <details class="ms-atk-block">
        <summary class="ms-atk-block__title">
          {activeWeapon ? activeWeapon.name : "Ranged"}
        </summary>
        <div class="ms-atk-block__picker">
          <select
            class="dropdown"
            value={activeWeapon ? activeWeapon.id : `style:${character.toggles.rangedAttackStyle}`}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v.startsWith("style:")) {
                set("toggles.activeRangedWeaponId", undefined);
                set("toggles.rangedAttackStyle", v.slice(6));
              } else {
                set("toggles.activeRangedWeaponId", v);
              }
            }}
          >
            {profiles.ranged.map((p) => (
              <option key={p.id} value={p.id} selected={!!activeWeapon && p.id === activeWeapon.id}>
                {p.name}
              </option>
            ))}
            {RANGED_STYLES.map((style) => (
              <option
                key={style}
                value={`style:${style}`}
                selected={!activeWeapon && style === character.toggles.rangedAttackStyle}
              >
                {style}
              </option>
            ))}
          </select>
        </div>
        <AttackText text={activeWeapon ? activeWeapon.text : attacks.ranged} />
      </details>
    );
  }

  return (
    <div class="ms-attacks">
      {meleeBlocks}
      {rangedBlocks}
      {character.characterType !== "familiar" && (
        <details class="ms-atk-block">
          <summary class="ms-atk-block__title">Unarmed Strike</summary>
          <AttackText text={attacks.unarmed} />
        </details>
      )}
    </div>
  );
}
