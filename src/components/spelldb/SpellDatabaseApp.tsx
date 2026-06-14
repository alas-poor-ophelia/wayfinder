import { Notice } from "obsidian";
import type MiniSheetPlugin from "../../main";
import { addKnownSpell, addSpellToLoadout } from "../../state/spellbook-actions";
import { isEschewMaterialsCompatible, transformSpellForSpellbook } from "../../spells/parse";
import type { SpellDoc } from "../../spells/index";
import type { CharacterRecord } from "../../types/character";
import type { SpellDbState } from "../../types/data-file";
import type { Loadout } from "../../types/spellbook";
import { Icon } from "../common/Icon";
import { UI } from "../config/glyphs";
import { SpellFilters } from "./SpellFilters";
import { SpellLoadouts } from "./SpellLoadouts";
import { SpellMetamagic } from "./SpellMetamagic";
import { SpellTable } from "./SpellTable";

export const PAGE_SIZE = 50;

const TABS: Array<{ key: SpellDbState["section"]; label: string; icon: string }> = [
  { key: "database", label: "Database", icon: "ra-book" },
  { key: "loadouts", label: "Loadouts", icon: "ra-scroll-unfurled" },
  { key: "metamagic", label: "Metamagic", icon: "ra-fairy-wand" },
];

/** Resolve the target character (DB add destination + loadout owner). */
function resolveTarget(
  store: MiniSheetPlugin["store"],
  db: SpellDbState
): CharacterRecord | null {
  const characters = store.data.value.characters.filter((c) => c.spellbook);
  return (
    characters.find((c) => c.id === db.targetCharacterId) ??
    characters.find((c) => c.id === store.data.value.ui.activeCharacterId) ??
    characters[0] ??
    null
  );
}

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

function SectionTabs({
  db,
  store,
  counts,
}: {
  db: SpellDbState;
  store: MiniSheetPlugin["store"];
  counts: Partial<Record<SpellDbState["section"], number>>;
}) {
  return (
    <div class="ms-spelldb__tabs">
      {TABS.map((t) => (
        <button
          key={t.key}
          class={`ms-spelldb__tab${db.section === t.key ? " is-on" : ""}`}
          onClick={() =>
            // tab switch resets search, sort, page, and filters (handoff)
            store.updateSpellDb({
              section: t.key,
              search: "",
              classes: [],
              levels: [],
              school: "",
              componentsFilter: "",
              source: "",
              sr: "",
              eschewOnly: false,
              knownOnly: false,
              sortKey: "name",
              sortDir: "asc",
              page: 0,
            })
          }
        >
          <Icon id={t.icon} class="ms-spelldb__tab-icon" />
          <span>{t.label}</span>
          {counts[t.key] != null && (
            <span class="ms-spelldb__tab-count">{counts[t.key]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function DatabaseSection({
  plugin,
  target,
  activeLoadout,
}: {
  plugin: MiniSheetPlugin;
  target: CharacterRecord | null;
  activeLoadout: Loadout | null;
}) {
  const store = plugin.store;
  const db = store.spellDb();
  const docs = plugin.spellIndex.docs.value;
  const characters = store.data.value.characters.filter((c) => c.spellbook);
  const toLoadout = activeLoadout !== null;

  // "known" set drives the gold rail + dedupe; for a loadout target it's the
  // spells already in the loadout (mapped back to their database id).
  const knownIds = new Set<string>();
  if (activeLoadout && target?.spellbook) {
    const byId = new Map(target.spellbook.spells.map((s) => [s.id, s]));
    for (const entry of activeLoadout.spells) {
      const ks = byId.get(entry.spellId);
      knownIds.add(ks ? ks.originalId ?? ks.id : entry.spellId);
    }
  } else if (target?.spellbook) {
    for (const s of target.spellbook.spells) {
      if (s.known) knownIds.add(s.originalId ?? s.id);
    }
  }

  const filtered = sortSpells(filterSpells(docs, db, knownIds), db);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(db.page, pageCount - 1);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // add-to-loadout override: ensure the spell is known, then add to the loadout
  const addToLoadout = toLoadout
    ? (doc: SpellDoc, level: number | null, classes: string[] | null) => {
        if (!target || !activeLoadout) return;
        const spell = transformSpellForSpellbook(doc, level, classes);
        addKnownSpell(store, target, spell);
        addSpellToLoadout(store, target, activeLoadout.id, {
          spellId: spell.id,
          level: spell.baseLevel,
          metamagic: [],
          count: 1,
        });
        new Notice(`Added ${doc.name} to ${activeLoadout.name}`);
      }
    : undefined;

  const targetValue = activeLoadout
    ? `load:${activeLoadout.id}`
    : target
      ? `char:${target.id}`
      : "";

  const onTargetChange = (raw: string) => {
    if (raw.startsWith("load:")) {
      store.updateSpellDb({ addLoadoutId: raw.slice(5) });
    } else if (raw.startsWith("char:")) {
      store.updateSpellDb({ targetCharacterId: raw.slice(5), addLoadoutId: null });
    }
  };

  const targetLoadouts = target?.spellbook?.loadouts ?? [];

  return (
    <>
      <div class="ms-spelldb__header">
        <div class="ms-spelldb__search">
          <UI.search />
          <input
            type="search"
            placeholder="Search spells…"
            value={db.search}
            onInput={(e) =>
              store.updateSpellDb({
                search: (e.target as HTMLInputElement).value,
                page: 0,
              })
            }
          />
        </div>
        <button
          class={`ms-spelldb__btn${db.filtersOpen ? " is-on" : ""}`}
          aria-expanded={db.filtersOpen}
          onClick={() => store.updateSpellDb({ filtersOpen: !db.filtersOpen })}
        >
          <UI.sliders />
          Filters
        </button>
        <button
          class="ms-spelldb__btn ms-spelldb__btn--ghost"
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
          Showing <b>{filtered.length}</b> of {docs.length} spells
        </span>
        {characters.length > 0 && (
          <label class={`ms-spelldb__target${toLoadout ? " is-load" : ""}`}>
            Add to
            <select
              class="ms-spelldb__sel"
              value={targetValue}
              onChange={(e) => onTargetChange((e.target as HTMLSelectElement).value)}
            >
              <optgroup label="Spellbook">
                {characters.map((c) => (
                  <option key={c.id} value={`char:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              {targetLoadouts.length > 0 && (
                <optgroup label="Loadout">
                  {targetLoadouts.map((l) => (
                    <option key={l.id} value={`load:${l.id}`}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        )}
      </div>
      <div class={`ms-spelldb__body${db.filtersOpen ? "" : " is-nofilters"}`}>
        {db.filtersOpen && <SpellFilters plugin={plugin} db={db} />}
        <SpellTable
          plugin={plugin}
          db={db}
          docs={visible}
          target={target}
          targetIsLoadout={toLoadout}
          knownIds={knownIds}
          onAdd={addToLoadout}
        />
      </div>
      {pageCount > 1 && (
        <div class="ms-spelldb__pager">
          <button
            disabled={page === 0}
            onClick={() => store.updateSpellDb({ page: page - 1 })}
          >
            <UI.arrowL />
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount - 1}
            onClick={() => store.updateSpellDb({ page: page + 1 })}
          >
            <UI.arrowR />
          </button>
        </div>
      )}
    </>
  );
}

export function SpellDatabaseApp({ plugin }: { plugin: MiniSheetPlugin }) {
  const store = plugin.store;
  const db = store.spellDb();
  const docs = plugin.spellIndex.docs.value;

  const target = resolveTarget(store, db);
  const loadouts = target?.spellbook?.loadouts ?? [];
  const activeLoadout =
    (db.addLoadoutId && loadouts.find((l) => l.id === db.addLoadoutId)) || null;
  const knownMetamagic = target?.spellbook?.metamagicFeats?.length ?? 0;

  return (
    <div class="ms-spelldb">
      <SectionTabs
        db={db}
        store={store}
        counts={{
          database: docs.length,
          loadouts: loadouts.length,
          metamagic: knownMetamagic,
        }}
      />
      {db.section === "database" && (
        <DatabaseSection plugin={plugin} target={target} activeLoadout={activeLoadout} />
      )}
      {db.section === "loadouts" && <SpellLoadouts plugin={plugin} character={target} />}
      {db.section === "metamagic" && (
        <SpellMetamagic plugin={plugin} character={target} />
      )}
    </div>
  );
}
