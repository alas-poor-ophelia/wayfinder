/**
 * Quick Action resolution engine — formula evaluation, stage/variant
 * merging, gate/requires suppression, and channel assembly. Legacy parity
 * of the DEFAULT catalog against the real calculators is proven separately
 * in quick-action-parity.test.ts (M3).
 */
import { describe, expect, it } from "vitest";
import {
  activeEffects,
  evaluateQAValue,
  resolveQuickActions,
  type QuickActionContext,
} from "../../../src/calc/quick-actions";
import {
  DEFAULT_QUICK_ACTIONS,
  FIGHTING_DEFENSIVELY_CRANE,
  defaultQuickActions,
  newCharacterQuickActions,
  seedQuickActionsFromToggles,
} from "../../../src/data/quick-actions";
import { ICONS } from "../../../src/data/icons/registry";
import type { QuickActionDef } from "../../../src/types/quick-actions";
import { defaultToggles } from "../../../src/types/character";

function ctx(overrides: Partial<QuickActionContext> = {}): QuickActionContext {
  return {
    classes: [],
    bab: 0,
    totalLevel: 0,
    mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    resources: [],
    ...overrides,
  };
}

describe("evaluateQAValue", () => {
  it("passes plain numbers through", () => {
    expect(evaluateQAValue(-4, ctx())).toBe(-4);
  });

  it("multiplier applies AFTER the floor (power attack damage at bab 6)", () => {
    // legacy: 2 + floor(6/4)*2 = 4. A pre-floor multiply (ResourceFormula
    // style) would give 2 + floor(6*2/4) = 5 — the counterexample that
    // forced a separate formula shape.
    const v = evaluateQAValue(
      { source: "bab", divisor: 4, multiplier: 2, flatBonus: 2 },
      ctx({ bab: 6 }),
    );
    expect(v).toBe(4);
  });

  it("negative multiplier floors toward -inf on the base, not the product (power attack penalty at bab 5)", () => {
    // legacy: -1 - floor(5/4) = -2
    const v = evaluateQAValue(
      { source: "bab", divisor: 4, multiplier: -1, flatBonus: -1 },
      ctx({ bab: 5 }),
    );
    expect(v).toBe(-2);
  });

  it("classLevel sums case-insensitive substring matches", () => {
    const c = ctx({
      classes: [
        { className: "Paladin (Virtuous Bravo)", level: 5 },
        { className: "paladin", level: 2 },
        { className: "Monk", level: 3 },
      ],
    });
    expect(
      evaluateQAValue({ source: "classLevel", className: "paladin" }, c),
    ).toBe(7);
  });

  it("abilityMod and abilityScore read the right tables", () => {
    const c = ctx({
      mods: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 5 },
      scores: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 20 },
    });
    expect(evaluateQAValue({ source: "abilityMod", ability: "cha" }, c)).toBe(
      5,
    );
    expect(evaluateQAValue({ source: "abilityScore", ability: "cha" }, c)).toBe(
      20,
    );
  });

  it("flurry count formula: 2 below monk 11, 3 at 11", () => {
    const f = {
      source: "classLevel",
      className: "monk",
      divisor: 11,
      flatBonus: 2,
    } as const;
    expect(
      evaluateQAValue(f, ctx({ classes: [{ className: "Monk", level: 10 }] })),
    ).toBe(2);
    expect(
      evaluateQAValue(f, ctx({ classes: [{ className: "Monk", level: 11 }] })),
    ).toBe(3);
  });
});

describe("activeEffects", () => {
  const twoStage: QuickActionDef = {
    id: "x",
    name: "X",
    icon: "ra-acid",
    stages: [
      { effects: [{ kind: "note", text: "one" }] },
      { effects: [{ kind: "note", text: "two" }] },
    ],
  };

  it("stage 0 / missing state yields nothing", () => {
    expect(activeEffects(twoStage, undefined)).toEqual([]);
    expect(activeEffects(twoStage, { stage: 0 })).toEqual([]);
  });

  it("selects the right stage and clamps stale out-of-range stages", () => {
    expect(activeEffects(twoStage, { stage: 2 })[0]).toMatchObject({
      text: "two",
    });
    expect(activeEffects(twoStage, { stage: 9 })[0]).toMatchObject({
      text: "two",
    });
  });

  it("merges stage + variant effects", () => {
    const def: QuickActionDef = {
      ...twoStage,
      variants: [
        { id: "v", name: "V", effects: [{ kind: "note", text: "variant" }] },
      ],
    };
    const fx = activeEffects(def, { stage: 1, variantId: "v" });
    expect(fx.map((e) => (e as { text: string }).text)).toEqual([
      "one",
      "variant",
    ]);
  });
});

describe("newCharacterQuickActions", () => {
  it("seeds only the truly-default actions plus Power Attack when EitR is on", () => {
    const ids = newCharacterQuickActions(true).map((d) => d.id);
    expect(ids).toEqual([
      "powerAttack",
      "fightingDefensively",
      "charge",
      "flank",
    ]);
  });

  it("omits Power Attack when EitR is off", () => {
    const ids = newCharacterQuickActions(false).map((d) => d.id);
    expect(ids).toEqual(["fightingDefensively", "charge", "flank"]);
  });

  it("never seeds class-specific or hidden legacy actions", () => {
    const seeded = new Set(newCharacterQuickActions(true).map((d) => d.id));
    for (const id of [
      "smiteEvil",
      "flurryOfBlows",
      "weaponSong",
      "preciseStrike",
      "weaponFinesse",
      "agileWeapon",
      "versatilePerformance",
    ]) {
      expect(seeded.has(id), `${id} should not be seeded`).toBe(false);
    }
  });

  it("returns fresh clones (no shared catalog references)", () => {
    const a = newCharacterQuickActions(true);
    const b = newCharacterQuickActions(true);
    expect(a[0]).not.toBe(b[0]);
    const catalog = DEFAULT_QUICK_ACTIONS.find((d) => d.id === "charge");
    expect(a.find((d) => d.id === "charge")).not.toBe(catalog);
  });
});

describe("resolveQuickActions", () => {
  const acts = defaultQuickActions();

  it("inactive defs contribute nothing", () => {
    const r = resolveQuickActions(acts, {}, ctx());
    expect(r.modifiers).toEqual([]);
    expect(r.acChannels).toEqual({ normal: 0, touch: 0, ff: 0 });
    expect(r.smiteOverride).toBeNull();
  });

  it("power attack emits formula-evaluated attack.all/damage.all untyped modifiers stamped with the action name", () => {
    const r = resolveQuickActions(
      acts,
      { powerAttack: { stage: 1 } },
      ctx({ bab: 8 }),
    );
    expect(r.modifiers).toEqual([
      {
        target: "attack.all",
        type: "untyped",
        value: -3,
        source: "Power Attack",
      },
      {
        target: "damage.all",
        type: "untyped",
        value: 6,
        source: "Power Attack",
      },
    ]);
  });

  it("smite requires paladin levels — suppressed at 0, active at 5, doubled at stage 2", () => {
    const off = resolveQuickActions(acts, { smiteEvil: { stage: 1 } }, ctx());
    expect(off.smiteOverride).toBeNull();

    const c = ctx({
      classes: [{ className: "Paladin (Virtuous Bravo)", level: 5 }],
      mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 5 },
    });
    const s1 = resolveQuickActions(acts, { smiteEvil: { stage: 1 } }, c);
    expect(s1.smiteOverride).toEqual({
      atkBonus: 5,
      dmgBonus: 5,
      description: "",
    });

    const s2 = resolveQuickActions(acts, { smiteEvil: { stage: 2 } }, c);
    expect(s2.smiteOverride).toEqual({
      atkBonus: 5,
      dmgBonus: 10,
      description: " (2x vs outsider)",
    });
  });

  it("precise strike gates on panache > 0 with state preserved", () => {
    const c0 = ctx({
      classes: [{ className: "Paladin", level: 6 }],
      resources: [{ id: "panache", current: 0 }],
    });
    expect(
      resolveQuickActions(acts, { preciseStrike: { stage: 1 } }, c0)
        .preciseStrikeOverride,
    ).toBeNull();

    const c3 = ctx({
      classes: [{ className: "Paladin", level: 6 }],
      resources: [{ id: "panache", current: 3 }],
    });
    expect(
      resolveQuickActions(acts, { preciseStrike: { stage: 1 } }, c3)
        .preciseStrikeOverride,
    ).toBe(6);
    expect(
      resolveQuickActions(acts, { preciseStrike: { stage: 2 } }, c3)
        .preciseStrikeOverride,
    ).toBe(12);
  });

  it("flurry: replacement count 2 (monk 10) / 3 (monk 11); suppressed without monk levels", () => {
    const m10 = ctx({
      classes: [{ className: "Monk (Unchained)", level: 10 }],
    });
    expect(
      resolveQuickActions(acts, { flurryOfBlows: { stage: 1 } }, m10).flurry,
    ).toEqual({
      active: true,
      attacks: 2,
    });
    const m11 = ctx({
      classes: [{ className: "Monk (Unchained)", level: 11 }],
    });
    expect(
      resolveQuickActions(acts, { flurryOfBlows: { stage: 1 } }, m11).flurry,
    ).toEqual({
      active: true,
      attacks: 3,
    });
    expect(
      resolveQuickActions(acts, { flurryOfBlows: { stage: 1 } }, ctx()).flurry,
    ).toBeNull();
  });

  it("weapon song variants: enhancement is ENHANCEMENT-typed attack modifiers (RAW FIX — no damage rows: the enhancement input feeds damage downstream); flaming is melee+ranged dice; keen flags; defending is acChannels + attack note", () => {
    const enh = resolveQuickActions(
      acts,
      { weaponSong: { stage: 1, variantId: "enhancement" } },
      ctx(),
    );
    expect(enh.modifiers).toEqual([
      {
        target: "attack.melee",
        type: "enhancement",
        value: 1,
        source: "Weapon Song",
      },
      {
        target: "attack.ranged",
        type: "enhancement",
        value: 1,
        source: "Weapon Song",
      },
    ]);

    const flame = resolveQuickActions(
      acts,
      { weaponSong: { stage: 1, variantId: "flaming" } },
      ctx(),
    );
    expect(flame.extraDamageDice).toEqual({
      melee: "+1d6 fire",
      ranged: "+1d6 fire",
      unarmed: "",
    });

    const keen = resolveQuickActions(
      acts,
      { weaponSong: { stage: 1, variantId: "keen" } },
      ctx(),
    );
    expect(keen.keen).toEqual({ melee: true, ranged: true, unarmed: false });

    const def = resolveQuickActions(
      acts,
      { weaponSong: { stage: 1, variantId: "defending" } },
      ctx(),
    );
    expect(def.acChannels).toEqual({ normal: 1, touch: 1, ff: 1 });
    expect(def.attackNoteLines).toHaveLength(1);
    expect(def.attackNoteLines[0]).toMatch(/^\*\*Defending:\*\*/);

    const songOnNoVariant = resolveQuickActions(
      acts,
      { weaponSong: { stage: 1 } },
      ctx(),
    );
    expect(songOnNoVariant.modifiers).toEqual([]);
  });

  it("extraAttacks effect pushes count entries at the given penalty", () => {
    const def: QuickActionDef = {
      id: "h",
      name: "H",
      icon: "ra-acid",
      stages: [{ effects: [{ kind: "extraAttacks", count: 2, penalty: 5 }] }],
    };
    const r = resolveQuickActions([def], { h: { stage: 1 } }, ctx());
    expect(r.extraAttacks).toEqual([5, 5]);
  });

  it("special ops set the behavior flags", () => {
    const r = resolveQuickActions(
      acts,
      { agileWeapon: { stage: 1 }, versatilePerformance: { stage: 1 } },
      ctx(),
    );
    expect(r.agileWeapon).toBe(true);
    expect(r.versatilePerformance).toBe(true);
  });

  it("hidden defs with active state still apply (agile weapon seeding contract)", () => {
    const hiddenDef = acts.find((a) => a.id === "agileWeapon")!;
    expect(hiddenDef.hidden).toBe(true);
    const r = resolveQuickActions(
      [hiddenDef],
      { agileWeapon: { stage: 1 } },
      ctx(),
    );
    expect(r.agileWeapon).toBe(true);
  });

  it("conditions on modifier effects ride through (situational, never auto-summed downstream)", () => {
    const def: QuickActionDef = {
      id: "c",
      name: "C",
      icon: "ra-acid",
      stages: [
        {
          effects: [
            {
              kind: "modifier",
              target: "save.all",
              type: "morale",
              value: 1,
              condition: "vs fear",
            },
          ],
        },
      ],
    };
    const r = resolveQuickActions([def], { c: { stage: 1 } }, ctx());
    expect(r.modifiers[0].condition).toBe("vs fear");
  });
});

describe("default catalog integrity", () => {
  it("every icon id (def, stage, variant) resolves in the registry", () => {
    for (const def of [...DEFAULT_QUICK_ACTIONS, FIGHTING_DEFENSIVELY_CRANE]) {
      expect(ICONS[def.icon], `def ${def.id} icon ${def.icon}`).toBeDefined();
      for (const s of def.stages) {
        if (s.icon) expect(ICONS[s.icon], `stage icon ${s.icon}`).toBeDefined();
      }
      for (const v of def.variants ?? []) {
        if (v.icon)
          expect(ICONS[v.icon], `variant icon ${v.icon}`).toBeDefined();
      }
    }
  });

  it("catalog ids are unique and order matches the legacy button order", () => {
    const ids = DEFAULT_QUICK_ACTIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "powerAttack",
      "fightingDefensively",
      "charge",
      "flank",
      "flurryOfBlows",
      "weaponSong",
      "preciseStrike",
      "smiteEvil",
      "agileWeapon",
      "weaponFinesse",
      "versatilePerformance",
    ]);
  });
});

describe("seedQuickActionsFromToggles", () => {
  it("all-off toggles seed the default catalog with empty state", () => {
    const seeded = seedQuickActionsFromToggles(defaultToggles());
    expect(seeded.quickActions.map((d) => d.id)).toEqual(
      DEFAULT_QUICK_ACTIONS.map((d) => d.id),
    );
    expect(seeded.quickActionState).toEqual({});
  });

  it("maps boolean toggles, two-stage states, and the song variant", () => {
    const seeded = seedQuickActionsFromToggles({
      ...defaultToggles(),
      powerAttack: true,
      smiteEvil: true,
      smiteEvilOutsider: true,
      preciseStrike: true,
      weaponSong: "Ghost Touch",
    });
    expect(seeded.quickActionState).toEqual({
      powerAttack: { stage: 1 },
      smiteEvil: { stage: 2 },
      preciseStrike: { stage: 1 },
      weaponSong: { stage: 1, variantId: "ghost-touch" },
    });
  });

  it("craneStyle swaps in the crane variant of fighting defensively", () => {
    const seeded = seedQuickActionsFromToggles({
      ...defaultToggles(),
      fightingDefensively: true,
      craneStyle: true,
    });
    const ids = seeded.quickActions.map((d) => d.id);
    expect(ids).toContain("fightingDefensivelyCrane");
    expect(ids).not.toContain("fightingDefensively");
    expect(seeded.quickActionState.fightingDefensivelyCrane).toEqual({
      stage: 1,
    });
  });

  it("agile/VP unhide and activate when their toggles were set", () => {
    const seeded = seedQuickActionsFromToggles({
      ...defaultToggles(),
      agileWeapon: true,
    });
    const agile = seeded.quickActions.find((d) => d.id === "agileWeapon")!;
    const vp = seeded.quickActions.find(
      (d) => d.id === "versatilePerformance",
    )!;
    expect(agile.hidden).toBe(false);
    expect(vp.hidden).toBe(true);
    expect(seeded.quickActionState.agileWeapon).toEqual({ stage: 1 });
  });
});
