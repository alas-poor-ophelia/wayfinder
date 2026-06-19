/**
 * Active maneuver-effect registry — the modifier-bearing subset of Path of War
 * stances and boosts, keyed by maneuver id (discipline:name slug, matching
 * ManeuverIndex / maneuverId()). Only maneuvers with a clean, unconditional,
 * self-applicable numeric bonus live here; the rest (auras, counters,
 * conditional/"vs fear"/"against AoO"/IL-scaled effects) stay informational.
 *
 * computeAll folds the ACTIVE stance's and active boosts' modifiers into the
 * same typed-stacking pipeline as buffs (so a dodge stance stacks with Haste's
 * dodge, an insight stance suppresses a weaker insight source, etc.).
 *
 * Values transcribed from the scraped maneuver text (Open Game Content, OGL
 * 1.0a — Path of War, (c) 2014 Dreamscarred Press). Extend as effects are
 * verified; an unlisted maneuver simply contributes no modifier.
 */
import type { Modifier } from "../calc/modifiers";

/** Context for IL-scaled effects, evaluated in computeAll where IL is known. */
export interface ManeuverEffectContext {
  /** Initiator Level (initiating-class levels + ½ others, or the override). */
  initiatorLevel: number;
}

export interface ManeuverEffect {
  /** static modifiers (the common case; always-on while the stance/boost is). */
  modifiers?: Modifier[];
  /**
   * IL-scaled modifiers — used INSTEAD of `modifiers` when present. Returns the
   * full modifier set for the given Initiator Level (e.g. "+1 dodge per 4 IL").
   * Keeps the static form byte-for-byte for the entries that don't scale.
   */
  modifiersFor?: (ctx: ManeuverEffectContext) => Modifier[];
  /** one-line summary for the maneuver tab */
  note?: string;
}

/** Resolve an effect's modifiers at a given Initiator Level (scaled or static). */
export function maneuverModifiers(
  eff: ManeuverEffect,
  ctx: ManeuverEffectContext,
): Modifier[] {
  return eff.modifiersFor ? eff.modifiersFor(ctx) : (eff.modifiers ?? []);
}

export const MANEUVER_EFFECTS: Record<string, ManeuverEffect> = {
  // Golden Lion — Boost: all allies (incl. the initiator) +2 morale atk/dmg
  "golden-lion:encouraging-roar": {
    modifiers: [
      {
        target: "attack.all",
        type: "morale",
        value: 2,
        source: "Encouraging Roar",
      },
      {
        target: "damage.all",
        type: "morale",
        value: 2,
        source: "Encouraging Roar",
      },
    ],
    note: "+2 morale to attack and damage (1 round)",
  },
  // Primal Fury — Stance: +2 dodge AC
  "primal-fury:skirmisher-s-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Skirmisher's Stance",
      },
    ],
    note: "+2 dodge to AC",
  },
  // Mithral Current — Stance: +4 dodge AC
  "mithral-current:flowing-water-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 4,
        source: "Flowing Water Stance",
      },
    ],
    note: "+4 dodge to AC",
  },
  // Iron Tortoise — Stance: +2 dodge AC and CMD
  "iron-tortoise:mithral-tortoise-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Mithral Tortoise Stance",
      },
      {
        target: "cmd",
        type: "dodge",
        value: 2,
        source: "Mithral Tortoise Stance",
      },
    ],
    note: "+2 dodge to AC and CMD",
  },
  // Thrashing Dragon — Stance: +2 dodge AC, +2 morale Will
  "thrashing-dragon:inner-sphere-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 2,
        source: "Inner Sphere Stance",
      },
      {
        target: "save.will",
        type: "morale",
        value: 2,
        source: "Inner Sphere Stance",
      },
    ],
    note: "+2 dodge to AC, +2 morale to Will saves",
  },
  // Silver Crane — Stance: +2 insight AC and Reflex
  "silver-crane:silver-crane-waltz": {
    modifiers: [
      {
        target: "ac.all",
        type: "insight",
        value: 2,
        source: "Silver Crane Waltz",
      },
      {
        target: "save.ref",
        type: "insight",
        value: 2,
        source: "Silver Crane Waltz",
      },
    ],
    note: "+2 insight to AC and Reflex saves",
  },
  // Iron Tortoise — Stance: +1 shield AC, +1 per 4 IL (IL-scaled; see B2)
  "iron-tortoise:stance-of-the-defending-shell": {
    modifiersFor: ({ initiatorLevel }) => [
      {
        target: "ac.all",
        type: "shield",
        value: 1 + Math.floor(initiatorLevel / 4),
        source: "Stance of the Defending Shell",
      },
    ],
    note: "+1 shield AC (+1 per 4 initiator levels)",
  },

  /* ===================== Epic B — stances ===================== */
  // Black Seraph — Stance: +2 profane AC (also fly speed + Whirlwind Attack)
  "black-seraph:razor-wings-of-the-black-seraph": {
    modifiers: [
      {
        target: "ac.all",
        type: "profane",
        value: 2,
        source: "Razor Wings of the Black Seraph",
      },
    ],
    note: "+2 profane AC; fly speed; Whirlwind Attack",
  },
  // Broken Blade — Stance: +2 shield AC (+1 at IL 6/12/18); needs a free hand
  "broken-blade:iron-hand-stance": {
    modifiersFor: ({ initiatorLevel: il }) => [
      {
        target: "ac.all",
        type: "shield",
        value: 2 + (il >= 6 ? 1 : 0) + (il >= 12 ? 1 : 0) + (il >= 18 ? 1 : 0),
        source: "Iron Hand Stance",
      },
    ],
    note: "+2 shield AC (+1 at IL 6/12/18) with a free hand",
  },
  // Iron Tortoise — Stance: +4 shield AC + IL circumstance CMD (uncanny dodge)
  "iron-tortoise:turtle-knight-s-stance": {
    modifiersFor: ({ initiatorLevel: il }) => [
      {
        target: "ac.all",
        type: "shield",
        value: 4,
        source: "Turtle Knight's Stance",
      },
      {
        target: "cmd",
        type: "circumstance",
        value: il,
        source: "Turtle Knight's Stance",
      },
    ],
    note: "+4 shield AC; +IL circumstance CMD; improved uncanny dodge",
  },
  // Iron Tortoise — Stance: +2 shield AC (set shield vs line/cone effects)
  "iron-tortoise:turtle-general-s-stance": {
    modifiers: [
      {
        target: "ac.all",
        type: "shield",
        value: 2,
        source: "Turtle General's Stance",
      },
    ],
    note: "+2 shield AC; block a line/cone with a shield attack roll",
  },
  // Mithral Current — Stance: +10 ft enhancement to all speeds (silver weapons)
  "mithral-current:mithral-lightning-stance": {
    modifiers: [
      {
        target: "speed",
        type: "enhancement",
        value: 10,
        source: "Mithral Lightning Stance",
      },
    ],
    note: "+10 ft speeds; +6 dodge AC vs AoO; weapons count as silver",
  },
  // Piercing Thunder — Stance: +4 dodge AC (reach +5 ft)
  "piercing-thunder:stance-of-the-thunderbrand": {
    modifiers: [
      {
        target: "ac.all",
        type: "dodge",
        value: 4,
        source: "Stance of the Thunderbrand",
      },
    ],
    note: "+4 dodge AC; weapon reach +5 ft",
  },
  // Primal Fury — Stance: +10 ft enhancement land speed (scent)
  "primal-fury:running-hunter-s-stance": {
    modifiers: [
      {
        target: "speed",
        type: "enhancement",
        value: 10,
        source: "Running Hunter's Stance",
      },
    ],
    note: "+10 ft land speed; scent",
  },
  // Scarlet Throne — Stance: +2 shield AC (+1 at IL 6/12/18); +1d6 (2d6 @10)
  "scarlet-throne:scarlet-einhander": {
    modifiersFor: ({ initiatorLevel: il }) => [
      {
        target: "ac.all",
        type: "shield",
        value: 2 + (il >= 6 ? 1 : 0) + (il >= 12 ? 1 : 0) + (il >= 18 ? 1 : 0),
        source: "Scarlet Einhander",
      },
    ],
    note: "+2 shield AC (+1 at IL 6/12/18); +1d6 damage (2d6 at IL 10)",
  },
  // Scarlet Throne — Stance: +5 insight to AC, CMD, and Initiative
  "scarlet-throne:scarlet-duelist-attitude": {
    modifiers: [
      {
        target: "ac.all",
        type: "insight",
        value: 5,
        source: "Scarlet Duelist Attitude",
      },
      {
        target: "cmd",
        type: "insight",
        value: 5,
        source: "Scarlet Duelist Attitude",
      },
      {
        target: "initiative",
        type: "insight",
        value: 5,
        source: "Scarlet Duelist Attitude",
      },
    ],
    note: "+5 insight to AC, CMD, and Initiative",
  },
  // Silver Crane — Stance: +4 sacred saves + SR 15 + IL (IL-scaled)
  "silver-crane:diamond-wings-of-the-imperial-crane": {
    modifiersFor: ({ initiatorLevel: il }) => [
      {
        target: "save.all",
        type: "sacred",
        value: 4,
        source: "Diamond Wings of the Imperial Crane",
      },
      {
        target: "sr",
        type: "untyped",
        value: 15 + il,
        source: "Diamond Wings of the Imperial Crane",
      },
    ],
    note: "+4 sacred saves; SR 15 + initiator level",
  },
  // Thrashing Dragon — Stance: +4 Initiative (TWF; +1d6+init two-weapon dmg)
  "thrashing-dragon:battle-dragon-s-stance": {
    modifiers: [
      {
        target: "initiative",
        type: "untyped",
        value: 4,
        source: "Battle Dragon's Stance",
      },
    ],
    note: "+4 Initiative; -2 TWF penalty; +1d6 + init two-weapon damage",
  },

  /* ===================== Epic B — boosts ===================== */
  // Black Seraph — Boost: +2 profane attack (also +1d6 damage)
  "black-seraph:strength-of-hell": {
    modifiers: [
      {
        target: "attack.all",
        type: "profane",
        value: 2,
        source: "Strength of Hell",
      },
    ],
    note: "+2 profane attack; +1d6 damage (1 round)",
  },
  // Eternal Guardian — Boost: +2 to combat maneuver check
  "eternal-guardian:warden-s-bearing": {
    modifiers: [
      {
        target: "cmb",
        type: "untyped",
        value: 2,
        source: "Warden's Bearing",
      },
    ],
    note: "+2 CMB; no AoO; treated one size larger for the maneuver",
  },
  // Piercing Thunder — Boost: +30 ft enhancement land speed
  "piercing-thunder:lightning-rush": {
    modifiers: [
      {
        target: "speed",
        type: "enhancement",
        value: 30,
        source: "Lightning Rush",
      },
    ],
    note: "+30 ft land speed; move up to your speed (1 round)",
  },
  // Scarlet Throne — Boost: +2 competence Reflex/Will (dodge AC vs AoO)
  "scarlet-throne:prince-s-attitude": {
    modifiers: [
      {
        target: "save.ref",
        type: "competence",
        value: 2,
        source: "Prince's Attitude",
      },
      {
        target: "save.will",
        type: "competence",
        value: 2,
        source: "Prince's Attitude",
      },
    ],
    note: "+2 competence Reflex/Will; +4 dodge AC when provoking (1 round)",
  },
  // Scarlet Throne — Boost: +2 insight attack (one attack; +1d8 insight dmg)
  "scarlet-throne:regal-blade": {
    modifiers: [
      {
        target: "attack.all",
        type: "insight",
        value: 2,
        source: "Regal Blade",
      },
    ],
    note: "+2 insight attack; +1d8 insight damage (single attack)",
  },
  // Scarlet Throne — Boost: +5 insight attack (one attack; +2d8 insight dmg)
  "scarlet-throne:noble-blade": {
    modifiers: [
      {
        target: "attack.all",
        type: "insight",
        value: 5,
        source: "Noble Blade",
      },
    ],
    note: "+5 insight attack; +2d8 insight damage (single attack)",
  },
  // Scarlet Throne — Boost: +5 insight attack (one attack; +5d8 insight; cower)
  "scarlet-throne:royal-blade": {
    modifiers: [
      {
        target: "attack.all",
        type: "insight",
        value: 5,
        source: "Royal Blade",
      },
    ],
    note: "+5 insight attack; +5d8 insight damage; Will or cower (single attack)",
  },
};

export function maneuverEffect(id: string): ManeuverEffect | undefined {
  return MANEUVER_EFFECTS[id];
}

/**
 * Stances and boosts deliberately NOT modelled as Modifiers (recorded with a
 * category reason so the Epic B triage is provably complete — every corpus
 * Stance/Boost is either in MANEUVER_EFFECTS or here; scripts/maneuver-verify
 * .mjs enforces it). These grant effects the typed-modifier engine can't carry:
 * extra damage DICE (not a numeric Modifier), ally auras, healing, movement/
 * positioning, enemy-targeted control/debuff, extra attacks, or non-modifier
 * abilities (feats, blindsight, fly, DR, reach). Their action/effect text still
 * renders on the maneuver tab — they simply contribute no auto-applied bonus.
 */
export const MANEUVER_REFERENCE_ONLY: Record<string, string> = {
  "black-seraph:black-seraph-battle-stance":
    "stance: situational / non-modeled bonus",
  "black-seraph:black-seraph-s-glare":
    "stance: control / debuff (enemy-targeted)",
  "black-seraph:black-seraph-s-wrath":
    "boost: control / debuff (enemy-targeted)",
  "black-seraph:fear-eating-technique": "boost: healing / utility",
  "black-seraph:savage-stance": "stance: bonus damage dice (not a Modifier)",
  "black-seraph:soul-consumption": "boost: healing / utility",
  "black-seraph:taunting-laugh": "boost: control / debuff (enemy-targeted)",
  "black-seraph:unfettered-progression":
    "boost: bonus damage dice (not a Modifier)",
  "black-seraph:vampiric-aura": "stance: ally aura / coordination",
  "black-seraph:walk-in-the-dark": "stance: control / debuff (enemy-targeted)",
  "broken-blade:adamantine-knuckle":
    "boost: bonus damage dice (not a Modifier)",
  "broken-blade:brawler-s-attitude": "boost: extra attack / maneuver",
  "broken-blade:broken-blade-stance": "stance: extra attack / maneuver",
  "broken-blade:bronze-knuckle": "boost: bonus damage dice (not a Modifier)",
  "broken-blade:finishing-kick": "boost: bonus damage dice (not a Modifier)",
  "broken-blade:iron-dust": "boost: extra attack / maneuver",
  "broken-blade:iron-knuckle": "boost: bonus damage dice (not a Modifier)",
  "broken-blade:pit-fighter-s-stance":
    "stance: bonus damage dice (not a Modifier)",
  "broken-blade:pugilist-stance": "stance: bonus damage dice (not a Modifier)",
  "broken-blade:steel-grappler-s-attitude": "stance: extra attack / maneuver",
  "broken-blade:unbreakable-stride-stance": "stance: non-modifier ability",
  "cursed-razor:aura-of-misfortune":
    "stance: control / debuff (enemy-targeted)",
  "cursed-razor:aura-of-shared-misery":
    "stance: control / debuff (enemy-targeted)",
  "cursed-razor:luck-shifting": "boost: control / debuff (enemy-targeted)",
  "cursed-razor:luckdrinker-aura": "stance: ally aura / coordination",
  "cursed-razor:murderous-spite": "boost: control / debuff (enemy-targeted)",
  "cursed-razor:oathbreaker-s-aura":
    "stance: control / debuff (enemy-targeted)",
  "cursed-razor:sorcerer-s-gaze": "boost: situational / non-modeled bonus",
  "cursed-razor:the-dragon-knows": "stance: non-modifier ability",
  "cursed-razor:touch-of-the-witch":
    "stance: control / debuff (enemy-targeted)",
  "cursed-razor:warlock-s-stride": "boost: control / debuff (enemy-targeted)",
  "cursed-razor:witchfinder-s-brand": "boost: situational / non-modeled bonus",
  "eternal-guardian:binding-fetters":
    "boost: control / debuff (enemy-targeted)",
  "eternal-guardian:debilitating-fear":
    "boost: control / debuff (enemy-targeted)",
  "eternal-guardian:grim-satisfaction": "boost: healing / utility",
  "eternal-guardian:inescapable-fetters":
    "boost: control / debuff (enemy-targeted)",
  "eternal-guardian:inescapable-grasp":
    "stance: control / debuff (enemy-targeted)",
  "eternal-guardian:jailer-of-the-damned":
    "stance: control / debuff (enemy-targeted)",
  "eternal-guardian:oath-of-torpor": "boost: control / debuff (enemy-targeted)",
  "eternal-guardian:stance-of-the-eternal-guardian":
    "stance: ally aura / coordination",
  "eternal-guardian:stance-of-the-infinite-warrior":
    "stance: non-modifier ability",
  "eternal-guardian:valiant-keeper-s-stance":
    "stance: ally aura / coordination",
  "eternal-guardian:vigilant-keeper-s-stance": "stance: non-modifier ability",
  "golden-lion:alpha-s-roar": "boost: ally aura / coordination",
  "golden-lion:circling-the-prey": "boost: ally aura / coordination",
  "golden-lion:defending-the-pride": "boost: ally aura / coordination",
  "golden-lion:demoralizing-roar": "boost: control / debuff (enemy-targeted)",
  "golden-lion:direct-the-pride": "boost: ally aura / coordination",
  "golden-lion:discipline-of-the-pride": "boost: ally aura / coordination",
  "golden-lion:golden-commander-stance": "stance: ally aura / coordination",
  "golden-lion:golden-general-s-attitude": "stance: ally aura / coordination",
  "golden-lion:golden-general-s-victory": "boost: ally aura / coordination",
  "golden-lion:golden-lion-charger":
    "stance: situational / charge-conditional bonus",
  "golden-lion:lion-s-feast": "boost: ally aura / coordination",
  "golden-lion:pride-leader-s-stance": "stance: ally aura / coordination",
  "golden-lion:pride-movement": "boost: movement / positioning",
  "golden-lion:triumphant-lion-s-leadership":
    "stance: ally aura / coordination",
  "iron-tortoise:aggravated-wounds": "boost: control / debuff (enemy-targeted)",
  "iron-tortoise:iron-tortoise-stance":
    "stance: non-modifier ability (reach/size)",
  "iron-tortoise:snapping-turtle-stance":
    "stance: bonus damage dice (not a Modifier)",
  "iron-tortoise:taunting-turtle": "boost: control / debuff (enemy-targeted)",
  "iron-tortoise:unlimited-aggression":
    "boost: control / debuff (enemy-targeted)",
  "mithral-current:endless-current": "boost: movement / positioning",
  "mithral-current:following-wake": "boost: movement / positioning",
  "mithral-current:mithral-current-stance":
    "stance: control / debuff (enemy-targeted)",
  "mithral-current:reaching-blade-stance":
    "stance: bonus damage dice (not a Modifier)",
  "mithral-current:ready-the-draw": "stance: non-modifier ability",
  "mithral-current:ride-the-wake": "boost: movement / positioning",
  "mithral-current:rushing-wake": "boost: movement / positioning",
  "mithral-current:shifting-waters-stance": "stance: movement / positioning",
  "piercing-thunder:adamantine-lancer-s-edge":
    "boost: bonus damage dice (not a Modifier)",
  "piercing-thunder:bronze-lancer-s-edge":
    "boost: bonus damage dice (not a Modifier)",
  "piercing-thunder:deadly-thunder-lancer-s-stance":
    "stance: init-mod scaled (not supported)",
  "piercing-thunder:diving-thunderbolt-stance": "stance: non-modifier ability",
  "piercing-thunder:hastened-leap": "boost: movement / positioning",
  "piercing-thunder:iron-lancer-s-edge":
    "boost: bonus damage dice (not a Modifier)",
  "piercing-thunder:iron-pikeman-s-attitude":
    "stance: non-modifier ability (armor)",
  "piercing-thunder:phalanx-lancer": "stance: ally aura / coordination",
  "piercing-thunder:twin-thunder-stance": "stance: non-modifier ability",
  "primal-fury:blade-of-fury": "boost: situational / charge-conditional bonus",
  "primal-fury:devastating-momentum":
    "boost: situational / charge-conditional bonus",
  "primal-fury:iron-hide-stance": "stance: non-modifier ability (DR/Str)",
  "primal-fury:lightning-step": "boost: movement / positioning",
  "primal-fury:momentum-crash": "boost: situational / charge-conditional bonus",
  "primal-fury:momentum-crush": "boost: situational / charge-conditional bonus",
  "primal-fury:primal-warrior-stance": "stance: movement / positioning",
  "primal-fury:stance-of-aggression":
    "stance: bonus damage dice (not a Modifier)",
  "scarlet-throne:circular-stance": "stance: situational / non-modeled bonus",
  "scarlet-throne:red-zephyr-s-fleetness": "boost: movement / positioning",
  "scarlet-throne:scarlet-eye-s-perception":
    "boost: situational / non-modeled bonus",
  "scarlet-throne:scarlet-majesty-stance":
    "stance: control / debuff (enemy-targeted)",
  "scarlet-throne:unfettered-movement": "stance: movement / positioning",
  "silver-crane:benediction-of-the-silver-crane": "boost: healing / utility",
  "silver-crane:blazing-crane-s-wing":
    "boost: bonus damage dice (not a Modifier)",
  "silver-crane:crane-step": "boost: movement / positioning",
  "silver-crane:eyes-of-the-crane": "stance: situational / non-modeled bonus",
  "silver-crane:holy-rush": "boost: movement / positioning",
  "silver-crane:silver-crane-endurance":
    "stance: non-modifier ability (fast healing)",
  "silver-crane:silver-crane-s-blessing": "boost: healing / utility",
  "silver-crane:silver-crane-s-leap": "boost: movement / positioning",
  "silver-crane:silver-crane-s-mercy": "boost: healing / utility",
  "silver-crane:stance-of-the-crane-knight":
    "stance: non-modifier ability (fly/DR)",
  "silver-crane:stance-of-the-silver-crane":
    "stance: situational / non-modeled bonus",
  "thrashing-dragon:bend-with-the-wind": "stance: situational / on-miss bonus",
  "thrashing-dragon:brutal-dragon-s-stance":
    "stance: bonus damage dice (not a Modifier)",
  "thrashing-dragon:doom-talon": "boost: bonus damage dice (not a Modifier)",
  "thrashing-dragon:dragon-rush": "boost: extra attack / maneuver",
  "thrashing-dragon:dragon-warrior-s-talons":
    "stance: bonus damage dice (not a Modifier)",
  "thrashing-dragon:flash-kick": "boost: extra attack / maneuver",
  "thrashing-dragon:hurricane-of-fangs":
    "boost: non-modifier ability (thrown range)",
  "thrashing-dragon:leaping-dragon": "boost: situational / non-modeled bonus",
  "thrashing-dragon:outer-sphere-stance":
    "stance: bonus damage dice (not a Modifier)",
  "thrashing-dragon:rending-claws": "boost: extra attack / maneuver",
  "thrashing-dragon:sharpened-talons":
    "boost: bonus damage dice (not a Modifier)",
  "thrashing-dragon:unbreakable-talons":
    "boost: bonus damage dice (not a Modifier)",
};
