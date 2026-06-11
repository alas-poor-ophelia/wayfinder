import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord, ClassEntry } from "../../types/character";
import { ABILITY_KEYS, type AbilityKey } from "../../types/character";
import { CLASS_NAMES, getClassStats, totalBab, totalLevel } from "../../calc/class-stats";
import { findRaceByName, getRaceData, RACE_DATA, RACE_KEYS } from "../../data/races";
import type { RaceData } from "../../data/types";
import { NumberField, SelectField, TextField } from "../common/fields";
import {
  CustomBuffsEditor,
  EnergyResEditor,
  MiscConfigEditor,
  ResourcesEditor,
  RuleLinksEditor,
  SkillsEditor,
} from "./editors";

interface ConfigSurfaceProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  onClose: () => void;
}

const ABILITY_LABELS: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export function ConfigSurface({ plugin, store, character, onClose }: ConfigSurfaceProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);

  return (
    <div class="ms-config">
      <header class="ms-config__header">
        <h2 class="ms-config__title">Configure — {character.name}</h2>
        <button
          class="ms-config__close"
          aria-label="Close configuration"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      <section class="ms-config__section">
        <h3 class="ms-config__section-title">Identity</h3>
        <TextField
          label="Name"
          value={character.name}
          onChange={(v) => set("name", v)}
        />
        <TextField
          label="Race"
          value={character.race}
          onChange={(v) => set("race", v)}
        />
        <RaceDataPicker store={store} character={character} />
        <SelectField
          label="Type"
          value={character.characterType}
          options={["pc", "familiar"]}
          onChange={(v) => set("characterType", v)}
        />
        <TextField
          label="Banner image"
          value={character.bannerImage ?? ""}
          placeholder="vault path or URL"
          onChange={(v) => set("bannerImage", v)}
        />
        <TextField
          label="Speed"
          value={character.speed}
          onChange={(v) => set("speed", v)}
        />
      </section>

      <section class="ms-config__section">
        <h3 class="ms-config__section-title">Base abilities</h3>
        <div class="ms-config__abilities">
          {ABILITY_KEYS.map((key) => (
            <NumberField
              key={key}
              label={ABILITY_LABELS[key]}
              value={character.baseAbilities[key]}
              onChange={(v) => set(`baseAbilities.${key}`, v)}
            />
          ))}
        </div>
      </section>

      <ClassesEditor
        classes={character.classes}
        onChange={(classes) => set("classes", classes)}
      />

      <section class="ms-config__section">
        <h3 class="ms-config__section-title">Class data</h3>
        <button
          class="ms-config__add"
          onClick={() => store.applyClassSkills(character.id)}
        >
          Mark class skills
        </button>
        <button
          class="ms-config__add"
          onClick={() => store.syncClassResources(character.id)}
        >
          Sync class pools
        </button>
        <div class="ms-config__derived">
          Flags class skills on existing rows · upserts class resource pools
        </div>
      </section>

      <section class="ms-config__section">
        <h3 class="ms-config__section-title">Hit points</h3>
        <div class="ms-config__abilities">
          <NumberField
            label="Max"
            value={character.hp.max}
            onChange={(v) => set("hp.max", v)}
          />
          <NumberField
            label="Current"
            value={character.hp.current}
            onChange={(v) => set("hp.current", v)}
          />
        </div>
      </section>

      <MiscConfigEditor store={store} character={character} />
      <EnergyResEditor store={store} character={character} />
      <SkillsEditor store={store} character={character} />
      <ResourcesEditor store={store} character={character} />
      <CustomBuffsEditor store={store} character={character} />
      <RuleLinksEditor store={store} character={character} plugin={plugin} />
    </div>
  );
}

const CUSTOM_RACE = "(custom)";
const RACE_NAME_OPTIONS = RACE_KEYS.map((k) => RACE_DATA[k].name).sort();

function raceSummary(race: RaceData): string {
  const mods = race.flexibleAbility
    ? "+2 to one ability"
    : ABILITY_KEYS.filter((k) => race.abilityMods[k])
        .map((k) => {
          const v = race.abilityMods[k]!;
          return `${v > 0 ? "+" : ""}${v} ${ABILITY_LABELS[k]}`;
        })
        .join(", ");
  const size = race.size === "small" ? "Small" : "Medium";
  const VISION_LABELS: Record<string, string> = {
    "low-light": "low-light vision",
    darkvision60: "darkvision 60 ft",
    darkvision120: "darkvision 120 ft",
  };
  const vision = race.vision
    .filter((v) => v !== "normal")
    .map((v) => VISION_LABELS[v] ?? v)
    .join(", ");
  return [mods, size, `${race.speed} ft`, vision].filter(Boolean).join(" · ");
}

function RaceDataPicker({
  store,
  character,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
}) {
  const race = character.raceKey ? getRaceData(character.raceKey) : null;
  return (
    <>
      <SelectField
        label="Race data"
        value={race ? race.name : CUSTOM_RACE}
        options={[CUSTOM_RACE, ...RACE_NAME_OPTIONS]}
        onChange={(v) =>
          store.setRace(
            character.id,
            v === CUSTOM_RACE ? null : findRaceByName(v)?.key ?? null
          )
        }
      />
      {race?.flexibleAbility && (
        <SelectField
          label="+2 ability"
          value={character.raceAbilityChoice ?? "—"}
          options={["—", ...ABILITY_KEYS]}
          onChange={(v) =>
            store.setCharacterField(
              character.id,
              "raceAbilityChoice",
              ABILITY_KEYS.includes(v as AbilityKey) ? v : undefined
            )
          }
        />
      )}
      {race && <div class="ms-config__derived">{raceSummary(race)}</div>}
    </>
  );
}

function ClassesEditor({
  classes,
  onChange,
}: {
  classes: ClassEntry[];
  onChange: (classes: ClassEntry[]) => void;
}) {
  const update = (idx: number, patch: Partial<ClassEntry>) => {
    const next = classes.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange(next);
  };

  const bab = totalBab(classes);
  const level = totalLevel(classes);

  return (
    <section class="ms-config__section">
      <h3 class="ms-config__section-title">Classes &amp; levels</h3>
      {classes.map((entry, idx) => {
        const stats = getClassStats(entry.className);
        return (
          <div class="ms-config__class-row" key={idx}>
            <select
              class="ms-field__input dropdown"
              value={entry.className}
              onChange={(e) =>
                update(idx, {
                  className: (e.target as HTMLSelectElement).value,
                })
              }
            >
              {CLASS_NAMES.map((name) => (
                <option key={name} value={name} selected={name === entry.className}>
                  {name}
                </option>
              ))}
            </select>
            <input
              class="ms-field__input ms-field__input--number"
              type="number"
              min={0}
              value={entry.level}
              onInput={(e) => {
                const n = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(n)) update(idx, { level: n });
              }}
            />
            <span class="ms-config__class-stats">
              {stats ? `${stats.hitDie} · BAB ×${stats.bab}` : "—"}
            </span>
            <button
              class="ms-config__remove"
              aria-label={`Remove ${entry.className}`}
              onClick={() => onChange(classes.filter((_, i) => i !== idx))}
            >
              ✕
            </button>
          </div>
        );
      })}
      <button
        class="ms-config__add"
        onClick={() =>
          onChange([...classes, { className: CLASS_NAMES[0], level: 1 }])
        }
      >
        + Add class
      </button>
      <div class="ms-config__derived">
        Level {level} · BAB +{bab}
      </div>
    </section>
  );
}
