import { useState } from "preact/hooks";
import { STANDARD_SKILLS } from "../../../calc/skills";
import { type SkillEntry } from "../../../types/character";
import { UI } from "../glyphs";
import { Check, Num, Sec } from "../primitives";
import { type SectionProps, setter } from "./shared";

export function SkillsSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const [q, setQ] = useState("");
  const names = Object.keys(character.skills).sort();
  const filtered = names.filter((n) =>
    n.toLowerCase().includes(q.toLowerCase()),
  );
  const classCount = names.filter(
    (n) => character.skills[n]!.classSkill,
  ).length;

  const addStandard = () => {
    const skills: Record<string, SkillEntry> = { ...character.skills };
    for (const [name, ability] of Object.entries(STANDARD_SKILLS)) {
      skills[name] ??= { ability, ranks: 0, misc: 0, classSkill: false };
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
            const sk = character.skills[name]!;
            return (
              <div class="skillrow" key={name}>
                <span class="skillrow__name">{name}</span>
                <span class="skillrow__ab">{sk.ability.toUpperCase()}</span>
                <Num
                  value={sk.ranks}
                  onChange={(v) => set(`skills.${name}.ranks`, v)}
                />
                <Num
                  value={sk.misc}
                  onChange={(v) => set(`skills.${name}.misc`, v)}
                />
                <span class="col">
                  <Check
                    value={sk.classSkill}
                    onChange={(v) => set(`skills.${name}.classSkill`, v)}
                  />
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div class="empty">No skills match “{q}”.</div>
          )}
        </>
      )}
    </Sec>
  );
}
