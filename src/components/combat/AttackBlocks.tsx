import type { ComponentChildren } from "preact";
import type { AttackProfileText } from "../../calc";
import type { AttackStrings, AttackParts } from "../../calc/attacks";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";

interface AttackBlocksProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  attacks: AttackStrings;
  profiles: { melee: AttackProfileText[]; ranged: AttackProfileText[] };
}

/**
 * Two-way fold sleeve inside each <details>, after the <summary>. Uses the
 * generic `.ms-fold` grid sleeve (scss/_fold.scss): the block's `.is-open`
 * class eases the row 0fr↔1fr to the inner item's height, both ways, on every
 * engine including iPad WebKit. Needs the contents always rendered, so the
 * <details> is held permanently open and the fold is purely visual (foldProps).
 */
function Fold({ children }: { children: ComponentChildren }) {
  return (
    <div class="ms-fold">
      <div class="ms-fold__inner">{children}</div>
    </div>
  );
}

/** "19-20/x2" → "19–20/×2" — presentational only; calc keeps the raw form. */
function prettyCrit(crit: string): string {
  return crit.replace("-", "–").replace("x", "×");
}

/** Render a "**Bold:** rest" note line from the calculator's extra text. */
function NoteLine({ line }: { line: string }) {
  const m = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
  if (m) {
    return (
      <div>
        <strong>{m[1]}:</strong> {m[2]}
      </div>
    );
  }
  const bold = line.match(/^\*\*(.+?)\*\*$/);
  if (bold) {
    return (
      <div>
        <strong>{bold[1]}</strong>
      </div>
    );
  }
  return <div>{line}</div>;
}

/**
 * The attack-block contents: a deduped two-row layout. Row one is the to-hit
 * heroes (Standard / Full, collapsed to "Atk" when they match — i.e. only one
 * attack); row two shows the shared damage + crit as chips, exactly once.
 * `text` carries any trailing note block (weapon-song effects) verbatim.
 */
function AttackBody({ parts, text }: { parts: AttackParts; text: string }) {
  const collapsed = parts.full === parts.standard;
  const hasMeta = parts.touch || !!parts.damage || !!parts.crit;
  const notes = text
    .split("\n")
    .filter((l) => l.trim() !== "" && !/^\*\*(Standard|Full) Attack:\*\*/.test(l));

  return (
    <div class="ms-atk-block__body">
      <div class="ms-atk-rows">
        <div class="ms-atk-tohit">
          {collapsed ? (
            <span class="ms-atk-tohit__cell">
              <span class="ms-atk-tohit__label">Atk</span>
              <span class="ms-atk-tohit__value">{parts.standard}</span>
            </span>
          ) : (
            <>
              <span class="ms-atk-tohit__cell">
                <span class="ms-atk-tohit__label">Std</span>
                <span class="ms-atk-tohit__value">{parts.standard}</span>
              </span>
              <span class="ms-atk-tohit__cell">
                <span class="ms-atk-tohit__label">Full</span>
                <span class="ms-atk-tohit__value">{parts.full}</span>
              </span>
            </>
          )}
        </div>
        {hasMeta && (
          <div class="ms-atk-meta">
            {parts.touch && <span class="ms-atk-chip ms-atk-chip--touch">Touch</span>}
            {parts.damage && (
              <span class="ms-atk-chip ms-atk-chip--dmg">{parts.damage}</span>
            )}
            {parts.crit && (
              <span class="ms-atk-chip ms-atk-chip--crit">{prettyCrit(parts.crit)}</span>
            )}
          </div>
        )}
      </div>
      {notes.length > 0 && (
        <div class="ms-atk-block__notes">
          {notes.map((line, i) => (
            <NoteLine key={i} line={line} />
          ))}
        </div>
      )}
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

  // Fold state is persisted on the character (attackBlocksOpen) so expanded /
  // collapsed survives tab swaps and reloads, and is immune to DOM node
  // identity: toggling touch can swap a separate-mode block ARRAY for a single
  // touch block (a remount), but the fold re-derives from the store either way.
  //
  // The <details> is held permanently `open` so its contents stay rendered for
  // the grid-rows fold animation (a closed <details> hides content via
  // content-visibility, which can't be eased on WebKit). The visual fold is the
  // `.is-open` class instead; the native disclosure toggle is suppressed and we
  // drive the persisted state from the summary click. patchOpen merges
  // multi-key updates (the touch toggle).
  const openBlocks = character.attackBlocksOpen ?? {};
  const patchOpen = (patch: Record<string, boolean>) =>
    set("attackBlocksOpen", { ...openBlocks, ...patch });
  const foldProps = (k: string) => ({
    key: k,
    open: true,
    class: `ms-atk-block${openBlocks[k] ? " is-open" : ""}`,
    onClick: (e: MouseEvent) => {
      // Only a click on the summary toggles the fold; clicks in the body
      // (weapon <select> etc.) must not. The touch button stops propagation,
      // so it never reaches here.
      const target = e.target;
      if (target instanceof Element && target.closest(".ms-atk-block__title")) {
        e.preventDefault(); // suppress the native <details> open/close
        if (!openBlocks[k]) patchOpen({ [k]: true });
        else patchOpen({ [k]: false });
      }
    },
  });

  // Touch toggle (replaces the old Ray style): a hand icon in the block
  // header, revealed only while the block is open (CSS .is-open gate). When
  // on, the bucket renders a single touch block with the ray-treatment
  // math; the icon stays in its header to toggle back. stopPropagation keeps
  // the click off the summary's fold handler; the destination block(s) are
  // explicitly marked open so the toggle never lands folded.
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
        const next: Record<string, boolean> = { [`${bucket}-main`]: true };
        if (!enabling) {
          // touch off in separate mode lands on the weapon blocks
          for (const p of profiles[bucket]) next[p.id] = true;
        }
        patchOpen(next);
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
      <details {...foldProps(p.id)}>
        <summary class="ms-atk-block__title">
          {p.name}
          {touchIcon("melee", false)}
        </summary>
        <Fold>
          <AttackBody parts={p.parts} text={p.text} />
        </Fold>
      </details>
    ));
  } else {
    const active = meleeTouch
      ? undefined
      : profiles.melee.find((p) => p.id === character.toggles.activeMeleeWeaponId) ??
        profiles.melee[0];
    meleeBlocks = (
      <details {...foldProps("melee-main")}>
        <summary class="ms-atk-block__title">
          {meleeTouch ? "Melee Touch" : active ? active.name : "Melee"}
          {touchIcon("melee", meleeTouch)}
        </summary>
        <Fold>
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
          <AttackBody
            parts={active ? active.parts : attacks.parts.melee}
            text={active ? active.text : attacks.melee}
          />
        </Fold>
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
      <details {...foldProps(p.id)}>
        <summary class="ms-atk-block__title">
          {p.name}
          {touchIcon("ranged", false)}
        </summary>
        <Fold>
          <AttackBody parts={p.parts} text={p.text} />
        </Fold>
      </details>
    ));
  } else {
    const activeWeapon = rangedTouch
      ? undefined
      : profiles.ranged.find((p) => p.id === character.toggles.activeRangedWeaponId) ??
        profiles.ranged[0];
    rangedBlocks = (
      <details {...foldProps("ranged-main")}>
        <summary class="ms-atk-block__title">
          {rangedTouch ? "Ranged Touch" : activeWeapon ? activeWeapon.name : "Ranged"}
          {touchIcon("ranged", rangedTouch)}
        </summary>
        <Fold>
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
            <AttackBody parts={attacks.parts.ranged} text={attacks.ranged} />
          ) : activeWeapon ? (
            <AttackBody parts={activeWeapon.parts} text={activeWeapon.text} />
          ) : (
            <div class="ms-atk-block__hint">No ranged weapon equipped.</div>
          )}
        </Fold>
      </details>
    );
  }

  return (
    <div class="ms-attacks">
      {meleeBlocks}
      {rangedBlocks}
      {character.characterType !== "familiar" && (
        <details {...foldProps("unarmed")}>
          <summary class="ms-atk-block__title">Unarmed Strike</summary>
          <Fold>
            <AttackBody parts={attacks.parts.unarmed} text={attacks.unarmed} />
          </Fold>
        </details>
      )}
    </div>
  );
}
