import type MiniSheetPlugin from "../../main";
import { isEschewMaterialsCompatible } from "../../spells/parse";
import type { SpellDoc } from "../../spells/index";
import type { SpellDbState } from "../../types/data-file";
import { SpellFilters } from "./SpellFilters";
import { SpellTable } from "./SpellTable";

export const PAGE_SIZE = 50;

function matchesClassLevel(doc: SpellDoc, classes: string[], levels: number[]): boolean {
  if (classes.length === 0 && levels.length === 0) return true;
  // pair semantics: some (class, level) entry satisfies both active filters
  return Object.entries(doc.parsed.levels).some(
    ([cls, lvl]) =>
      (classes.length === 0 || classes.includes(cls)) &&
      (levels.length === 0 || levels.includes(lvl))
  );
}

export function filterSpells(
  docs: SpellDoc[],
  db: SpellDbState,
  knownIds: Set<string>
): SpellDoc[] {
  const search = db.search.toLowerCase();
  return docs.filter((doc) => {
    if (search && !doc.name.toLowerCase().includes(search)) return false;
    if (!matchesClassLevel(doc, db.classes, db.levels)) return false;
    if (db.school && doc.school.toLowerCase() !== db.school) return false;
    if (db.source && doc.source !== db.source) return false;
    if (
      db.componentsFilter &&
      !doc.components.toLowerCase().includes(db.componentsFilter.toLowerCase())
    ) {
      return false;
    }
    if (db.sr === "yes" && !doc.sr.toLowerCase().startsWith("yes")) return false;
    if (db.sr === "no" && doc.sr.toLowerCase().startsWith("yes")) return false;
    if (db.eschewOnly && !isEschewMaterialsCompatible(doc.components)) return false;
    if (db.knownOnly && !knownIds.has(doc.id)) return false;
    return true;
  });
}

export function sortSpells(docs: SpellDoc[], db: SpellDbState): SpellDoc[] {
  const dir = db.sortDir === "desc" ? -1 : 1;
  const key = db.sortKey;
  const lowest = (d: SpellDoc) => {
    const levels = Object.values(d.parsed.levels);
    return levels.length ? Math.min(...levels) : 99;
  };
  return [...docs].sort((a, b) => {
    let cmp: number;
    if (key === "level") cmp = lowest(a) - lowest(b);
    else {
      const av = String((a as unknown as Record<string, unknown>)[key] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[key] ?? "");
      cmp = av.localeCompare(bv);
    }
    return cmp === 0 ? a.name.localeCompare(b.name) : cmp * dir;
  });
}

export function SpellDatabaseApp({ plugin }: { plugin: MiniSheetPlugin }) {
  const store = plugin.store;
  const db = store.spellDb();
  const docs = plugin.spellIndex.docs.value;
  // reading data.value keeps this reactive to character/spellbook changes
  const characters = store.data.value.characters.filter((c) => c.spellbook);
  const target =
    characters.find((c) => c.id === db.targetCharacterId) ??
    characters.find((c) => c.id === store.data.value.ui.activeCharacterId) ??
    characters[0] ??
    null;

  const knownIds = new Set<string>();
  if (target?.spellbook) {
    for (const s of target.spellbook.spells) {
      if (s.known) knownIds.add(s.originalId ?? s.id);
    }
  }

  const filtered = sortSpells(filterSpells(docs, db, knownIds), db);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(db.page, pageCount - 1);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div class="ms-spelldb">
      <div class="ms-spelldb__header">
        <input
          type="search"
          class="ms-spelldb__search"
          placeholder="Search spells…"
          value={db.search}
          onInput={(e) =>
            store.updateSpellDb({
              search: (e.target as HTMLInputElement).value,
              page: 0,
            })
          }
        />
        <button
          class="ms-spelldb__filters-toggle"
          aria-expanded={db.filtersOpen}
          onClick={() => store.updateSpellDb({ filtersOpen: !db.filtersOpen })}
        >
          Filters
        </button>
        <button
          class="ms-spelldb__clear"
          onClick={() =>
            store.updateSpellDb({
              search: "",
              classes: [],
              levels: [],
              school: "",
              componentsFilter: "",
              source: "",
              sr: "",
              eschewOnly: false,
              knownOnly: false,
              page: 0,
            })
          }
        >
          Clear all
        </button>
        <span class="ms-spelldb__count">
          Showing {filtered.length} of {docs.length} spells
        </span>
        {characters.length > 0 && (
          <label class="ms-spelldb__target">
            Add to:
            <select
              class="dropdown"
              value={target?.id ?? ""}
              onChange={(e) =>
                store.updateSpellDb({
                  targetCharacterId: (e.target as HTMLSelectElement).value,
                })
              }
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {db.filtersOpen && <SpellFilters plugin={plugin} db={db} />}
      <SpellTable plugin={plugin} db={db} docs={visible} target={target} knownIds={knownIds} />
      {pageCount > 1 && (
        <div class="ms-spelldb__pager">
          <button
            disabled={page === 0}
            onClick={() => store.updateSpellDb({ page: page - 1 })}
          >
            ←
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount - 1}
            onClick={() => store.updateSpellDb({ page: page + 1 })}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
