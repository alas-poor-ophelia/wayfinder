/**
 * Config section content for the redesign, grouped by rail category.
 * Flat native-Obsidian rows built from ./primitives, wired straight to the
 * store via setCharacterField. Ported from the handoff's sections.jsx, with
 * prototype-only fields mapped onto the real CharacterRecord + store.
 */
import { useState } from "preact/hooks";
import { CLASS_NAMES, getClassStats, totalBab, totalLevel } from "../../calc/class-stats";
import { STANDARD_SKILLS } from "../../calc/skills";
import { isPartialMechanics, listArchetypes } from "../../data/archetypes";
import {
  applyHeritage,
  findRaceByName,
  getHeritage,
  getRaceData,
  listHeritages,
  RACE_DATA,
  RACE_KEYS,
} from "../../data/races";
import type { RaceData, RaceHeritage } from "../../data/types";
import type MiniSheetPlugin from "../../main";
import { NotePickModal } from "../../modals";
import type { MiniSheetStore } from "../../state/store";
import {
  ABILITY_KEYS,
  type AbilityKey,
  type CharacterRecord,
  type ClassEntry,
  type SkillEntry,
} from "../../types/character";
import { Icon } from "../common/Icon";
import { ModifierEditor } from "../common/ModifierEditor";
import { UI } from "./glyphs";
import { Check, InfoTip, Num, Row, Sec, Seg, Sel, StatGrid, Txt } from "./primitives";

interface SectionProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

const ABILITY_LABELS: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};
const ABIL: [string, string][] = ABILITY_KEYS.map((k) => [k, ABILITY_LABELS[k]]);
const ENERGY: [string, string, string][] = [
  ["cold", "Cold", "ra-snowflake"],
  ["fire", "Fire", "ra-fire"],
  ["acid", "Acid", "ra-acid"],
  ["electricity", "Electricity", "ra-lightning-bolt"],
  ["sonic", "Sonic", "ra-bell"],
];

function formatMods(mods: Partial<Record<AbilityKey, number>>): string {
  const parts = ABILITY_KEYS.filter((k) => mods[k]).map((k) => {
    const v = mods[k]!;
    return `${v > 0 ? "+" : ""}${v} ${ABILITY_LABELS[k]}`;
  });
  return parts.length ? parts.join(", ") : "no ability modifiers";
}

const CUSTOM_RACE = "(custom)";
const BASE_HERITAGE = "— (base)";
const RACE_NAME_OPTIONS = RACE_KEYS.map((k) => RACE_DATA[k].name).sort();

function setter(store: MiniSheetStore, character: CharacterRecord) {
  return (path: string, value: unknown) => store.setCharacterField(character.id, path, value);
}

/* ============================== CHARACTER ============================== */

const VISION_LABELS: Record<string, string> = {
  "low-light": "low-light vision",
  darkvision60: "darkvision 60 ft",
  darkvision120: "darkvision 120 ft",
};

/** One formatted block for the effective race: ability mods, size, speed,
 *  senses, plus the heritage's spell-like ability + source when present.
 *  Single source of truth — no duplicate inline summary. */
function RaceDetail({ race, heritage }: { race: RaceData; heritage: RaceHeritage | null }) {
  const senses = race.vision
    .filter((v) => v !== "normal")
    .map((v) => VISION_LABELS[v] ?? v)
    .join(", ");
  const rows: [string, string][] = [
    ["Ability", race.flexibleAbility ? "+2 to one ability" : formatMods(race.abilityMods)],
    ["Size", race.size === "small" ? "Small" : "Medium"],
    ["Speed", `${race.speed} ft`],
  ];
  if (senses) rows.push(["Senses", senses]);
  if (heritage) {
    rows.push(["Spell-like", heritage.sla]);
    rows.push(["Source", heritage.source]);
  }
  return (
    <div class="race-detail">
      {rows.map(([label, value]) => (
        <div class="race-detail__row" key={label}>
          <span class="race-detail__lbl">{label}</span>
          <span class="race-detail__val">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function IdentitySection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const baseRace = character.raceKey ? getRaceData(character.raceKey) : null;
  const heritages = baseRace ? listHeritages(baseRace.key) : [];
  const heritage = baseRace ? getHeritage(baseRace.key, character.raceHeritageKey ?? "") : null;
  const race = baseRace ? applyHeritage(baseRace, heritage?.key) : null;

  return (
    <Sec icon="ra-player" title="Identity">
      <Row label="Name">
        <Txt value={character.name} onChange={(v) => set("name", v)} />
      </Row>
      <Row label="Race">
        <Txt value={character.race} onChange={(v) => set("race", v)} />
      </Row>
      <Row label="Race data">
        <Sel
          value={baseRace ? baseRace.name : CUSTOM_RACE}
          options={[CUSTOM_RACE, ...RACE_NAME_OPTIONS]}
          onChange={(v) =>
            store.setRace(character.id, v === CUSTOM_RACE ? null : findRaceByName(v)?.key ?? null)
          }
        />
      </Row>
      {/* races with no heritage variants: race detail sits under Race data */}
      {race && heritages.length === 0 && <RaceDetail race={race} heritage={null} />}
      {heritages.length > 0 && (
        <Row label="Heritage">
          <Sel
            value={heritage ? heritage.name : BASE_HERITAGE}
            options={[BASE_HERITAGE, ...heritages.map((h) => h.name)]}
            onChange={(v) =>
              store.setRaceHeritage(character.id, heritages.find((h) => h.name === v)?.key ?? null)
            }
          />
        </Row>
      )}
      {/* races with heritages: the detail lives with the heritage picker */}
      {race && heritages.length > 0 && <RaceDetail race={race} heritage={heritage} />}
      {baseRace?.flexibleAbility && (
        <Row label="+2 ability">
          <Sel
            value={character.raceAbilityChoice ?? "—"}
            options={["—", ...ABILITY_KEYS]}
            onChange={(v) =>
              set("raceAbilityChoice", ABILITY_KEYS.includes(v as AbilityKey) ? v : undefined)
            }
          />
        </Row>
      )}
      <Row label="Type">
        <Seg
          value={character.characterType}
          options={[
            { value: "pc", label: "PC" },
            { value: "familiar", label: "Familiar" },
          ]}
          onChange={(v) => set("characterType", v)}
        />
      </Row>
      <Row label="Speed" sub={race && !character.speed ? "derives from race" : undefined}>
        <input
          class="num"
          style={{ width: 88 }}
          value={character.speed}
          placeholder={race ? `${race.speed}ft` : "30ft"}
          onInput={(e) => set("speed", (e.target as HTMLInputElement).value)}
        />
      </Row>
      <Row label="Banner image" sub="vault path">
        <Txt value={character.bannerImage ?? ""} onChange={(v) => set("bannerImage", v)} />
      </Row>
    </Sec>
  );
}

/** Middle-ground occasional toggles — backed by the character's passive
 *  (special-op) quick actions. Toggling flips quickActionState[id].stage,
 *  the same live channel the combat tab uses. No drag, no bench. */
export function CharacterActionsSection({
  store,
  character,
  goToEffects,
}: SectionProps & { goToEffects: () => void }) {
  const set = setter(store, character);
  const passives = (character.quickActions ?? []).filter(
    (qa) =>
      qa.stages.length > 0 &&
      qa.stages.every((s) => s.effects.length > 0 && s.effects.every((e) => e.kind === "special"))
  );
  const isOn = (id: string) => (character.quickActionState?.[id]?.stage ?? 0) > 0;
  const onCount = passives.filter((qa) => isOn(qa.id)).length;

  return (
    <Sec icon="ra-aware" title="Actions" desc={`${onCount} on`}>
      <p class="help" style={{ marginTop: 2, marginBottom: 11 }}>
        Situational toggles you flip now and then. For frequently-used actions, use Effects → Quick
        Actions.
      </p>
      <div class="cact-row">
        {passives.map((qa) => (
          <button
            key={qa.id}
            class="cact"
            title={qa.name}
            aria-pressed={isOn(qa.id)}
            onClick={() => set(`quickActionState.${qa.id}`, { stage: isOn(qa.id) ? 0 : 1 })}
          >
            <span class={`squircle${isOn(qa.id) ? " is-on" : ""}`}>
              <Icon id={qa.icon} />
            </span>
            <span class="cact__name">{qa.name}</span>
          </button>
        ))}
        <button class="cact cact--add" title="Add an action in Effects → Quick Actions" onClick={goToEffects}>
          <span class="squircle">
            <UI.plus />
          </span>
          <span class="cact__name">Add</span>
        </button>
        {passives.length === 0 && (
          <span class="help" style={{ marginTop: 0 }}>
            No passive actions yet — add one from Effects → Quick Actions.
          </span>
        )}
      </div>
    </Sec>
  );
}

/** PF average HP: first character level = max die, every other HD = die/2+1,
 *  plus CON mod × total level. Derived from stored hit dice + levels + CON. */
function hpBreakdown(character: CharacterRecord): string {
  const lines: string[] = [];
  let total = 0;
  character.classes.forEach((c, i) => {
    const die = getClassStats(c.className)?.hitDie ?? "d8";
    const dieMax = parseInt(die.slice(1), 10) || 8;
    const avg = dieMax / 2 + 1;
    const level = c.level || 0;
    let hp = 0;
    if (level > 0) hp = i === 0 ? dieMax + (level - 1) * avg : level * avg;
    total += hp;
    lines.push(`${level}×${die} ${c.className}:  ${hp}`);
  });
  const conMod = Math.floor((character.baseAbilities.con - 10) / 2);
  const level = totalLevel(character.classes);
  const conTotal = conMod * level;
  total += conTotal;
  lines.push(`CON ${conMod >= 0 ? "+" : ""}${conMod} × ${level} levels:  ${conTotal}`);
  return `${lines.join("\n")}\n────────────\nAverage max HP:  ${total}`;
}

/** Base Abilities (75%) + Hit Points (25%) on one row. */
export function VitalsSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  return (
    <section class="sec">
      <div class="vitals">
        <div class="vitals__abil">
          <header class="sec__head">
            <span class="sec__ic">
              <Icon id="ra-knight-helmet" />
            </span>
            <span class="sec__title">Base Abilities</span>
            <span class="sec__desc">before race, items &amp; buffs</span>
          </header>
          <StatGrid
            items={ABIL}
            get={(k) => character.baseAbilities[k as AbilityKey]}
            set={(k, v) => set(`baseAbilities.${k}`, v)}
          />
        </div>
        <div class="vitals__hp">
          <header class="sec__head">
            <span class="sec__ic">
              <Icon id="ra-shield" />
            </span>
            <span class="sec__title">Hit Points</span>
            <InfoTip text={hpBreakdown(character)} />
          </header>
          <div class="vitals__hpfields">
            <label class="vital-f">
              <span>Maximum</span>
              <Num value={character.hp.max} onChange={(v) => set("hp.max", v)} />
            </label>
            <label class="vital-f">
              <span>Current</span>
              <Num value={character.hp.current} onChange={(v) => set("hp.current", v)} />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClassesSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const [archOpen, setArchOpen] = useState<number | null>(null);
  const classes = character.classes;
  const update = (idx: number, patch: Partial<ClassEntry>) =>
    set(
      "classes",
      classes.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );

  return (
    <Sec
      icon="ra-relic-blade"
      title="Classes &amp; Levels"
      desc={`Level ${totalLevel(classes)} · BAB +${totalBab(classes)}`}
    >
      {classes.map((entry, idx) => {
        const stats = getClassStats(entry.className);
        const archetypes = listArchetypes(entry.className);
        const selected = entry.archetypeKeys ?? [];
        return (
          <div class="classrow" key={idx}>
            <div class="classrow__main">
              <Sel
                value={entry.className}
                options={CLASS_NAMES}
                onChange={(v) => update(idx, { className: v })}
              />
              <Num value={entry.level} onChange={(v) => update(idx, { level: v })} />
              <span class="classrow__stat">
                {stats ? `${stats.hitDie} · ×${stats.bab}` : "—"}
              </span>
              <button
                class="iconbtn"
                aria-label={`Remove ${entry.className}`}
                onClick={() =>
                  set(
                    "classes",
                    classes.filter((_, i) => i !== idx)
                  )
                }
              >
                <UI.x />
              </button>
            </div>
            {archetypes.length > 0 && (
              <div class="archrow">
                <span class="archrow__lbl">Archetypes</span>
                {selected.map((id) => {
                  const a = archetypes.find((x) => x.id === id);
                  return (
                    <span key={id} class="chip">
                      {a?.name ?? id}
                    </span>
                  );
                })}
                <button
                  class="btn btn--ghost btn--sm"
                  onClick={() => setArchOpen(archOpen === idx ? null : idx)}
                >
                  {archOpen === idx ? "Done" : "Edit"}
                </button>
              </div>
            )}
            {archOpen === idx && (
              <div class="archlist">
                {archetypes.map((a) => {
                  const checked = selected.includes(a.id);
                  return (
                    <label class="skillrow" key={a.id} style={{ cursor: "pointer" }}>
                      <Check
                        value={checked}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((k) => k !== a.id)
                            : [...selected, a.id];
                          update(idx, { archetypeKeys: next.length > 0 ? next : undefined });
                        }}
                      />
                      <span class="skillrow__name" title={a.description}>
                        {a.name}
                      </span>
                      {isPartialMechanics(a.id, a.classKey) && <span class="chip">partial</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, margin: "8px 0 4px" }}>
        <button
          class="btn btn--ghost btn--sm"
          onClick={() => set("classes", [...classes, { className: CLASS_NAMES[0], level: 1 }])}
        >
          <UI.plus /> Add class
        </button>
      </div>
      <div class="miniheads">Apply class defaults — runs only when tapped, never overwrites your edits</div>
      <div class="synccards">
        <button class="synccard" onClick={() => store.applyClassSkills(character.id)}>
          <div class="synccard__t">
            <Icon id="ra-targeted" /> Class skills
          </div>
          <div class="synccard__d">Flag class skills on your skill rows.</div>
        </button>
        <button class="synccard" onClick={() => store.syncClassResources(character.id)}>
          <div class="synccard__t">
            <Icon id="ra-round-bottom-flask" /> Resource pools
          </div>
          <div class="synccard__d">Add class pools like Lay on Hands.</div>
        </button>
        <button class="synccard" onClick={() => store.syncClassQuickActions(character.id)}>
          <div class="synccard__t">
            <Icon id="ra-lightning-bolt" /> Quick actions
          </div>
          <div class="synccard__d">Add class actions like Smite Evil.</div>
        </button>
      </div>
    </Sec>
  );
}

/* ============================== COMBAT ============================== */

export function AttackBlocksSection({ store, character }: SectionProps) {
  const prefs = { melee: "single", ranged: "single", ...character.attackBlocks };
  const save = (patch: Partial<typeof prefs>) =>
    store.setCharacterField(character.id, "attackBlocks", { ...prefs, ...patch });
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
        Equipped weapons become attack blocks. One block = a single block with a weapon picker; Per
        weapon = one block each.
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
          <Num value={character.ac.natural} onChange={(v) => set("ac.natural", v)} />
        </Row>
        <Row label="Dodge">
          <Num value={character.ac.dodge} onChange={(v) => set("ac.dodge", v)} />
        </Row>
        <Row label="Deflection">
          <Num value={character.ac.deflection} onChange={(v) => set("ac.deflection", v)} />
        </Row>
        <Row label="Size">
          <Num
            value={raceSizeMod !== null ? character.ac.sizeModOverride ?? raceSizeMod : character.ac.sizeMod}
            onChange={(v) => {
              if (raceSizeMod !== null) set("ac.sizeModOverride", v === raceSizeMod ? undefined : v);
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
          <Num value={character.initiative.miscBonus} onChange={(v) => set("initiative.miscBonus", v)} />
        </Row>
        <Row label="Familiar">
          <Num
            value={character.initiative.familiarBonus}
            onChange={(v) => set("initiative.familiarBonus", v)}
          />
        </Row>
      </div>
      <p class="help">Passive toggles like Agile Weapon &amp; Versatile Performance now live in Character → Actions.</p>
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
              <Num value={character.energyRes[key] ?? 0} onChange={(v) => set(`energyRes.${key}`, v)} />
            </span>
          </label>
        ))}
      </div>
    </Sec>
  );
}

/* ============================== SKILLS ============================== */

export function SkillsSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const [q, setQ] = useState("");
  const names = Object.keys(character.skills).sort();
  const filtered = names.filter((n) => n.toLowerCase().includes(q.toLowerCase()));
  const classCount = names.filter((n) => character.skills[n].classSkill).length;

  const addStandard = () => {
    const skills: Record<string, SkillEntry> = { ...character.skills };
    for (const [name, ability] of Object.entries(STANDARD_SKILLS)) {
      if (!skills[name]) skills[name] = { ability, ranks: 0, misc: 0, classSkill: false };
    }
    set("skills", skills);
  };

  return (
    <Sec icon="ra-targeted" title="Skills" desc={`${classCount} class skills`}>
      {names.length === 0 ? (
        <button class="btn btn--ghost btn--sm" onClick={addStandard}>
          <UI.plus /> Add standard PF1e skills
        </button>
      ) : (
        <>
          <div class="searchbox" style={{ margin: "2px 0 8px" }}>
            <UI.search />
            <input
              placeholder="Filter skills…"
              value={q}
              onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="skills-h">
            <span style={{ flex: 1 }}>Skill</span>
            <span style={{ width: 28 }}>Abl</span>
            <span class="col">Ranks</span>
            <span class="col">Misc</span>
            <span class="col">Class</span>
          </div>
          {filtered.map((name) => {
            const sk = character.skills[name];
            return (
              <div class="skillrow" key={name}>
                <span class="skillrow__name">{name}</span>
                <span class="skillrow__ab">{sk.ability.toUpperCase()}</span>
                <Num value={sk.ranks} onChange={(v) => set(`skills.${name}.ranks`, v)} />
                <Num value={sk.misc} onChange={(v) => set(`skills.${name}.misc`, v)} />
                <span class="col">
                  <Check
                    value={sk.classSkill}
                    onChange={(v) => set(`skills.${name}.classSkill`, v)}
                  />
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && <div class="empty">No skills match “{q}”.</div>}
        </>
      )}
    </Sec>
  );
}

/* ============================== EFFECTS ============================== */

export function ResourcesSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const update = (idx: number, patch: Partial<CharacterRecord["resources"][number]>) => {
    set(
      "resources",
      character.resources.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };
  return (
    <Sec icon="ra-round-bottom-flask" title="Resource Pools" desc={`${character.resources.length} pools`}>
      {character.resources.map((r, idx) => (
        <div class="respool" key={r.id}>
          <input
            class="inp"
            type="text"
            value={r.name}
            onInput={(e) => update(idx, { name: (e.target as HTMLInputElement).value })}
          />
          <Num value={r.max} onChange={(v) => update(idx, { max: v })} />
          <span class="respool__src">{r.kind === "item" ? "Item" : "Class"}</span>
          <button
            class={`respool__kind${r.kind === "item" ? " is-item" : ""}`}
            title={r.kind === "item" ? "Item resource" : "Class resource"}
            onClick={() => update(idx, { kind: r.kind === "item" ? undefined : "item" })}
          >
            <Icon id={r.kind === "item" ? "ra-round-bottom-flask" : "ra-crossed-swords"} />
          </button>
          <button
            class="iconbtn"
            aria-label={`Remove ${r.name}`}
            onClick={() =>
              set(
                "resources",
                character.resources.filter((_, i) => i !== idx)
              )
            }
          >
            <UI.x />
          </button>
        </div>
      ))}
      <button
        class="btn btn--ghost btn--sm"
        style={{ marginTop: 8 }}
        onClick={() =>
          set("resources", [
            ...character.resources,
            { id: `res-${Date.now().toString(36)}`, name: "New resource", current: 0, max: 1 },
          ])
        }
      >
        <UI.plus /> Add resource
      </button>
    </Sec>
  );
}

export function BuffsSection({ store, character }: SectionProps) {
  const buffs = character.customBuffs ?? [];
  const setBuffs = (value: CharacterRecord["customBuffs"]) =>
    store.setCharacterField(character.id, "customBuffs", value);
  return (
    <Sec icon="ra-bell" title="Custom Buffs">
      <p class="help" style={{ marginTop: 2 }}>
        Your own typed modifiers, toggled as chips on the adjustments tab.
      </p>
      {buffs.map((buff, idx) => (
        <div key={buff.id} style={{ marginTop: 8 }}>
          <div class="respool" style={{ borderBottom: 0 }}>
            <input
              class="inp"
              type="text"
              value={buff.name}
              onInput={(e) =>
                setBuffs(
                  buffs.map((b, i) =>
                    i === idx ? { ...b, name: (e.target as HTMLInputElement).value } : b
                  )
                )
              }
            />
            <button
              class="iconbtn"
              aria-label={`Remove ${buff.name}`}
              onClick={() => {
                setBuffs(buffs.filter((_, i) => i !== idx));
                if (character.buffs.includes(buff.id)) {
                  store.setCharacterField(
                    character.id,
                    "buffs",
                    character.buffs.filter((k) => k !== buff.id)
                  );
                }
              }}
            >
              <UI.x />
            </button>
          </div>
          <ModifierEditor
            modifiers={buff.modifiers}
            source={buff.name || "Custom buff"}
            onChange={(modifiers) =>
              setBuffs(buffs.map((b, i) => (i === idx ? { ...b, modifiers } : b)))
            }
          />
        </div>
      ))}
      <button
        class="btn btn--ghost btn--sm"
        style={{ marginTop: 8 }}
        onClick={() =>
          setBuffs([
            ...buffs,
            { id: `buff-${Date.now().toString(36)}`, name: "New buff", modifiers: [] },
          ])
        }
      >
        <UI.plus /> Add custom buff
      </button>
    </Sec>
  );
}

/* ============================== RULES ============================== */

export function RulesSection({
  store,
  character,
  plugin,
}: SectionProps & { plugin: MiniSheetPlugin }) {
  const set = (value: CharacterRecord["ruleLinks"]) =>
    store.setCharacterField(character.id, "ruleLinks", value);
  const addLink = () => {
    const folder = store.data.value.settings.rulesFolder;
    const modal = new NotePickModal(plugin.app, `Pick a rules note (${folder}/)`, (file) => {
      if (character.ruleLinks.some((l) => l.path === file.path)) return;
      set([...character.ruleLinks, { path: file.path }]);
    });
    modal.open();
  };
  return (
    <Sec icon="ra-aware" title="Rules &amp; Linked Notes" desc={`${character.ruleLinks.length} notes`}>
      {character.ruleLinks.map((link) => (
        <div class="rulerow" key={link.path}>
          <UI.link />
          <span class="rulerow__path">{link.path}</span>
          <input
            class="inp"
            type="text"
            placeholder="category"
            value={link.category ?? ""}
            onInput={(e) => {
              const category = (e.target as HTMLInputElement).value || undefined;
              set(character.ruleLinks.map((l) => (l.path === link.path ? { ...l, category } : l)));
            }}
          />
          <button
            class="iconbtn"
            aria-label={`Remove ${link.path}`}
            onClick={() => set(character.ruleLinks.filter((l) => l.path !== link.path))}
          >
            <UI.x />
          </button>
        </div>
      ))}
      <button class="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={addLink}>
        <UI.plus /> Link a rules note
      </button>
    </Sec>
  );
}
