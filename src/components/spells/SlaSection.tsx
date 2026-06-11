import { castSla, setSlaRemaining } from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type MiniSheetPlugin from "../../main";
import { Tracker } from "../combat/Resources";
import { CollapseSection } from "./CollapseSection";
import { SpellLink } from "./SpellRow";

/**
 * "Spell-Like Abilities" callout — port of the legacy SLAManager rendering:
 * cast button, linked name, "(N/day)" suffix, then either an italic
 * "At Will" label (casts = 0) or a remaining-uses tracker.
 */
export function SlaSection({
  plugin,
  store,
  character,
}: {
  plugin: MiniSheetPlugin;
  store: MiniSheetStore;
  character: CharacterRecord;
}) {
  const sb = character.spellbook;
  if (!sb || sb.slas.length === 0) return null;

  return (
    <CollapseSection
      store={store}
      character={character}
      title="Spell-Like Abilities"
    >
      {sb.slas.map((sla, index) => {
        const spell = sb.spells.find((s) => s.id === sla.spellId);
        const name = spell?.name ?? `Unknown spell ${sla.spellId}`;
        const atWill = sla.casts === 0;
        return (
          <div class="ms-sla" key={`${sla.spellId}-${index}`}>
            <button
              class={`ms-spellbtn ms-spellbtn--cast${atWill ? " is-at-will" : ""}`}
              aria-label={atWill ? `${name} (at will)` : `Cast ${name}`}
              disabled={atWill}
              onClick={() => castSla(store, character, index)}
            />
            <div class="ms-sla__name">
              <SpellLink plugin={plugin} name={name} cls="sla-spell-name" />
              {sla.casts > 0 && <span class="ms-sla__casts"> ({sla.casts}/day)</span>}
            </div>
            {atWill ? (
              <span class="ms-sla__at-will">At Will</span>
            ) : (
              <Tracker
                pool={{
                  id: `sla-${index}`,
                  name: "",
                  current: sla.castsRemaining,
                  max: sla.casts,
                  set: (value) => setSlaRemaining(store, character, index, value),
                }}
              />
            )}
          </div>
        );
      })}
    </CollapseSection>
  );
}
