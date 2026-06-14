import { useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { SpellDbState } from "../../types/data-file";
import { UI } from "../config/glyphs";

/**
 * Persistent left filter column (Spell DB redesign): class find+checklist,
 * level chip grid, school/source/SR selects, components input, and option
 * flags — laid out as Taroca-labelled groups separated by hairline dividers.
 */
export function SpellFilters({
  plugin,
  db,
}: {
  plugin: MiniSheetPlugin;
  db: SpellDbState;
}) {
  const store = plugin.store;
  const [classSearch, setClassSearch] = useState("");
  const classes = plugin.spellIndex.allClasses.value.filter(
    (c) => !classSearch || c.toLowerCase().includes(classSearch.toLowerCase())
  );
  const schools = plugin.spellIndex.allSchools.value;
  const sources = plugin.spellIndex.allSources.value;

  const toggleClass = (cls: string) => {
    const next = db.classes.includes(cls)
      ? db.classes.filter((c) => c !== cls)
      : [...db.classes, cls];
    store.updateSpellDb({ classes: next, page: 0 });
  };
  const toggleLevel = (level: number) => {
    const next = db.levels.includes(level)
      ? db.levels.filter((l) => l !== level)
      : [...db.levels, level];
    store.updateSpellDb({ levels: next, page: 0 });
  };

  return (
    <div class="ms-spelldb__aside">
      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">
          Class
          {db.classes.length > 0 && <span class="badge">{db.classes.length}</span>}
        </div>
        <input
          type="search"
          class="ms-spelldb__finput"
          placeholder="Find a class…"
          value={classSearch}
          onInput={(e) => setClassSearch((e.target as HTMLInputElement).value)}
        />
        <div class="ms-spelldb__classlist">
          {classes.map((cls) => {
            const on = db.classes.includes(cls);
            return (
              <label
                key={cls}
                class={`ms-spelldb__classrow${on ? " is-on" : ""}`}
              >
                <input type="checkbox" checked={on} onChange={() => toggleClass(cls)} />
                <span class={`ms-spelldb__check${on ? " is-on" : ""}`}>
                  {on && <UI.check />}
                </span>
                {cls}
              </label>
            );
          })}
        </div>
      </div>

      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">Level</div>
        <div class="ms-spelldb__chips">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
            <button
              key={level}
              class={`ms-spelldb__chip${db.levels.includes(level) ? " is-on" : ""}`}
              aria-pressed={db.levels.includes(level)}
              onClick={() => toggleLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div class="ms-spelldb__divider" />

      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">School</div>
        <select
          class="ms-spelldb__sel"
          value={db.school}
          onChange={(e) =>
            store.updateSpellDb({
              school: (e.target as HTMLSelectElement).value,
              page: 0,
            })
          }
        >
          <option value="">Any school</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">Source</div>
        <select
          class="ms-spelldb__sel"
          value={db.source}
          onChange={(e) =>
            store.updateSpellDb({
              source: (e.target as HTMLSelectElement).value,
              page: 0,
            })
          }
        >
          <option value="">Any source</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">Spell resistance</div>
        <select
          class="ms-spelldb__sel"
          value={db.sr}
          onChange={(e) =>
            store.updateSpellDb({
              sr: (e.target as HTMLSelectElement).value as SpellDbState["sr"],
              page: 0,
            })
          }
        >
          <option value="">Any</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">Components contain</div>
        <input
          type="search"
          class="ms-spelldb__finput"
          placeholder="e.g. V, S or guano"
          value={db.componentsFilter}
          onInput={(e) =>
            store.updateSpellDb({
              componentsFilter: (e.target as HTMLInputElement).value,
              page: 0,
            })
          }
        />
      </div>

      <div class="ms-spelldb__divider" />

      <div class="ms-spelldb__fgroup">
        <div class="ms-spelldb__flabel">Options</div>
        <label class="ms-spelldb__flag">
          <input
            type="checkbox"
            checked={db.eschewOnly}
            onChange={() => store.updateSpellDb({ eschewOnly: !db.eschewOnly, page: 0 })}
          />
          <span class={`ms-spelldb__check${db.eschewOnly ? " is-on" : ""}`}>
            {db.eschewOnly && <UI.check />}
          </span>
          Eschew Materials compatible
        </label>
        <label class="ms-spelldb__flag">
          <input
            type="checkbox"
            checked={db.knownOnly}
            onChange={() => store.updateSpellDb({ knownOnly: !db.knownOnly, page: 0 })}
          />
          <span class={`ms-spelldb__check${db.knownOnly ? " is-on" : ""}`}>
            {db.knownOnly && <UI.check />}
          </span>
          In current target only
        </label>
      </div>
    </div>
  );
}
