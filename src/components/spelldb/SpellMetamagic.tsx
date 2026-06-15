import { useState } from "preact/hooks";
import {
  METAMAGIC_FEATS,
  metamagicAdjLabel,
  metamagicPickerString,
  type MetamagicFeat,
} from "../../data/feats";
import type MiniSheetPlugin from "../../main";
import { toggleMetamagicFeat } from "../../state/spellbook-actions";
import type { CharacterRecord } from "../../types/character";
import { UI } from "../config/glyphs";

type AdjFilter = number | "var";
const ADJ_CHIPS: Array<{ value: AdjFilter; label: string }> = [
  { value: 1, label: "+1" },
  { value: 2, label: "+2" },
  { value: 3, label: "+3" },
  { value: 4, label: "+4" },
  { value: "var", label: "Var" },
];

/**
 * Metamagic tab: curate the character's KNOWN metamagic feats. The known set
 * (spellbook.metamagicFeats, stored as picker strings) is what the spellbook's
 * per-level/global metamagic pickers offer.
 */
export function SpellMetamagic({
  plugin,
  character,
}: {
  plugin: MiniSheetPlugin;
  character: CharacterRecord | null;
}) {
  const store = plugin.store;
  const [search, setSearch] = useState("");
  const [adjFilter, setAdjFilter] = useState<AdjFilter[]>([]);

  if (!character?.spellbook) {
    return (
      <div class="ms-spelldb__placeholder">
        <b>Metamagic</b>
        <span>
          Select a spellcasting character to curate their metamagic feats.
        </span>
      </div>
    );
  }

  const knownSet = new Set(character.spellbook.metamagicFeats ?? []);
  const isKnown = (f: MetamagicFeat) => knownSet.has(metamagicPickerString(f));

  const q = search.toLowerCase();
  const matches = (f: MetamagicFeat) => {
    if (q && !`${f.name} ${f.desc}`.toLowerCase().includes(q)) return false;
    if (adjFilter.length && !adjFilter.includes(f.adj)) return false;
    return true;
  };
  const filtered = METAMAGIC_FEATS.filter(matches);
  const knownFeats = filtered.filter(isKnown);
  const catalogFeats = filtered.filter((f) => !isKnown(f));

  const toggleAdj = (v: AdjFilter) =>
    setAdjFilter((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    );
  const toggle = (f: MetamagicFeat) =>
    toggleMetamagicFeat(store, character, metamagicPickerString(f));
  const filtersActive = q !== "" || adjFilter.length > 0;

  const card = (f: MetamagicFeat) => {
    const known = isKnown(f);
    return (
      <button
        key={f.id}
        class={`ms-spelldb__mmcard${known ? " is-known" : ""}`}
        onClick={() => toggle(f)}
      >
        <div class="ms-spelldb__mmcard-top">
          <span class="ms-spelldb__mmcard-name">{f.name}</span>
          <span class="ms-spelldb__mmcard-adj">{metamagicAdjLabel(f)}</span>
        </div>
        {f.desc && <div class="ms-spelldb__mmcard-desc">{f.desc}</div>}
        <div class="ms-spelldb__mmcard-foot">
          <span class="ms-spelldb__mmcard-src">{f.source}</span>
          <span class="ms-spelldb__mmtoggle">
            <span class={`ms-spelldb__check${known ? " is-on" : ""}`}>
              {known && <UI.check />}
            </span>
            {known ? "Known" : "Add"}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div class="ms-spelldb__mm">
      <div class="ms-spelldb__mm-intro">
        Only feats marked <b>Known</b> appear in the spellbook's metamagic
        pickers. Curate {character.name}'s metamagic feats here.
      </div>

      <div class="ms-spelldb__mm-toolbar">
        <div class="ms-spelldb__search">
          <UI.search />
          <input
            type="search"
            placeholder="Search metamagic feats…"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="ms-spelldb__mm-levelchips">
          {ADJ_CHIPS.map((c) => (
            <button
              key={String(c.value)}
              class={`ms-spelldb__mm-levelchip${adjFilter.includes(c.value) ? " is-on" : ""}`}
              onClick={() => toggleAdj(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {filtersActive && (
          <button
            class="ms-spelldb__btn ms-spelldb__btn--ghost"
            onClick={() => {
              setSearch("");
              setAdjFilter([]);
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div class="ms-spelldb__mm-section">
        <div class="ms-spelldb__blocklabel">
          Known feats <span class="muted">· {knownFeats.length}</span>
          <span class="ln" />
        </div>
        {knownFeats.length > 0 ? (
          <div class="ms-spelldb__mm-grid">{knownFeats.map(card)}</div>
        ) : (
          <div class="ms-spelldb__empty">
            {filtersActive
              ? "No known feats match the filters."
              : "No metamagic feats known yet — add some from the catalog below."}
          </div>
        )}
      </div>

      <div class="ms-spelldb__mm-section">
        <div class="ms-spelldb__blocklabel">
          Catalog <span class="muted">· add to known</span>
          <span class="ln" />
        </div>
        {catalogFeats.length > 0 ? (
          <div class="ms-spelldb__mm-grid">{catalogFeats.map(card)}</div>
        ) : (
          <div class="ms-spelldb__empty">
            No catalog feats match the filters.
          </div>
        )}
      </div>
    </div>
  );
}
