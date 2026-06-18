/**
 * Maneuver database — the Path of War analogue of SpellDatabaseApp, trimmed to
 * the one "database" section (maneuvers have no metamagic; loadouts live on the
 * tab). Mirrors the spell DB's DOM/classes (.ms-spelldb__header / __body /
 * __aside / __main) so it inherits the exact same chrome, and renders each
 * maneuver name as a real Obsidian internal link (click opens the note, hover
 * shows the page preview). Filters by discipline / type / tier / search and
 * adds maneuvers to the target character's maneuverbook roster.
 */
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type { ManeuverDbState } from "../../types/data-file";
import type { ManeuverDoc } from "../../maneuvers/index";
import type { ManeuverType } from "../../types/maneuverbook";
import {
  addManeuverToRoster,
  removeManeuver,
} from "../../state/maneuver-actions";
import { UI } from "../config/glyphs";

const PAGE_SIZE = 50;
const TYPES: ManeuverType[] = ["Strike", "Boost", "Counter", "Stance"];
const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const COLUMNS: { key: string; label: string; sort?: boolean; dim?: boolean }[] =
  [
    { key: "name", label: "Name", sort: true },
    { key: "discipline", label: "Discipline", sort: true },
    { key: "tier", label: "Tier", sort: true },
    { key: "type", label: "Type" },
    { key: "action", label: "Action" },
    { key: "range", label: "Range", dim: true },
    { key: "save", label: "Save", dim: true },
    { key: "source", label: "Source", dim: true },
  ];

function resolveTarget(
  store: MiniSheetStore,
  db: ManeuverDbState,
): CharacterRecord | null {
  const chars = store.data.value.characters.filter((c) => c.maneuverbook);
  return (
    chars.find((c) => c.id === db.targetCharacterId) ??
    chars.find((c) => c.id === store.data.value.ui.activeCharacterId) ??
    chars[0] ??
    null
  );
}

/** Pure filter — exported for tests. */
export function filterManeuvers(
  docs: ManeuverDoc[],
  db: ManeuverDbState,
  knownIds: Set<string>,
): ManeuverDoc[] {
  const search = db.search.toLowerCase();
  return docs.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search)) return false;
    if (db.disciplines.length && !db.disciplines.includes(d.discipline))
      return false;
    if (db.types.length && !db.types.includes(d.type)) return false;
    if (db.tiers.length && !db.tiers.includes(d.level)) return false;
    if (db.knownOnly && !knownIds.has(d.id)) return false;
    return true;
  });
}

/** Pure sort — exported for tests. */
export function sortManeuvers(
  docs: ManeuverDoc[],
  db: ManeuverDbState,
): ManeuverDoc[] {
  const dir = db.sortDir === "desc" ? -1 : 1;
  return [...docs].sort((a, b) => {
    let cmp: number;
    if (db.sortKey === "tier") cmp = a.level - b.level;
    else if (db.sortKey === "discipline")
      cmp = a.discipline.localeCompare(b.discipline);
    else cmp = a.name.localeCompare(b.name);
    return cmp === 0 ? a.name.localeCompare(b.name) : cmp * dir;
  });
}

export function ManeuverDatabaseApp({ plugin }: { plugin: MiniSheetPlugin }) {
  const store = plugin.store;
  const db = store.maneuverDb();
  const docs = plugin.maneuverIndex.docs.value;
  const target = resolveTarget(store, db);
  const characters = store.data.value.characters.filter((c) => c.maneuverbook);
  const disciplines = plugin.maneuverIndex.allDisciplines.value;

  const knownIds = new Set(
    target?.maneuverbook?.maneuvers.map((m) => m.id) ?? [],
  );

  const filtered = sortManeuvers(filterManeuvers(docs, db, knownIds), db);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(db.page, pageCount - 1);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleIn = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const setSort = (key: string) =>
    db.sortKey === key
      ? store.updateManeuverDb({
          sortDir: db.sortDir === "asc" ? "desc" : "asc",
        })
      : store.updateManeuverDb({ sortKey: key, sortDir: "asc" });

  const openNote = (path: string) =>
    void plugin.app.workspace.openLinkText(path, "", true);
  const hover = (e: MouseEvent, path: string) =>
    plugin.app.workspace.trigger("hover-link", {
      event: e,
      source: "minisheet",
      hoverParent: { hoverPopover: null },
      targetEl: e.currentTarget as HTMLElement,
      linktext: path,
      sourcePath: "",
    });

  return (
    <div class="ms-spelldb">
      <div class="ms-spelldb__header">
        <div class="ms-spelldb__search">
          <UI.search />
          <input
            type="search"
            placeholder="Search maneuvers…"
            value={db.search}
            onInput={(e) =>
              store.updateManeuverDb({
                search: (e.target as HTMLInputElement).value,
                page: 0,
              })
            }
          />
        </div>
        <button
          class={`ms-spelldb__btn${db.filtersOpen ? " is-on" : ""}`}
          aria-expanded={db.filtersOpen}
          onClick={() =>
            store.updateManeuverDb({ filtersOpen: !db.filtersOpen })
          }
        >
          <UI.sliders />
          Filters
        </button>
        <button
          class="ms-spelldb__btn ms-spelldb__btn--ghost"
          onClick={() =>
            store.updateManeuverDb({
              search: "",
              disciplines: [],
              types: [],
              tiers: [],
              knownOnly: false,
              page: 0,
            })
          }
        >
          Clear all
        </button>
        <span class="ms-spelldb__count">
          Showing <b>{filtered.length}</b> of {docs.length} maneuvers
        </span>
        {characters.length > 0 && (
          <label class="ms-spelldb__target">
            Add to
            <select
              class="ms-spelldb__sel"
              value={target?.id ?? ""}
              onChange={(e) =>
                store.updateManeuverDb({
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

      {characters.length === 0 && (
        <div class="ms-spelldb__empty">
          No Path of War initiators yet — browse below, but to <b>add</b>{" "}
          maneuvers first open <b>Configure → Combat → Path of War</b> and pick
          a class (Warlord, Warder, or Stalker). The Maneuvers tab and the add
          buttons here then target that character.
        </div>
      )}

      <div class={`ms-spelldb__body${db.filtersOpen ? "" : " is-nofilters"}`}>
        {db.filtersOpen && (
          <div class="ms-spelldb__aside">
            <div class="ms-spelldb__fgroup">
              <div class="ms-spelldb__flabel">
                Discipline
                {db.disciplines.length > 0 && (
                  <span class="badge">{db.disciplines.length}</span>
                )}
              </div>
              <div class="ms-spelldb__classlist">
                {disciplines.map((d) => {
                  const on = db.disciplines.includes(d);
                  return (
                    <label
                      key={d}
                      class={`ms-spelldb__classrow${on ? " is-on" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          store.updateManeuverDb({
                            disciplines: toggleIn(db.disciplines, d),
                            page: 0,
                          })
                        }
                      />
                      <span class={`ms-spelldb__check${on ? " is-on" : ""}`}>
                        {on && <UI.check />}
                      </span>
                      {d}
                    </label>
                  );
                })}
              </div>
            </div>

            <div class="ms-spelldb__fgroup">
              <div class="ms-spelldb__flabel">Type</div>
              <div class="ms-spelldb__chips ms-spelldb__chips--wrap">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    class={`ms-spelldb__chip${db.types.includes(t) ? " is-on" : ""}`}
                    aria-pressed={db.types.includes(t)}
                    onClick={() =>
                      store.updateManeuverDb({
                        types: toggleIn(db.types, t),
                        page: 0,
                      })
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div class="ms-spelldb__fgroup">
              <div class="ms-spelldb__flabel">Tier</div>
              <div class="ms-spelldb__chips ms-spelldb__chips--wrap">
                {TIERS.map((n) => (
                  <button
                    key={n}
                    class={`ms-spelldb__chip${db.tiers.includes(n) ? " is-on" : ""}`}
                    aria-pressed={db.tiers.includes(n)}
                    onClick={() =>
                      store.updateManeuverDb({
                        tiers: toggleIn(db.tiers, n),
                        page: 0,
                      })
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div class="ms-spelldb__divider" />

            <div class="ms-spelldb__fgroup">
              <div class="ms-spelldb__flabel">Options</div>
              <label class="ms-spelldb__flag">
                <input
                  type="checkbox"
                  checked={db.knownOnly}
                  onChange={() =>
                    store.updateManeuverDb({
                      knownOnly: !db.knownOnly,
                      page: 0,
                    })
                  }
                />
                <span
                  class={`ms-spelldb__check${db.knownOnly ? " is-on" : ""}`}
                >
                  {db.knownOnly && <UI.check />}
                </span>
                In current target only
              </label>
            </div>
          </div>
        )}

        <div class="ms-spelldb__main">
          <div class="ms-spelldb__tablescroll">
            <table class="ms-spelldb__table">
              <thead>
                <tr>
                  {target && <th class="ms-spelldb__addcol" />}
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      class={db.sortKey === col.key ? "is-sort" : ""}
                      onClick={col.sort ? () => setSort(col.key) : undefined}
                    >
                      {col.label}
                      {col.sort && db.sortKey === col.key && (
                        <span class="ms-spelldb__sortcaret">
                          {db.sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => {
                  const known = knownIds.has(d.id);
                  return (
                    <tr key={d.path} class={known ? "is-known" : ""}>
                      {target && (
                        <td class="ms-spelldb__addcol">
                          {known ? (
                            <button
                              class="ms-spelldb__remove"
                              aria-label={`Remove ${d.name}`}
                              onClick={() =>
                                removeManeuver(store, target, d.id)
                              }
                            >
                              <UI.x />
                            </button>
                          ) : (
                            <button
                              class="ms-spelldb__add"
                              aria-label={`Add ${d.name}`}
                              onClick={() =>
                                addManeuverToRoster(store, target, d)
                              }
                            >
                              <UI.plus />
                            </button>
                          )}
                        </td>
                      )}
                      <td>
                        <a
                          class="ms-spelldb__name"
                          data-href={d.path}
                          href={d.path}
                          onClick={(e) => {
                            e.preventDefault();
                            openNote(d.path);
                          }}
                          onMouseOver={(e) => hover(e, d.path)}
                        >
                          {d.name}
                        </a>
                      </td>
                      <td>{d.discipline}</td>
                      <td class="ms-spelldb__numcol">{d.level}</td>
                      <td>{d.type}</td>
                      <td>{d.action}</td>
                      <td class="sp-dim">{d.range}</td>
                      <td class="sp-dim">{d.save}</td>
                      <td class="sp-dim">{d.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {docs.length === 0 && (
              <div class="ms-spelldb__empty">
                No maneuver notes found. Download the Path of War maneuvers from
                the wayfinder-rules repo into your maneuvers folder (Settings →
                Wayfinder).
              </div>
            )}
            {docs.length > 0 && filtered.length === 0 && (
              <div class="ms-spelldb__empty">
                No matches — adjust your search or filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {pageCount > 1 && (
        <div class="ms-spelldb__pager">
          <button
            disabled={page === 0}
            onClick={() => store.updateManeuverDb({ page: page - 1 })}
          >
            <UI.arrowL />
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount - 1}
            onClick={() => store.updateManeuverDb({ page: page + 1 })}
          >
            <UI.arrowR />
          </button>
        </div>
      )}
    </div>
  );
}
