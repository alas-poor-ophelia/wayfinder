/**
 * Fixture capture — runs INSIDE Obsidian via js-engine importJs.
 * Calls the old MiniSheet calculators (pure methods) across a matrix of
 * inputs and writes JSON fixtures into `fixtures-tmp/` at the vault root.
 *
 * Deployed temporarily to MiniSheet/z_Components/scripts/fixture-capture.js,
 * invoked from window eval:
 *   const api = app.plugins.getPlugin("js-engine").api;
 *   const mod = await api.importJs("MiniSheet/z_Components/scripts/fixture-capture.js");
 *   await mod.captureAll(app, api);
 */

const SCRIPTS = "MiniSheet/z_Components/scripts";

const NOTES = {
  adarinSheet: "MiniSheet/Adarin/Adarin Mini Sheet.md",
  adarinConfig: "MiniSheet/Adarin/components/AdarinMiniSheetConfig.md",
  hwayoungSheet: "MiniSheet/Hwayoung/Hwayoung Mini Sheet.md",
  hwayoungConfig: "MiniSheet/Hwayoung/components/HwayoungMiniSheetConfig.md",
};

const WEAPON_SONGS = [
  "Off",
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

const CONDITIONS = [
  "prone",
  "blinded",
  "dazed",
  "staggered",
  "stunned",
  "shaken",
  "paralyzed",
  "grappled",
  "flat-footed",
  "nauseated",
  "sickened",
  "frightened",
  "panicked",
  "deafened",
  "exhausted",
  "fatigued",
  "entangled",
  "helpless",
  "confused",
];

const BUFFS = [
  "enlarged",
  "bull's strength",
  "cat's grace",
  "bear's endurance",
  "fox's cunning",
  "owl's wisdom",
  "eagle's splendor",
  "bless",
  "blessing of fervor",
  "haste",
  "barkskin",
  "magic weapon",
  "shield",
  "mage armor",
];

const BOF_CHOICES = [
  "+30ft. Speed",
  "Stand as Swift",
  "Extra Attack",
  "+2 Atk/AC/Reflex",
  "Free Metamagic",
];

const MOCK_MB = {
  setMetadata() {},
  getMetadata() {
    return 0;
  },
  parseBindTarget() {
    return {};
  },
  createInlineFieldFromString() {},
  wrapInMDRC() {},
};

function getFm(app, path) {
  const file = app.vault.getFileByPath(path);
  if (!file) return null;
  const cache = app.metadataCache.getFileCache(file);
  return cache && cache.frontmatter
    ? JSON.parse(JSON.stringify(cache.frontmatter))
    : null;
}

/**
 * Build the boundData object the way the component notes bind it:
 * derived mods from the config note, toggles/adjusts from the sheet note.
 * `overrides` lets matrix cases replace any field.
 */
function buildBoundData(sheet, config, overrides) {
  const base = {
    // mods (config note)
    strMod: config.strMod ?? 0,
    dexMod: config.dexMod ?? 0,
    conMod: config.conMod ?? 0,
    intMod: config.intMod ?? 0,
    wisMod: config.wisMod ?? 0,
    chaMod: config.chaMod ?? 0,
    bab: config.adarinBab ?? config.bab ?? 0,
    // The real meta-bind-js-view binds these from the SHEET note (no config
    // prefix) — sheet and config can disagree (they do: paladinLevel 4 vs 5).
    panachePoints: sheet.panachePoints ?? 0,
    paladinLevel: sheet.paladinLevel ?? 0,
    monkLevel: sheet.monkunchainedLevel ?? 0,
    // sheet note fields
    sizeMod: sheet.sizeMod ?? 0,
    naturalAC: sheet.naturalAC ?? 0,
    deflectionAC: sheet.deflectionAC ?? 0,
    dodgeAC: sheet.dodgeAC ?? 0,
    acAdjust: sheet.acAdjust ?? 0,
    atkAdjust: sheet.atkAdjust ?? 0,
    dmgAdjust: sheet.dmgAdjust ?? 0,
    rangedAtkAdjust: sheet.rangedAtkAdjust ?? 0,
    rangedDmgAdjust: sheet.rangedDmgAdjust ?? 0,
    unarmedAtkAdjust: sheet.unarmedAtkAdjust ?? 0,
    unarmedDmgAdjust: sheet.unarmedDmgAdjust ?? 0,
    meleeWeaponEnhancement: sheet.meleeWeaponEnhancement ?? 0,
    rangedWeaponEnhancement: sheet.rangedWeaponEnhancement ?? 0,
    smiteEvil: sheet.smiteEvil ?? false,
    smiteEvilOutsider: sheet.smiteEvilOutsider ?? false,
    charging: sheet.charging ?? false,
    flurryOfBlows: sheet.flurryOfBlows ?? false,
    fightingDefensively: sheet.fightingDefensively ?? false,
    craneStyle: sheet.craneStyle ?? false,
    powerAttack: sheet.powerAttack ?? false,
    agileWeapon: sheet.agileWeapon ?? false,
    preciseStrike: sheet.preciseStrike ?? false,
    doublePreciseStrike: sheet.doublePreciseStrike ?? false,
    flanking: sheet.flanking ?? false,
    hasted: sheet.hasted ?? false,
    rangedAttackStyle: sheet.rangedAttackStyle ?? "Longbow",
    weaponSong: sheet.weaponSong ?? "Off",
    conditionEffects: sheet.conditionEffects
      ? JSON.parse(JSON.stringify(sheet.conditionEffects))
      : {},
  };
  return Object.assign(base, overrides || {});
}

/** Neutral toggles/conditions: pure-math baseline for the matrix. */
const NEUTRAL = {
  smiteEvil: false,
  smiteEvilOutsider: false,
  charging: false,
  flurryOfBlows: false,
  fightingDefensively: false,
  craneStyle: false,
  powerAttack: false,
  agileWeapon: false,
  preciseStrike: false,
  doublePreciseStrike: false,
  flanking: false,
  hasted: false,
  weaponSong: "Off",
  atkAdjust: 0,
  dmgAdjust: 0,
  acAdjust: 0,
  conditionEffects: {},
};

export async function captureAll(app, api) {
  const out = { meta: { capturedAt: new Date().toISOString() }, warnings: [] };

  // --- load calculators ---
  const { AttackCalculator } = await api.importJs(
    `${SCRIPTS}/attack-calculator.js`
  );
  const { ACDisplayCalculator } = await api.importJs(`${SCRIPTS}/ac-renderer.js`);
  const { ConditionBuffCalculator } = await api.importJs(
    `${SCRIPTS}/condition-buff-calculator.js`
  );
  const { ClassStatsLookup } = await api.importJs(
    `${SCRIPTS}/lookups/ClassStatsLookup.js`
  );

  const attackCalc = new AttackCalculator();
  const acCalc = new ACDisplayCalculator(MOCK_MB, NOTES.adarinSheet);
  const condCalc = new ConditionBuffCalculator(MOCK_MB, NOTES.adarinSheet);
  const classLookup = new ClassStatsLookup(MOCK_MB);

  // --- raw frontmatter snapshots (legacy import fixtures) ---
  out.frontmatter = {};
  for (const [key, path] of Object.entries(NOTES)) {
    out.frontmatter[key] = getFm(app, path);
    if (!out.frontmatter[key]) out.warnings.push(`No frontmatter: ${path}`);
  }

  const sheet = out.frontmatter.adarinSheet;
  const config = out.frontmatter.adarinConfig;
  if (!sheet || !config) {
    throw new Error("Adarin sheet/config frontmatter missing — cannot capture");
  }

  // --- live baseline: must reproduce the stored attackStrings exactly ---
  const liveBound = buildBoundData(sheet, config);
  out.attacksLive = {
    input: liveBound,
    output: attackCalc.calculateAttackStrings(liveBound),
    storedAttackStrings: config.attackStrings ?? null,
  };
  out.attacksLive.matchesStored =
    JSON.stringify(out.attacksLive.output) ===
    JSON.stringify(config.attackStrings);

  out.acLive = {
    input: liveBound,
    output: acCalc.calculateACValues(liveBound),
  };

  // --- attack matrix (from NEUTRAL baseline) ---
  const neutralBound = buildBoundData(sheet, config, NEUTRAL);
  out.attackMatrix = [
    { name: "neutral", overrides: {} },
    { name: "powerAttack", overrides: { powerAttack: true } },
    { name: "fightingDefensively", overrides: { fightingDefensively: true } },
    {
      name: "fightingDefensively+craneStyle",
      overrides: { fightingDefensively: true, craneStyle: true },
    },
    { name: "flurryOfBlows", overrides: { flurryOfBlows: true } },
    { name: "smiteEvil", overrides: { smiteEvil: true } },
    {
      name: "smiteEvil+outsider",
      overrides: { smiteEvil: true, smiteEvilOutsider: true },
    },
    { name: "charging", overrides: { charging: true } },
    { name: "flanking", overrides: { flanking: true } },
    { name: "agileWeapon", overrides: { agileWeapon: true } },
    { name: "preciseStrike", overrides: { preciseStrike: true } },
    {
      name: "preciseStrike+double",
      overrides: { preciseStrike: true, doublePreciseStrike: true },
    },
    { name: "hasted", overrides: { hasted: true } },
    {
      name: "powerAttack+flurry",
      overrides: { powerAttack: true, flurryOfBlows: true },
    },
    {
      name: "powerAttack+smite+charging",
      overrides: { powerAttack: true, smiteEvil: true, charging: true },
    },
    {
      name: "fd+crane+flurry",
      overrides: {
        fightingDefensively: true,
        craneStyle: true,
        flurryOfBlows: true,
      },
    },
    {
      name: "kitchen-sink",
      overrides: {
        powerAttack: true,
        flurryOfBlows: true,
        smiteEvil: true,
        flanking: true,
        preciseStrike: true,
        weaponSong: "Flaming",
      },
    },
    { name: "ranged:Shuriken", overrides: { rangedAttackStyle: "Shuriken" } },
    {
      name: "ranged:Shuriken+flurry",
      overrides: { rangedAttackStyle: "Shuriken", flurryOfBlows: true },
    },
    { name: "ranged:Longbow", overrides: { rangedAttackStyle: "Longbow" } },
    { name: "ranged:Ray", overrides: { rangedAttackStyle: "Ray" } },
    ...WEAPON_SONGS.map((song) => ({
      name: `weaponSong:${song}`,
      overrides: { weaponSong: song },
    })),
  ].map(({ name, overrides }) => {
    const input = Object.assign({}, neutralBound, overrides);
    return { name, overrides, output: attackCalc.calculateAttackStrings(input) };
  });
  out.attackMatrixBase = neutralBound;

  // --- AC matrix ---
  out.acMatrix = [
    { name: "neutral", overrides: {} },
    { name: "fightingDefensively", overrides: { fightingDefensively: true } },
    {
      name: "fightingDefensively+craneStyle",
      overrides: { fightingDefensively: true, craneStyle: true },
    },
    { name: "charging", overrides: { charging: true } },
    { name: "hasted", overrides: { hasted: true } },
    { name: "weaponSong:Defending", overrides: { weaponSong: "Defending" } },
    { name: "acAdjust:+3", overrides: { acAdjust: 3 } },
    {
      name: "loseDexToAC",
      overrides: { conditionEffects: { loseDexToAC: true } },
    },
    {
      name: "flatFooted",
      overrides: { conditionEffects: { flatFooted: true } },
    },
    {
      name: "condition ac adjusts",
      overrides: {
        conditionEffects: { acAdjust: -4, touchAcAdjust: -2, ffAcAdjust: 1, cmb: -2, cmd: -2 },
      },
    },
  ].map(({ name, overrides }) => {
    const input = Object.assign({}, neutralBound, overrides);
    return { name, overrides, output: acCalc.calculateACValues(input) };
  });

  // --- condition / buff effects matrix ---
  const condInput = (overrides) =>
    Object.assign(
      { conditions: [], buffs: [], negativeLevels: 0, bofChoice: "" },
      overrides
    );
  out.conditionMatrix = [
    ...CONDITIONS.map((c) => ({
      name: `condition:${c}`,
      input: condInput({ conditions: [c] }),
    })),
    ...BUFFS.map((b) => ({
      name: `buff:${b}`,
      input: condInput({ buffs: [b] }),
    })),
    ...BOF_CHOICES.map((choice) => ({
      name: `bof:${choice}`,
      input: condInput({ buffs: ["blessing of fervor"], bofChoice: choice }),
    })),
    {
      name: "haste+bof-extra-attack (no stack)",
      input: condInput({
        buffs: ["haste", "blessing of fervor"],
        bofChoice: "Extra Attack",
      }),
    },
    {
      name: "negativeLevels:2",
      input: condInput({ negativeLevels: 2 }),
    },
    {
      name: "live-stack",
      input: condInput({
        conditions: sheet.conditions ?? [],
        buffs: sheet.buffs ?? [],
        negativeLevels: sheet.negativeLevels || 0,
        bofChoice: sheet.bofChoice ?? "",
      }),
    },
  ].map(({ name, input }) => ({
    name,
    input,
    output: condCalc.calculateConditionEffects(input),
  }));

  // --- conditions fed through attacks + AC ---
  out.integration = ["prone", "blinded", "grappled"].map((c) => {
    const eff = condCalc.calculateConditionEffects(condInput({ conditions: [c] }));
    const input = Object.assign({}, neutralBound, { conditionEffects: eff });
    return {
      name: `integration:${c}`,
      attacks: attackCalc.calculateAttackStrings(input),
      ac: acCalc.calculateACValues(input),
    };
  });
  for (const b of ["enlarged", "haste"]) {
    const eff = condCalc.calculateConditionEffects(condInput({ buffs: [b] }));
    const input = Object.assign({}, neutralBound, { conditionEffects: eff });
    out.integration.push({
      name: `integration:${b}`,
      attacks: attackCalc.calculateAttackStrings(input),
      ac: acCalc.calculateACValues(input),
    });
  }

  // --- class stats lookup (all of Adarin's classes + a sample spread) ---
  out.classStats = {
    adarin: classLookup.lookupClassStats({ classes: config.classes ?? [] }),
    sample: classLookup.lookupClassStats({
      classes: [
        "Fighter",
        "Wizard",
        "Rogue",
        "Cleric",
        "Barbarian (Unchained)",
        "Monk (Unchained)",
        "Swashbuckler",
      ],
    }),
  };

  // --- saves + skills source inputs (math is inline in the md notes) ---
  out.savesFixture = {
    inputs: {
      classes: config.classes ?? [],
      classStats: config.classStats ?? {},
      conMod: config.conMod,
      dexMod: config.dexMod,
      wisMod: config.wisMod,
      chaMod: config.chaMod,
      paladinLevel: config.paladinLevel,
      skaldLevel: config.skaldLevel,
      monkunchainedLevel: config.monkunchainedLevel,
      resistanceEnhancement: sheet.resistanceEnhancement,
      conditionEffects: sheet.conditionEffects ?? {},
    },
    storedSaves: config.saves ?? null,
  };
  out.skillsFixture = {
    inputs: {
      skills: sheet.skills ?? {},
      skillAdjust: sheet.skillAdjust,
      mods: {
        str: config.strMod,
        dex: config.dexMod,
        con: config.conMod,
        int: config.intMod,
        wis: config.wisMod,
        cha: config.chaMod,
      },
      versatilePerformance: sheet.versatilePerformance,
      conditionEffects: sheet.conditionEffects ?? {},
    },
  };

  // --- Hwayoung baseline (familiar) ---
  const hSheet = out.frontmatter.hwayoungSheet;
  const hConfig = out.frontmatter.hwayoungConfig;
  if (hSheet && hConfig) {
    const hBound = buildBoundData(hSheet, hConfig);
    out.hwayoung = {
      attacks: attackCalc.calculateAttackStrings(hBound),
      storedAttackStrings: hConfig.attackStrings ?? null,
      ac: new ACDisplayCalculator(MOCK_MB, NOTES.hwayoungSheet).calculateACValues(
        hBound
      ),
      input: hBound,
    };
  } else {
    out.warnings.push("Hwayoung sheet/config not found at expected paths");
  }

  // --- write results into the vault ---
  const json = JSON.stringify(out, null, 2);
  await app.vault.adapter.mkdir("fixtures-tmp");
  await app.vault.adapter.write("fixtures-tmp/captured-fixtures.json", json);

  return {
    attacksLiveMatchesStored: out.attacksLive.matchesStored,
    attackMatrixCount: out.attackMatrix.length,
    acMatrixCount: out.acMatrix.length,
    conditionMatrixCount: out.conditionMatrix.length,
    hwayoungCaptured: !!out.hwayoung,
    warnings: out.warnings,
    bytes: json.length,
  };
}
