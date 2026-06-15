import {
  BONUS_TYPES,
  type BonusType,
  type Modifier,
  type ModifierTarget,
} from "../../calc/modifiers";
import { STANDARD_SKILLS } from "../../calc/skills";

/**
 * Shared typed-modifier row editor — used by the inventory ItemEditor
 * (gear bonuses) and the config custom-buff editor. Builds Modifier[]
 * from dropdowns; no free-text targets.
 */

interface TargetOption {
  value: ModifierTarget;
  label: string;
}

interface TargetGroup {
  label: string;
  options: TargetOption[];
}

/** exported for the quick-action effect editor's target dropdown */
export const TARGET_GROUPS: TargetGroup[] = [
  {
    label: "Armor Class",
    options: [
      { value: "ac.all", label: "AC" },
      { value: "ac.natural", label: "Natural armor" },
    ],
  },
  {
    label: "Saves",
    options: [
      { value: "save.all", label: "All saves" },
      { value: "save.fort", label: "Fortitude" },
      { value: "save.ref", label: "Reflex" },
      { value: "save.will", label: "Will" },
    ],
  },
  {
    label: "Abilities",
    options: (["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => ({
      value: `ability.${k}` as ModifierTarget,
      label: k.toUpperCase(),
    })),
  },
  {
    label: "Attack",
    options: [
      { value: "attack.all", label: "All attacks" },
      { value: "attack.melee", label: "Melee attack" },
      { value: "attack.ranged", label: "Ranged attack" },
      { value: "attack.unarmed", label: "Unarmed attack" },
    ],
  },
  {
    label: "Damage",
    options: [
      { value: "damage.all", label: "All damage" },
      { value: "damage.melee", label: "Melee damage" },
      { value: "damage.ranged", label: "Ranged damage" },
      { value: "damage.unarmed", label: "Unarmed damage" },
    ],
  },
  {
    label: "Other",
    options: [{ value: "initiative", label: "Initiative" }],
  },
  {
    label: "Skills",
    options: Object.keys(STANDARD_SKILLS).map((name) => ({
      value: `skill.${name}` as ModifierTarget,
      label: name,
    })),
  },
];

export function ModifierEditor({
  modifiers,
  source,
  onChange,
}: {
  modifiers: Modifier[];
  /** default source stamped on new rows (e.g. the item/buff name) */
  source: string;
  onChange: (modifiers: Modifier[]) => void;
}) {
  const update = (idx: number, patch: Partial<Modifier>) =>
    onChange(modifiers.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  return (
    <div class="ms-modedit">
      {modifiers.map((mod, idx) => (
        <div class="ms-modedit__row" key={idx}>
          <select
            class="ms-modedit__target"
            aria-label="Bonus target"
            value={mod.target}
            onChange={(e) =>
              update(idx, {
                target: (e.target as HTMLSelectElement).value as ModifierTarget,
              })
            }
          >
            {TARGET_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            class="ms-modedit__type"
            aria-label="Bonus type"
            value={mod.type}
            onChange={(e) =>
              update(idx, {
                type: (e.target as HTMLSelectElement).value as BonusType,
              })
            }
          >
            {BONUS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            class="ms-modedit__value"
            type="number"
            aria-label="Bonus value"
            value={mod.value}
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n)) update(idx, { value: n });
            }}
          />
          <input
            class="ms-modedit__condition"
            type="text"
            placeholder="condition (vs fear...)"
            aria-label="Bonus condition"
            value={mod.condition ?? ""}
            onInput={(e) =>
              update(idx, {
                condition: (e.target as HTMLInputElement).value || undefined,
              })
            }
          />
          <button
            class="ms-modedit__remove"
            aria-label="Remove bonus"
            onClick={() => onChange(modifiers.filter((_, i) => i !== idx))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        class="ms-modedit__add"
        onClick={() =>
          onChange([
            ...modifiers,
            { target: "ac.all", type: "untyped", value: 1, source },
          ])
        }
      >
        + Add bonus
      </button>
    </div>
  );
}
