import { getRaceData } from "../../../data/races";
import { Icon } from "../../common/Icon";
import { Num, Row, Sec, Seg } from "../primitives";
import { ENERGY, type SectionProps, setter } from "./shared";

export function AttackBlocksSection({ store, character }: SectionProps) {
  const prefs = {
    melee: "single",
    ranged: "single",
    ...character.attackBlocks,
  };
  const save = (patch: Partial<typeof prefs>) =>
    store.setCharacterField(character.id, "attackBlocks", {
      ...prefs,
      ...patch,
    });
  return (
    <Sec icon="ra-crossed-swords" title="Attack Blocks">
      <Row label="Melee">
        <Seg
          value={prefs.melee}
          options={[
            { value: "single", label: "One block" },
            { value: "separate", label: "Per weapon" },
          ]}
          onChange={(v) => save({ melee: v })}
        />
      </Row>
      <Row label="Ranged">
        <Seg
          value={prefs.ranged}
          options={[
            { value: "single", label: "One block" },
            { value: "separate", label: "Per weapon" },
          ]}
          onChange={(v) => save({ ranged: v })}
        />
      </Row>
      <p class="help">
        Equipped weapons become attack blocks. One block = a single block with a
        weapon picker; Per weapon = one block each.
      </p>
    </Sec>
  );
}

export function DefenseSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const race = character.raceKey ? getRaceData(character.raceKey) : null;
  const raceSizeMod = race ? (race.size === "small" ? 1 : 0) : null;
  return (
    <Sec icon="ra-shield" title="Defense &amp; Initiative">
      <div class="miniheads">Armor class</div>
      <div class="grid3">
        <Row label="Natural">
          <Num
            value={character.ac.natural}
            onChange={(v) => set("ac.natural", v)}
          />
        </Row>
        <Row label="Dodge">
          <Num
            value={character.ac.dodge}
            onChange={(v) => set("ac.dodge", v)}
          />
        </Row>
        <Row label="Deflection">
          <Num
            value={character.ac.deflection}
            onChange={(v) => set("ac.deflection", v)}
          />
        </Row>
        <Row label="Size">
          <Num
            value={
              raceSizeMod !== null
                ? (character.ac.sizeModOverride ?? raceSizeMod)
                : character.ac.sizeMod
            }
            onChange={(v) => {
              if (raceSizeMod !== null)
                set("ac.sizeModOverride", v === raceSizeMod ? undefined : v);
              else set("ac.sizeMod", v);
            }}
          />
        </Row>
      </div>
      <div class="miniheads">Enhancement bonuses</div>
      <div class="grid3">
        <Row label="Melee">
          <Num
            value={character.enhancements.meleeWeapon}
            onChange={(v) => set("enhancements.meleeWeapon", v)}
          />
        </Row>
        <Row label="Ranged">
          <Num
            value={character.enhancements.rangedWeapon}
            onChange={(v) => set("enhancements.rangedWeapon", v)}
          />
        </Row>
        <Row label="Resistance">
          <Num
            value={character.enhancements.resistance}
            onChange={(v) => set("enhancements.resistance", v)}
          />
        </Row>
      </div>
      <div class="miniheads">Initiative</div>
      <div class="grid2">
        <Row label="Misc">
          <Num
            value={character.initiative.miscBonus}
            onChange={(v) => set("initiative.miscBonus", v)}
          />
        </Row>
        <Row label="Familiar">
          <Num
            value={character.initiative.familiarBonus}
            onChange={(v) => set("initiative.familiarBonus", v)}
          />
        </Row>
      </div>
      <p class="help">
        Passive toggles like Agile Weapon &amp; Versatile Performance now live
        in Character → Actions.
      </p>
    </Sec>
  );
}

export function EnergySection({ store, character }: SectionProps) {
  const set = setter(store, character);
  return (
    <Sec icon="ra-lightning-bolt" title="Energy Resistance">
      <div class="grid3">
        {ENERGY.map(([key, label, icon]) => (
          <label class="f energy-f" key={key}>
            <span class="f__label">
              <span class={`energy-ic energy-ic--${key}`}>
                <Icon id={icon} />
              </span>
              {label}
            </span>
            <span class="f__control">
              <Num
                value={character.energyRes[key] ?? 0}
                onChange={(v) => set(`energyRes.${key}`, v)}
              />
            </span>
          </label>
        ))}
      </div>
    </Sec>
  );
}
