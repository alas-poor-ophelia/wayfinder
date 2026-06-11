import { useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { SpellDbState } from "../../types/data-file";

/**
 * The legacy filter set (class, level 0–9, school, components, source, SR,
 * eschew-materials) plus known-only — laid out as labeled groups: class
 * picker with its own search, level chips, dropdown pairs, and an options
 * column.
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
    <div class="ms-spelldb__filters">
      <div class="ms-spelldb__filter-group ms-spelldb__filter-group--classes">
        <div class="ms-spelldb__filter-title">
          Class
          {db.classes.length > 0 && (
            <span class="ms-spelldb__filter-badge">{db.classes.length}</span>
          )}
        </div>
        <input
          type="search"
          placeholder="Find a class…"
          value={classSearch}
          onInput={(e) => setClassSearch((e.target as HTMLInputElement).value)}
        />
        <div class="ms-spelldb__class-list">
          {classes.map((cls) => (
            <label key={cls} class={db.classes.includes(cls) ? "is-on" : ""}>
              <input
                type="checkbox"
                checked={db.classes.includes(cls)}
                onChange={() => toggleClass(cls)}
              />
              {cls}
            </label>
          ))}
        </div>
      </div>

      <div class="ms-spelldb__filter-col">
        <div class="ms-spelldb__filter-group">
          <div class="ms-spelldb__filter-title">Level</div>
          <div class="ms-spelldb__level-chips">
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
        <div class="ms-spelldb__filter-group">
          <div class="ms-spelldb__filter-title">Components contain</div>
          <input
            type="search"
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
      </div>

      <div class="ms-spelldb__filter-col">
        <div class="ms-spelldb__filter-group">
          <div class="ms-spelldb__filter-title">School</div>
          <select
            class="dropdown"
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
        <div class="ms-spelldb__filter-group">
          <div class="ms-spelldb__filter-title">Source</div>
          <select
            class="dropdown"
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
        <div class="ms-spelldb__filter-group">
          <div class="ms-spelldb__filter-title">Spell resistance</div>
          <select
            class="dropdown"
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
      </div>

      <div class="ms-spelldb__filter-group">
        <div class="ms-spelldb__filter-title">Options</div>
        <label class="ms-spelldb__flag">
          <input
            type="checkbox"
            checked={db.eschewOnly}
            onChange={() =>
              store.updateSpellDb({ eschewOnly: !db.eschewOnly, page: 0 })
            }
          />
          Eschew Materials compatible
        </label>
        <label class="ms-spelldb__flag">
          <input
            type="checkbox"
            checked={db.knownOnly}
            onChange={() =>
              store.updateSpellDb({ knownOnly: !db.knownOnly, page: 0 })
            }
          />
          Known spells only
        </label>
      </div>
    </div>
  );
}
