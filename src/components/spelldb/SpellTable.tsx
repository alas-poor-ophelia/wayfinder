import { Modal } from "obsidian";
import type MiniSheetPlugin from "../../main";
import { addKnownSpell, removeKnownSpell } from "../../state/spellbook-actions";
import type { SpellDoc } from "../../spells/index";
import {
  formatLevelsForDisplay,
  formatLevelsWithClassesForTooltip,
  getAllLevels,
  getSchoolColors,
  transformSpellForSpellbook,
} from "../../spells/parse";
import type { CharacterRecord } from "../../types/character";
import type { SpellDbState } from "../../types/data-file";

const COLUMNS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "level", label: "L" },
  { key: "school", label: "School" },
  { key: "castingTime", label: "Cast" },
  { key: "range", label: "Range" },
  { key: "duration", label: "Duration" },
  { key: "components", label: "Comp." },
  { key: "saveType", label: "Save" },
  { key: "sr", label: "SR" },
  { key: "source", label: "Source" },
];

/** Level picker for multi-level spells (replaces the legacy DOM portal). */
class LevelPickModal extends Modal {
  private doc: SpellDoc;
  private onPick: (level: number, classes: string[]) => void;

  constructor(
    plugin: MiniSheetPlugin,
    doc: SpellDoc,
    onPick: (level: number, classes: string[]) => void
  ) {
    super(plugin.app);
    this.doc = doc;
    this.onPick = onPick;
  }

  onOpen(): void {
    this.titleEl.setText(`Add ${this.doc.name} at which level?`);
    const groups: Record<number, string[]> = {};
    for (const [cls, level] of Object.entries(this.doc.parsed.levels)) {
      (groups[level] ??= []).push(cls);
    }
    for (const [level, classes] of Object.entries(groups).sort(
      ([a], [b]) => Number(a) - Number(b)
    )) {
      const btn = this.contentEl.createEl("button", {
        text: `Level ${level} (${classes.join("/")})`,
        cls: "mod-cta",
      });
      btn.style.display = "block";
      btn.style.margin = "6px 0";
      btn.addEventListener("click", () => {
        this.close();
        this.onPick(Number(level), classes);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function SpellTable({
  plugin,
  db,
  docs,
  target,
  knownIds,
}: {
  plugin: MiniSheetPlugin;
  db: SpellDbState;
  docs: SpellDoc[];
  target: CharacterRecord | null;
  knownIds: Set<string>;
}) {
  const store = plugin.store;

  const setSort = (key: string) => {
    if (db.sortKey === key) {
      store.updateSpellDb({ sortDir: db.sortDir === "asc" ? "desc" : "asc" });
    } else {
      store.updateSpellDb({ sortKey: key, sortDir: "asc" });
    }
  };

  const add = (doc: SpellDoc) => {
    if (!target) return;
    const levels = getAllLevels(doc.spellLevelRaw);
    if (levels.length > 1) {
      new LevelPickModal(plugin, doc, (level, classes) => {
        addKnownSpell(store, target, transformSpellForSpellbook(doc, level, classes));
      }).open();
    } else {
      addKnownSpell(store, target, transformSpellForSpellbook(doc));
    }
  };

  const variantCount = (doc: SpellDoc) =>
    target?.spellbook
      ? target.spellbook.spells.filter((s) => (s.originalId ?? s.id) === doc.id).length
      : 0;

  return (
    <table class="ms-spelldb__table">
      <thead>
        <tr>
          {target && <th class="ms-spelldb__add-col" />}
          {COLUMNS.map((col) => (
            <th key={col.key} onClick={() => setSort(col.key)}>
              {col.label}
              {db.sortKey === col.key ? (db.sortDir === "asc" ? " ▲" : " ▼") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {docs.map((doc) => {
          const known = knownIds.has(doc.id);
          const school = getSchoolColors(doc.school);
          return (
            <tr key={doc.path} class={known ? "is-known" : ""}>
              {target && (
                <td class="ms-spelldb__add-col">
                  {known ? (
                    <button
                      class="ms-spelldb__remove"
                      aria-label={`Remove ${doc.name}`}
                      title={`Remove all variants (${variantCount(doc)})`}
                      onClick={() => removeKnownSpell(store, target, doc.id)}
                    >
                      ✕{variantCount(doc) > 1 ? ` ${variantCount(doc)}` : ""}
                    </button>
                  ) : (
                    <button
                      class="ms-spelldb__add"
                      aria-label={`Add ${doc.name}`}
                      onClick={() => add(doc)}
                    >
                      +
                    </button>
                  )}
                </td>
              )}
              <td>
                <a
                  class="internal-link"
                  data-href={doc.path}
                  href={doc.path}
                  onClick={(e) => {
                    e.preventDefault();
                    void plugin.app.workspace.openLinkText(doc.path, "", true);
                  }}
                >
                  {doc.name}
                </a>
              </td>
              <td title={formatLevelsWithClassesForTooltip(doc.spellLevelRaw)}>
                {formatLevelsForDisplay(doc.spellLevelRaw)}
              </td>
              <td>
                {doc.school && (
                  <span
                    class="ms-spelldb__school"
                    style={{ backgroundColor: school.bg, color: school.text }}
                  >
                    {doc.school}
                  </span>
                )}
              </td>
              <td>{doc.castingTime}</td>
              <td>{doc.range}</td>
              <td>{doc.duration}</td>
              <td>{doc.components}</td>
              <td>{doc.saveType}</td>
              <td>{doc.sr}</td>
              <td>{doc.source}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
