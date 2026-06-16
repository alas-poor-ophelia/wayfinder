import type MiniSheetPlugin from "../../../main";
import { NotePickModal } from "../../../modals";
import { type CharacterRecord } from "../../../types/character";
import { UI } from "../glyphs";
import { Sec } from "../primitives";
import { type SectionProps } from "./shared";

export function RulesSection({
  store,
  character,
  plugin,
}: SectionProps & { plugin: MiniSheetPlugin }) {
  const set = (value: CharacterRecord["ruleLinks"]) =>
    store.setCharacterField(character.id, "ruleLinks", value);
  const addLink = () => {
    const folder = store.data.value.settings.rulesFolder;
    const modal = new NotePickModal(
      plugin.app,
      `Pick a rules note (${folder}/)`,
      (file) => {
        if (character.ruleLinks.some((l) => l.path === file.path)) return;
        set([...character.ruleLinks, { path: file.path }]);
      },
    );
    modal.open();
  };
  return (
    <Sec
      icon="ra-aware"
      title="Rules &amp; Linked Notes"
      desc={`${character.ruleLinks.length} notes`}
    >
      {character.ruleLinks.map((link) => (
        <div class="rulerow" key={link.path}>
          <UI.link />
          <span class="rulerow__path">{link.path}</span>
          <input
            class="inp"
            type="text"
            placeholder="category"
            value={link.category ?? ""}
            onInput={(e) => {
              const category =
                (e.target as HTMLInputElement).value || undefined;
              set(
                character.ruleLinks.map((l) =>
                  l.path === link.path ? { ...l, category } : l,
                ),
              );
            }}
          />
          <button
            class="iconbtn"
            aria-label={`Remove ${link.path}`}
            onClick={() =>
              set(character.ruleLinks.filter((l) => l.path !== link.path))
            }
          >
            <UI.x />
          </button>
        </div>
      ))}
      <button
        class="btn btn--ghost btn--sm"
        style={{ marginTop: 8 }}
        onClick={addLink}
      >
        <UI.plus /> Link a rules note
      </button>
    </Sec>
  );
}
