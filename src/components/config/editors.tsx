import { STANDARD_SKILLS } from "../../calc/skills";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type {
  CharacterRecord,
  ResourcePool,
  RuleLink,
  SkillEntry,
} from "../../types/character";
import { NotePickModal } from "../../modals";

interface EditorProps {
  store: MiniSheetStore;
  character: CharacterRecord;
}

export function SkillsEditor({ store, character }: EditorProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);
  const names = Object.keys(character.skills).sort();

  const addStandard = () => {
    const skills: Record<string, SkillEntry> = { ...character.skills };
    for (const [name, ability] of Object.entries(STANDARD_SKILLS)) {
      if (!skills[name]) {
        skills[name] = { ability, ranks: 0, misc: 0, classSkill: false };
      }
    }
    set("skills", skills);
  };

  return (
    <section class="ms-config__section">
      <h3 class="ms-config__section-title">Skills</h3>
      {names.length === 0 && (
        <button class="ms-config__add" onClick={addStandard}>
          + Add standard PF1e skills
        </button>
      )}
      {names.map((name) => {
        const entry = character.skills[name];
        return (
          <div class="ms-config__skill-row" key={name}>
            <span class="ms-config__skill-name">{name}</span>
            <span class="ms-config__skill-ability">{entry.ability.toUpperCase()}</span>
            <input
              type="number"
              class="ms-config__skill-num"
              aria-label={`${name} ranks`}
              value={entry.ranks}
              min={0}
              onInput={(e) => {
                const n = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(n)) set(`skills.${name}.ranks`, n);
              }}
            />
            <input
              type="number"
              class="ms-config__skill-num"
              aria-label={`${name} misc bonus`}
              value={entry.misc}
              onInput={(e) => {
                const n = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(n)) set(`skills.${name}.misc`, n);
              }}
            />
            <input
              type="checkbox"
              aria-label={`${name} class skill`}
              checked={entry.classSkill}
              onChange={(e) =>
                set(`skills.${name}.classSkill`, (e.target as HTMLInputElement).checked)
              }
            />
          </div>
        );
      })}
      {names.length > 0 && (
        <div class="ms-config__skill-legend">name / ability / ranks / misc / class</div>
      )}
    </section>
  );
}

export function ResourcesEditor({ store, character }: EditorProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);

  const update = (idx: number, patch: Partial<ResourcePool>) => {
    const next = character.resources.map((r, i) =>
      i === idx ? { ...r, ...patch } : r
    );
    set("resources", next);
  };

  return (
    <section class="ms-config__section">
      <h3 class="ms-config__section-title">Resources</h3>
      <div class="ms-config__abilities">
        <label class="ms-field">
          <span class="ms-field__label">Panache max</span>
          <input
            class="ms-field__input ms-field__input--number"
            type="number"
            min={0}
            value={character.panache.max}
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n)) set("panache.max", n);
            }}
          />
        </label>
      </div>
      {character.resources.map((pool, idx) => (
        <div class="ms-config__resource-row" key={pool.id}>
          <input
            class="ms-field__input"
            type="text"
            aria-label="Resource name"
            value={pool.name}
            onInput={(e) => update(idx, { name: (e.target as HTMLInputElement).value })}
          />
          <input
            class="ms-config__skill-num"
            type="number"
            aria-label={`${pool.name} max`}
            min={0}
            value={pool.max}
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n)) update(idx, { max: n });
            }}
          />
          <input
            class="ms-field__input ms-config__resource-footer"
            type="text"
            placeholder="footer"
            aria-label={`${pool.name} footer`}
            value={pool.footer ?? ""}
            onInput={(e) =>
              update(idx, { footer: (e.target as HTMLInputElement).value || undefined })
            }
          />
          <button
            class="ms-config__remove"
            aria-label={`Remove ${pool.name}`}
            onClick={() =>
              set(
                "resources",
                character.resources.filter((_, i) => i !== idx)
              )
            }
          >
            ✕
          </button>
        </div>
      ))}
      <button
        class="ms-config__add"
        onClick={() =>
          set("resources", [
            ...character.resources,
            {
              id: `res-${Date.now().toString(36)}`,
              name: "New resource",
              current: 0,
              max: 1,
            },
          ])
        }
      >
        + Add resource
      </button>
    </section>
  );
}

export function RuleLinksEditor({
  store,
  character,
  plugin,
}: EditorProps & { plugin: MiniSheetPlugin }) {
  const set = (value: RuleLink[]) =>
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
    <section class="ms-config__section">
      <h3 class="ms-config__section-title">Rules links</h3>
      {character.ruleLinks.map((link) => (
        <div class="ms-config__rule-row" key={link.path}>
          <span class="ms-config__rule-path">{link.path}</span>
          <input
            class="ms-field__input ms-config__rule-category"
            type="text"
            placeholder="category"
            value={link.category ?? ""}
            onInput={(e) => {
              const category = (e.target as HTMLInputElement).value || undefined;
              set(
                character.ruleLinks.map((l) =>
                  l.path === link.path ? { ...l, category } : l
                )
              );
            }}
          />
          <button
            class="ms-config__remove"
            aria-label={`Remove ${link.path}`}
            onClick={() => set(character.ruleLinks.filter((l) => l.path !== link.path))}
          >
            ✕
          </button>
        </div>
      ))}
      <button class="ms-config__add" onClick={addLink}>
        + Link rules note
      </button>
    </section>
  );
}

export function EnergyResEditor({ store, character }: EditorProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);
  const kinds = ["cold", "fire", "acid", "electricity", "sonic"];
  return (
    <section class="ms-config__section">
      <h3 class="ms-config__section-title">Energy resistance</h3>
      <div class="ms-config__abilities">
        {kinds.map((kind) => (
          <label class="ms-field" key={kind}>
            <span class="ms-field__label">{kind}</span>
            <input
              class="ms-field__input ms-field__input--number"
              type="number"
              min={0}
              value={character.energyRes[kind] ?? 0}
              onInput={(e) => {
                const n = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(n)) set(`energyRes.${kind}`, n);
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export function MiscConfigEditor({ store, character }: EditorProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);
  return (
    <section class="ms-config__section">
      <h3 class="ms-config__section-title">Combat config</h3>
      <div class="ms-config__abilities">
        <label class="ms-field">
          <span class="ms-field__label">Natural AC</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.ac.natural}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("ac.natural", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Dodge AC</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.ac.dodge}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("ac.dodge", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Deflection</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.ac.deflection}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("ac.deflection", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Size mod</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.ac.sizeMod}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("ac.sizeMod", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Melee enh.</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.enhancements.meleeWeapon}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("enhancements.meleeWeapon", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Ranged enh.</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.enhancements.rangedWeapon}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("enhancements.rangedWeapon", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Resist enh.</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.enhancements.resistance}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("enhancements.resistance", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Init misc</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.initiative.miscBonus}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("initiative.miscBonus", n); }} />
        </label>
        <label class="ms-field">
          <span class="ms-field__label">Init familiar</span>
          <input class="ms-field__input ms-field__input--number" type="number" value={character.initiative.familiarBonus}
            onInput={(e) => { const n = Number((e.target as HTMLInputElement).value); if (!Number.isNaN(n)) set("initiative.familiarBonus", n); }} />
        </label>
      </div>
      <label class="ms-field">
        <span class="ms-field__label">Versatile Perf.</span>
        <input
          type="checkbox"
          checked={character.toggles.versatilePerformance}
          onChange={(e) =>
            set("toggles.versatilePerformance", (e.target as HTMLInputElement).checked)
          }
        />
      </label>
      <label class="ms-field">
        <span class="ms-field__label">Agile weapon</span>
        <input
          type="checkbox"
          checked={character.toggles.agileWeapon}
          onChange={(e) =>
            set("toggles.agileWeapon", (e.target as HTMLInputElement).checked)
          }
        />
      </label>
    </section>
  );
}
