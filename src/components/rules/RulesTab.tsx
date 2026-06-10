import { MarkdownRenderer } from "obsidian";
import { useEffect, useRef, useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import { searchRules } from "../../rules/search";
import type { RuleDoc } from "../../rules/index";
import type { CharacterRecord } from "../../types/character";

interface RulesTabProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
}

function RuleCard({ plugin, doc }: { plugin: MiniSheetPlugin; doc: RuleDoc }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.empty();
    // the first heading is already the card title — don't render it twice
    const body = doc.body.replace(/^#{1,6}\s+.*\n+/, "");
    void MarkdownRenderer.render(plugin.app, body, el, doc.path, plugin);
  }, [doc.body, doc.path]);

  return (
    <details class="ms-rule-card">
      <summary
        class="ms-rule-card__title"
        onContextMenu={(e) => {
          e.preventDefault();
          void plugin.app.workspace.openLinkText(doc.path, "", true);
        }}
      >
        {doc.title}
      </summary>
      <div class="ms-rule-card__body" ref={bodyRef} />
    </details>
  );
}

/** Rules tab: all of the character's linked rules notes, grouped by
 *  category, searchable (titles fuzzy + full text). */
export function RulesTab({ plugin, store, character }: RulesTabProps) {
  const [query, setQuery] = useState("");
  const [allRules, setAllRules] = useState(false);
  const docs = plugin.rulesIndex.docs.value;

  const linkedPaths = new Set(character.ruleLinks.map((l) => l.path));
  const pool = allRules ? docs : docs.filter((d) => linkedPaths.has(d.path));
  const results = searchRules(pool, query);

  const grouped = new Map<string, RuleDoc[]>();
  for (const { doc } of results) {
    const linked = character.ruleLinks.find((l) => l.path === doc.path);
    const category = linked?.category || doc.category;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(doc);
  }

  return (
    <div class="ms-rules">
      <div class="ms-rules__search">
        <input
          type="search"
          class="ms-rules__input"
          placeholder="Search rules…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        <label class="ms-rules__all">
          <input
            type="checkbox"
            checked={allRules}
            onChange={(e) => setAllRules((e.target as HTMLInputElement).checked)}
          />
          All
        </label>
      </div>
      {pool.length === 0 && (
        <div class="ms-placeholder">
          <div>No rules linked</div>
          <div class="ms-muted">
            Link rules notes from the character config, or put notes in “
            {store.data.value.settings.rulesFolder}/” and use the All toggle
          </div>
        </div>
      )}
      {query.trim()
        ? results.map(({ doc }) => <RuleCard plugin={plugin} doc={doc} key={doc.path} />)
        : [...grouped.entries()].map(([category, catDocs]) => (
            <section class="ms-rules__group" key={category}>
              <h3 class="ms-rules__category">{category}</h3>
              {catDocs.map((doc) => (
                <RuleCard plugin={plugin} doc={doc} key={doc.path} />
              ))}
            </section>
          ))}
    </div>
  );
}
