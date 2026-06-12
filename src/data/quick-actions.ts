/**
 * Default Quick Action catalog — data-driven replacements for the legacy
 * hardcoded CombatToggles, reproducing the legacy math EXACTLY (quirks
 * included; see tests/unit/calc/quick-action-parity.test.ts):
 *
 *  - Power attack: -1-floor(bab/4) attack / +2+floor(bab/4)*2 damage, ALL
 *    weapons (melee, ranged, unarmed — the legacy baseParams spread).
 *  - Fighting defensively: -4 attack all weapons; +3 normal/touch AC (the
 *    +1 "3+ Acrobatics ranks" assumption is hardcoded, carried over).
 *    Crane Style is a separate catalog action (-2 attack, +4 AC) because
 *    the legacy craneStyle flag had no UI of its own.
 *  - Charge/flank: +2 melee AND unarmed attack only (never ranged);
 *    charge -2 to all three ACs but never CMB/CMD.
 *  - Weapon Song "Enhancement" is a true enhancement bonus (RAW FIX
 *    2026-06: the legacy song stacked flat on top of weapon enhancement;
 *    now the larger of song/weapon applies, like any enhancement bonus).
 *  - Smite/precise strike ride dedicated override channels to preserve the
 *    ray double-count and Shuriken-only-ranged quirks downstream.
 */

import type {
  QuickActionDef,
  QuickActionStateMap,
  QuickActionVariant,
} from "../types/quick-actions";
import type { CombatToggles } from "../types/character";

const WEAPON_SONG_VARIANTS: QuickActionVariant[] = [
  {
    id: "enhancement",
    name: "Enhancement",
    // RAW FIX (2026-06): a real enhancement bonus, so it does NOT stack
    // with weapon enhancement (legacy added it flat on top). No damage
    // modifiers needed: the enhancement input feeds attack AND damage in
    // the legacy calculator (createWeaponAttack), exactly like a magic
    // weapon's bonus.
    effects: [
      { kind: "modifier", target: "attack.melee", type: "enhancement", value: 1 },
      { kind: "modifier", target: "attack.ranged", type: "enhancement", value: 1 },
    ],
  },
  {
    id: "defending",
    name: "Defending",
    effects: [
      { kind: "acChannels", normal: 1, touch: 1, ff: 1 },
      {
        kind: "note",
        placement: "attack",
        text: "**Defending:** You can use the enhancement bonus as a bonus to your AC. Designate when the song begins.",
      },
    ],
  },
  {
    id: "distance",
    name: "Distance",
    effects: [
      {
        kind: "note",
        placement: "attack",
        text: "**Distance:** Doubles the range increment of your ranged weapon.",
      },
    ],
  },
  {
    id: "flaming",
    name: "Flaming",
    effects: [
      { kind: "damageDice", dice: "+1d6 fire", appliesTo: "melee" },
      { kind: "damageDice", dice: "+1d6 fire", appliesTo: "ranged" },
    ],
  },
  {
    id: "frost",
    name: "Frost",
    effects: [
      { kind: "damageDice", dice: "+1d6 cold", appliesTo: "melee" },
      { kind: "damageDice", dice: "+1d6 cold", appliesTo: "ranged" },
    ],
  },
  {
    id: "ghost-touch",
    name: "Ghost Touch",
    effects: [
      {
        kind: "note",
        placement: "attack",
        text: "**Ghost Touch:** Your weapon can strike incorporeal creatures without miss chance and deals full damage to them.",
      },
    ],
  },
  {
    id: "keen",
    name: "Keen",
    effects: [
      { kind: "keen", appliesTo: "melee" },
      { kind: "keen", appliesTo: "ranged" },
    ],
  },
  {
    id: "mighty-cleaving",
    name: "Mighty Cleaving",
    effects: [
      {
        kind: "note",
        placement: "attack",
        text: "**Mighty Cleaving:** If you hit your target, you can make an additional attack against another opponent within reach at the same attack bonus.",
      },
    ],
  },
  {
    id: "returning",
    name: "Returning",
    effects: [
      {
        kind: "note",
        placement: "attack",
        text: "**Returning:** A thrown weapon returns to your hand immediately after it is thrown, allowing you to make a full attack with it.",
      },
    ],
  },
  {
    id: "shock",
    name: "Shock",
    effects: [
      { kind: "damageDice", dice: "+1d6 electricity", appliesTo: "melee" },
      { kind: "damageDice", dice: "+1d6 electricity", appliesTo: "ranged" },
    ],
  },
  {
    id: "seeking",
    name: "Seeking",
    effects: [
      {
        kind: "note",
        placement: "attack",
        text: "**Seeking:** Negates the miss chance for concealment (not total concealment) for ranged attacks.",
      },
    ],
  },
];

/** The full catalog. Order = legacy combat-tab button order. */
export const DEFAULT_QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: "powerAttack",
    name: "Power Attack",
    icon: "legacy-power-attack",
    stages: [
      {
        effects: [
          {
            kind: "modifier",
            target: "attack.all",
            type: "untyped",
            value: { source: "bab", divisor: 4, multiplier: -1, flatBonus: -1 },
          },
          {
            kind: "modifier",
            target: "damage.all",
            type: "untyped",
            value: { source: "bab", divisor: 4, multiplier: 2, flatBonus: 2 },
          },
        ],
      },
    ],
  },
  {
    id: "fightingDefensively",
    name: "Fighting Defensively",
    icon: "legacy-fighting-defensively",
    stages: [
      {
        effects: [
          { kind: "modifier", target: "attack.all", type: "untyped", value: -4 },
          { kind: "acChannels", normal: 3, touch: 3 },
        ],
      },
    ],
  },
  {
    id: "charge",
    name: "Charge",
    icon: "legacy-charge",
    stages: [
      {
        effects: [
          { kind: "modifier", target: "attack.melee", type: "untyped", value: 2 },
          { kind: "modifier", target: "attack.unarmed", type: "untyped", value: 2 },
          { kind: "acChannels", normal: -2, touch: -2, ff: -2 },
        ],
      },
    ],
  },
  {
    id: "flank",
    name: "Flank",
    icon: "legacy-flank",
    stages: [
      {
        effects: [
          { kind: "modifier", target: "attack.melee", type: "untyped", value: 2 },
          { kind: "modifier", target: "attack.unarmed", type: "untyped", value: 2 },
        ],
      },
    ],
  },
  {
    id: "flurryOfBlows",
    name: "Flurry of Blows",
    icon: "legacy-flurry",
    requires: { className: "monk", minLevel: 1 },
    classKey: "Monk",
    stages: [
      {
        effects: [
          {
            kind: "flurryAttacks",
            // 2 base attacks, 3 at monk 11+ (legacy thresholds)
            count: { source: "classLevel", className: "monk", divisor: 11, flatBonus: 2 },
          },
        ],
      },
    ],
  },
  {
    id: "weaponSong",
    name: "Weapon Song",
    icon: "legacy-weapon-song",
    stages: [{ effects: [] }],
    variants: WEAPON_SONG_VARIANTS,
  },
  {
    id: "preciseStrike",
    name: "Precise Strike",
    icon: "legacy-precise-strike",
    gate: { resourceId: "panache" },
    stages: [
      {
        effects: [
          {
            kind: "preciseStrike",
            damage: { source: "classLevel", className: "paladin" },
          },
        ],
      },
      {
        name: "Double",
        icon: "legacy-precise-strike-double",
        emphasized: true,
        effects: [
          {
            kind: "preciseStrike",
            damage: { source: "classLevel", className: "paladin", multiplier: 2 },
          },
        ],
      },
    ],
  },
  {
    id: "smiteEvil",
    name: "Smite Evil",
    icon: "legacy-smite",
    requires: { className: "paladin", minLevel: 1 },
    classKey: "Paladin",
    stages: [
      {
        effects: [
          {
            kind: "smite",
            attack: { source: "abilityMod", ability: "cha" },
            damage: { source: "classLevel", className: "paladin" },
            description: "",
          },
        ],
      },
      {
        name: "vs Outsider",
        icon: "legacy-smite-double",
        emphasized: true,
        effects: [
          {
            kind: "smite",
            attack: { source: "abilityMod", ability: "cha" },
            damage: { source: "classLevel", className: "paladin", multiplier: 2 },
            description: " (2x vs outsider)",
          },
        ],
      },
    ],
  },
  {
    id: "agileWeapon",
    name: "Agile Weapon",
    icon: "ra-plain-dagger",
    hidden: true,
    stages: [{ effects: [{ kind: "special", op: "agileWeapon" }] }],
  },
  {
    id: "versatilePerformance",
    name: "Versatile Performance",
    icon: "ra-arcane-mask",
    hidden: true,
    stages: [{ effects: [{ kind: "special", op: "versatilePerformance" }] }],
  },
];

/** Crane Style replaces plain Fighting Defensively when migrating a record
 *  that had the (UI-less) craneStyle flag set. Also offered in the catalog. */
export const FIGHTING_DEFENSIVELY_CRANE: QuickActionDef = {
  id: "fightingDefensivelyCrane",
  name: "Fighting Defensively (Crane Style)",
  icon: "legacy-fighting-defensively",
  stages: [
    {
      effects: [
        { kind: "modifier", target: "attack.all", type: "untyped", value: -2 },
        { kind: "acChannels", normal: 4, touch: 4 },
      ],
    },
  ],
};

export function defaultQuickActions(): QuickActionDef[] {
  return structuredClone(DEFAULT_QUICK_ACTIONS);
}

/** Catalog lookup (defaults + the crane variant) — fresh clone per call. */
export function getCatalogQuickAction(id: string): QuickActionDef | null {
  const def = [...DEFAULT_QUICK_ACTIONS, FIGHTING_DEFENSIVELY_CRANE].find(
    (d) => d.id === id
  );
  return def ? structuredClone(def) : null;
}

const SONG_VARIANT_BY_NAME = new Map(WEAPON_SONG_VARIANTS.map((v) => [v.name, v.id]));

export interface SeededQuickActions {
  quickActions: QuickActionDef[];
  quickActionState: QuickActionStateMap;
}

/**
 * Build the per-character catalog + active state from legacy CombatToggles
 * values. Shared by the v6 migration and the legacy frontmatter importer.
 * (`rangedAttackStyle` is an attack-style selector, not a toggle — it stays
 * in CombatToggles and is not seeded here.)
 */
export function seedQuickActionsFromToggles(
  toggles: Partial<CombatToggles>
): SeededQuickActions {
  const quickActions = defaultQuickActions().map((def) => {
    if (def.id === "fightingDefensively" && toggles.craneStyle) {
      return structuredClone(FIGHTING_DEFENSIVELY_CRANE);
    }
    if (def.id === "agileWeapon" && toggles.agileWeapon) {
      return { ...def, hidden: false };
    }
    if (def.id === "versatilePerformance" && toggles.versatilePerformance) {
      return { ...def, hidden: false };
    }
    return def;
  });

  const state: QuickActionStateMap = {};
  if (toggles.powerAttack) state.powerAttack = { stage: 1 };
  if (toggles.fightingDefensively) {
    state[toggles.craneStyle ? "fightingDefensivelyCrane" : "fightingDefensively"] = {
      stage: 1,
    };
  }
  if (toggles.charging) state.charge = { stage: 1 };
  if (toggles.flanking) state.flank = { stage: 1 };
  if (toggles.flurryOfBlows) state.flurryOfBlows = { stage: 1 };
  if (toggles.smiteEvil || toggles.smiteEvilOutsider) {
    state.smiteEvil = { stage: toggles.smiteEvilOutsider ? 2 : 1 };
  }
  if (toggles.preciseStrike || toggles.doublePreciseStrike) {
    state.preciseStrike = { stage: toggles.doublePreciseStrike ? 2 : 1 };
  }
  const songVariant =
    toggles.weaponSong && toggles.weaponSong !== "Off"
      ? SONG_VARIANT_BY_NAME.get(toggles.weaponSong)
      : undefined;
  if (songVariant) state.weaponSong = { stage: 1, variantId: songVariant };
  if (toggles.agileWeapon) state.agileWeapon = { stage: 1 };
  if (toggles.versatilePerformance) state.versatilePerformance = { stage: 1 };

  return { quickActions, quickActionState: state };
}
