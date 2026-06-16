import {
  DEFAULT_QUICK_ACTIONS,
  FIGHTING_DEFENSIVELY_CRANE,
} from "../../../data/quick-actions";
import type {
  QAValue,
  QuickActionDef,
  QuickActionEffect,
} from "../../../types/quick-actions";
import { TARGET_GROUPS } from "../../common/ModifierEditor";

export const newId = () => `qa-${Date.now().toString(36)}`;

export const CATALOG: QuickActionDef[] = [
  ...DEFAULT_QUICK_ACTIONS,
  FIGHTING_DEFENSIVELY_CRANE,
];

export const TARGET_LABEL = new Map<string, string>();
for (const g of TARGET_GROUPS)
  for (const o of g.options) TARGET_LABEL.set(o.value, o.label);

/* ---------- effect catalog (plain-language) ------------------------------- */

export interface EffectType {
  kind: QuickActionEffect["kind"];
  label: string;
  desc: string;
  icon: string;
}
/** The eight friendly effect types offered in the wizard/choice cards. */
export const EFFECT_TYPES: EffectType[] = [
  {
    kind: "modifier",
    label: "Bonus or penalty",
    icon: "ra-crossed-swords",
    desc: "Adjust an attack, damage, AC, save, or skill by a number.",
  },
  {
    kind: "acChannels",
    label: "Adjust AC",
    icon: "ra-shield",
    desc: "Change normal, touch, and flat-footed AC directly.",
  },
  {
    kind: "extraAttacks",
    label: "Extra attacks",
    icon: "ra-double-team",
    desc: "Add attacks at a chosen penalty.",
  },
  {
    kind: "damageDice",
    label: "Bonus damage dice",
    icon: "ra-lightning-bolt",
    desc: "Add dice like +1d6 fire to your hits.",
  },
  {
    kind: "keen",
    label: "Keen",
    icon: "ra-plain-dagger",
    desc: "Double your weapon's threat range.",
  },
  {
    kind: "note",
    label: "Reminder note",
    icon: "ra-aware",
    desc: "Show a note on the sheet or in attack lines.",
  },
  {
    kind: "smite",
    label: "Smite",
    icon: "ra-angel-wings",
    desc: "Add an ability bonus to attack and a level bonus to damage.",
  },
  {
    kind: "special",
    label: "Special rule",
    icon: "ra-arcane-mask",
    desc: "Built-in behaviours like Agile weapon.",
  },
];
/** Full kind list for the row select (includes the two niche legacy channels). */
export const EFFECT_KIND_OPTIONS: { value: string; label: string }[] = [
  ...EFFECT_TYPES.map((t) => ({ value: t.kind, label: t.label })),
  { value: "preciseStrike", label: "Precise strike damage" },
  { value: "flurryAttacks", label: "Flurry base attacks" },
];

export const APPLIES_TO = ["melee", "ranged", "unarmed", "all"];

export function defaultEffect(
  kind: QuickActionEffect["kind"],
): QuickActionEffect {
  switch (kind) {
    case "modifier":
      return { kind, target: "attack.all", type: "untyped", value: 1 };
    case "acChannels":
      return { kind, normal: 1, touch: 1, ff: 0 };
    case "extraAttacks":
      return { kind, count: 1, penalty: 0 };
    case "damageDice":
      return { kind, dice: "+1d6 fire", appliesTo: "melee" };
    case "keen":
      return { kind, appliesTo: "melee" };
    case "note":
      return { kind, text: "", placement: "sheet" };
    case "smite":
      return {
        kind,
        attack: { source: "abilityMod", ability: "cha" },
        damage: { source: "classLevel", className: "" },
      };
    case "preciseStrike":
      return { kind, damage: { source: "classLevel", className: "" } };
    case "flurryAttacks":
      return { kind, count: 2 };
    case "special":
      return { kind, op: "agileWeapon" };
  }
}

export function valueStr(v: QAValue): string {
  if (typeof v === "object") return "scaling";
  return v >= 0 ? `+${v}` : `${v}`;
}

export function effectSummary(e: QuickActionEffect): string {
  switch (e.kind) {
    case "modifier":
      return `${valueStr(e.value)} ${e.type !== "untyped" ? e.type + " " : ""}to ${(TARGET_LABEL.get(e.target) ?? e.target).toLowerCase()}`;
    case "acChannels":
      return `AC ${valueStr(e.normal ?? 0)} / ${valueStr(e.touch ?? 0)} touch / ${valueStr(e.ff ?? 0)} flat`;
    case "extraAttacks":
      return `${valueStr(e.count)} extra attack(s)${e.penalty ? ` at ${e.penalty}` : ""}`;
    case "damageDice":
      return `${e.dice} (${e.appliesTo})`;
    case "keen":
      return `Keen (${e.appliesTo})`;
    case "note":
      return `Note: “${e.text}”`;
    case "smite":
      return `${valueStr(e.attack)} atk, ${valueStr(e.damage)} dmg`;
    case "preciseStrike":
      return `${valueStr(e.damage)} precise damage`;
    case "flurryAttacks":
      return `${valueStr(e.count)} flurry attacks`;
    case "special":
      return e.op === "agileWeapon"
        ? "DEX for melee attack"
        : e.op === "versatilePerformance"
          ? "Bluff/Sense Motive use Perform"
          : "Weapon Finesse";
  }
}

export function defSummary(def: QuickActionDef): string {
  const effects = def.stages.flatMap((s) => s.effects);
  if (def.variants?.length) return `Tap-menu, ${def.variants.length} options.`;
  if (effects.length === 0) return "No effects yet.";
  return effects.map(effectSummary).join("; ") + ".";
}
