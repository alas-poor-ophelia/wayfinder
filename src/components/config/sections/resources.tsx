import { useState } from "preact/hooks";
import { computeAll } from "../../../calc";
import { eitrEnabled } from "../../../types/data-file";
import {
  ABILITY_KEYS,
  type AbilityKey,
  type CharacterRecord,
  type ResourceFormula,
} from "../../../types/character";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";
import { Num, Sec, Sel } from "../primitives";
import { ABILITY_LABELS, type SectionProps, setter } from "./shared";

/** Source dropdown for a pool's max formula; "" = manual (no formula). */
const RES_FORMULA_SOURCES: { value: string; label: string }[] = [
  { value: "", label: "Manual max" },
  { value: "classLevel", label: "Class level" },
  { value: "characterLevel", label: "Character level" },
  { value: "abilityMod", label: "Ability mod" },
  { value: "abilityScore", label: "Ability score" },
];
const RES_ABILITY_OPTIONS = ABILITY_KEYS.map((k) => ({
  value: k,
  label: ABILITY_LABELS[k]!,
}));

export function ResourcesSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  // Live class/archetype pool maxima, derived from current level + abilities.
  // A pool whose id appears here is class-backed: its max is calculated and
  // shown read-only. Pools absent here are custom and keep an editable max.
  const computed = computeAll(character, null, {
    elephantInTheRoom: eitrEnabled(store.data.value.settings),
  });
  const resourceMaxes = computed.resourceMaxes;
  const resourceFormulas = computed.resourceFormulas;
  const resourceFooters = computed.resourceFooters;
  // formula detail is collapsed by default; track open pools by id
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const update = (
    idx: number,
    patch: Partial<CharacterRecord["resources"][number]>,
  ) => {
    set(
      "resources",
      character.resources.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
    // formula/kind edits should recompute computed maxima immediately
    if ("formula" in patch) store.syncClassResources(character.id);
  };
  const patchFormula = (
    idx: number,
    pool: CharacterRecord["resources"][number],
    p: Partial<ResourceFormula>,
  ) =>
    update(idx, {
      formula: { source: "characterLevel", ...pool.formula, ...p },
    });
  const patchFooter = (
    idx: number,
    pool: CharacterRecord["resources"][number],
    p: Partial<
      NonNullable<CharacterRecord["resources"][number]["footerFormula"]>
    >,
  ) =>
    update(idx, {
      footerFormula: {
        dice: { source: "classLevel" },
        ...pool.footerFormula,
        ...p,
      },
    });
  const patchFooterDice = (
    idx: number,
    pool: CharacterRecord["resources"][number],
    p: Partial<ResourceFormula>,
  ) =>
    update(idx, {
      footerFormula: {
        ...pool.footerFormula,
        dice: { source: "classLevel", ...pool.footerFormula?.dice, ...p },
      },
    });

  return (
    <Sec
      icon="ra-round-bottom-flask"
      title="Resource Pools"
      desc={`${character.resources.length} pools`}
    >
      {character.resources.map((r, idx) => {
        const hasF = !!r.formula;
        const derivedMax = resourceMaxes[r.id];
        // class-backed: max is calculated (and a user formula isn't overriding it)
        const isCalc = !hasF && derivedMax !== undefined;
        const isOpen = !!open[r.id];
        return (
          <div class="respool-block" key={r.id}>
            <div class="respool">
              <input
                class="inp"
                type="text"
                value={r.name}
                onInput={(e) =>
                  update(idx, { name: (e.target as HTMLInputElement).value })
                }
              />
              {hasF ? (
                <input
                  class="num"
                  type="number"
                  value={derivedMax ?? r.max}
                  disabled
                  title="Max is computed by the formula below"
                />
              ) : isCalc ? (
                <input
                  class="num is-calc"
                  type="number"
                  value={derivedMax}
                  disabled
                  title="Calculated from class level & ability scores — auto-updates"
                />
              ) : (
                <Num value={r.max} onChange={(v) => update(idx, { max: v })} />
              )}
              <span class="respool__src">
                {r.kind === "item" ? "Item" : isCalc ? "Class ƒ" : "Class"}
              </span>
              <button
                class={`respool__kind${r.kind === "item" ? " is-item" : ""}`}
                title={r.kind === "item" ? "Item resource" : "Class resource"}
                onClick={() =>
                  update(idx, { kind: r.kind === "item" ? undefined : "item" })
                }
              >
                <Icon
                  id={
                    r.kind === "item"
                      ? "ra-round-bottom-flask"
                      : "ra-crossed-swords"
                  }
                />
              </button>
              <button
                class={`respool__math${hasF || isCalc ? " is-on" : ""}${isOpen ? " is-open" : ""}`}
                aria-label={
                  isCalc
                    ? `${r.name}: view class formula`
                    : hasF
                      ? `${r.name}: max formula (computed)`
                      : `${r.name}: set a max formula`
                }
                title={
                  isCalc
                    ? "Class formula — tap to view (read-only)"
                    : hasF
                      ? "Max formula (computed) — tap to edit"
                      : "Set a max formula"
                }
                onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
              >
                <span class="respool__math-f">ƒ</span>
                <UI.chev />
              </button>
              <button
                class="iconbtn"
                aria-label={`Remove ${r.name}`}
                onClick={() =>
                  set(
                    "resources",
                    character.resources.filter((_, i) => i !== idx),
                  )
                }
              >
                <UI.x />
              </button>
            </div>
            {isOpen && (
              <div class="respool__detail">
                {isCalc ? (
                  <div class="respool__readonly">
                    <span class="respool__readonly-lbl">Class formula</span>
                    <code class="respool__readonly-f">
                      {resourceFormulas[r.id] ??
                        "Derived from class level & ability scores"}
                    </code>
                    <span class="respool__readonly-eq">= {derivedMax}</span>
                  </div>
                ) : (
                  <div class="respool__formula">
                    <Sel
                      value={r.formula?.source ?? ""}
                      options={RES_FORMULA_SOURCES}
                      onChange={(v) =>
                        v === ""
                          ? update(idx, { formula: undefined })
                          : update(idx, {
                              formula: {
                                ...(r.formula ?? {}),
                                source: v as ResourceFormula["source"],
                              },
                            })
                      }
                    />
                    {r.formula?.source === "classLevel" && (
                      <input
                        class="inp"
                        type="text"
                        placeholder="class name (blank = all)"
                        value={r.formula.className ?? ""}
                        onInput={(e) =>
                          patchFormula(idx, r, {
                            className: (e.target as HTMLInputElement).value,
                          })
                        }
                      />
                    )}
                    {(r.formula?.source === "abilityMod" ||
                      r.formula?.source === "abilityScore") && (
                      <Sel
                        value={r.formula.ability ?? "str"}
                        options={RES_ABILITY_OPTIONS}
                        onChange={(v) =>
                          patchFormula(idx, r, { ability: v as AbilityKey })
                        }
                      />
                    )}
                    {hasF && (
                      <span class="respool__knobs">
                        {(
                          [
                            ["×", "multiplier", 1],
                            ["÷", "divisor", 1],
                            ["+", "flatBonus", 0],
                            ["min", "minimum", 0],
                          ] as [string, keyof ResourceFormula, number][]
                        ).map(([label, key, fallback]) => (
                          <label class="respool__knob" key={key}>
                            {label}
                            <input
                              class="num"
                              type="number"
                              value={(r.formula?.[key] as number) ?? fallback}
                              onInput={(e) => {
                                const raw = (e.target as HTMLInputElement)
                                  .value;
                                if (raw === "") return;
                                const n = Number(raw);
                                if (!Number.isNaN(n))
                                  patchFormula(idx, r, { [key]: n });
                              }}
                            />
                          </label>
                        ))}
                      </span>
                    )}
                  </div>
                )}
                <div class="respool__foot">
                  <span class="respool__foot-lbl">Footer</span>
                  {r.footerFormula ? (
                    <span
                      class="respool__foot-preview"
                      title="Calculated footer (live)"
                    >
                      {resourceFooters[r.id] ?? ""}
                    </span>
                  ) : (
                    <input
                      class="inp"
                      type="text"
                      placeholder="small text under the pips, e.g. 2d6 (+4 self)"
                      value={r.footer ?? ""}
                      onInput={(e) =>
                        update(idx, {
                          footer:
                            (e.target as HTMLInputElement).value || undefined,
                        })
                      }
                    />
                  )}
                  <button
                    class={`respool__math${r.footerFormula ? " is-on" : ""}`}
                    title={
                      r.footerFormula
                        ? "Calculated footer — tap for plain text"
                        : "Use a calculated footer"
                    }
                    aria-label="Toggle calculated footer"
                    onClick={() =>
                      update(idx, {
                        footerFormula: r.footerFormula
                          ? undefined
                          : {
                              dice: { source: "classLevel", divisor: 2 },
                              dieSize: 6,
                            },
                      })
                    }
                  >
                    <span class="respool__math-f">ƒ</span>
                  </button>
                </div>
                {r.footerFormula && (
                  <div class="respool__footformula">
                    <div class="respool__formula">
                      <span class="respool__knob-lbl">Dice</span>
                      <Sel
                        value={r.footerFormula.dice.source}
                        options={RES_FORMULA_SOURCES.filter((o) => o.value)}
                        onChange={(v) =>
                          patchFooterDice(idx, r, {
                            source: v as ResourceFormula["source"],
                          })
                        }
                      />
                      {r.footerFormula.dice.source === "classLevel" && (
                        <input
                          class="inp"
                          type="text"
                          placeholder="class name (blank = all)"
                          value={r.footerFormula.dice.className ?? ""}
                          onInput={(e) =>
                            patchFooterDice(idx, r, {
                              className: (e.target as HTMLInputElement).value,
                            })
                          }
                        />
                      )}
                      {(r.footerFormula.dice.source === "abilityMod" ||
                        r.footerFormula.dice.source === "abilityScore") && (
                        <Sel
                          value={r.footerFormula.dice.ability ?? "cha"}
                          options={RES_ABILITY_OPTIONS}
                          onChange={(v) =>
                            patchFooterDice(idx, r, {
                              ability: v as AbilityKey,
                            })
                          }
                        />
                      )}
                      <label class="respool__knob">
                        ÷
                        <Num
                          value={r.footerFormula.dice.divisor ?? 1}
                          onChange={(v) =>
                            patchFooterDice(idx, r, { divisor: v })
                          }
                        />
                      </label>
                      <label class="respool__knob">
                        d
                        <Num
                          value={r.footerFormula.dieSize ?? 0}
                          onChange={(v) =>
                            patchFooter(idx, r, { dieSize: v || undefined })
                          }
                        />
                      </label>
                    </div>
                    <div class="respool__formula">
                      <label class="respool__knob">
                        +/die
                        <Num
                          value={r.footerFormula.perDieBonus ?? 0}
                          onChange={(v) =>
                            patchFooter(idx, r, { perDieBonus: v || undefined })
                          }
                        />
                      </label>
                      <label class="respool__knob">
                        +flat
                        <Num
                          value={r.footerFormula.flatBonus ?? 0}
                          onChange={(v) =>
                            patchFooter(idx, r, { flatBonus: v || undefined })
                          }
                        />
                      </label>
                      <input
                        class="inp"
                        type="text"
                        placeholder="bonus label, e.g. self"
                        value={r.footerFormula.bonusLabel ?? ""}
                        onInput={(e) =>
                          patchFooter(idx, r, {
                            bonusLabel:
                              (e.target as HTMLInputElement).value || undefined,
                          })
                        }
                      />
                      <input
                        class="inp"
                        type="text"
                        placeholder="suffix, e.g. healed"
                        value={r.footerFormula.suffix ?? ""}
                        onInput={(e) =>
                          patchFooter(idx, r, {
                            suffix:
                              (e.target as HTMLInputElement).value || undefined,
                          })
                        }
                      />
                    </div>
                    <div class="respool__readonly">
                      <span class="respool__readonly-lbl">Preview</span>
                      <code class="respool__readonly-f">
                        {resourceFooters[r.id] ?? ""}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button
        class="btn btn--ghost btn--sm"
        style={{ marginTop: 8 }}
        onClick={() =>
          set("resources", [
            ...character.resources,
            {
              id: `res-${Date.now().toString(36)}`,
              name: "New resource",
              current: 0,
              max: 1,
            },
          ])
        }
      >
        <UI.plus /> Add resource
      </button>
    </Sec>
  );
}
