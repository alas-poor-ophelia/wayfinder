import { Modal } from "obsidian";
import { useState } from "preact/hooks";
import { computeAll } from "../../calc";
import { eitrEnabled } from "../../types/data-file";
import type MiniSheetPlugin from "../../main";
import {
  applyLoadout,
  createLoadout,
  deleteLoadout,
  duplicateLoadout,
  removeLoadoutSpell,
  setLoadoutSpellCount,
  snapshotCurrentPrep,
  updateLoadout,
} from "../../state/spellbook-actions";
import { getSchoolInk } from "../../spells/parse";
import type { CharacterRecord } from "../../types/character";
import type { Loadout, LoadoutSpell } from "../../types/spellbook";
import { Icon } from "../common/Icon";
import { UI } from "../config/glyphs";

const APPEARANCE_ICONS = [
  "ra-fire",
  "ra-moon-sun",
  "ra-compass",
  "ra-shield",
  "ra-focused-lightning",
  "ra-eyeball",
  "ra-crystal-wand",
  "ra-fairy-wand",
  "ra-crystals",
  "ra-crossed-swords",
  "ra-book",
  "ra-aura",
];

const LOADOUT_COLORS = [
  "#c24a3a",
  "#ca9759",
  "#e0a64e",
  "#ef6a4e",
  "#ef74b3",
  "#b48cf0",
  "#9b86f2",
  "#6aa6ef",
  "#6cc26a",
  "#6f9a93",
  "#98a4b4",
];

const totalCount = (lo: Loadout) => lo.spells.reduce((n, s) => n + s.count, 0);

/** Minimal confirm dialog (no shared helper exists yet). */
class ConfirmModal extends Modal {
  constructor(
    plugin: MiniSheetPlugin,
    private titleText: string,
    private body: string,
    private onConfirm: () => void
  ) {
    super(plugin.app);
  }
  onOpen(): void {
    this.titleEl.setText(this.titleText);
    this.contentEl.createEl("p", { text: this.body });
    const row = this.contentEl.createDiv();
    row.style.display = "flex";
    row.style.justifyContent = "flex-end";
    row.style.gap = "8px";
    row.style.marginTop = "14px";
    const cancel = row.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const ok = row.createEl("button", { text: "Apply", cls: "mod-cta" });
    ok.addEventListener("click", () => {
      this.close();
      this.onConfirm();
    });
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

export function SpellLoadouts({
  plugin,
  character,
}: {
  plugin: MiniSheetPlugin;
  character: CharacterRecord | null;
}) {
  const store = plugin.store;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [appOpen, setAppOpen] = useState(false);

  if (!character?.spellbook) {
    return (
      <div class="ms-spelldb__placeholder">
        <b>Loadouts</b>
        <span>Select a spellcasting character to manage loadouts.</span>
      </div>
    );
  }

  const sb = character.spellbook;
  const computed = computeAll(character, null, {
    elephantInTheRoom: eitrEnabled(store.data.value.settings),
  });
  const sbc = computed.spellbook;
  const paradigm = sbc?.paradigm;

  if (!sbc || paradigm === "spontaneous" || sb.castingClass === "") {
    return (
      <div class="ms-spelldb__placeholder">
        <b>Loadouts are for prepared casters</b>
        <span>
          {character.name} is a spontaneous caster — their known spells are fixed,
          so there are no daily preparations to swap.
        </span>
      </div>
    );
  }

  const castingStatBonus = sbc.castingStatBonus;
  const loadouts = sb.loadouts ?? [];
  const lo = loadouts.find((l) => l.id === activeId) ?? loadouts[0] ?? null;

  // name/school lookup from the character's known spells (denormalized), then
  // the spell index, then the raw id as a last resort
  const known = new Map(sb.spells.map((s) => [s.id, s]));
  const spName = (id: string) =>
    known.get(id)?.name ?? plugin.spellIndex.byId.get(id)?.name ?? id;
  const spSchool = (id: string) =>
    known.get(id)?.school ?? plugin.spellIndex.byId.get(id)?.school ?? "universal";

  const newLoadout = () => {
    const id = createLoadout(store, character);
    setActiveId(id);
    setAppOpen(true);
  };
  const saveCurrent = () => {
    const id = snapshotCurrentPrep(
      store,
      character,
      `${character.name.split(" ")[0]}'s Prep`
    );
    if (id) setActiveId(id);
  };
  const duplicate = () => {
    if (!lo) return;
    const id = duplicateLoadout(store, character, lo.id);
    if (id) setActiveId(id);
  };
  const del = () => {
    if (!lo) return;
    deleteLoadout(store, character, lo.id);
    setActiveId(null);
  };
  const apply = () => {
    if (!lo) return;
    new ConfirmModal(
      plugin,
      `Apply "${lo.name}"?`,
      `This replaces ${character.name}'s current prepared spells with this loadout (${totalCount(lo)} prepared) and refills the day's slots.`,
      () => applyLoadout(store, character, lo.id, castingStatBonus)
    ).open();
  };
  const buildFromDb = (loadoutId: string) => {
    setActiveId(loadoutId);
    store.updateSpellDb({ section: "database", addLoadoutId: loadoutId });
  };

  // group the active loadout's spells by level
  const grouped: Array<[number, Array<{ s: LoadoutSpell; i: number }>]> = [];
  if (lo) {
    const byLevel = new Map<number, Array<{ s: LoadoutSpell; i: number }>>();
    lo.spells.forEach((s, i) => {
      if (!byLevel.has(s.level)) byLevel.set(s.level, []);
      byLevel.get(s.level)!.push({ s, i });
    });
    for (const [lv, arr] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
      arr.sort((a, b) => spName(a.s.spellId).localeCompare(spName(b.s.spellId)));
      grouped.push([lv, arr]);
    }
  }

  return (
    <div class="ms-spelldb__load">
      <div class="ms-spelldb__load-rail">
        <button
          class="ms-spelldb__cta ms-spelldb__cta--gold"
          style={{ justifyContent: "center" }}
          onClick={saveCurrent}
        >
          <UI.check />
          Save current prep
        </button>
        {loadouts.map((l) => (
          <button
            key={l.id}
            class={`ms-spelldb__loadcard${l.id === lo?.id ? " is-on" : ""}`}
            onClick={() => setActiveId(l.id)}
          >
            {sb.appliedLoadoutId === l.id && (
              <span class="ms-spelldb__loadcard-active">
                <UI.check />
                Active
              </span>
            )}
            <div class="ms-spelldb__loadcard-top">
              <span class="ms-spelldb__loadcard-icon" style={{ color: l.color }}>
                <Icon id={l.icon} />
              </span>
              <span class="ms-spelldb__loadcard-name">{l.name}</span>
            </div>
            <div class="ms-spelldb__loadcard-meta">
              <span>
                <b>{l.spells.length}</b> spells
              </span>
              <span>
                <b>{totalCount(l)}</b> prepared
              </span>
            </div>
          </button>
        ))}
        <button class="ms-spelldb__load-new" onClick={newLoadout}>
          <UI.plus />
          New loadout
        </button>
      </div>

      {lo ? (
        <div class="ms-spelldb__load-detail">
          <div class="ms-spelldb__load-head">
            <button
              class={`ms-spelldb__load-appearchip${appOpen ? " is-open" : ""}`}
              title="Customize appearance"
              style={{ color: lo.color }}
              onClick={() => setAppOpen(!appOpen)}
            >
              <Icon id={lo.icon} />
              <span class="edit-dot">
                <UI.pencil />
              </span>
            </button>
            <div class="ms-spelldb__load-title">
              <div class="ms-spelldb__load-name">
                <input
                  value={lo.name}
                  onInput={(e) =>
                    updateLoadout(store, character, lo.id, {
                      name: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              </div>
              <div class="ms-spelldb__load-sub">
                <input
                  placeholder="Describe when to reach for this loadout…"
                  value={lo.desc}
                  onInput={(e) =>
                    updateLoadout(store, character, lo.id, {
                      desc: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              </div>
            </div>
            <div class="ms-spelldb__load-actions">
              <button class="ms-spelldb__cta" onClick={apply}>
                <UI.check />
                Apply
              </button>
              <button class="ms-spelldb__ghostbtn" onClick={() => buildFromDb(lo.id)}>
                <UI.plus />
                Add from database
              </button>
              <button class="ms-spelldb__ghostbtn" title="Duplicate" onClick={duplicate}>
                <UI.plus />
              </button>
              <button
                class="ms-spelldb__ghostbtn ms-spelldb__ghostbtn--danger"
                title="Delete"
                onClick={del}
              >
                <UI.trash />
              </button>
            </div>
          </div>

          {appOpen && (
            <div class="ms-spelldb__appear">
              <div class="ms-spelldb__appear-row">
                <span class="ms-spelldb__appear-lbl">Icon</span>
                <div class="ms-spelldb__appear-icons">
                  {APPEARANCE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      class={`ms-spelldb__appear-icon${lo.icon === ic ? " is-on" : ""}`}
                      onClick={() => updateLoadout(store, character, lo.id, { icon: ic })}
                    >
                      <Icon id={ic} />
                    </button>
                  ))}
                </div>
              </div>
              <div class="ms-spelldb__appear-row">
                <span class="ms-spelldb__appear-lbl">Color</span>
                <div class="ms-spelldb__appear-colors">
                  {LOADOUT_COLORS.map((c) => (
                    <button
                      key={c}
                      class={`ms-spelldb__appear-color${lo.color === c ? " is-on" : ""}`}
                      style={{ background: c }}
                      onClick={() => updateLoadout(store, character, lo.id, { color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {lo.spells.length === 0 ? (
            <div class="ms-spelldb__load-empty">
              <b>This loadout is empty</b>
              Add spells from the database, or save your current preparations as a
              starting point.
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
                <button class="ms-spelldb__cta" onClick={() => buildFromDb(lo.id)}>
                  <UI.plus />
                  Add from database
                </button>
              </div>
            </div>
          ) : (
            <div class="ms-spelldb__load-levels">
              {grouped.map(([lv, arr]) => (
                <div key={lv}>
                  <div class="ms-spelldb__lvlblock-head">
                    <span class="ms-spelldb__lvlblock-lvl">
                      {lv === 0 ? "Cantrips" : `Level ${lv}`}
                    </span>
                    <span class="ms-spelldb__lvlblock-ct">
                      {arr.reduce((n, x) => n + x.s.count, 0)} prepared
                    </span>
                    <span class="ms-spelldb__lvlblock-ln" />
                  </div>
                  {arr.map(({ s, i }) => {
                    const ink = getSchoolInk(spSchool(s.spellId));
                    return (
                      <div class="ms-spelldb__prep" key={s.spellId + i}>
                        <span class="ms-spelldb__prep-name">{spName(s.spellId)}</span>
                        <span
                          class="ms-spelldb__school"
                          style={{
                            color: ink,
                            backgroundColor: `${ink}26`,
                            borderColor: `${ink}73`,
                          }}
                        >
                          {spSchool(s.spellId)}
                        </span>
                        {s.metamagic.map((m) => (
                          <span class="ms-spelldb__prep-mm" key={m}>
                            {m.replace(" Spell", "")}
                          </span>
                        ))}
                        <span class="ms-spelldb__prep-qty">
                          <button
                            class="ms-spelldb__prep-qtybtn"
                            onClick={() => setLoadoutSpellCount(store, character, lo.id, i, -1)}
                          >
                            <UI.minus />
                          </button>
                          <span class="ms-spelldb__prep-count">{s.count}</span>
                          <button
                            class="ms-spelldb__prep-qtybtn"
                            onClick={() => setLoadoutSpellCount(store, character, lo.id, i, 1)}
                          >
                            <UI.plus />
                          </button>
                        </span>
                        <button
                          class="ms-spelldb__prep-del"
                          title="Remove"
                          onClick={() => removeLoadoutSpell(store, character, lo.id, i)}
                        >
                          <UI.trash />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div class="ms-spelldb__load-empty">
          <b>No loadouts yet</b>
          Create one, or save your current preparations to get started.
        </div>
      )}
    </div>
  );
}
