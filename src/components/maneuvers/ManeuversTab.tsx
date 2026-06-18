/**
 * Maneuvers tab — the Path of War analogue of the Spells tab. Reads the raw
 * maneuverbook for roster/readied/stance state and the computed block
 * (computed.maneuvers) for Initiator Level, max tier, limits, and recovery.
 *
 * Gated like the Spells tab: it renders only for initiators (the tab is hidden
 * in the bar otherwise — see App.tsx), but still guards here for safety.
 */
import type { ComputedCharacter } from "../../calc";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type { KnownManeuver, ManeuverType } from "../../types/maneuverbook";
import { useState } from "preact/hooks";
import {
  applyManeuverLoadout,
  deleteManeuverLoadout,
  recoverAll,
  setActiveStance,
  snapshotReadiedAsLoadout,
  toggleActiveBoost,
  toggleExpended,
  toggleReadied,
} from "../../state/maneuver-actions";
import { maneuverEffect } from "../../data/maneuver-effects";

const READIED_TYPES: ManeuverType[] = ["Strike", "Boost", "Counter"];

export function ManeuversTab({
  plugin,
  store,
  character,
  computed,
}: {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}) {
  // hooks must precede the initiator gate below
  const [loadoutName, setLoadoutName] = useState("");

  const book = character.maneuverbook;
  const m = computed.maneuvers;
  if (!book || !m) {
    return (
      <div class="ms-maneuvers ms-maneuvers--empty">
        <p class="ms-muted">
          Not a martial initiator. Pick a Path of War class under Configure →
          Combat → Path of War.
        </p>
      </div>
    );
  }

  const byId = new Map(book.maneuvers.map((mn) => [mn.id, mn]));
  const readied = book.readied
    .map((id) => byId.get(id))
    .filter((x): x is KnownManeuver => !!x);
  const stances = book.maneuvers.filter((mn) => mn.type === "Stance");
  const roster = book.maneuvers.filter((mn) => mn.type !== "Stance");

  // notes for whatever active stance/boosts have a registered numeric effect
  const activeEffectNotes = [
    ...(book.activeStanceId ? [book.activeStanceId] : []),
    ...(book.activeBoosts ?? []),
  ]
    .map((id) => maneuverEffect(id)?.note)
    .filter((n): n is string => !!n);

  const stat = book.initiatingStat.toUpperCase();
  const stress = (n: number, cap: number) =>
    n > cap ? " is-over" : ""; // over-limit hint

  const openDatabase = () => {
    store.updateManeuverDb({ targetCharacterId: character.id });
    void plugin.activateManeuverDbView();
  };

  return (
    <div class="ms-maneuvers">
      <div class="ms-mnv__toolbar">
        <button class="btn btn--ghost btn--sm" onClick={openDatabase}>
          Maneuver database
        </button>
      </div>
      <header class="ms-mnv__head">
        <div class="ms-mnv__class">{m.className}</div>
        <div class="ms-mnv__stats">
          <span title="Initiator Level">IL {m.initiatorLevel}</span>
          <span title="Highest maneuver tier accessible">
            Tier ≤ {m.maxManeuverLevel}
          </span>
          <span title={`Save DC = 10 + tier + ${stat} mod`}>
            DC 10+tier{m.initMod >= 0 ? "+" : ""}
            {m.initMod}
          </span>
        </div>
        <div class="ms-mnv__counts">
          <span class={`ms-mnv__count${stress(m.counts.known, m.limits.known)}`}>
            Known {m.counts.known}/{m.limits.known}
          </span>
          <span
            class={`ms-mnv__count${stress(m.counts.readied, m.limits.readied)}`}
          >
            Readied {m.counts.readied}/{m.limits.readied}
          </span>
          <span
            class={`ms-mnv__count${stress(m.counts.stances, m.limits.stances)}`}
          >
            Stances {m.counts.stances}/{m.limits.stances}
          </span>
        </div>
      </header>

      <section class="ms-mnv__recovery">
        <div class="ms-mnv__recovery-bar">
          <span>
            Expended <b>{m.counts.expended}</b> / readied {m.counts.readied}
          </span>
          <button
            class="btn btn--ghost btn--sm"
            disabled={!m.counts.expended}
            onClick={() => recoverAll(store, character)}
          >
            Recover all
          </button>
        </div>
        {m.recoveryMethod && (
          <p class="help">
            Recovers {m.recoveryCount} ({stat} mod, min 2). {m.recoveryMethod}
          </p>
        )}
      </section>

      <section class="ms-mnv__section">
        <h6 class="ms-mnv__h">Loadouts</h6>
        {!!(book.loadouts ?? []).length && (
          <div class="ms-mnv__loadouts">
            {(book.loadouts ?? []).map((lo) => (
              <span
                key={lo.id}
                class={`ms-mnv__loadout${
                  book.appliedLoadoutId === lo.id ? " is-active" : ""
                }`}
              >
                <button
                  class="ms-mnv__loadout-apply"
                  title={`Apply ${lo.name}`}
                  onClick={() => applyManeuverLoadout(store, character, lo.id)}
                >
                  {lo.name}
                </button>
                <button
                  class="ms-mnv__loadout-del"
                  aria-label={`Delete ${lo.name}`}
                  onClick={() => deleteManeuverLoadout(store, character, lo.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div class="ms-mnv__loadout-save">
          <input
            class="inp"
            type="text"
            placeholder="Name this readied set…"
            value={loadoutName}
            onInput={(e) =>
              setLoadoutName((e.target as HTMLInputElement).value)
            }
          />
          <button
            class="btn btn--ghost btn--sm"
            disabled={!m.counts.readied && !book.activeStanceId}
            onClick={() => {
              snapshotReadiedAsLoadout(store, character, loadoutName);
              setLoadoutName("");
            }}
          >
            Save current
          </button>
        </div>
      </section>

      <section class="ms-mnv__section">
        <h6 class="ms-mnv__h">Active stance</h6>
        <select
          class="inp"
          value={book.activeStanceId ?? ""}
          onChange={(e) =>
            setActiveStance(
              store,
              character,
              (e.target as HTMLSelectElement).value || undefined,
            )
          }
        >
          <option value="">— none active —</option>
          {stances.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (tier {s.level})
            </option>
          ))}
        </select>
        {!!activeEffectNotes.length && (
          <div class="ms-mnv__effects">
            {activeEffectNotes.map((n, i) => (
              <div key={i} class="ms-mnv__effect-note">
                {n}
              </div>
            ))}
          </div>
        )}
      </section>

      {READIED_TYPES.map((type) => {
        const ofType = readied.filter((mn) => mn.type === type);
        if (!ofType.length) return null;
        return (
          <section class="ms-mnv__section" key={type}>
            <h6 class="ms-mnv__h">
              {type}s <span class="ms-mnv__n">{ofType.length}</span>
            </h6>
            {ofType.map((mn) => {
              const spent = book.expended.includes(mn.id);
              const hasEffect = mn.type === "Boost" && !!maneuverEffect(mn.id);
              const boostOn = (book.activeBoosts ?? []).includes(mn.id);
              return (
                <div
                  key={mn.id}
                  class={`ms-mnv__row${spent ? " is-expended" : ""}`}
                >
                  <button
                    class="ms-mnv__expend"
                    title={spent ? "Recover this maneuver" : "Expend (spend)"}
                    onClick={() => toggleExpended(store, character, mn.id)}
                  >
                    {spent ? "spent" : "ready"}
                  </button>
                  <span class="ms-mnv__name">{mn.name}</span>
                  <span class="ms-mnv__tier">T{mn.level}</span>
                  {hasEffect ? (
                    <button
                      class={`ms-mnv__boost${boostOn ? " is-on" : ""}`}
                      title="Toggle this boost's effect on the sheet"
                      onClick={() => toggleActiveBoost(store, character, mn.id)}
                    >
                      {boostOn ? "on" : "off"}
                    </button>
                  ) : (
                    <span class="ms-mnv__action">{mn.action}</span>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      <section class="ms-mnv__section">
        <h6 class="ms-mnv__h">
          Known maneuvers <span class="ms-mnv__n">{roster.length}</span>
        </h6>
        {roster.length === 0 && stances.length === 0 ? (
          <p class="help">
            No maneuvers yet. Download the Path of War maneuver notes into your
            maneuvers folder (Settings → Wayfinder) and add them from the
            maneuver database.
          </p>
        ) : (
          [...roster, ...stances].map((mn) => {
            const isStance = mn.type === "Stance";
            const isReadied = book.readied.includes(mn.id);
            return (
              <div key={mn.id} class="ms-mnv__roster-row">
                <span class="ms-mnv__name">{mn.name}</span>
                <span class="ms-mnv__disc">
                  {mn.discipline} · T{mn.level} · {mn.type}
                </span>
                {!isStance && (
                  <button
                    class={`btn btn--sm${isReadied ? "" : " btn--ghost"}`}
                    onClick={() => toggleReadied(store, character, mn.id)}
                  >
                    {isReadied ? "readied" : "ready"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
