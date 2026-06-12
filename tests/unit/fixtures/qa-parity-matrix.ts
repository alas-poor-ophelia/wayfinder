/**
 * The Quick Action parity matrix — shared by scripts/capture-qa-parity.mjs
 * (which ran computeAll at the PRE-conversion HEAD and froze the outputs
 * into quick-action-parity.json) and quick-action-parity.test.ts (which
 * proves the post-conversion computeAll reproduces them byte-for-byte,
 * both via the toggles fallback and via seeded quick actions).
 *
 * DO NOT edit cases without recapturing: the fixture is only meaningful
 * against the exact records this module builds.
 */

import {
  createDefaultCharacter,
  type CharacterRecord,
  type CombatToggles,
} from "../../../src/types/character";

export interface MatrixCase {
  name: string;
  record: CharacterRecord;
}

interface CaseSpec {
  name: string;
  /** archetype builder key */
  char: keyof typeof ARCHETYPES;
  toggles?: Partial<CombatToggles>;
  buffs?: string[];
  /** melee weapon enhancement (config field) */
  meleeEnh?: number;
  panache?: number;
}

const ARCHETYPES = {
  /** Adarin-shaped: Virtuous Bravo paladin with panache and high cha/dex.
   *  The legacy outputs were captured WITH the bravo AC bonus (the old
   *  sheet granted it to every paladin); now that the bonus lives behind
   *  the archetype, the fixture declares what was always true. */
  paladin5: (c: CharacterRecord) => {
    c.classes = [
      {
        className: "Paladin (Virtuous Bravo)",
        level: 5,
        archetypeKeys: ["virtuous-bravo"],
      },
    ];
    c.baseAbilities = { str: 14, dex: 18, con: 14, int: 13, wis: 8, cha: 20 };
    c.resources = [{ id: "panache", name: "Panache", current: 3, max: 5 }];
  },
  /** Same deal: the captured truth includes the bravo bonus at 11th (+3). */
  paladin11: (c: CharacterRecord) => {
    c.classes = [
      { className: "Paladin", level: 11, archetypeKeys: ["virtuous-bravo"] },
    ];
    c.baseAbilities = { str: 18, dex: 12, con: 14, int: 10, wis: 10, cha: 16 };
  },
  monk10: (c: CharacterRecord) => {
    c.classes = [{ className: "Monk (Unchained)", level: 10 }];
    c.baseAbilities = { str: 16, dex: 18, con: 14, int: 10, wis: 14, cha: 10 };
  },
  monk11: (c: CharacterRecord) => {
    c.classes = [{ className: "Monk (Unchained)", level: 11 }];
    c.baseAbilities = { str: 16, dex: 18, con: 14, int: 10, wis: 14, cha: 10 };
  },
  /** no paladin/monk levels: smite/precise/flurry dead-toggle cases */
  fighter8: (c: CharacterRecord) => {
    c.classes = [{ className: "Fighter", level: 8 }];
    c.baseAbilities = { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 };
  },
  /** str > dex AND dex > str variants for agile weapon */
  agileDex: (c: CharacterRecord) => {
    c.classes = [{ className: "Fighter", level: 6 }];
    c.baseAbilities = { str: 12, dex: 18, con: 14, int: 10, wis: 10, cha: 10 };
  },
  agileStr: (c: CharacterRecord) => {
    c.classes = [{ className: "Fighter", level: 6 }];
    c.baseAbilities = { str: 18, dex: 12, con: 14, int: 10, wis: 10, cha: 10 };
  },
  /** skald with Perform (Sing) + Bluff + Sense Motive for VP */
  skald6: (c: CharacterRecord) => {
    c.classes = [{ className: "Skald", level: 6 }];
    c.baseAbilities = { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 18 };
    c.skills = {
      "Perform (Sing)": { ability: "cha", ranks: 6, misc: 2, classSkill: true },
      Bluff: { ability: "cha", ranks: 1, misc: 0, classSkill: false },
      "Sense Motive": { ability: "wis", ranks: 0, misc: 0, classSkill: false },
    };
  },
} satisfies Record<string, (c: CharacterRecord) => void>;

const SONGS = [
  "Enhancement",
  "Defending",
  "Distance",
  "Flaming",
  "Frost",
  "Ghost Touch",
  "Keen",
  "Mighty Cleaving",
  "Returning",
  "Shock",
  "Seeking",
];

function specs(): CaseSpec[] {
  const list: CaseSpec[] = [
    // --- singles -----------------------------------------------------------
    { name: "baseline paladin5", char: "paladin5" },
    { name: "powerAttack bab5", char: "paladin5", toggles: { powerAttack: true } },
    { name: "powerAttack bab8", char: "fighter8", toggles: { powerAttack: true } },
    { name: "powerAttack bab11", char: "paladin11", toggles: { powerAttack: true } },
    { name: "fightingDefensively", char: "paladin5", toggles: { fightingDefensively: true } },
    { name: "fightingDefensively crane", char: "paladin5", toggles: { fightingDefensively: true, craneStyle: true } },
    { name: "charge", char: "paladin5", toggles: { charging: true } },
    { name: "flank", char: "paladin5", toggles: { flanking: true } },
    { name: "flurry monk10", char: "monk10", toggles: { flurryOfBlows: true } },
    { name: "flurry monk11", char: "monk11", toggles: { flurryOfBlows: true } },
    { name: "flurry no monk", char: "fighter8", toggles: { flurryOfBlows: true } },
    { name: "flurry monk10 shuriken", char: "monk10", toggles: { flurryOfBlows: true, rangedAttackStyle: "Shuriken" } },
    // --- smite -------------------------------------------------------------
    { name: "smite paladin5", char: "paladin5", toggles: { smiteEvil: true } },
    { name: "smite outsider paladin5", char: "paladin5", toggles: { smiteEvil: true, smiteEvilOutsider: true } },
    { name: "smite paladin11", char: "paladin11", toggles: { smiteEvil: true } },
    { name: "smite no paladin", char: "fighter8", toggles: { smiteEvil: true } },
    { name: "smite outsider ray", char: "paladin5", toggles: { smiteEvil: true, smiteEvilOutsider: true, rangedAttackStyle: "Ray" } },
    // --- precise strike ----------------------------------------------------
    { name: "precise panache3", char: "paladin5", toggles: { preciseStrike: true } },
    { name: "precise double panache3", char: "paladin5", toggles: { preciseStrike: true, doublePreciseStrike: true } },
    { name: "precise panache0", char: "paladin5", toggles: { preciseStrike: true }, panache: 0 },
    { name: "precise shuriken", char: "paladin5", toggles: { preciseStrike: true, rangedAttackStyle: "Shuriken" } },
    // --- agile / VP --------------------------------------------------------
    { name: "agile dex>str", char: "agileDex", toggles: { agileWeapon: true } },
    { name: "agile str>dex", char: "agileStr", toggles: { agileWeapon: true } },
    { name: "versatilePerformance", char: "skald6", toggles: { versatilePerformance: true } },
    // --- combos ------------------------------------------------------------
    { name: "PA+FD", char: "paladin5", toggles: { powerAttack: true, fightingDefensively: true } },
    { name: "PA+FD+crane", char: "paladin5", toggles: { powerAttack: true, fightingDefensively: true, craneStyle: true } },
    { name: "charge+flank", char: "paladin5", toggles: { charging: true, flanking: true } },
    { name: "haste+flurry+PA monk11", char: "monk11", toggles: { flurryOfBlows: true, powerAttack: true }, buffs: ["haste"] },
    { name: "song enhancement + magic weapon enh2", char: "paladin5", toggles: { weaponSong: "Enhancement" }, meleeEnh: 2 },
    {
      name: "everything paladin5",
      char: "paladin5",
      toggles: {
        powerAttack: true,
        fightingDefensively: true,
        charging: true,
        flanking: true,
        smiteEvil: true,
        smiteEvilOutsider: true,
        preciseStrike: true,
        doublePreciseStrike: true,
        weaponSong: "Flaming",
      },
      buffs: ["haste"],
      meleeEnh: 1,
    },
  ];
  for (const song of SONGS) {
    list.push({ name: `song ${song}`, char: "paladin5", toggles: { weaponSong: song } });
  }
  return list;
}

export function buildMatrix(): MatrixCase[] {
  return specs().map((spec) => {
    const record = createDefaultCharacter(`qa-${spec.name.replace(/\W+/g, "-")}`, spec.name);
    ARCHETYPES[spec.char](record);
    Object.assign(record.toggles, spec.toggles ?? {});
    if (spec.buffs) record.buffs = spec.buffs;
    if (spec.meleeEnh) record.enhancements.meleeWeapon = spec.meleeEnh;
    if (spec.panache !== undefined) {
      record.resources = [{ id: "panache", name: "Panache", current: spec.panache, max: 5 }];
    }
    return { name: spec.name, record };
  });
}

/** The output slice the fixture freezes (everything toggles can influence). */
export interface ParitySnapshot {
  melee: string;
  ranged: string;
  unarmed: string;
  ac: { normalAC: number; touchAC: number; flatFootedAC: number; cmb: number; cmd: number };
  saves: { fort: number; ref: number; will: number };
  initiative: number;
  skills: Record<string, number>;
}

// computed shape is structurally compatible; typed loosely so the capture
// script (plain mjs) and the test share this without importing calc types
export function snapshot(computed: {
  attacks: { melee: string; ranged: string; unarmed: string };
  ac: ParitySnapshot["ac"];
  saves: ParitySnapshot["saves"];
  initiative: number;
  skills: { name: string; total: number }[];
}): ParitySnapshot {
  return {
    melee: computed.attacks.melee,
    ranged: computed.attacks.ranged,
    unarmed: computed.attacks.unarmed,
    ac: {
      normalAC: computed.ac.normalAC,
      touchAC: computed.ac.touchAC,
      flatFootedAC: computed.ac.flatFootedAC,
      cmb: computed.ac.cmb,
      cmd: computed.ac.cmd,
    },
    saves: { ...computed.saves },
    initiative: computed.initiative,
    skills: Object.fromEntries(computed.skills.map((s) => [s.name, s.total])),
  };
}
