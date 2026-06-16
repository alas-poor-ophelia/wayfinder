import {
  applyHeritage,
  findRaceByName,
  getHeritage,
  getRaceData,
  listHeritages,
} from "../../../data/races";
import {
  ABILITY_KEYS,
  type AbilityKey,
  type CharacterRecord,
} from "../../../types/character";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";
import { Check, Num, Row, Sec, Seg, Sel, Txt } from "../primitives";
import {
  BASE_HERITAGE,
  CUSTOM_RACE,
  RACE_NAME_OPTIONS,
  RaceDetail,
  type SectionProps,
  setter,
} from "./shared";

export function IdentitySection({ store, character }: SectionProps) {
  const set = setter(store, character);
  // Create a new sheet of the given type, switch to it, and (for a linked
  // type) point its master at the current PC — or, when adding from a
  // familiar/companion, reuse that sheet's master.
  const createSheet = (type: CharacterRecord["characterType"]) => {
    const masterId =
      character.characterType === "pc"
        ? character.id
        : character.link?.masterId;
    const name =
      type === "companion"
        ? "New Companion"
        : type === "familiar"
          ? "New Familiar"
          : "New Character";
    const rec = store.addCharacter(name);
    const patch: Partial<CharacterRecord> = { characterType: type };
    if (type !== "pc" && masterId) {
      patch.link = { masterId, hpMaxFromMaster: false, babFromMaster: false };
    }
    if (type === "companion") patch.companionLevel = 1;
    store.updateCharacter(rec.id, patch);
  };
  const baseRace = character.raceKey ? getRaceData(character.raceKey) : null;
  const heritages = baseRace ? listHeritages(baseRace.key) : [];
  const heritage = baseRace
    ? getHeritage(baseRace.key, character.raceHeritageKey ?? "")
    : null;
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
            store.setRace(
              character.id,
              v === CUSTOM_RACE ? null : (findRaceByName(v)?.key ?? null),
            )
          }
        />
      </Row>
      {/* races with no heritage variants: race detail sits under Race data */}
      {race && heritages.length === 0 && (
        <RaceDetail race={race} heritage={null} />
      )}
      {heritages.length > 0 && (
        <Row label="Heritage">
          <Sel
            value={heritage ? heritage.name : BASE_HERITAGE}
            options={[BASE_HERITAGE, ...heritages.map((h) => h.name)]}
            onChange={(v) =>
              store.setRaceHeritage(
                character.id,
                heritages.find((h) => h.name === v)?.key ?? null,
              )
            }
          />
        </Row>
      )}
      {/* races with heritages: the detail lives with the heritage picker */}
      {race && heritages.length > 0 && (
        <RaceDetail race={race} heritage={heritage} />
      )}
      {baseRace?.flexibleAbility && (
        <Row label="+2 ability">
          <Sel
            value={character.raceAbilityChoice ?? "—"}
            options={["—", ...ABILITY_KEYS]}
            onChange={(v) =>
              set(
                "raceAbilityChoice",
                ABILITY_KEYS.includes(v as AbilityKey) ? v : undefined,
              )
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
            { value: "companion", label: "Companion" },
          ]}
          onChange={(v) => set("characterType", v)}
        />
      </Row>
      {character.characterType !== "pc" && (
        <Row label="Master" sub="links to a PC sheet">
          <Sel
            value={character.link?.masterId ?? ""}
            options={[
              { value: "", label: "— none —" },
              ...store.data.value.characters
                .filter(
                  (c) => c.id !== character.id && c.characterType === "pc",
                )
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(v) =>
              set(
                "link",
                v
                  ? {
                      masterId: v,
                      hpMaxFromMaster: character.link?.hpMaxFromMaster ?? false,
                      babFromMaster: character.link?.babFromMaster ?? false,
                    }
                  : undefined,
              )
            }
          />
        </Row>
      )}
      {character.characterType === "familiar" && character.link && (
        <>
          <Row label="HP from master" sub="½ master max">
            <Check
              value={character.link.hpMaxFromMaster}
              onChange={(v) =>
                set("link", { ...character.link!, hpMaxFromMaster: v })
              }
            />
          </Row>
          <Row label="BAB from master">
            <Check
              value={character.link.babFromMaster}
              onChange={(v) =>
                set("link", { ...character.link!, babFromMaster: v })
              }
            />
          </Row>
        </>
      )}
      {character.characterType === "companion" && (
        <Row label="Companion level" sub="drives the stat table">
          <Num
            value={character.companionLevel ?? 1}
            width={88}
            onChange={(v) =>
              set("companionLevel", Math.max(1, Math.min(20, v)))
            }
          />
        </Row>
      )}
      <Row
        label="Speed"
        sub={race && !character.speed ? "derives from race" : undefined}
      >
        <input
          class="num"
          style={{ width: 88 }}
          value={character.speed}
          placeholder={race ? `${race.speed}ft` : "30ft"}
          onInput={(e) => set("speed", (e.target as HTMLInputElement).value)}
        />
      </Row>
      <Row label="Banner image" sub="vault path">
        <Txt
          value={character.bannerImage ?? ""}
          onChange={(v) => set("bannerImage", v)}
        />
      </Row>
      <Row label="New sheet" sub="creates & switches">
        <div class="id-create">
          <button class="btn btn--sm" onClick={() => createSheet("pc")}>
            + PC
          </button>
          <button class="btn btn--sm" onClick={() => createSheet("familiar")}>
            + Familiar
          </button>
          <button class="btn btn--sm" onClick={() => createSheet("companion")}>
            + Companion
          </button>
        </div>
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
      qa.stages.every(
        (s) =>
          s.effects.length > 0 && s.effects.every((e) => e.kind === "special"),
      ),
  );
  const isOn = (id: string) =>
    (character.quickActionState?.[id]?.stage ?? 0) > 0;
  const onCount = passives.filter((qa) => isOn(qa.id)).length;

  return (
    <Sec icon="ra-aware" title="Actions" desc={`${onCount} on`}>
      <p class="help" style={{ marginTop: 2, marginBottom: 11 }}>
        Situational toggles you flip now and then. For frequently-used actions,
        use Effects → Quick Actions.
      </p>
      <div class="cact-row">
        {passives.map((qa) => (
          <button
            key={qa.id}
            class="cact"
            title={qa.name}
            aria-pressed={isOn(qa.id)}
            onClick={() =>
              set(`quickActionState.${qa.id}`, { stage: isOn(qa.id) ? 0 : 1 })
            }
          >
            <span class={`squircle${isOn(qa.id) ? " is-on" : ""}`}>
              <Icon id={qa.icon} />
            </span>
            <span class="cact__name">{qa.name}</span>
          </button>
        ))}
        <button
          class="cact cact--add"
          title="Add an action in Effects → Quick Actions"
          onClick={goToEffects}
        >
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
