import {
  BONUS_TYPES,
  type BonusType,
  type ModifierTarget,
} from "../../../calc/modifiers";
import { ABILITY_KEYS, type AbilityKey } from "../../../types/character";
import type {
  QAValue,
  QuickActionEffect,
  QuickActionFormula,
} from "../../../types/quick-actions";
import { TARGET_GROUPS } from "../../common/ModifierEditor";
import { UI } from "../glyphs";
import { Num, Sel } from "../primitives";
import { APPLIES_TO, EFFECT_KIND_OPTIONS, defaultEffect } from "./shared";

/* ---------- value field (number | formula) -------------------------------- */

function FormulaBody({
  value,
  onChange,
}: {
  value: QuickActionFormula;
  onChange: (v: QAValue) => void;
}) {
  return (
    <>
      <select
        class="sel"
        value={value.source}
        aria-label="Formula source"
        onChange={(e) =>
          onChange({
            ...value,
            source: (e.target as HTMLSelectElement).value as never,
          })
        }
      >
        <option value="bab">BAB</option>
        <option value="classLevel">Class level</option>
        <option value="characterLevel">Character level</option>
        <option value="abilityMod">Ability mod</option>
        <option value="abilityScore">Ability score</option>
      </select>
      {value.source === "classLevel" && (
        <input
          class="inp"
          type="text"
          placeholder="class name"
          value={value.className ?? ""}
          onInput={(e) =>
            onChange({
              ...value,
              className: (e.target as HTMLInputElement).value,
            })
          }
        />
      )}
      {(value.source === "abilityMod" || value.source === "abilityScore") && (
        <Sel
          value={value.ability ?? "str"}
          options={ABILITY_KEYS.map((k) => ({
            value: k,
            label: k.toUpperCase(),
          }))}
          onChange={(v) => onChange({ ...value, ability: v as AbilityKey })}
        />
      )}
      <span class="effect__num" title="divide before flooring">
        ÷{" "}
        <Num
          value={value.divisor ?? 1}
          onChange={(n) => onChange({ ...value, divisor: n })}
        />
      </span>
      <span class="effect__num" title="multiply after the floor">
        ×{" "}
        <Num
          value={value.multiplier ?? 1}
          onChange={(n) => onChange({ ...value, multiplier: n })}
        />
      </span>
      <span class="effect__num" title="flat bonus added last">
        +{" "}
        <Num
          value={value.flatBonus ?? 0}
          onChange={(n) => onChange({ ...value, flatBonus: n })}
        />
      </span>
    </>
  );
}

function ValueField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QAValue;
  onChange: (v: QAValue) => void;
}) {
  const isF = typeof value === "object";
  return (
    <span class="effect__num">
      {label}
      <button
        class={`effect__ftoggle${isF ? " is-on" : ""}`}
        title={
          isF
            ? "Switch to a fixed number"
            : "Switch to a level/BAB/ability formula"
        }
        onClick={() =>
          onChange(isF ? 0 : { source: "classLevel", className: "" })
        }
      >
        ƒ
      </button>
      {/* wrapping value column — keeps wrapped formula rows aligned under the
          inputs rather than flush below the label */}
      <span class="effect__num__vals">
        {!isF ? (
          <Num value={value} onChange={(n) => onChange(n)} />
        ) : (
          <FormulaBody value={value} onChange={onChange} />
        )}
      </span>
    </span>
  );
}

/* ---------- effect row ---------------------------------------------------- */

export function EffectRow({
  e,
  onChange,
  onRemove,
}: {
  e: QuickActionEffect;
  onChange: (e: QuickActionEffect) => void;
  onRemove: () => void;
}) {
  const patch = (p: Partial<QuickActionEffect>) =>
    onChange({ ...e, ...p } as QuickActionEffect);
  return (
    <div class="effect">
      <div class="effect__head">
        <select
          class="sel"
          aria-label="Effect kind"
          value={e.kind}
          onChange={(ev) =>
            onChange(
              defaultEffect(
                (ev.target as HTMLSelectElement)
                  .value as QuickActionEffect["kind"],
              ),
            )
          }
        >
          {EFFECT_KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <button class="iconbtn" aria-label="Remove effect" onClick={onRemove}>
          <UI.x />
        </button>
      </div>
      <div class="effect__body">
        {e.kind === "modifier" && (
          <>
            <select
              class="sel"
              value={e.target}
              aria-label="Target"
              onChange={(ev) =>
                patch({
                  target: (ev.target as HTMLSelectElement)
                    .value as ModifierTarget,
                })
              }
            >
              {TARGET_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Sel
              value={e.type}
              options={BONUS_TYPES.map((t) => t)}
              onChange={(v) => patch({ type: v as BonusType })}
            />
            <ValueField
              label="value"
              value={e.value}
              onChange={(v) => patch({ value: v })}
            />
          </>
        )}
        {e.kind === "acChannels" && (
          <>
            <ValueField
              label="normal"
              value={e.normal ?? 0}
              onChange={(v) => patch({ normal: v })}
            />
            <ValueField
              label="touch"
              value={e.touch ?? 0}
              onChange={(v) => patch({ touch: v })}
            />
            <ValueField
              label="flat"
              value={e.ff ?? 0}
              onChange={(v) => patch({ ff: v })}
            />
          </>
        )}
        {e.kind === "extraAttacks" && (
          <>
            <ValueField
              label="count"
              value={e.count}
              onChange={(v) => patch({ count: v })}
            />
            <span class="effect__num">
              penalty{" "}
              <Num
                value={e.penalty ?? 0}
                onChange={(n) => patch({ penalty: n })}
              />
            </span>
          </>
        )}
        {e.kind === "damageDice" && (
          <>
            <input
              class="inp"
              value={e.dice}
              placeholder="+1d6 fire"
              onInput={(ev) =>
                patch({ dice: (ev.target as HTMLInputElement).value })
              }
            />
            <Sel
              value={e.appliesTo}
              options={APPLIES_TO}
              onChange={(v) => patch({ appliesTo: v as never })}
            />
          </>
        )}
        {e.kind === "keen" && (
          <Sel
            value={e.appliesTo}
            options={APPLIES_TO}
            onChange={(v) => patch({ appliesTo: v as never })}
          />
        )}
        {e.kind === "note" && (
          <>
            <input
              class="inp"
              value={e.text}
              placeholder="Reminder text"
              onInput={(ev) =>
                patch({ text: (ev.target as HTMLInputElement).value })
              }
            />
            <Sel
              value={e.placement ?? "sheet"}
              options={[
                { value: "sheet", label: "Sheet" },
                { value: "attack", label: "Attack lines" },
              ]}
              onChange={(v) => patch({ placement: v as never })}
            />
          </>
        )}
        {e.kind === "smite" && (
          <>
            <ValueField
              label="attack"
              value={e.attack}
              onChange={(v) => patch({ attack: v })}
            />
            <ValueField
              label="damage"
              value={e.damage}
              onChange={(v) => patch({ damage: v })}
            />
          </>
        )}
        {e.kind === "preciseStrike" && (
          <ValueField
            label="damage"
            value={e.damage}
            onChange={(v) => patch({ damage: v })}
          />
        )}
        {e.kind === "flurryAttacks" && (
          <ValueField
            label="attacks"
            value={e.count}
            onChange={(v) => patch({ count: v })}
          />
        )}
        {e.kind === "special" && (
          <Sel
            value={e.op}
            options={[
              { value: "agileWeapon", label: "Agile weapon (DEX for melee)" },
              { value: "versatilePerformance", label: "Versatile Performance" },
              { value: "weaponFinesse", label: "Weapon Finesse" },
            ]}
            onChange={(v) => patch({ op: v as never })}
          />
        )}
      </div>
    </div>
  );
}
