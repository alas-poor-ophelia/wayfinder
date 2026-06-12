import { useState } from "preact/hooks";
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

  // Fold state is component-owned (controlled <details open>), NOT trusted
  // to DOM node identity: toggling touch can swap a separate-mode block
  // ARRAY for a single touch block, which remounts the slot and would snap
  // an uncontrolled block shut mid-click. onToggle keeps user folds synced.
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({});
  const foldProps = (k: string) => ({
    key: k,
    open: !!openBlocks[k],
    onToggle: (e: Event) => {
      const open = (e.currentTarget as HTMLDetailsElement).open;
      setOpenBlocks((m) => (m[k] === open ? m : { ...m, [k]: open }));
    },
  });

  // Touch toggle (replaces the old Ray style): a hand icon in the block
  // header, revealed only while the block is open (CSS [open] gate). When
  // on, the bucket renders a single touch block with the ray-treatment
  // math; the icon stays in its header to toggle back. preventDefault
  // keeps the summary from folding the block on click; the destination
  // block(s) are explicitly marked open so the toggle never lands folded.
  const touchIcon = (bucket: "melee" | "ranged", on: boolean) => (
    <button
      class={`ms-atk-block__touch${on ? " is-on" : ""}`}
      aria-pressed={on}
      aria-label={`Toggle ${bucket} touch attack`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const enabling = !on;
        set(`toggles.${bucket}Touch`, enabling);
        setOpenBlocks((m) => {
          const next = { ...m, [`${bucket}-main`]: true };
          if (!enabling) {
            // touch off in separate mode lands on the weapon blocks
            for (const p of profiles[bucket]) next[p.id] = true;
          }
          return next;
        });
      }}
    />
  );

  // ---- melee ----
  // Touch/fallback/single all render through ONE keyed <details> call site:
  // toggling touch must DIFF the open block, not replace it — a recreated
  // node loses its open state and the block snaps shut under the click.
  const meleeTouch = !!character.toggles.meleeTouch;
  let meleeBlocks;
  if (!meleeTouch && prefs.melee === "separate" && profiles.melee.length > 0) {
    meleeBlocks = profiles.melee.map((p) => (
      <details class="ms-atk-block" {...foldProps(p.id)}>
        <summary class="ms-atk-block__title">
          {p.name}
          {touchIcon("melee", false)}
        </summary>
        <AttackText text={p.text} />
      </details>
    ));
  } else {
    const active = meleeTouch
      ? undefined
      : profiles.melee.find((p) => p.id === character.toggles.activeMeleeWeaponId) ??
        profiles.melee[0];
    meleeBlocks = (
      <details class="ms-atk-block" {...foldProps("melee-main")}>
        <summary class="ms-atk-block__title">
          {meleeTouch ? "Melee Touch" : active ? active.name : "Melee"}
          {touchIcon("melee", meleeTouch)}
        </summary>
        {!meleeTouch && profiles.melee.length > 1 && active && (
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
        <AttackText text={active ? active.text : attacks.melee} />
      </details>
    );
  }

  // ---- ranged ----
  // Blocks derive from equipped ranged weapons only (no built-in styles).
  // Same single keyed call site as melee so toggling touch never replaces
  // the open <details>.
  const rangedTouch = !!character.toggles.rangedTouch;
  let rangedBlocks;
  if (!rangedTouch && prefs.ranged === "separate" && profiles.ranged.length > 0) {
    rangedBlocks = profiles.ranged.map((p) => (
      <details class="ms-atk-block" {...foldProps(p.id)}>
        <summary class="ms-atk-block__title">
          {p.name}
          {touchIcon("ranged", false)}
        </summary>
        <AttackText text={p.text} />
      </details>
    ));
  } else {
    const activeWeapon = rangedTouch
      ? undefined
      : profiles.ranged.find((p) => p.id === character.toggles.activeRangedWeaponId) ??
        profiles.ranged[0];
    rangedBlocks = (
      <details class="ms-atk-block" {...foldProps("ranged-main")}>
        <summary class="ms-atk-block__title">
          {rangedTouch ? "Ranged Touch" : activeWeapon ? activeWeapon.name : "Ranged"}
          {touchIcon("ranged", rangedTouch)}
        </summary>
        {!rangedTouch && profiles.ranged.length > 1 && activeWeapon && (
          <div class="ms-atk-block__picker">
            <select
              class="dropdown"
              value={activeWeapon.id}
              onChange={(e) =>
                set(
                  "toggles.activeRangedWeaponId",
                  (e.target as HTMLSelectElement).value
                )
              }
            >
              {profiles.ranged.map((p) => (
                <option key={p.id} value={p.id} selected={p.id === activeWeapon.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {rangedTouch ? (
          <AttackText text={attacks.ranged} />
        ) : activeWeapon ? (
          <AttackText text={activeWeapon.text} />
        ) : (
          <div class="ms-atk-block__hint">No ranged weapon equipped.</div>
        )}
      </details>
    );
  }

  return (
    <div class="ms-attacks">
      {meleeBlocks}
      {rangedBlocks}
      {character.characterType !== "familiar" && (
        <details class="ms-atk-block" {...foldProps("unarmed")}>
          <summary class="ms-atk-block__title">Unarmed Strike</summary>
          <AttackText text={attacks.unarmed} />
        </details>
      )}
    </div>
  );
}
