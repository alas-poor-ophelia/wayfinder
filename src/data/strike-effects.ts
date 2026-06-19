/**
 * Strike-effect registry — the one-shot attack riders for Path of War Strikes,
 * keyed by maneuver id (discipline:name slug, matching ManeuverIndex /
 * maneuverId()). The Path of War analogue of MANEUVER_EFFECTS, but Strikes
 * cannot ride the always-on buff pipeline: a Strike modifies the NEXT attack
 * only. So computeAll resolves the single armed strike (ManeuverBookState.
 * pendingStrikeId) and merges these fields into the attack hooks — the flat
 * atk/dmg adjusts, the weapon-song dmgExtra dice slot, the keen crit channel,
 * and the attack note block — NOT baseMods (see src/calc/index.ts).
 *
 * Deliberately NOT the smite damage channel: it double-counts on rays
 * (preserved legacy quirk, src/calc/attacks.ts:7).
 *
 * Values transcribed verbatim from the scraped maneuver text (Open Game
 * Content, OGL 1.0a — Path of War (c) 2014 + Path of War: Expanded (c) 2016,
 * Dreamscarred Press). An unlisted strike contributes nothing.
 *
 * TRIAGE POLICY (Story A6): a strike earns an entry here when it modifies a
 * NORMAL weapon / unarmed / natural / charge / shield-bash attack:
 *   - extraDamageDice "+Xd6" (+ energy type, e.g. "+2d6 profane") for the
 *     "additional Xd6 points of [type] damage" on that hit.
 *   - dmgBonus N for a flat "additional N points of [hp] damage".
 *   - atkBonus N for a bonus (or penalty) to the attack roll.
 *   - riderText for the surfaceable effect (save-or-condition, forced move,
 *     ignores DR, conditional dice escalation, ability damage, bleed, heals).
 * Conditional / scaling damage ("if cursed → Yd6", "if flanked → Yd6") stays
 * in riderText — there is no evaluator (plan A6.3).
 *
 * Strikes that do NOT ride a single normal attack's damage line are recorded
 * in STRIKE_REFERENCE_ONLY (with a reason) so the corpus is provably complete
 * but nothing is silently dropped: ranged-touch / AoE-burst / cone / line
 * strikes (their damage is the maneuver's own), maneuver-attempt strikes
 * (disarm / trip / sunder / grapple / bull rush / throw — damage rides the
 * maneuver, not a weapon hit), pure extra-attack / two-weapon / pounce
 * strikes, attack-roll replacements (Sense Motive vs AC, roll-twice), and
 * purely narrative / ally-coordination effects.
 *
 * NOTE on no present STRIKE granting a flat to-hit BONUS for a normal swing:
 * the +atk seen here is the charge self-buff (Panthera on the Hunt), a sweep's
 * insight (Silver Crane's Spiral), a luck self-buff (Woedrinker), or a penalty
 * (Furious Primal Wrath). Clean +atk "this hits better" riders live on Boosts.
 */

export interface StrikeEffect {
  /** bonus (or penalty) to the attack roll */
  atkBonus?: number;
  /** flat bonus to the damage roll (rides the dmgAdjust channel) */
  dmgBonus?: number;
  /** extra damage dice appended to the damage string, e.g. "+2d6" / "+1d6 profane" */
  extraDamageDice?: string;
  /** treat the attack as keen / expanded threat (unused by present strikes) */
  expandThreat?: boolean;
  /** non-numeric rider surfaced on the attack line (saves, prone, auto-hit…) */
  riderText?: string;
  /** one-line summary for the maneuver tab */
  note?: string;
}

export const STRIKE_EFFECTS: Record<string, StrikeEffect> = {
  /* ───────────────────────── Black Seraph ───────────────────────── */
  "black-seraph:gutstrike": {
    riderText:
      "Adds your initiation modifier to the damage; Fortitude (DC 11 + init) or sickened 1 round.",
    note: "+init mod damage; sicken",
  },
  "black-seraph:ravaging-blow": {
    extraDamageDice: "+1d6 profane",
    riderText: "Will (DC 11 + init) or shaken 1 round.",
    note: "+1d6 profane; shaken",
  },
  "black-seraph:voracious-drive": {
    extraDamageDice: "+1d6",
    riderText: "On a charge (no AoO).",
    note: "+1d6 charge",
  },
  "black-seraph:inner-demon-strike": {
    extraDamageDice: "+4d6 profane",
    riderText: "You take 1d6 damage.",
    note: "+4d6 profane; 1d6 self",
  },
  "black-seraph:seraph-s-wrath": {
    extraDamageDice: "+2d6",
    riderText: "Reflex save (DC 12 + init) or knocked prone.",
    note: "+2d6 damage; prone on failed Reflex",
  },
  "black-seraph:savage-drive": {
    extraDamageDice: "+4d6",
    riderText: "On a charge (no AoO).",
    note: "+4d6 charge",
  },
  "black-seraph:tendon-rip": {
    extraDamageDice: "+2d6",
    riderText: "Halves the target's move speed for your init mod in rounds.",
    note: "+2d6; slow",
  },
  "black-seraph:bilious-strike": {
    extraDamageDice: "+6d6 profane",
    riderText:
      "Target nauseated for your init mod in rounds (Fortitude DC 14 + init reduces to 1 round).",
    note: "+6d6 profane; nauseate",
  },
  "black-seraph:sharing-the-dark-soul": {
    extraDamageDice: "+8d6 profane",
    riderText: "Fortitude (DC 15 + init) or dazed 1 round.",
    note: "+8d6 profane; daze",
  },
  "black-seraph:sensory-rip": {
    riderText: "1d4 Charisma damage; Reflex (DC 15 + init) or blinded.",
    note: "1d4 Cha; blind",
  },
  "black-seraph:abyssal-drive": {
    extraDamageDice: "+8d6",
    riderText:
      "Charge (no AoO); Fortitude (DC 16 + init) or sickened 1d4 rounds.",
    note: "+8d6 charge; sicken",
  },
  "black-seraph:consumption-strike": {
    extraDamageDice: "+10d6 profane",
    riderText: "You gain temporary hp equal to the damage dealt.",
    note: "+10d6 profane; temp hp",
  },
  "black-seraph:charge-of-the-ravager": {
    extraDamageDice: "+2d6",
    riderText: "One attack against each opponent along your charge path.",
    note: "+2d6 per hit; charge line",
  },
  "black-seraph:soul-crusher": {
    riderText: "3d4 Charisma damage.",
    note: "3d4 Cha damage",
  },
  "black-seraph:black-seraph-onslaught": {
    extraDamageDice: "+4d6 profane",
    riderText: "Per successful attack.",
    note: "+4d6 profane per hit",
  },

  /* ───────────────────────── Broken Blade ───────────────────────── */
  "broken-blade:pommel-bash": {
    extraDamageDice: "+1d6",
    riderText:
      "Unarmed attack resolved against the target's flat-footed AC; no extra damage vs crit-immune foes.",
    note: "+1d6; vs flat-footed AC",
  },
  "broken-blade:shards-of-iron-strike": {
    riderText:
      "Target is staggered for 1 round (in addition to normal damage).",
    note: "Staggered 1 round",
  },
  "broken-blade:cartwheel-axe-kick": {
    extraDamageDice: "+2d6",
    note: "+2d6 unarmed",
  },
  "broken-blade:steel-flurry-strike": {
    extraDamageDice: "+3d6",
    note: "+3d6 per hit",
  },
  "broken-blade:iron-axe-kick": {
    extraDamageDice: "+6d6",
    riderText: "Fortitude (DC 14 + init) or dazed 1d4 rounds.",
    note: "+6d6; daze",
  },
  "broken-blade:shards-of-steel-strike": {
    extraDamageDice: "+8d6",
    riderText:
      "Ignores DR; target bleeds 2d4/round for your init mod in rounds (DC 20 Heal ends).",
    note: "+8d6 (ignores DR); bleed",
  },
  "broken-blade:singing-steel-strike": {
    extraDamageDice: "+8d6",
    riderText:
      "Fortitude (DC 16 + init) or deafened and silenced 1d4 rounds (deafened 1 round on save).",
    note: "+8d6; deafen/silence",
  },
  "broken-blade:steel-axe-kick": {
    extraDamageDice: "+10d6",
    riderText: "Fortitude (DC 16 + init) or dazed 1d3 rounds.",
    note: "+10d6; daze",
  },
  "broken-blade:shards-of-adamantine-strike": {
    extraDamageDice: "+12d6",
    riderText:
      "Ignores DR/hardness; a living target makes a Fortitude save (DC 17 + init) or is nauseated 1d4 rounds.",
    note: "+12d6 (ignores DR); nauseate",
  },
  "broken-blade:spinning-flurry-rush": {
    extraDamageDice: "+4d6",
    riderText: "Two attacks at full BAB against each foe in reach.",
    note: "+4d6 per hit; sweep",
  },
  "broken-blade:spinning-adamantine-axe": {
    extraDamageDice: "+10d6",
    riderText:
      "One unarmed attack against each foe in range; ignores DR; struck foes are knocked prone.",
    note: "+10d6 (ignores DR); prone; sweep",
  },
  "broken-blade:storm-of-iron-fists-strike": {
    extraDamageDice: "+4d6",
    riderText:
      "Full attack; ignores DR; afterward the target makes a Fortitude save (DC 19 + init, +1 per hit landed) or drops to -1 hp.",
    note: "+4d6 per hit (ignores DR); death save",
  },

  /* ───────────────────────── Cursed Razor ───────────────────────── */
  "cursed-razor:stutter-strike": {
    riderText:
      "Will (DC 11 + init) or -4 on language-based checks and 25% verbal-spell failure for your IL in rounds; target is cursed regardless.",
    note: "Hamper casting; cursed",
  },
  "cursed-razor:woeful-burden": {
    riderText:
      "The target's movement speeds drop by 10 ft + 5 ft per four initiator levels.",
    note: "Slow",
  },
  "cursed-razor:mockery": {
    extraDamageDice: "+1d6",
    riderText: "If the target is cursed, the extra damage is 3d6 instead.",
    note: "+1d6 (3d6 if cursed)",
  },
  "cursed-razor:torment-the-weak": {
    extraDamageDice: "+1d6",
    riderText:
      "If the target is cursed, it also takes 1d6 each round at the start of its turn for your init mod in rounds.",
    note: "+1d6; bleed if cursed",
  },
  "cursed-razor:dogpile-strike": {
    extraDamageDice: "+2d6",
    riderText:
      "Reflex save (DC 13 + init) or knocked prone. If the target is flanked, this strike's extra damage is 4d6 instead.",
    note: "+2d6 (4d6 if flanked); prone on failed Reflex",
  },
  "cursed-razor:huntsman-s-curse": {
    riderText:
      "Will (DC 13 + init) or cursed and staggered for your IL in rounds (-1 attack/Reflex/AC, half speed).",
    note: "Curse + stagger",
  },
  "cursed-razor:hangman-s-curse": {
    riderText:
      "Fortitude (DC 14 + init) or cursed and exhausted for your IL in rounds.",
    note: "Curse + exhaust",
  },
  "cursed-razor:persecution": {
    extraDamageDice: "+4d6",
    riderText: "If the target is cursed, the extra damage is 8d8 instead.",
    note: "+4d6 (8d8 if cursed)",
  },
  "cursed-razor:festering-curse": {
    extraDamageDice: "+4d6",
    riderText:
      "Target becomes cursed; each turn Fortitude (DC 15 + init) or takes 2d6 for your init mod in rounds.",
    note: "+4d6; curse rot",
  },
  "cursed-razor:witch-s-revenge": {
    riderText:
      "Fortitude (DC 15 + init) or -4 to an ability score of your choice; target cursed regardless.",
    note: "Ability penalty; cursed",
  },
  "cursed-razor:curse-of-chains": {
    riderText:
      "Will (DC 16 + init) or cursed and paralyzed for your init mod in rounds; foes ending their turn adjacent risk the same.",
    note: "Curse + paralyze",
  },
  "cursed-razor:warlock-s-blow": {
    extraDamageDice: "+8d6",
    riderText:
      "Will (DC 16 + init) or the target is teleported to an open space within your reach.",
    note: "+8d6; teleport",
  },
  "cursed-razor:black-dog-s-due": {
    extraDamageDice: "+8d6",
    riderText:
      "Reflex (DC 17 + init) or knocked prone. If the target is flanked, the extra damage is 12d6 instead.",
    note: "+8d6 (12d6 if flanked); prone",
  },
  "cursed-razor:traitor-s-roar": {
    riderText:
      "Will (DC 17 + init) or the target spends a standard action to harm or hinder its own allies.",
    note: "Turn-traitor",
  },
  "cursed-razor:woedrinker": {
    atkBonus: 2,
    dmgBonus: 2,
    riderText: "You gain concealment (20% miss chance) for 1 minute.",
    note: "+2 luck atk/dmg; concealment",
  },
  "cursed-razor:unending-nightmare-strike": {
    riderText:
      "4 points of damage to the target's Int, Wis, and Cha; each turn Will (DC 18 + init) or another 4 to each.",
    note: "Mental ability drain",
  },
  "cursed-razor:festival-of-shadows": {
    extraDamageDice: "+10d6",
    riderText:
      "All foes in range Reflex (DC 19 + init) or immobilized (speed 0) for your init mod in rounds; if the target is cursed, the extra damage is 12d8.",
    note: "+10d6; mass immobilize",
  },

  /* ─────────────────────── Eternal Guardian ─────────────────────── */
  "eternal-guardian:guard-s-oath": {
    riderText:
      "Will (DC 11 + init) or cursed and unable to leave your threatened area without provoking, for 24 hours.",
    note: "Curse: can't disengage",
  },
  "eternal-guardian:strike-of-the-infinite-protector": {
    riderText: "An ally within 30 ft gains +2 AC for 1 round.",
    note: "Ally +2 AC",
  },
  "eternal-guardian:terrifying-blow": {
    riderText:
      "Will (DC 11 + init) or frightened 1 round; if the target is cursed, this attack also deals +1d6.",
    note: "Frighten; +1d6 if cursed",
  },
  "eternal-guardian:relentless-warden-s-strike": {
    extraDamageDice: "+2d6",
    riderText:
      "You may teleport up to 60 ft to within 10 ft of a cowering / cursed / shaken / frightened / panicked creature.",
    note: "+2d6; teleport to fear",
  },
  "eternal-guardian:strike-of-the-royal-guardian": {
    riderText:
      "Target becomes cursed, taking -2 on weapon damage rolls while cursed.",
    note: "Curse: -2 damage",
  },
  "eternal-guardian:grim-guard-s-laughter": {
    extraDamageDice: "+4d6",
    riderText:
      "Make one Intimidate (demoralize) check against every opponent within 30 ft.",
    note: "+4d6; mass demoralize",
  },
  "eternal-guardian:strike-of-the-steadfast-legion": {
    riderText:
      "Adds ½ your IL to the damage; all allies within 60 ft gain DR/- equal to your init mod (min 1) for 1 round.",
    note: "+½ IL dmg; ally DR",
  },
  "eternal-guardian:shackles-of-the-condemned": {
    extraDamageDice: "+5d6",
    riderText: "Target becomes cursed and entangled for your IL in rounds.",
    note: "+5d6; curse + entangle",
  },
  "eternal-guardian:charge-of-dismay": {
    extraDamageDice: "+6d6",
    riderText:
      "All opponents within 30 ft Will (DC 16 + init) or frightened 1d4 rounds (shaken 1 minute after).",
    note: "+6d6; mass fear",
  },
  "eternal-guardian:strike-of-sacrifice": {
    extraDamageDice: "+6d6",
    riderText:
      "You may lower your AC by up to ½ IL to grant all allies within 30 ft an equal AC bonus.",
    note: "+6d6; share AC",
  },
  "eternal-guardian:curse-of-impending-doom": {
    extraDamageDice: "+6d6",
    riderText:
      "Target cursed 24 hours; on a failed roll it risks Will (DC 17 + init) or panicked 1 round.",
    note: "+6d6; curse of doom",
  },
  "eternal-guardian:hammer-of-the-immortal": {
    extraDamageDice: "+8d6",
    riderText: "Target takes -4 AC and CMB until the start of your next turn.",
    note: "+8d6; -4 AC/CMB",
  },

  /* ───────────────────────── Golden Lion ────────────────────────── */
  "golden-lion:call-to-action": {
    extraDamageDice: "+2d6",
    riderText: "An adjacent ally gains an immediate move action.",
    note: "+2d6; ally move",
  },
  "golden-lion:distracting-strike": {
    extraDamageDice: "+2d6",
    riderText: "Target is left flat-footed until its next turn.",
    note: "+2d6; flat-footed",
  },
  "golden-lion:pyrite-strike": {
    extraDamageDice: "+1d6",
    riderText:
      "Target makes a 5-ft. forced move of your choice, provoking attacks of opportunity from all but you (or just takes the damage if it cannot move).",
    note: "+1d6 damage; forced 5-ft. move",
  },
  "golden-lion:pack-pounce": {
    riderText:
      "+5 circumstance damage per ally adjacent to the target (maximum +15).",
    note: "+5/ally damage (max +15)",
  },
  "golden-lion:charge-of-the-battle-cat": {
    extraDamageDice: "+4d6",
    riderText: "On a charge; Reflex (DC 14 + init) or knocked prone.",
    note: "+4d6 charge; prone",
  },
  "golden-lion:golden-swipe": {
    extraDamageDice: "+6d6",
    riderText:
      "Forces the foe to move 10 ft (or just takes the damage if it cannot move).",
    note: "+6d6; forced 10-ft move",
  },
  "golden-lion:roar-of-battle": {
    extraDamageDice: "+6d6",
    riderText: "Allies attacking the target deal +3d6 for 1 round.",
    note: "+6d6; allies +3d6",
  },
  "golden-lion:strategic-blow": {
    extraDamageDice: "+8d6",
    riderText: "Grants an ally within 10 ft an immediate benefit.",
    note: "+8d6; ally benefit",
  },
  "golden-lion:orichalcum-swipe": {
    extraDamageDice: "+12d6",
    riderText:
      "Forces the foe up to twice its speed in a line of your choice (or just takes the damage if it cannot move).",
    note: "+12d6; long forced move",
  },
  "golden-lion:war-lion-s-charge": {
    extraDamageDice: "+14d6",
    riderText: "Charge (no AoO); Fortitude (DC 17 + init) or stunned 1 round.",
    note: "+14d6 charge; stun",
  },

  /* ───────────────────────── Iron Tortoise ──────────────────────── */
  "iron-tortoise:angering-smash": {
    riderText:
      "Shield bash; the target takes -4 on attack rolls against anyone but you.",
    note: "Taunt: -4 vs others",
  },
  "iron-tortoise:snapping-strike": {
    extraDamageDice: "+1d6",
    note: "+1d6",
  },
  "iron-tortoise:throwing-shell": {
    extraDamageDice: "+1d6",
    riderText:
      "Ranged shield throw (shield-bash damage); the shield lands adjacent to the target.",
    note: "+1d6; thrown shield",
  },
  "iron-tortoise:enraging-strike": {
    dmgBonus: 10,
    riderText:
      "Will (DC 12 + init) or the target must attack you on its next action.",
    note: "+10 damage; enrage",
  },
  "iron-tortoise:ricochet-shell": {
    extraDamageDice: "+3d6",
    riderText:
      "Shield-bash throw that bounces to further targets (+2d6 the second target, +1d6 the third) with the same roll.",
    note: "+3d6; bouncing shield",
  },
  "iron-tortoise:greater-snapping-strike": {
    extraDamageDice: "+3d6",
    riderText: "Ignores the target's DR.",
    note: "+3d6 (ignores DR)",
  },
  "iron-tortoise:smashing-shell": {
    extraDamageDice: "+4d6",
    riderText: "Shield bash; Fortitude (DC 14 + init) or dazed.",
    note: "+4d6 shield; daze",
  },
  "iron-tortoise:shell-shock": {
    extraDamageDice: "+6d6",
    riderText:
      "Shield bash; Reflex (DC 15 + init) or knocked up to 20 ft away and prone.",
    note: "+6d6 shield; knockback/prone",
  },
  "iron-tortoise:vicious-snapping-strike": {
    extraDamageDice: "+5d6",
    riderText: "Halves the target's move speed for its turn.",
    note: "+5d6; slow",
  },
  "iron-tortoise:snapping-turtle-rush": {
    extraDamageDice: "+8d6",
    riderText:
      "Charge with your shield; Reflex (DC 16 + init) or knocked prone.",
    note: "+8d6 shield charge; prone",
  },
  "iron-tortoise:cyclonic-shell-crush": {
    extraDamageDice: "+7d6",
    riderText:
      "Shield bash against all adjacent foes; Fortitude (DC 17 + init) or dazed 1d4 rounds.",
    note: "+7d6 shield sweep; daze",
  },
  "iron-tortoise:glorious-shell-shock": {
    extraDamageDice: "+8d6",
    riderText:
      "One shield-bash roll against up to three adjacent foes; struck foes are sent up to 20 ft.",
    note: "+8d6 shield; knockback",
  },

  /* ─────────────────────── Mithral Current ──────────────────────── */
  "mithral-current:swift-current": {
    extraDamageDice: "+1d6",
    note: "+1d6",
  },
  "mithral-current:iron-wave": {
    extraDamageDice: "+2d6",
    riderText:
      "Will (DC 12 + init) or vulnerable to silver (+50% silver damage) until the end of your next turn.",
    note: "+2d6; silver-vulnerable",
  },
  "mithral-current:riptide-strike": {
    extraDamageDice: "+2d6",
    riderText:
      "If you drew your weapon for this strike, a free trip attempt (+2) that doesn't provoke.",
    note: "+2d6; free trip",
  },
  "mithral-current:rippling-current": {
    extraDamageDice: "+3d6",
    note: "+3d6",
  },
  "mithral-current:salt-breeze-strike": {
    extraDamageDice: "+3d6",
    note: "+3d6",
  },
  "mithral-current:blinding-reflection": {
    extraDamageDice: "+6d6",
    riderText:
      "If you drew your weapon, Fortitude (DC 14 + init) or blinded 1 minute (dazzled 1 round on save).",
    note: "+6d6; blind",
  },
  "mithral-current:silver-wave": {
    extraDamageDice: "+6d6",
    riderText:
      "If you drew your weapon, strike at close range; Will (DC 14 + init) or vulnerable to silver.",
    note: "+6d6; reach + silver-vuln",
  },
  "mithral-current:rapid-current": {
    extraDamageDice: "+3d6",
    riderText: "Each attack that hits gains the bonus damage.",
    note: "+3d6 per hit",
  },
  "mithral-current:whirlpool-strike": {
    extraDamageDice: "+3d6",
    riderText: "Hits up to two targets in reach with the same roll.",
    note: "+3d6; two targets",
  },
  "mithral-current:crashing-wake": {
    extraDamageDice: "+4d6",
    note: "+4d6",
  },
  "mithral-current:quicksilver-wave": {
    extraDamageDice: "+8d6",
    riderText:
      "If you drew your weapon, strike at close range; Will (DC 16 + init) or vulnerable to silver; free trip (+init mod) that doesn't provoke.",
    note: "+8d6; reach + silver-vuln + trip",
  },
  "mithral-current:blade-of-the-silver-sea": {
    extraDamageDice: "+8d6",
    riderText:
      "If you drew your weapon, the attack counts as silver, auto-overcomes DR, and suppresses fast healing/regeneration for your init mod in rounds.",
    note: "+8d6; silver; suppress regen",
  },
  "mithral-current:raging-whirlpool-strike": {
    extraDamageDice: "+5d6",
    riderText: "Hits up to two targets in reach.",
    note: "+5d6; two targets",
  },
  "mithral-current:mithral-wave": {
    extraDamageDice: "+14d6",
    riderText:
      "If you drew your weapon, close range; Fort or dazed 1d4, Reflex or prone, Will or vulnerable to silver (DC 18 + init).",
    note: "+14d6; triple save",
  },
  "mithral-current:riptide-slice": {
    extraDamageDice: "+12d6",
    note: "+12d6",
  },

  /* ────────────────────── Piercing Thunder ──────────────────────── */
  "piercing-thunder:bronze-lancet-charge": {
    extraDamageDice: "+1d6",
    riderText: "On a charge.",
    note: "+1d6 charge",
  },
  "piercing-thunder:throwing-thunder": {
    extraDamageDice: "+2d6",
    riderText: "Thrown weapon; Reflex (DC 12 + init) or knocked prone.",
    note: "+2d6 thrown; prone",
  },
  "piercing-thunder:thunderous-fall": {
    extraDamageDice: "+2d6",
    riderText:
      "If the target is mounted, Reflex (DC 12 + init) or dismounted and prone; otherwise a free trip (+2).",
    note: "+2d6; dismount/trip",
  },
  "piercing-thunder:goring-strike": {
    extraDamageDice: "+2d6",
    riderText: "Hits up to two targets; Fortitude (DC 13 + init) or 1d4 bleed.",
    note: "+2d6; bleed; two targets",
  },
  "piercing-thunder:piercing-thunder-hammer": {
    extraDamageDice: "+2d6",
    riderText: "Reflex (DC 13 + init) or knocked prone.",
    note: "+2d6; prone",
  },
  "piercing-thunder:iron-lancet-charge": {
    extraDamageDice: "+6d6",
    riderText: "Charge (no AoO); Reflex (DC 14 + init) or knocked prone.",
    note: "+6d6 charge; prone",
  },
  "piercing-thunder:leaping-strike": {
    extraDamageDice: "+6d6",
    note: "+6d6",
  },
  "piercing-thunder:twisting-lance": {
    extraDamageDice: "+5d6",
    riderText:
      "First a trip attempt (+4, no AoO); on success, a free melee attack carrying this bonus damage.",
    note: "+5d6 after a trip",
  },
  "piercing-thunder:meteor-spiral-thrust": {
    extraDamageDice: "+8d6",
    riderText:
      "Overcomes DR; Fortitude (DC 15 + init) or nauseated 1d3 rounds.",
    note: "+8d6 (overcomes DR); nauseate",
  },
  "piercing-thunder:glorious-thunder-charge": {
    extraDamageDice: "+8d6",
    riderText: "Fortitude (DC 16 + init) or nauseated 1d3 rounds.",
    note: "+8d6; nauseate",
  },
  "piercing-thunder:impaling-comet-strike": {
    extraDamageDice: "+6d6",
    riderText: "Hits up to two targets; overcomes DR.",
    note: "+6d6 (overcomes DR); two targets",
  },
  "piercing-thunder:steel-lancer-s-edge": {
    extraDamageDice: "+8d6",
    riderText: "Overcomes DR.",
    note: "+8d6 (overcomes DR)",
  },
  "piercing-thunder:leaping-thunder-crash": {
    dmgBonus: 35,
    riderText: "Fortitude (DC 17 + init) or drops held items (as disarmed).",
    note: "+35 damage; disarm",
  },
  "piercing-thunder:rush-to-the-fray": {
    extraDamageDice: "+5d6",
    riderText:
      "Charge ignoring difficult terrain; or +5 on a combat maneuver check instead.",
    note: "+5d6 charge",
  },
  "piercing-thunder:thundering-lancer-s-blow": {
    extraDamageDice: "+12d6",
    riderText:
      "Free bull rush; if it succeeds, the target is knocked prone at the end of its movement.",
    note: "+12d6; bull rush/prone",
  },

  /* ───────────────────────── Primal Fury ────────────────────────── */
  "primal-fury:crushing-blow": {
    extraDamageDice: "+1d6",
    riderText: "Fortitude (DC 11 + init) or flat-footed until its next turn.",
    note: "+1d6; flat-footed",
  },
  "primal-fury:panthera-on-the-hunt": {
    atkBonus: 2,
    dmgBonus: 2,
    riderText:
      "On a charge; you ignore attacks of opportunity from moving through threatened squares.",
    note: "+2 atk/dmg on a charge",
  },
  "primal-fury:primal-wrath": {
    dmgBonus: 4,
    riderText: "+6 instead if wielding the weapon two-handed.",
    note: "+4 damage (+6 two-handed)",
  },
  "primal-fury:crippling-strike": {
    extraDamageDice: "+2d6",
    riderText: "Target bleeds 1d3/round (DC 15 Heal or healing ends).",
    note: "+2d6; bleed",
  },
  "primal-fury:devastating-rush": {
    extraDamageDice: "+2d6",
    riderText: "Ignores DR/hardness.",
    note: "+2d6 (ignores DR)",
  },
  "primal-fury:disparity-blow": {
    extraDamageDice: "+2d6",
    riderText: "A free trip attempt (+4) that doesn't provoke.",
    note: "+2d6; free trip",
  },
  "primal-fury:frenzy-strike": {
    extraDamageDice: "+2d6",
    note: "+2d6 per hit",
  },
  "primal-fury:furious-primal-wrath": {
    atkBonus: -4,
    dmgBonus: 20,
    riderText: "+35 damage instead if wielding the weapon two-handed.",
    note: "+20 damage; -4 atk",
  },
  "primal-fury:impaling-strike": {
    extraDamageDice: "+4d6",
    riderText:
      "Ignores DR; Fortitude (DC 14 + init) or 1d4 Constitution damage (not vs crit-immune foes).",
    note: "+4d6 (ignores DR); Con damage",
  },
  "primal-fury:cornered-frenzy-strike": {
    extraDamageDice: "+4d6",
    riderText:
      "Full attack with each wielded weapon against each foe in reach.",
    note: "+4d6 per hit; sweep",
  },
  "primal-fury:dizzying-blow": {
    extraDamageDice: "+10d6",
    riderText: "Charge; Fortitude (DC 15 + init) or nauseated 1d4 rounds.",
    note: "+10d6 charge; nauseate",
  },
  "primal-fury:charge-of-the-battle-panthera": {
    extraDamageDice: "+12d6",
    riderText: "Charge; Reflex (DC 16 + init) or knocked prone.",
    note: "+12d6 charge; prone",
  },
  "primal-fury:shield-breaking-strike": {
    riderText:
      "Inflicts the broken condition on the target's armor or shield (-4 to that bonus until repaired).",
    note: "Break armor/shield",
  },
  "primal-fury:blood-spray-strike": {
    extraDamageDice: "+8d6",
    riderText: "2d4 Constitution damage (not vs crit-immune foes).",
    note: "+8d6; Con damage",
  },
  "primal-fury:primal-frenzy": {
    extraDamageDice: "+6d6",
    riderText:
      "Full attack with each wielded weapon against each foe in reach.",
    note: "+6d6 per hit; sweep",
  },
  "primal-fury:wrath-of-the-primal-hunter": {
    extraDamageDice: "+4d6",
    riderText: "Each attack ignores DR.",
    note: "+4d6 per hit (ignores DR)",
  },

  /* ───────────────────────── Scarlet Throne ─────────────────────── */
  "scarlet-throne:garnet-lance": {
    extraDamageDice: "+2d6",
    riderText: "Automatically bypasses the target's DR.",
    note: "+2d6 (bypasses DR)",
  },
  "scarlet-throne:dazing-attack": {
    extraDamageDice: "+3d6",
    riderText: "Fortitude (DC 13 + init) or dazed 1 round.",
    note: "+3d6; daze",
  },
  "scarlet-throne:strike-of-defeat": {
    riderText:
      "If the foe is below 75% hp, +4d6; if below 25% hp, +8d6 instead (no extra damage above 75%).",
    note: "Execute: +4d6/+8d6 by foe hp",
  },
  "scarlet-throne:weeping-scarlet-razor": {
    extraDamageDice: "+4d6",
    riderText: "Target bleeds 4/round (DC 20 Heal or healing ends).",
    note: "+4d6; heavy bleed",
  },
  "scarlet-throne:riddle-of-iron": {
    extraDamageDice: "+5d6",
    riderText: "Will (DC 15 + init) or dazed 1 round.",
    note: "+5d6; daze",
  },
  "scarlet-throne:blade-of-perfection": {
    riderText:
      "This attack automatically hits and ignores damage reduction; treat it as a natural 20 against counters that oppose an attack roll.",
    note: "Auto-hits; ignores DR",
  },
  "scarlet-throne:final-blow": {
    riderText:
      "Resolved as a critical hit; if the foe is at or below 25% of its max hp, Fortitude (DC 10 + damage dealt) or it dies.",
    note: "Auto-crit; death if ≤25% hp",
  },
  "scarlet-throne:sanguine-proclamation": {
    extraDamageDice: "+10d6",
    riderText: "Will (DC 17 + init) or driven to its knees (knocked prone).",
    note: "+10d6; prone",
  },
  "scarlet-throne:riddle-of-steel": {
    extraDamageDice: "+10d6",
    riderText: "Will (DC 18 + init) or stunned 1d4 rounds.",
    note: "+10d6; stun",
  },
  "scarlet-throne:heavenly-blade-of-the-scarlet-throne": {
    dmgBonus: 100,
    riderText: "Will save (DC 19 + init) or paralyzed for 1d4 rounds.",
    note: "+100 damage; paralysis on failed Will",
  },

  /* ───────────────────────── Silver Crane ───────────────────────── */
  "silver-crane:enduring-crane-strike": {
    riderText: "Heals you or an ally within 30 ft for 1d6 + your init mod.",
    note: "Heal 1d6 + init",
  },
  "silver-crane:flashing-wings": {
    extraDamageDice: "+1d4",
    riderText: "Target is dazzled 1 round.",
    note: "+1d4; dazzle",
  },
  "silver-crane:blessed-pinions": {
    extraDamageDice: "+2d6 sacred",
    riderText: "Counts as good-aligned for overcoming DR.",
    note: "+2d6 sacred",
  },
  "silver-crane:emerald-displacement-strike": {
    riderText:
      "Fortitude (DC 12 + init) or -4 Perception and 20% miss chance for your init mod in rounds.",
    note: "Disorient: -4 Perception, miss",
  },
  "silver-crane:exorcism-strike": {
    extraDamageDice: "+2d6",
    riderText:
      "Against undead or evil outsiders the bonus is +6d6 sacred instead, with Fortitude (DC 13 + init) or dazed 1 round.",
    note: "+2d6 (+6d6 sacred vs undead/evil outsider)",
  },
  "silver-crane:silver-knight-s-blade": {
    extraDamageDice: "+4d6 sacred",
    riderText: "Heals you or an ally within 30 ft an equal amount.",
    note: "+4d6 sacred; heal",
  },
  "silver-crane:sacred-pinions": {
    extraDamageDice: "+5d6",
    note: "+5d6",
  },
  "silver-crane:sapphire-displacement-strike": {
    riderText:
      "Fortitude (DC 14 + init) or auto-fail Perception and 50% miss chance for your init mod in rounds.",
    note: "Disorient: blind-fight",
  },
  "silver-crane:argent-knight-s-banner": {
    extraDamageDice: "+8d6",
    riderText: "Heals you and all allies within 30 ft for 4d6.",
    note: "+8d6; party heal 4d6",
  },
  "silver-crane:silver-crane-s-spiral": {
    atkBonus: 2,
    riderText:
      "One attack at full BAB (+2 insight) against each adjacent or threatened enemy.",
    note: "+2 atk; hits all adjacent",
  },
  "silver-crane:argent-king-s-scepter": {
    extraDamageDice: "+12d6",
    riderText: "Heals you for 60.",
    note: "+12d6; heal 60",
  },
  "silver-crane:holy-pinions": {
    extraDamageDice: "+10d6",
    riderText:
      "Will (DC 16 + init) or made corporeal and stunned for your init mod in rounds.",
    note: "+10d6; corporeal + stun",
  },
  "silver-crane:diamond-displacement-strike": {
    riderText: "Will (DC 17 + init) or permanently blinded and deafened.",
    note: "Blind + deafen",
  },
  "silver-crane:celestial-pinions": {
    extraDamageDice: "+15d6",
    riderText:
      "Against a possessing fiend or incorporeal creature: Will (DC 18 + init) or instantly slain.",
    note: "+15d6; slay incorporeal",
  },
  "silver-crane:strike-of-silver-exorcism": {
    dmgBonus: 80,
    riderText:
      "80 sacred damage; dazzles 1 round. Undead and evil outsiders take 120 instead and Will (DC 19 + init) or are slain.",
    note: "+80 sacred; dazzle",
  },

  /* ─────────────────────── Thrashing Dragon ─────────────────────── */
  "thrashing-dragon:offensive-roll": {
    extraDamageDice: "+1d6",
    riderText: "Target is treated as flat-footed.",
    note: "+1d6; flat-footed",
  },
  "thrashing-dragon:wyrmling-s-fang": {
    extraDamageDice: "+1d6",
    note: "+1d6 damage on a successful thrown attack",
  },
  "thrashing-dragon:ancient-s-fang": {
    extraDamageDice: "+4d6",
    note: "+4d6",
  },
  "thrashing-dragon:fangs-strike-low": {
    riderText:
      "Halves the target's land speed; 1d6 bleed/round for 3 rounds (DC 15 Heal or healing ends).",
    note: "Slow; bleed",
  },
  "thrashing-dragon:vicious-swipe": {
    extraDamageDice: "+3d6",
    riderText: "Fortitude (DC 13 + init) or dazed 1d4 rounds.",
    note: "+3d6; daze",
  },
  "thrashing-dragon:devastation-roll": {
    extraDamageDice: "+6d6",
    riderText: "Resolved against the target's flat-footed AC.",
    note: "+6d6; vs flat-footed AC",
  },
  "thrashing-dragon:dragon-assault": {
    extraDamageDice: "+1d6",
    riderText:
      "Full attack; each successive hit adds +1d6 more than the last (to a maximum of +5d6).",
    note: "+1d6 escalating",
  },
  "thrashing-dragon:great-wyrm-s-fang": {
    extraDamageDice: "+9d6",
    note: "+9d6",
  },
  "thrashing-dragon:tail-slap": {
    extraDamageDice: "+6d6",
    riderText:
      "Adds your unarmed strike damage; Fortitude or stunned (dazed 1 round on save).",
    note: "+6d6; stun",
  },
  "thrashing-dragon:thrashing-blades": {
    extraDamageDice: "+2d6",
    note: "+2d6 per hit",
  },
  "thrashing-dragon:deadly-dragon-strike": {
    extraDamageDice: "+12d6",
    riderText:
      "Two attacks at full BAB; on a hit, Fortitude (DC 19 + init) or instantly slain (a death effect; not vs precision-immune foes).",
    note: "+12d6; death strike",
  },
};

export function strikeEffect(id: string): StrikeEffect | undefined {
  return STRIKE_EFFECTS[id];
}

/**
 * Strikes deliberately left reference-only (their action text renders, but they
 * do not arm) — they do not ride a single normal attack's damage line. Recorded
 * with a reason so the corpus triage is provably complete (scripts/strike-
 * verify.mjs checks every corpus Strike is either modelled or listed here).
 */
export const STRIKE_REFERENCE_ONLY: Record<string, string> = {
  // extra-attack / two-weapon / full-attack / pounce mechanics
  "broken-blade:flurry-strike":
    "two attacks at full BAB; no single-attack rider",
  "mithral-current:dual-crash": "optional second attack; no damage rider",
  "primal-fury:raging-hunter-pounce": "pounce (charge + full attack)",
  "scarlet-throne:ruby-battle-lord-s-strike": "full attack at full BAB",
  "thrashing-dragon:swift-claws": "two-weapon extra attack",
  "thrashing-dragon:thrashing-dragon-twist": "two-weapon attack vs each foe",
  "thrashing-dragon:thrashing-dragon-frenzy":
    "four two-weapon attacks vs each foe",
  // multi-target / sweep with NO bonus damage (just normal damage spread)
  "mithral-current:tidal-blade": "one roll vs two creatures; normal damage",
  "piercing-thunder:piercing-strike":
    "extended reach, two creatures; normal damage",
  "scarlet-throne:scything-strike": "one attack vs two adjacent; normal damage",
  // maneuver-attempt strikes (damage rides the maneuver, not a weapon hit)
  "broken-blade:knuckle-to-the-blade": "free disarm attempt",
  "broken-blade:leg-sweeping-hilt": "trip attempt",
  "broken-blade:iron-breaking-palm": "sunder; damage to the item",
  "broken-blade:iron-monger-s-throw": "throws the foe; fall damage",
  "broken-blade:meteoric-throw": "grapple then throw; impact damage",
  "iron-tortoise:tactical-snap": "free trip attempt",
  "primal-fury:shoulder-rush": "bull rush / overrun attempt",
  "primal-fury:meteoric-collision":
    "bull rush; damage on a successful maneuver",
  "primal-fury:meteoric-crash":
    "bull rush; damage + prone on a successful maneuver",
  "scarlet-throne:blade-of-breaking": "disarm / sunder attempt",
  "thrashing-dragon:flick-of-the-wrist": "two attacks then a disarm combo",
  "thrashing-dragon:sweeping-tail":
    "trip; fall damage on a successful maneuver",
  // ranged-touch / AoE-burst / cone / line strikes (the maneuver's own damage)
  "black-seraph:shadow-feather-strike": "ranged touch attack; its own damage",
  "black-seraph:abyssal-lance": "ranged touch attack; its own damage",
  "black-seraph:void-seraph-strike": "ranged touch; recurring damage",
  "black-seraph:armageddon-lance": "ranged touch attack; its own damage",
  "black-seraph:circle-of-razor-feathers": "AoE needle burst",
  "black-seraph:shadow-raptor-swarm": "30-ft cone",
  "black-seraph:apocalyptic-strike": "40-ft radius burst",
  "iron-tortoise:throwing-shell-cyclone": "AoE shield throw (Reflex for half)",
  "piercing-thunder:throwing-comet": "thrown-weapon 30-ft line",
  "piercing-thunder:piercing-charge-of-the-dread-lancer": "line charge AoE",
  // attack-roll replacements (Sense Motive vs AC) / roll-twice
  "scarlet-throne:rising-zenith-strike": "Sense Motive vs AC; ×2 damage",
  "scarlet-throne:ruby-zenith-strike": "Sense Motive vs AC; ×3 damage",
  "scarlet-throne:descending-sunset-strike": "Sense Motive vs AC; ×4 damage",
  "silver-crane:silver-strike": "roll the attack twice, take the better",
  // armor-bypass attack-resolution (no damage/condition rider)
  "piercing-thunder:armor-piercing-thrust": "resolves against reduced armor",
  // pure ally-coordination / positioning / aura (no self-attack modifier)
  "golden-lion:hunting-party": "grants an ally an attack of opportunity",
  "golden-lion:tactical-strike": "grants an ally a free 10-ft move",
  "golden-lion:harry-the-prey": "grants allies immediate attacks",
  "golden-lion:kill-the-wounded": "buffs allies' attacks, not the initiator's",
  "golden-lion:lion-lord-s-agony":
    "damage = missing hp; replaces weapon damage",
  "golden-lion:lord-of-the-pridelands": "party morale aura (AC/saves/scaling)",
  "scarlet-throne:red-zephyr-s-strike": "free 10-ft move; positioning only",
  "scarlet-throne:red-zephyr-s-dance": "attack, move, attack; positioning",
};
