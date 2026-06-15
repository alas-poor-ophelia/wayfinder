/* Barebones References tab — the fallback when the Carrel plugin is not in use.
   A flat list of expandable/collapsible sections grouped by category, with a
   simple title/body search. Renders note markdown through Obsidian's
   MarkdownRenderer; no cards, typed blocks, tagging, pins, or filters. */
import { MarkdownRenderer } from "obsidian";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { CharacterRecord } from "../../types/character";
import type { RuleDoc } from "../../rules/model";

function NoteBody({ plugin, doc }: { plugin: MiniSheetPlugin; doc: RuleDoc }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.empty();
    void MarkdownRenderer.render(plugin.app, doc.body, el, doc.path, plugin);
  }, [doc.path]);
  return <div class="ms-bref__body" ref={ref} />;
}

export function BarebonesReferences({
  plugin,
  character,
}: {
  plugin: MiniSheetPlugin;
  character: CharacterRecord;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const docs = plugin.rulesIndex.docs.value;
  const linkedPaths = useMemo(
    () => new Set(character.ruleLinks.map((l) => l.path)),
    [character.ruleLinks],
  );
  // Show the character's linked rules (parity with the old default); if none are
  // linked, fall back to everything in the rules folder.
  const pool = linkedPaths.size
    ? docs.filter((d) => linkedPaths.has(d.path))
    : docs;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? pool.filter(
        (d) =>
          d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q),
      )
    : pool;

  const sections = useMemo(() => {
    const groups = new Map<string, RuleDoc[]>();
    for (const d of filtered) {
      const arr = groups.get(d.category);
      if (arr) arr.push(d);
      else groups.set(d.category, [d]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggle = (path: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(path) ? n.delete(path) : n.add(path);
      return n;
    });

  return (
    <div class="ms-bref">
      <div class="ms-bref__search">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-3.6-3.6" />
        </svg>
        <input
          class="ms-bref__input"
          type="search"
          placeholder="Search rules…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        {query && (
          <button
            class="ms-bref__clear"
            title="Clear"
            onClick={() => setQuery("")}
          >
            ✕
          </button>
        )}
      </div>

      {pool.length === 0 ? (
        <div class="ms-placeholder">
          <div>No rules linked</div>
          <div class="ms-muted">
            Link rules notes from the character config, or put notes in “
            {plugin.store.data.value.settings.rulesFolder}/”.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div class="ms-placeholder">
          <div>No references match</div>
        </div>
      ) : (
        sections.map(([cat, ds]) => (
          <section class="ms-bref__sect" key={cat}>
            <div class="ms-bref__cat">
              {cat}
              <span class="ms-bref__count">{ds.length}</span>
            </div>
            {ds.map((d) => {
              const isOpen = open.has(d.path);
              return (
                <div
                  class={"ms-bref__item" + (isOpen ? " is-open" : "")}
                  key={d.path}
                >
                  <button class="ms-bref__head" onClick={() => toggle(d.path)}>
                    <svg
                      class="ms-bref__chev"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                    <span class="ms-bref__title">{d.title}</span>
                  </button>
                  {isOpen && <NoteBody plugin={plugin} doc={d} />}
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
