import {
  calculateSpellDC,
  calculateSpellRange,
  getSpellSaveType,
} from "../../calc/spells";
import type MiniSheetPlugin from "../../main";
import type { KnownSpell, SpellLevel } from "../../types/spellbook";

/** Legacy metamagic suffix takes the first two words ("Still Spell"). */
function metamagicNames(metamagics: string[]): string {
  return metamagics
    .map((meta) => meta.split(" ").slice(0, 2).join(" "))
    .join(", ");
}

/** Spell name as an internal link to the spell note. Resolves through the
 *  SpellIndex by name when possible (legacy createSpellLink hardcoded the
 *  database folder; the folder path is the fallback). */
export function SpellLink({
  plugin,
  name,
  cls = "",
}: {
  plugin: MiniSheetPlugin;
  name: string;
  cls?: string;
}) {
  const indexed = plugin.spellIndex?.byName.get(name.toLowerCase());
  const path =
    indexed?.path ?? `${plugin.store.data.value.settings.spellsFolder}/${name}.md`;
  return (
    <a
      class={`internal-link spell-link ${cls}`.trim()}
      data-href={path}
      href={path}
      target="_blank"
      rel="noopener nofollow"
      onClick={(e) => {
        e.preventDefault();
        void plugin.app.workspace.openLinkText(path, "", false);
      }}
    >
      {name}
    </a>
  );
}

/** Port of createSpellInfoRow: "DC: 17 W | 1 std | SR | 30 ft. | V, S". */
export function SpellInfoRow({
  spell,
  adjustedLevel,
  castingStatBonus,
  casterLevel,
}: {
  spell: KnownSpell;
  adjustedLevel: SpellLevel;
  castingStatBonus: number;
  casterLevel: number;
}) {
  const segments: string[] = [];
  const saveType = getSpellSaveType(spell);
  if (saveType) {
    segments.push(`DC: ${calculateSpellDC(adjustedLevel, castingStatBonus)} ${saveType}`);
  } else if (spell.saveType && spell.saveType.toLowerCase() === "none") {
    segments.push("No save");
  }
  if (spell.castingTime) segments.push(spell.castingTime);
  // legacy: strict boolean check — string values like "yes (harmless)" hide SR
  if (spell.sr === true) segments.push("SR");
  if (spell.range) {
    const range = calculateSpellRange(spell.range, casterLevel);
    if (range) segments.push(range);
  }
  if (spell.components) segments.push(spell.components);
  if (segments.length === 0) return null;
  return <div class="ms-spell-info">{segments.join(" | ")}</div>;
}

/**
 * One known-spell row for spontaneous casters: cast button (at-will for
 * level 0), linked name with gold metamagic suffix, info line below.
 */
export function SpontaneousSpellRow({
  plugin,
  spell,
  adjustedLevel,
  globalMetamagics,
  castingStatBonus,
  casterLevel,
  onCast,
}: {
  plugin: MiniSheetPlugin;
  spell: KnownSpell;
  adjustedLevel: SpellLevel;
  globalMetamagics: string[];
  castingStatBonus: number;
  casterLevel: number;
  onCast: () => void;
}) {
  const atWill = adjustedLevel === 0;
  return (
    <div class="ms-spell">
      <div class="ms-spell__row">
        <button
          class={`ms-spellbtn ms-spellbtn--cast${atWill ? " is-at-will" : ""}`}
          aria-label={atWill ? `${spell.name} (at will)` : `Cast ${spell.name}`}
          disabled={atWill}
          onClick={onCast}
        />
        <div class="ms-spell__name">
          <span class="spell-name-display">
            <SpellLink plugin={plugin} name={spell.name} cls="spell-base-name" />
            {globalMetamagics.length > 0 && (
              <span class="ms-spell__metamagic"> ({metamagicNames(globalMetamagics)})</span>
            )}
          </span>
          <SpellInfoRow
            spell={spell}
            adjustedLevel={adjustedLevel}
            castingStatBonus={castingStatBonus}
            casterLevel={casterLevel}
          />
        </div>
      </div>
    </div>
  );
}
