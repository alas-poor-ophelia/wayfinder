import { useState } from "preact/hooks";
import type { MiniSheetStore } from "../../../state/store";
import type { CharacterRecord } from "../../../types/character";
import type { QuickActionDef } from "../../../types/quick-actions";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";
import { Check, Seg, Sel, Txt } from "../primitives";
import { EffectRow } from "./effect-row";
import { IconPicker } from "./icon-picker";
import { defaultEffect, effectSummary } from "./shared";

/* ====================================================================== */
/* Editor modal (Simple / Advanced)                                       */
/* ====================================================================== */

export function QAEditor({
  store,
  character,
  def,
  onClose,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  def: QuickActionDef;
  onClose: () => void;
}) {
  const [m, setM] = useState<QuickActionDef>(() => structuredClone(def));
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [pick, setPick] = useState(false);
  const upd = (p: Partial<QuickActionDef>) => setM({ ...m, ...p });
  const patchStage = (
    i: number,
    p: Partial<QuickActionDef["stages"][number]>,
  ) => upd({ stages: m.stages.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const eff0 = m.stages[0]!.effects;

  const save = () => {
    const actions = character.quickActions ?? [];
    store.setCharacterField(
      character.id,
      "quickActions",
      actions.map((a) => (a.id === m.id ? m : a)),
    );
    onClose();
  };
  const remove = () => {
    const record = store.getCharacter(character.id)!;
    const state = { ...record.quickActionState };
    const wasOn = (state[m.id]?.stage ?? 0) > 0;
    delete state[m.id];
    store.updateCharacter(character.id, {
      quickActions: (record.quickActions ?? []).filter((a) => a.id !== m.id),
      quickActionState: state,
      ...(m.linkedBuff && wasOn
        ? { buffs: record.buffs.filter((b) => b !== m.linkedBuff) }
        : {}),
    });
    onClose();
  };

  const poolOptions = [
    { value: "", label: "Nothing" },
    ...character.resources.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <button
            class="squircle"
            onClick={() => setPick(true)}
            title="Change icon"
          >
            <Icon id={m.icon} />
          </button>
          <div class="modal__titles">
            <div class="modal__title">{m.name || "Action"}</div>
            <div class="modal__sub">Combat-tab toggle</div>
          </div>
          <div style={{ marginRight: 8 }}>
            <Seg
              value={mode}
              options={[
                { value: "simple", label: "Simple" },
                { value: "advanced", label: "Advanced" },
              ]}
              onChange={(v) => setMode(v as "simple" | "advanced")}
            />
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>

        <div class="modal__body">
          <div class="block">
            <div class="f">
              <span class="f__label">Name</span>
              <span class="f__control">
                <Txt value={m.name} onChange={(v) => upd({ name: v })} />
              </span>
            </div>
            <div class="f">
              <span class="f__label">Icon</span>
              <span class="f__control">
                <button class="iconpick__btn" onClick={() => setPick(true)}>
                  <Icon id={m.icon} />
                </button>
              </span>
            </div>
          </div>

          {mode === "simple" ? (
            <>
              <div class="block">
                <div class="block__label">
                  What it does <span class="ln" />
                </div>
                {eff0.length === 0 && <div class="empty">No effects yet.</div>}
                {eff0.map((e, i) => (
                  <EffectRow
                    key={i}
                    e={e}
                    onChange={(ne) =>
                      patchStage(0, {
                        effects: eff0.map((x, k) => (k === i ? ne : x)),
                      })
                    }
                    onRemove={() =>
                      patchStage(0, { effects: eff0.filter((_, k) => k !== i) })
                    }
                  />
                ))}
                <button
                  class="btn btn--ghost btn--sm"
                  onClick={() =>
                    patchStage(0, {
                      effects: [...eff0, defaultEffect("modifier")],
                    })
                  }
                >
                  <UI.plus /> Add effect
                </button>
                {(m.stages.length > 1 || (m.variants?.length ?? 0) > 0) && (
                  <p class="help">
                    {m.stages.length > 1 ? `Has ${m.stages.length} stages` : ""}
                    {m.stages.length > 1 && m.variants?.length ? " · " : ""}
                    {m.variants?.length
                      ? `a ${m.variants.length}-option menu`
                      : ""}
                    . Open Advanced to edit.
                  </p>
                )}
              </div>
              <div class="block">
                <div class="block__label">
                  Cost <span class="ln" />
                </div>
                <div class="f">
                  <span class="f__label">
                    Spends from<small>optional — links a pool</small>
                  </span>
                  <span class="f__control">
                    <Sel
                      value={m.gate?.resourceId ?? ""}
                      options={poolOptions}
                      onChange={(v) =>
                        upd({
                          gate: v
                            ? { resourceId: v, min: m.gate?.min ?? 1 }
                            : undefined,
                        })
                      }
                    />
                  </span>
                </div>
              </div>
            </>
          ) : (
            <AdvancedBody
              m={m}
              upd={upd}
              patchStage={patchStage}
              poolOptions={poolOptions}
            />
          )}
        </div>

        <div class="modal__foot">
          <button class="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <span class="spacer" />
          <button class="btn" onClick={remove}>
            <UI.trash /> Remove
          </button>
          <button class="btn btn--accent" onClick={save}>
            <UI.check /> Save
          </button>
        </div>
        {pick && (
          <IconPicker
            current={m.icon}
            onPick={(ic) => upd({ icon: ic })}
            onClose={() => setPick(false)}
          />
        )}
      </div>
    </div>
  );
}

function AdvancedBody({
  m,
  upd,
  patchStage,
  poolOptions,
}: {
  m: QuickActionDef;
  upd: (p: Partial<QuickActionDef>) => void;
  patchStage: (i: number, p: Partial<QuickActionDef["stages"][number]>) => void;
  poolOptions: { value: string; label: string }[];
}) {
  const variants = m.variants ?? [];
  return (
    <>
      <div class="block">
        <div class="block__label">
          Stages <span class="ln" />
        </div>
        <p class="help" style={{ marginTop: 0, marginBottom: 8 }}>
          Tapping cycles off → 1 → … → off. Add a stage for a stronger state.
        </p>
        {m.stages.map((s, i) => (
          <div class="ed-stage" key={i}>
            <div class="ed-stage__head">
              <span class="ed-stage__no">Stage {i + 1}</span>
              <input
                class="inp"
                placeholder="Label (optional)"
                value={s.name ?? ""}
                onInput={(e) =>
                  patchStage(i, {
                    name: (e.target as HTMLInputElement).value || undefined,
                  })
                }
              />
              <label class="chip" style={{ cursor: "pointer" }}>
                <Check
                  value={!!s.emphasized}
                  onChange={(v) =>
                    patchStage(i, { emphasized: v || undefined })
                  }
                />{" "}
                pulse
              </label>
              {m.stages.length > 1 && (
                <button
                  class="iconbtn"
                  onClick={() =>
                    upd({ stages: m.stages.filter((_, k) => k !== i) })
                  }
                >
                  <UI.x />
                </button>
              )}
            </div>
            {s.effects.map((e, k) => (
              <EffectRow
                key={k}
                e={e}
                onChange={(ne) =>
                  patchStage(i, {
                    effects: s.effects.map((x, j) => (j === k ? ne : x)),
                  })
                }
                onRemove={() =>
                  patchStage(i, {
                    effects: s.effects.filter((_, j) => j !== k),
                  })
                }
              />
            ))}
            <button
              class="btn btn--ghost btn--sm"
              onClick={() =>
                patchStage(i, {
                  effects: [...s.effects, defaultEffect("modifier")],
                })
              }
            >
              <UI.plus /> Add effect
            </button>
          </div>
        ))}
        <button
          class="btn btn--ghost btn--sm"
          onClick={() => upd({ stages: [...m.stages, { effects: [] }] })}
        >
          <UI.plus /> Add stage
        </button>
      </div>

      <div class="block">
        <div class="block__label">
          Tap-menu <span class="ln" />
        </div>
        <p class="help" style={{ marginTop: 0, marginBottom: 6 }}>
          Variants make a tap open a menu (like Weapon Song) instead of cycling.
        </p>
        {variants.map((v, i) => (
          <div class="menulist__item" key={v.id}>
            <Icon id={m.icon} />
            <input
              class="inp"
              value={v.name}
              onInput={(e) =>
                upd({
                  variants: variants.map((x, k) =>
                    k === i
                      ? { ...x, name: (e.target as HTMLInputElement).value }
                      : x,
                  ),
                })
              }
            />
            <span class="menulist__sum">
              {v.effects.map(effectSummary).join("; ")}
            </span>
            <button
              class="iconbtn"
              onClick={() =>
                upd({ variants: variants.filter((_, k) => k !== i) })
              }
            >
              <UI.x />
            </button>
          </div>
        ))}
        <button
          class="btn btn--ghost btn--sm"
          style={{ marginTop: 6 }}
          onClick={() =>
            upd({
              variants: [
                ...variants,
                {
                  id: `v-${Date.now().toString(36)}`,
                  name: "New variant",
                  effects: [],
                },
              ],
            })
          }
        >
          <UI.plus /> Add variant
        </button>
      </div>

      <div class="block">
        <div class="block__label">
          Availability <span class="ln" />
        </div>
        <div class="f">
          <span class="f__label">Spends from</span>
          <span class="f__control">
            <Sel
              value={m.gate?.resourceId ?? ""}
              options={poolOptions}
              onChange={(v) =>
                upd({
                  gate: v
                    ? { resourceId: v, min: m.gate?.min ?? 1 }
                    : undefined,
                })
              }
            />
          </span>
        </div>
        <div class="f">
          <span class="f__label">
            Show for class<small>blank = always shown</small>
          </span>
          <span class="f__control">
            <input
              class="inp"
              style={{ width: 150 }}
              placeholder="(any class)"
              value={m.requires?.className ?? ""}
              onInput={(e) => {
                const className = (e.target as HTMLInputElement).value;
                upd({
                  requires: className
                    ? { className, minLevel: m.requires?.minLevel ?? 1 }
                    : undefined,
                });
              }}
            />
          </span>
        </div>
      </div>
    </>
  );
}
