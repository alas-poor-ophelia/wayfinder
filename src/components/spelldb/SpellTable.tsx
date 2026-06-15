import { Modal } from "obsidian";
import type MiniSheetPlugin from "../../main";
import { addKnownSpell, removeKnownSpell } from "../../state/spellbook-actions";
import type { SpellDoc } from "../../spells/index";
import {
  formatLevelsForDisplay,
  formatLevelsWithClassesForTooltip,
  getAllLevels,
  getSchoolInk,
  transformSpellForSpellbook,
} from "../../spells/parse";
import type { CharacterRecord } from "../../types/character";
import type { SpellDbState } from "../../types/data-file";
import { UI } from "../config/glyphs";

const COLUMNS: { key: string; label: string; num?: boolean; dim?: boolean }[] =
  [
    { key: "name", label: "Name" },
    { key: "level", label: "L", num: true },
    { key: "school", label: "School" },
    { key: "castingTime", label: "Cast" },
    { key: "range", label: "Range" },
    { key: "duration", label: "Duration" },
    { key: "components", label: "Comp.", dim: true },
    { key: "saveType", label: "Save", dim: true },
    { key: "sr", label: "SR", dim: true },
    { key: "source", label: "Source", dim: true },
  ];

/** Level picker for multi-level spells (replaces the legacy DOM portal). */
class LevelPickModal extends Modal {
  private doc: SpellDoc;
  private onPick: (level: number, classes: string[]) => void;

  constructor(
    plugin: MiniSheetPlugin,
    doc: SpellDoc,
    onPick: (level: number, classes: string[]) => void,
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
      ([a], [b]) => Number(a) - Number(b),
    )) {
      const btn = this.contentEl.createEl("button", {
        text: `Level ${level} (${classes.join("/")})`,
        cls: "mod-cta ms-modal-block-btn",
      });
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
  targetIsLoadout = false,
  knownIds,
  onAdd,
  onRemove,
}: {
  plugin: MiniSheetPlugin;
  db: SpellDbState;
  docs: SpellDoc[];
  target: CharacterRecord | null;
  /** when the add-target is a loadout, the +Add button turns red */
  targetIsLoadout?: boolean | undefined;
  knownIds: Set<string>;
  /** Stage B overrides: route add/remove at a loadout instead of the spellbook */
  onAdd?:
    | ((doc: SpellDoc, level: number | null, classes: string[] | null) => void)
    | undefined;
  onRemove?: (doc: SpellDoc) => void;
}) {
  const store = plugin.store;
  const canTarget = target !== null || targetIsLoadout;

  const setSort = (key: string) => {
    if (db.sortKey === key) {
      store.updateSpellDb({ sortDir: db.sortDir === "asc" ? "desc" : "asc" });
    } else {
      store.updateSpellDb({ sortKey: key, sortDir: "asc" });
    }
  };

  const add = (doc: SpellDoc) => {
    const levels = getAllLevels(doc.spellLevelRaw);
    if (levels.length > 1) {
      new LevelPickModal(plugin, doc, (level, classes) => {
        if (onAdd) onAdd(doc, level, classes);
        else if (target)
          addKnownSpell(
            store,
            target,
            transformSpellForSpellbook(doc, level, classes),
          );
      }).open();
    } else if (onAdd) {
      onAdd(doc, null, null);
    } else if (target) {
      addKnownSpell(store, target, transformSpellForSpellbook(doc));
    }
  };

  const remove = (doc: SpellDoc) => {
    if (onRemove) onRemove(doc);
    else if (target) removeKnownSpell(store, target, doc.id);
  };

  const variantCount = (doc: SpellDoc) =>
    target?.spellbook
      ? target.spellbook.spells.filter((s) => (s.originalId ?? s.id) === doc.id)
          .length
      : 0;

  return (
    <div class="ms-spelldb__main">
      <div class="ms-spelldb__tablescroll">
        <table class="ms-spelldb__table">
          <thead>
            <tr>
              {canTarget && <th class="ms-spelldb__addcol" />}
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  class={`${col.num ? "ms-spelldb__numcol" : ""}${
                    db.sortKey === col.key ? " is-sort" : ""
                  }`}
                  onClick={() => setSort(col.key)}
                >
                  {col.label}
                  {db.sortKey === col.key && (
                    <span class="ms-spelldb__sortcaret">
                      {db.sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => {
              const known = knownIds.has(doc.id);
              const ink = getSchoolInk(doc.school);
              const vc = variantCount(doc);
              return (
                <tr key={doc.path} class={known ? "is-known" : ""}>
                  {canTarget && (
                    <td class="ms-spelldb__addcol">
                      {known && !targetIsLoadout ? (
                        <button
                          class="ms-spelldb__remove"
                          aria-label={`Remove ${doc.name}`}
                          title={`Remove all variants (${vc})`}
                          onClick={() => remove(doc)}
                        >
                          <UI.x />
                          {vc > 1 ? vc : ""}
                        </button>
                      ) : (
                        <button
                          class={`ms-spelldb__add${targetIsLoadout ? " is-load" : ""}`}
                          aria-label={`Add ${doc.name}`}
                          onClick={() => add(doc)}
                        >
                          <UI.plus />
                        </button>
                      )}
                    </td>
                  )}
                  <td>
                    <a
                      class="ms-spelldb__name"
                      data-href={doc.path}
                      href={doc.path}
                      onClick={(e) => {
                        e.preventDefault();
                        void plugin.app.workspace.openLinkText(
                          doc.path,
                          "",
                          true,
                        );
                      }}
                      onMouseOver={(e) => {
                        plugin.app.workspace.trigger("hover-link", {
                          event: e,
                          source: "minisheet",
                          hoverParent: { hoverPopover: null },
                          targetEl: e.currentTarget as HTMLElement,
                          linktext: doc.path,
                          sourcePath: "",
                        });
                      }}
                    >
                      {doc.name}
                    </a>
                  </td>
                  <td
                    class="ms-spelldb__numcol ms-spelldb__lvlcell"
                    title={formatLevelsWithClassesForTooltip(doc.spellLevelRaw)}
                  >
                    {formatLevelsForDisplay(doc.spellLevelRaw)}
                  </td>
                  <td>
                    {doc.school && (
                      <span
                        class="ms-spelldb__school"
                        style={{
                          color: ink,
                          backgroundColor: `${ink}26`,
                          borderColor: `${ink}73`,
                        }}
                      >
                        {doc.school}
                      </span>
                    )}
                  </td>
                  <td>{doc.castingTime}</td>
                  <td>{doc.range}</td>
                  <td>{doc.duration}</td>
                  <td class="sp-dim">{doc.components}</td>
                  <td class="sp-dim">{doc.saveType}</td>
                  <td class="sp-dim">{doc.sr}</td>
                  <td class="sp-dim">{doc.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {docs.length === 0 && (
          <div class="ms-spelldb__empty">
            No matches — adjust your search or filters.
          </div>
        )}
      </div>
    </div>
  );
}
