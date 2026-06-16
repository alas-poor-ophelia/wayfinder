import { Fragment } from "preact";
import { useState } from "preact/hooks";
import type { MiniSheetStore } from "../../../state/store";
import type { CharacterRecord } from "../../../types/character";
import type {
  QuickActionDef,
  QuickActionEffect,
} from "../../../types/quick-actions";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";
import { Txt } from "../primitives";
import { EffectRow } from "./effect-row";
import { IconPicker } from "./icon-picker";
import {
  CATALOG,
  EFFECT_TYPES,
  defSummary,
  defaultEffect,
  effectSummary,
  newId,
} from "./shared";

/* ====================================================================== */
/* Add picker                                                             */
/* ====================================================================== */

export function QAAddModal({
  store,
  character,
  onClose,
  onCustom,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  onClose: () => void;
  onCustom: () => void;
}) {
  const actions = character.quickActions ?? [];
  const present = new Set(actions.map((a) => a.id));
  const add = (def: QuickActionDef) => {
    store.setCharacterField(character.id, "quickActions", [
      ...actions,
      structuredClone(def),
    ]);
    onClose();
  };
  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <div class="modal__titles">
            <div class="modal__title">Add action</div>
            <div class="modal__sub">Defaults for your class, or your own</div>
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>
        <div class="modal__body">
          <div class="picklist">
            {CATALOG.map((c) => {
              const has = present.has(c.id);
              return (
                <button
                  key={c.id}
                  class={`pickitem${has ? " is-disabled" : ""}`}
                  disabled={has}
                  onClick={() => add(c)}
                >
                  <span class="squircle">
                    <Icon id={c.icon} />
                  </span>
                  <span>
                    <span class="pickitem__t">{c.name}</span>
                    <br />
                    <span class="pickitem__d">{defSummary(c)}</span>
                  </span>
                  {has && <span class="pickitem__on">on sheet</span>}
                </button>
              );
            })}
          </div>
          <div class="divider" />
          <button
            class="btn btn--accent"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={onCustom}
          >
            <UI.wand /> Build a custom action
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Wizard (Name → Effect → Done)                                          */
/* ====================================================================== */

const WIZ = ["Name", "Effect", "Done"];

export function QAWizard({
  store,
  character,
  onClose,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState(false);
  const [d, setD] = useState<{
    name: string;
    icon: string;
    effect: QuickActionEffect;
  }>(() => ({
    name: "",
    icon: "ra-crossed-swords",
    effect: defaultEffect("modifier"),
  }));
  const upd = (p: Partial<typeof d>) => setD({ ...d, ...p });
  const canNext = step !== 0 || d.name.trim().length > 0;

  const create = () => {
    const def: QuickActionDef = {
      id: newId(),
      name: d.name || "New action",
      icon: d.icon,
      stages: [{ effects: [d.effect] }],
    };
    store.setCharacterField(character.id, "quickActions", [
      ...(character.quickActions ?? []),
      def,
    ]);
    onClose();
  };

  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <div class="modal__titles">
            <div class="modal__title">New custom action</div>
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>
        <div class="wizsteps">
          {WIZ.map((s, i) => (
            <Fragment key={s}>
              <div
                class={`wizstep${i === step ? " is-active" : i < step ? " is-done" : ""}`}
              >
                <span class="wizstep__dot">
                  {i < step ? <UI.check /> : i + 1}
                </span>
                <span class="wizstep__lbl">{s}</span>
              </div>
              {i < WIZ.length - 1 && (
                <span class={`wizstep__ln${i < step ? " is-done" : ""}`} />
              )}
            </Fragment>
          ))}
        </div>
        <div class="modal__body">
          {step === 0 && (
            <>
              <p class="help" style={{ marginTop: 0 }}>
                Name it and pick a squircle icon.
              </p>
              <div class="f">
                <span class="f__label">Name</span>
                <span class="f__control">
                  <Txt
                    value={d.name}
                    onChange={(v) => upd({ name: v })}
                    placeholder="e.g. Vital Strike"
                  />
                </span>
              </div>
              <div class="f">
                <span class="f__label">Icon</span>
                <span class="f__control">
                  <button class="iconpick__btn" onClick={() => setPick(true)}>
                    <Icon id={d.icon} />
                  </button>
                </span>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p class="help" style={{ marginTop: 0 }}>
                What does it do? Pick an effect type — add more later in
                Advanced.
              </p>
              <div class="choice">
                {EFFECT_TYPES.map((t) => (
                  <button
                    key={t.kind}
                    class={`choice__card${d.effect.kind === t.kind ? " is-sel" : ""}`}
                    onClick={() => upd({ effect: defaultEffect(t.kind) })}
                  >
                    <span class="choice__ic">
                      <Icon id={t.icon} />
                    </span>
                    <span>
                      <span class="choice__t">{t.label}</span>
                      <span class="choice__d">{t.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div class="divider" />
              <EffectRow
                e={d.effect}
                onChange={(e) => upd({ effect: e })}
                onRemove={() => upd({ effect: defaultEffect("modifier") })}
              />
            </>
          )}
          {step === 2 && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span class="squircle is-on">
                  <Icon id={d.icon} />
                </span>
                <div>
                  <div class="modal__title">{d.name || "New action"}</div>
                  <div class="muted" style={{ fontSize: 12.5 }}>
                    {effectSummary(d.effect)}.
                  </div>
                </div>
              </div>
              <div class="review__row">
                <b>Effect</b>
                <span>{effectSummary(d.effect)}</span>
              </div>
              <div class="review__row">
                <b>Cost</b>
                <span class="muted">Free — add a pool later if needed</span>
              </div>
              <p class="help">
                It'll drop onto your grid where you can drag, restage, or gate
                it.
              </p>
            </>
          )}
        </div>
        <div class="modal__foot">
          <button
            class="btn btn--ghost"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          >
            <UI.arrowL /> {step === 0 ? "Cancel" : "Back"}
          </button>
          <span class="spacer" />
          {step < 2 ? (
            <button
              class="btn btn--accent"
              disabled={!canNext}
              style={{ opacity: canNext ? 1 : 0.5 }}
              onClick={() => setStep(step + 1)}
            >
              Next <UI.arrowR />
            </button>
          ) : (
            <button class="btn btn--accent" onClick={create}>
              <UI.check /> Create
            </button>
          )}
        </div>
        {pick && (
          <IconPicker
            current={d.icon}
            onPick={(ic) => upd({ icon: ic })}
            onClose={() => setPick(false)}
          />
        )}
      </div>
    </div>
  );
}
