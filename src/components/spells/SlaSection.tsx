import {
  castSla,
  setSlaRemaining,
  type SlaBookKey,
} from "../../state/spellbook-actions";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import type { SpellbookState } from "../../types/spellbook";
import type MiniSheetPlugin from "../../main";
import { Tracker } from "../combat/Resources";
import { CollapseSection } from "./CollapseSection";
import { SpellLink } from "./SpellRow";

/**
 * "Spell-Like Abilities" callout — port of the legacy SLAManager rendering:
 * cast button, linked name, "(N/day)" suffix, then either an italic
 * "At Will" label (casts = 0) or a remaining-uses tracker.
 *
 * Aggregates SLAs from BOTH the class spellbook and the innate racial
 * spellbook (auto-seeded from race/heritage), so racial SLAs show even on
 * non-casters. Each row carries its owning book key + in-book index so the
 * cast/tracker actions mutate the right book.
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
  const nameOf = (sb: SpellbookState, spellId: string) =>
    sb.spells.find((s) => s.id === spellId)?.name ?? `Unknown spell ${spellId}`;
  const rowsOf = (sb: SpellbookState | undefined, bookKey: SlaBookKey) =>
    (sb?.slas ?? []).map((sla, index) => ({ sla, index, bookKey, sb: sb! }));

  const classRows = rowsOf(character.spellbook, "spellbook");
  // Suppress a racial SLA the class book already shows (e.g. a legacy manual
  // entry of the same racial ability) so it isn't listed twice; the existing
  // entry — which may carry customized uses — wins.
  const shownNames = new Set(
    classRows.map((r) => nameOf(r.sb, r.sla.spellId).toLowerCase()),
  );
  const racialRows = rowsOf(
    character.racialSpellbook,
    "racialSpellbook",
  ).filter((r) => !shownNames.has(nameOf(r.sb, r.sla.spellId).toLowerCase()));
  const rows = [...classRows, ...racialRows];
  if (rows.length === 0) return null;

  return (
    <CollapseSection
      store={store}
      character={character}
      title="Spell-Like Abilities"
    >
      {rows.map(({ sla, index, bookKey, sb }) => {
        const spell = sb.spells.find((s) => s.id === sla.spellId);
        const name = spell?.name ?? `Unknown spell ${sla.spellId}`;
        const atWill = sla.casts === 0;
        return (
          <div class="ms-sla" key={`${bookKey}-${sla.spellId}-${index}`}>
            <button
              class={`ms-spellbtn ms-spellbtn--cast${atWill ? " is-at-will" : ""}`}
              aria-label={atWill ? `${name} (at will)` : `Cast ${name}`}
              disabled={atWill}
              onClick={() => castSla(store, character, index, bookKey)}
            />
            <div class="ms-sla__name">
              <SpellLink plugin={plugin} name={name} cls="sla-spell-name" />
              {sla.casts > 0 && (
                <span class="ms-sla__casts"> ({sla.casts}/day)</span>
              )}
            </div>
            {atWill ? (
              <span class="ms-sla__at-will">At Will</span>
            ) : (
              <Tracker
                pool={{
                  id: `sla-${bookKey}-${index}`,
                  name: "",
                  current: sla.castsRemaining,
                  max: sla.casts,
                  set: (value) =>
                    setSlaRemaining(store, character, index, value, bookKey),
                }}
              />
            )}
          </div>
        );
      })}
    </CollapseSection>
  );
}
