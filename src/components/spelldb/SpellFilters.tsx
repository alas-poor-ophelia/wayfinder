import { useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { SpellDbState } from "../../types/data-file";

/** The legacy filter set: class, level 0–9, school, components text,
 *  source, SR, eschew-materials, plus known-only for the target. */
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
      <div class="ms-spelldb__filter-group">
        <div class="ms-spelldb__filter-title">Class</div>
        <input
          type="search"
          placeholder="Filter classes…"
          value={classSearch}
          onInput={(e) => setClassSearch((e.target as HTMLInputElement).value)}
        />
        <div class="ms-spelldb__checks">
          {classes.map((cls) => (
            <label key={cls}>
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
      <div class="ms-spelldb__filter-group">
        <div class="ms-spelldb__filter-title">Level</div>
        <div class="ms-spelldb__checks ms-spelldb__checks--row">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
            <label key={level}>
              <input
                type="checkbox"
                checked={db.levels.includes(level)}
                onChange={() => toggleLevel(level)}
              />
              {level}
            </label>
          ))}
        </div>
      </div>
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
          <option value="">Any</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          <option value="">Any</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div class="ms-spelldb__filter-group">
        <div class="ms-spelldb__filter-title">Components</div>
        <input
          type="search"
          placeholder="e.g. V, S"
          value={db.componentsFilter}
          onInput={(e) =>
            store.updateSpellDb({
              componentsFilter: (e.target as HTMLInputElement).value,
              page: 0,
            })
          }
        />
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
          Known only
        </label>
      </div>
    </div>
  );
}
