/* Reference tab — masonry mosaic of typed rule cards. Browse mode groups the
   character's assigned notes by category under gold headers; a non-empty
   search collapses to a single fuzzy-ranked Results list. Pins and checklist
   completion persist per-character (schema v13). Ported from the design
   prototype (blocks.jsx + OptionMasonry.jsx). */
import { useMemo, useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type { RuleDoc } from "../../rules/model";
import { searchRules } from "../../rules/search";
import { CONTENT_TYPES, FILTERABLE_TYPES } from "../../rules/registry";
import { refIconId } from "../../rules/icons";
import { Icon } from "../common/Icon";
import { useDragScroll } from "../common/useDragScroll";
import { MasonryBody, type MasonrySection } from "./MasonryGrid";

interface RulesTabProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
}

/* ---------- chrome ---------- */

function SearchBar({ value, onChange, count }: { value: string; onChange: (v: string) => void; count: number }) {
  return (
    <div class="r-search">
      <svg class="r-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-3.6-3.6" />
      </svg>
      <input
        class="r-search__input"
        type="search"
        placeholder="Search rules…"
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      />
      {value ? (
        <button class="r-search__clear" title="Clear" onClick={() => onChange("")}>
          ✕
        </button>
      ) : (
        <span class="r-search__count">{count}</span>
      )}
    </div>
  );
}

/* ---------- tab ---------- */

export function RulesTab({ plugin, store, character }: RulesTabProps) {
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Set<string>>(() => new Set());
  const [types, setTypes] = useState<Set<string>>(() => new Set());
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [allRules, setAllRules] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const filtersRef = useDragScroll<HTMLDivElement>();

  const docs = plugin.rulesIndex.docs.value;
  const pins = useMemo(() => new Set(character.referencePins ?? []), [character.referencePins]);
  const checklistState = character.checklistState ?? {};

  const linkedPaths = useMemo(() => new Set(character.ruleLinks.map((l) => l.path)), [character.ruleLinks]);
  const catOf = (d: RuleDoc): string =>
    character.ruleLinks.find((l) => l.path === d.path)?.category || d.category;

  const pool = allRules ? docs : docs.filter((d) => linkedPaths.has(d.path));

  // facets present in the pool (drives the chip rows)
  const presentCats = useMemo(() => {
    const seen: string[] = [];
    for (const d of pool) {
      const c = catOf(d);
      if (!seen.includes(c)) seen.push(c);
    }
    return seen;
  }, [pool, character.ruleLinks]);
  const presentTypes = useMemo(() => FILTERABLE_TYPES.filter((t) => pool.some((d) => d.type === t)), [pool]);

  // non-query filters, then fuzzy rank
  const filtered = pool.filter((d) => {
    if (pinnedOnly && !pins.has(d.path)) return false;
    if (cats.size && !cats.has(catOf(d))) return false;
    if (types.size && !types.has(d.type)) return false;
    return true;
  });
  const ranked = searchRules(filtered, query);
  const titlePos = useMemo(() => {
    const m = new Map<string, number[]>();
    ranked.forEach((r) => m.set(r.doc.path, r.titlePos));
    return m;
  }, [ranked]);

  const isSearching = query.trim().length > 0;
  const rankedDocs = ranked.map((r) => r.doc);
  const pinnedDocs = useMemo(() => pool.filter((d) => pins.has(d.path)), [pool, pins]);
  // re-attach when the rail mounts/unmounts (it only renders with pins present)
  const railRef = useDragScroll<HTMLDivElement>([pinnedDocs.length, isSearching]);

  // build sections
  const sections: MasonrySection[] = [];
  if (isSearching) {
    sections.push({ label: "Results", docs: rankedDocs, results: true });
  } else {
    const groups = new Map<string, RuleDoc[]>();
    for (const d of rankedDocs) {
      const c = catOf(d);
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c)!.push(d);
    }
    for (const [label, ds] of groups) sections.push({ label, docs: ds, results: false });
  }

  /* ---------- persistence ---------- */
  const togglePin = (path: string) => {
    const next = new Set(pins);
    next.has(path) ? next.delete(path) : next.add(path);
    store.updateCharacter(character.id, { referencePins: [...next] });
  };
  const onToggleCheck = (key: string, value: boolean) => {
    const next = { ...checklistState };
    if (value) next[key] = true;
    else delete next[key];
    store.updateCharacter(character.id, { checklistState: next });
  };

  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
    const n = new Set(set);
    n.has(val) ? n.delete(val) : n.add(val);
    setter(n);
  };

  return (
    <div class="ms-rules r-body mz">
      <SearchBar value={query} onChange={setQuery} count={filtered.length} />

      <div class="r-filters" ref={filtersRef}>
        <button class={"r-chip r-chip--pin" + (pinnedOnly ? " is-on" : "")} onClick={() => setPinnedOnly((v) => !v)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={pinnedOnly ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
            <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.86L12 17.9l-5.25 2.76 1-5.86L3.5 9.66l5.9-.86z" />
          </svg>
          {pins.size}
        </button>
        <button class={"r-chip" + (allRules ? " is-on" : "")} title="Show all notes in the rules folder" onClick={() => setAllRules((v) => !v)}>
          All vault
        </button>
        {presentCats.length > 0 && <span class="r-filters__div" />}
        {presentCats.map((c) => (
          <button key={c} class={"r-chip" + (cats.has(c) ? " is-on" : "")} onClick={() => toggleSet(cats, setCats, c)}>
            {c}
          </button>
        ))}
        {presentTypes.length > 0 && <span class="r-filters__div" />}
        {presentTypes.map((t) => (
          <button
            key={t}
            class={"r-chip r-chip--type" + (types.has(t) ? " is-on" : "")}
            style={{ "--bc": CONTENT_TYPES[t].color }}
            onClick={() => toggleSet(types, setTypes, t)}
          >
            <Icon id={refIconId(CONTENT_TYPES[t].glyph)} class="r-chip__ic" />
            {CONTENT_TYPES[t].label}
          </button>
        ))}
      </div>

      {!isSearching && pinnedDocs.length > 0 && (
        <>
          <div class="mz-pinlabel">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.86L12 17.9l-5.25 2.76 1-5.86L3.5 9.66l5.9-.86z" />
            </svg>
            Pinned
          </div>
          <div class="mz-rail" ref={railRef}>
            {pinnedDocs.map((d) => (
              <button
                key={d.path}
                class="mz-railcard"
                style={{ "--bc": CONTENT_TYPES[d.type].color }}
                onClick={() => {
                  setPinnedOnly(false);
                  setOpen(d.path);
                }}
              >
                <span class="mz-railcard__ic">
                  <Icon id={refIconId(d.icon)} />
                </span>
                <div class="mz-railcard__title">{d.title}</div>
                <span class="mz-railcard__type" style={{ color: CONTENT_TYPES[d.type].color }}>
                  {CONTENT_TYPES[d.type].label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {pool.length === 0 ? (
        <div class="ms-placeholder">
          <div>No rules linked</div>
          <div class="ms-muted">
            Link rules notes from the character config, or put notes in “{store.data.value.settings.rulesFolder}/” and tap “All vault”.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div class="r-empty">
          <Icon id="ra-book" class="r-empty__ic" />
          <div>No references match</div>
          <div class="r-empty__sub">Try a different search or clear the filters.</div>
        </div>
      ) : (
        <MasonryBody
          plugin={plugin}
          sections={sections}
          open={open}
          setOpen={setOpen}
          query={query}
          titlePos={titlePos}
          pins={pins}
          togglePin={togglePin}
          checklistState={checklistState}
          onToggleCheck={onToggleCheck}
        />
      )}
    </div>
  );
}
