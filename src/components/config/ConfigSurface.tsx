/**
 * Character Configuration — rail-based master/detail surface (redesign).
 * A header, a left category rail (Character / Combat / Skills / Effects /
 * Rules) with per-category accents, and a scrolling detail pane. The Quick
 * Actions editor/add/wizard render as centered modals hosted here.
 *
 * Keeps the (plugin, store, character, onClose) signature so ConfigApp and
 * ConfigView are unchanged. All field state lives in the store; only the
 * selected category + open modal are local (category persists to localStorage).
 */
import { useEffect, useState } from "preact/hooks";
import { totalLevel } from "../../calc/class-stats";
import type MiniSheetPlugin from "../../main";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { Icon } from "../common/Icon";
import { UI } from "./glyphs";
import {
  AttackBlocksSection,
  BuffsSection,
  CharacterActionsSection,
  ClassesSection,
  DefenseSection,
  EnergySection,
  IdentitySection,
  ResourcesSection,
  RulesSection,
  SkillsSection,
  VitalsSection,
} from "./sections";
import {
  QAAddModal,
  QAEditor,
  QAWizard,
  QuickActionsSection,
} from "./QuickActionsEditor";

interface ConfigSurfaceProps {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
  onClose: () => void;
}

type Category = "character" | "combat" | "skills" | "effects" | "rules";

const CATEGORIES: {
  id: Category;
  label: string;
  icon: string;
  accent: string;
}[] = [
  { id: "character", label: "Character", icon: "ra-player", accent: "gold" },
  { id: "combat", label: "Combat", icon: "ra-crossed-swords", accent: "red" },
  { id: "skills", label: "Skills", icon: "ra-targeted", accent: "teal" },
  {
    id: "effects",
    label: "Effects",
    icon: "ra-lightning-bolt",
    accent: "amber",
  },
  { id: "rules", label: "Rules", icon: "ra-aware", accent: "blue" },
];
const accentOf = (id: string) =>
  CATEGORIES.find((c) => c.id === id)?.accent ?? "gold";

type Modal =
  | { mode: "edit"; id: string }
  | { mode: "add" }
  | { mode: "wizard" }
  | null;

export function ConfigSurface({
  plugin,
  store,
  character,
  onClose,
}: ConfigSurfaceProps) {
  const [cat, setCat] = useState<Category>(() => {
    const saved =
      (plugin.app.loadLocalStorage("msr_cat") as string | null) ?? "character";
    return (
      CATEGORIES.some((c) => c.id === saved) ? saved : "character"
    ) as Category;
  });
  const [modal, setModal] = useState<Modal>(null);
  useEffect(() => plugin.app.saveLocalStorage("msr_cat", cat), [plugin, cat]);

  const onSheetCount = (character.quickActions ?? []).filter(
    (a) => !a.hidden,
  ).length;
  const subtitle = [
    character.race,
    character.classes.map((c) => `${c.className} ${c.level}`).join(" / "),
    `Level ${totalLevel(character.classes)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const editing =
    modal?.mode === "edit"
      ? ((character.quickActions ?? []).find((a) => a.id === modal.id) ?? null)
      : null;

  return (
    <div class="cfg">
      <div class="cfg__top">
        <h1 class="cfg__title">
          Configure{" "}
          {store.data.value.characters.length > 1 ? (
            <span class="cfg__switch">
              <select
                value={character.id}
                aria-label="Switch character"
                onChange={(e) =>
                  store.setActiveCharacter(
                    (e.target as HTMLSelectElement).value,
                  )
                }
              >
                {store.data.value.characters.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    selected={c.id === character.id}
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
          ) : (
            <b>{character.name}</b>
          )}
        </h1>
        <span class="cfg__sub">{subtitle}</span>
        <span class="cfg__top-spacer" />
        <button
          class="iconbtn"
          title="Close"
          aria-label="Close configuration"
          onClick={onClose}
        >
          <UI.x />
        </button>
      </div>
      <div class="cfg__work">
        <aside class="rail">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              class={`rail__item acc-${c.accent}${cat === c.id ? " is-active" : ""}`}
              onClick={() => setCat(c.id)}
            >
              <span class="rail__ic">
                <Icon id={c.icon} />
              </span>
              <span class="rail__name">{c.label}</span>
              {c.id === "effects" && (
                <span class="rail__count">{onSheetCount}</span>
              )}
            </button>
          ))}
        </aside>
        <div class={`detail acc-${accentOf(cat)}`}>
          {cat === "character" && (
            <>
              <IdentitySection store={store} character={character} />
              <CharacterActionsSection
                store={store}
                character={character}
                goToEffects={() => setCat("effects")}
              />
              <VitalsSection store={store} character={character} />
              <ClassesSection store={store} character={character} />
            </>
          )}
          {cat === "combat" && (
            <>
              <AttackBlocksSection store={store} character={character} />
              <DefenseSection store={store} character={character} />
              <EnergySection store={store} character={character} />
            </>
          )}
          {cat === "skills" && (
            <SkillsSection store={store} character={character} />
          )}
          {cat === "effects" && (
            <>
              <QuickActionsSection
                store={store}
                character={character}
                onEdit={(id) => setModal({ mode: "edit", id })}
                onAdd={() => setModal({ mode: "add" })}
              />
              <ResourcesSection store={store} character={character} />
              <BuffsSection store={store} character={character} />
            </>
          )}
          {cat === "rules" && (
            <RulesSection store={store} character={character} plugin={plugin} />
          )}
        </div>
      </div>

      {editing && (
        <div class="acc-amber">
          <QAEditor
            store={store}
            character={character}
            def={editing}
            onClose={() => setModal(null)}
          />
        </div>
      )}
      {modal?.mode === "add" && (
        <div class="acc-amber">
          <QAAddModal
            store={store}
            character={character}
            onClose={() => setModal(null)}
            onCustom={() => setModal({ mode: "wizard" })}
          />
        </div>
      )}
      {modal?.mode === "wizard" && (
        <div class="acc-amber">
          <QAWizard
            store={store}
            character={character}
            onClose={() => setModal(null)}
          />
        </div>
      )}
    </div>
  );
}
