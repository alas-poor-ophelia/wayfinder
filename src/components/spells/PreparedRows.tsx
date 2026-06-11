import type MiniSheetPlugin from "../../main";
import type { KnownSpell, SpellLevel, SpellPreparation } from "../../types/spellbook";
import { SpellInfoRow, SpellLink } from "./SpellRow";

/** Legacy gold metamagic suffix: first two words ("Still Spell"). */
function goldNames(metamagics: string[]): string {
  return metamagics.map((m) => m.split(" ").slice(0, 2).join(" ")).join(", ");
}

/** Prepared-entry italic suffix: feat name without "(+N)" or "Spell". */
function italicNames(metamagics: string[]): string {
  return metamagics
    .map((m) => m.replace(/\s*\([^)]*\)/, "").replace(/\s*Spell/, ""))
    .join(", ");
}

/**
 * Known-spell row for prepared/hybrid casters: "+" prepare button, linked
 * name with gold metamagic suffix and the indigo "↑N" adjusted-level
 * indicator, info line below.
 */
export function PreparedKnownRow({
  plugin,
  spell,
  adjustedLevel,
  activeMetamagics,
  castingStatBonus,
  casterLevel,
  onPrepare,
}: {
  plugin: MiniSheetPlugin;
  spell: KnownSpell;
  adjustedLevel: SpellLevel;
  activeMetamagics: string[];
  castingStatBonus: number;
  casterLevel: number;
  onPrepare: () => void;
}) {
  return (
    <div class="ms-spell">
      <div class="ms-spell__row">
        <button
          class="ms-spellbtn ms-spellbtn--prepare"
          aria-label={`Prepare ${spell.name}`}
          onClick={onPrepare}
        />
        <div class="ms-spell__name">
          <span class="spell-name-display">
            <SpellLink plugin={plugin} name={spell.name} cls="spell-base-name" />
            {activeMetamagics.length > 0 && (
              <span class="ms-spell__metamagic"> ({goldNames(activeMetamagics)})</span>
            )}
            {activeMetamagics.length > 0 && adjustedLevel !== spell.baseLevel && (
              <span class="ms-spell__level-adjust">
                <span class="ms-spell__level-arrow">↑</span>
                {adjustedLevel}
              </span>
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

/**
 * Prepared-spell entry: cast + remove buttons, linked name with the italic
 * metamagic suffix, info line, gold count dots on the right.
 */
export function PreparedSpellRow({
  plugin,
  spell,
  preparation,
  displayLevel,
  displayMetamagics,
  castingStatBonus,
  casterLevel,
  onCast,
  onRemove,
}: {
  plugin: MiniSheetPlugin;
  spell: KnownSpell;
  preparation: SpellPreparation;
  /** storage level + non-duplicate global metamagics (hybrid) */
  displayLevel: SpellLevel;
  displayMetamagics: string[];
  castingStatBonus: number;
  casterLevel: number;
  onCast: () => void;
  onRemove: () => void;
}) {
  const dots = [];
  for (let i = 0; i < preparation.count; i++) {
    dots.push(<span class="ms-prep-dot" key={i} />);
  }
  return (
    <div class="ms-prepared">
      <div class="ms-prepared__buttons">
        <button
          class="ms-spellbtn ms-spellbtn--cast"
          aria-label={`Cast ${spell.name}`}
          onClick={onCast}
        />
        <button
          class="ms-spellbtn ms-spellbtn--remove"
          aria-label={`Remove ${spell.name} preparation`}
          onClick={onRemove}
        />
      </div>
      <div class="ms-prepared__info">
        <div class="ms-prepared__name">
          <SpellLink plugin={plugin} name={spell.name} />
          {displayMetamagics.length > 0 && (
            <span class="ms-prepared__metamagic"> ({italicNames(displayMetamagics)})</span>
          )}
        </div>
        <SpellInfoRow
          spell={spell}
          adjustedLevel={displayLevel}
          castingStatBonus={castingStatBonus}
          casterLevel={casterLevel}
        />
      </div>
      <div class="ms-prepared__dots">{dots}</div>
    </div>
  );
}
