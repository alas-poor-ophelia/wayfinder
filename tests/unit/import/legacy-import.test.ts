import { describe, expect, it } from "vitest";
import { computeAll } from "../../../src/calc";
import { calculateAttackStrings } from "../../../src/calc/attacks";
import { importLegacy } from "../../../src/import/legacy-import";
import fixtures from "../fixtures/captured-fixtures.json";

const adarin = importLegacy({
  id: "adarin",
  name: "Adarin",
  characterType: "pc",
  sheet: fixtures.frontmatter.adarinSheet,
  config: fixtures.frontmatter.adarinConfig,
});

const hwayoung = importLegacy({
  id: "hwayoung",
  name: "Hwayoung",
  characterType: "familiar",
  sheet: fixtures.frontmatter.hwayoungSheet,
  config: fixtures.frontmatter.hwayoungConfig,
});

describe("importLegacy(Adarin) -> computeAll", () => {
  const computed = computeAll(adarin.record);

  it("warns about the class-level drift between notes", () => {
    expect(
      adarin.warnings.some((w) => w.includes("paladinLevel")),
      adarin.warnings.join("; "),
    ).toBe(true);
  });

  it("ability mods match the old config note", () => {
    const config = fixtures.frontmatter.adarinConfig;
    expect(computed.mods).toEqual({
      str: config.strMod,
      dex: config.dexMod,
      con: config.conMod,
      int: config.intMod,
      wis: config.wisMod,
      cha: config.chaMod,
    });
  });

  it("BAB and level match the config note (drift-corrected source)", () => {
    expect(computed.bab).toBe(fixtures.frontmatter.adarinConfig.adarinBab);
    expect(computed.totalLevel).toBe(
      fixtures.frontmatter.adarinConfig.totalLevel,
    );
  });

  it("AC matches the live capture", () => {
    const expected = fixtures.acLive.output;
    expect(computed.ac).toEqual({
      normalAC: expected.normalAC,
      touchAC: expected.touchAC,
      flatFootedAC: expected.flatFootedAC,
      cmb: expected.cmb,
      cmd: expected.cmd,
    });
  });

  it("saves match the stored values (20/21/14)", () => {
    const stored = fixtures.savesFixture.storedSaves;
    expect(computed.saves.fort).toBe(stored.fort.value);
    expect(computed.saves.ref).toBe(stored.ref.value);
    expect(computed.saves.will).toBe(stored.will.value);
  });

  it("attacks match the legacy calculator with the drift-corrected paladin level", () => {
    // The old display used the stale sheet-note paladinLevel (4); the import
    // corrects to the config note's 5 (matches XP), shifting precise-strike
    // damage by +1. Everything else must flow through identically.
    const expected = calculateAttackStrings({
      ...(fixtures.attacksLive.input as never as Record<string, unknown>),
      paladinLevel: 5,
      // panache is a resources[] pool since schema v4
      panachePoints: adarin.record.resources.find((r) => r.id === "panache")!
        .current,
    });
    expect(computed.attacks).toEqual(expected);
  });

  it("skill totals match the old sheet's displayed values", () => {
    for (const [name, total] of Object.entries(
      fixtures.skillsFixture.expectedTotals as Record<string, number>,
    )) {
      const row = computed.skills.find((r) => r.name === name);
      expect(row, `missing skill ${name}`).toBeDefined();
      expect(row!.total, name).toBe(total);
    }
  });

  it("imports resources and panache", () => {
    // panache imports as a pool (schema v4), rendered first like the
    // legacy crease; the deprecated top-level field is never written
    const panache = adarin.record.resources.find((r) => r.id === "panache");
    expect(panache?.max).toBeGreaterThan(0);
    expect(adarin.record.resources[0]?.id).toBe("panache");
    expect(adarin.record.panache).toBeUndefined();
    const ids = adarin.record.resources.map((r) => r.id);
    expect(ids).toContain("layOnHands");
    expect(ids).toContain("smiteEvil");
    expect(ids).toContain("weaponSongRounds");
    // item-granted pools carry kind for the Items tab
    expect(
      adarin.record.resources.find((r) => r.id === "plumeOfPanache")?.kind,
    ).toBe("item");
    expect(
      adarin.record.resources.find((r) => r.id === "quickrunners")?.kind,
    ).toBe("item");
  });

  it("imports identity and misc fields", () => {
    expect(adarin.record.race).toBe("Tiefling");
    expect(adarin.record.speed).toBe("30ft");
    expect(adarin.record.energyRes.cold).toBe(5);
    expect(adarin.record.hp.current).toBeGreaterThan(0);
  });
});

describe("importLegacy(Hwayoung) -> computeAll", () => {
  const computed = computeAll(hwayoung.record);

  it("AC matches the live capture", () => {
    const expected = fixtures.hwayoung.ac;
    expect(computed.ac).toEqual({
      normalAC: expected.normalAC,
      touchAC: expected.touchAC,
      flatFootedAC: expected.flatFootedAC,
      cmb: expected.cmb,
      cmd: expected.cmd,
    });
  });

  it("attacks match the live capture", () => {
    const expected = fixtures.hwayoung.attacks;
    expect(computed.attacks.melee).toBe(expected.waveblade);
    expect(computed.attacks.ranged).toBe(expected.ranged);
    expect(computed.attacks.unarmed).toBe(expected.unarmed);
  });
});
