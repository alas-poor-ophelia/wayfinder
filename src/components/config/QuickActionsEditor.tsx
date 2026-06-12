import { App, Menu, Modal } from "obsidian";
import { render } from "preact";
import { useRef, useState } from "preact/hooks";
import { BONUS_TYPES, type BonusType, type ModifierTarget } from "../../calc/modifiers";
import { BUFF_DEFS } from "../../data/buffs";
import { ICONS } from "../../data/icons/registry";
import {
  DEFAULT_QUICK_ACTIONS,
  FIGHTING_DEFENSIVELY_CRANE,
} from "../../data/quick-actions";
import type { MiniSheetStore } from "../../state/store";
import { ABILITY_KEYS, type AbilityKey, type CharacterRecord } from "../../types/character";
import type {
  QAValue,
  QuickActionDef,
  QuickActionEffect,
  QuickActionStage,
  QuickActionVariant,
} from "../../types/quick-actions";
import { Icon } from "../common/Icon";
import { TARGET_GROUPS } from "../common/ModifierEditor";

/**
 * Quick Action Builder — the config-pane surface for the combat tab's
 * quick actions: drag-to-reorder (pointer events, iPad-first), show/hide,
 * add from catalog or blank, and a full expand-in-place editor for name,
 * icon, stages, variants, effects, gating, and buff links.
 */

interface EditorProps {
  app: App;
  store: MiniSheetStore;
  character: CharacterRecord;
}

const newId = () => `qa-${Date.now().toString(36)}`;
const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || newId();

// ---------------------------------------------------------------------------
// Icon picker (Obsidian modal: search + grid + CC BY attribution)
// ---------------------------------------------------------------------------

const PICKER_PAGE = 120;

class IconPickerModal extends Modal {
  private current: string;
  private onPick: (id: string) => void;

  constructor(app: App, current: string, onPick: (id: string) => void) {
    super(app);
    this.current = current;
    this.onPick = onPick;
  }

  onOpen(): void {
    this.modalEl.addClass("ms-icon-picker-modal");
    const host = this.contentEl.createDiv();
    const Picker = () => {
      const [query, setQuery] = useState("");
      const q = query.trim().toLowerCase();
      const matches = Object.entries(ICONS).filter(
        ([id, def]) => !q || def.name.toLowerCase().includes(q) || id.includes(q)
      );
      const shown = matches.slice(0, PICKER_PAGE);
      return (
        <div class="ms-icon-picker">
          <input
            class="ms-icon-picker__search"
            type="text"
            placeholder="Search icons..."
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
          <div class="ms-icon-picker__count">
            {matches.length > shown.length
              ? `showing ${shown.length} of ${matches.length} — refine your search`
              : `${matches.length} icons`}
          </div>
          <div class="ms-icon-picker__grid">
            {shown.map(([id, def]) => (
              <button
                key={id}
                class={`ms-icon-picker__cell${id === this.current ? " is-current" : ""}`}
                title={def.name}
                onClick={() => {
                  this.onPick(id);
                  this.close();
                }}
              >
                <Icon id={id} />
              </button>
            ))}
          </div>
          <div class="ms-icon-picker__credit">
            Icons by game-icons.net contributors (Lorc, Delapouite, et al.),
            CC BY 3.0 — via RPG Awesome.
          </div>
        </div>
      );
    };
    render(<Picker />, host);
  }

  onClose(): void {
    render(null, this.contentEl);
    this.contentEl.empty();
  }
}

// ---------------------------------------------------------------------------
// QAValue (number | formula) editor
// ---------------------------------------------------------------------------

function QAValueEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QAValue;
  onChange(v: QAValue): void;
}) {
  const isFormula = typeof value === "object";
  const num = (raw: string, fallback: number): number => {
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
  };
  return (
    <div class="ms-qa__value">
      <span class="ms-qa__value-label">{label}</span>
      <button
        class={`ms-qa__formula-toggle${isFormula ? " is-on" : ""}`}
        title={isFormula ? "Switch to a fixed number" : "Switch to a formula (level/BAB/ability-based)"}
        onClick={() => onChange(isFormula ? 0 : { source: "classLevel", className: "" })}
      >
        ƒ
      </button>
      {!isFormula ? (
        <input
          class="ms-qa__num"
          type="number"
          value={value as number}
          onInput={(e) => onChange(num((e.target as HTMLInputElement).value, 0))}
        />
      ) : (
        <span class="ms-qa__formula">
          <select
            value={value.source}
            aria-label="Formula source"
            onChange={(e) =>
              onChange({ ...value, source: (e.target as HTMLSelectElement).value as never })
            }
          >
            <option value="bab">BAB</option>
            <option value="classLevel">Class level</option>
            <option value="characterLevel">Character level</option>
            <option value="abilityMod">Ability mod</option>
            <option value="abilityScore">Ability score</option>
          </select>
          {value.source === "classLevel" && (
            <input
              type="text"
              class="ms-qa__formula-class"
              placeholder="class name"
              value={value.className ?? ""}
              onInput={(e) =>
                onChange({ ...value, className: (e.target as HTMLInputElement).value })
              }
            />
          )}
          {(value.source === "abilityMod" || value.source === "abilityScore") && (
            <select
              value={value.ability ?? "str"}
              aria-label="Formula ability"
              onChange={(e) =>
                onChange({ ...value, ability: (e.target as HTMLSelectElement).value as AbilityKey })
              }
            >
              {ABILITY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k.toUpperCase()}
                </option>
              ))}
            </select>
          )}
          <label title="divide before flooring">
            ÷
            <input
              type="number"
              value={value.divisor ?? 1}
              onInput={(e) =>
                onChange({ ...value, divisor: num((e.target as HTMLInputElement).value, 1) })
              }
            />
          </label>
          <label title="multiply AFTER the floor">
            ×
            <input
              type="number"
              value={value.multiplier ?? 1}
              onInput={(e) =>
                onChange({ ...value, multiplier: num((e.target as HTMLInputElement).value, 1) })
              }
            />
          </label>
          <label title="flat bonus added last">
            +
            <input
              type="number"
              value={value.flatBonus ?? 0}
              onInput={(e) =>
                onChange({ ...value, flatBonus: num((e.target as HTMLInputElement).value, 0) })
              }
            />
          </label>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Effect list editor
// ---------------------------------------------------------------------------

const EFFECT_KINDS: { kind: QuickActionEffect["kind"]; label: string }[] = [
  { kind: "modifier", label: "Typed bonus" },
  { kind: "acChannels", label: "AC adjust (flat channels)" },
  { kind: "extraAttacks", label: "Extra attacks" },
  { kind: "damageDice", label: "Damage dice" },
  { kind: "keen", label: "Keen (double threat range)" },
  { kind: "note", label: "Note" },
  { kind: "smite", label: "Smite (attack+damage on all weapons)" },
  { kind: "preciseStrike", label: "Precise strike damage" },
  { kind: "flurryAttacks", label: "Flurry base attacks" },
  { kind: "special", label: "Special behavior" },
];

function defaultEffect(kind: QuickActionEffect["kind"]): QuickActionEffect {
  switch (kind) {
    case "modifier":
      return { kind, target: "attack.all", type: "untyped", value: 1 };
    case "acChannels":
      return { kind, normal: 1, touch: 1, ff: 1 };
    case "extraAttacks":
      return { kind, count: 1, penalty: 0 };
    case "damageDice":
      return { kind, dice: "+1d6 fire", appliesTo: "melee" };
    case "keen":
      return { kind, appliesTo: "melee" };
    case "note":
      return { kind, text: "", placement: "sheet" };
    case "smite":
      return { kind, attack: { source: "abilityMod", ability: "cha" }, damage: { source: "classLevel", className: "" }, description: "" };
    case "preciseStrike":
      return { kind, damage: { source: "classLevel", className: "" } };
    case "flurryAttacks":
      return { kind, count: 2 };
    case "special":
      return { kind, op: "agileWeapon" };
  }
}

const APPLIES_TO = ["melee", "ranged", "unarmed", "all"] as const;

function EffectRow({
  effect,
  onChange,
  onRemove,
}: {
  effect: QuickActionEffect;
  onChange(e: QuickActionEffect): void;
  onRemove(): void;
}) {
  const text = (raw: string) => raw;
  return (
    <div class="ms-qa__effect">
      <div class="ms-qa__effect-head">
        <select
          class="ms-qa__effect-kind"
          aria-label="Effect kind"
          value={effect.kind}
          onChange={(e) =>
            onChange(defaultEffect((e.target as HTMLSelectElement).value as QuickActionEffect["kind"]))
          }
        >
          {EFFECT_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
        <button class="ms-qa__remove" aria-label="Remove effect" onClick={onRemove}>
          ✕
        </button>
      </div>
      <div class="ms-qa__effect-body">
        {effect.kind === "modifier" && (
          <>
            <select
              value={effect.target}
              aria-label="Bonus target"
              onChange={(e) =>
                onChange({ ...effect, target: (e.target as HTMLSelectElement).value as ModifierTarget })
              }
            >
              {TARGET_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={effect.type}
              aria-label="Bonus type"
              onChange={(e) =>
                onChange({ ...effect, type: (e.target as HTMLSelectElement).value as BonusType })
              }
            >
              {BONUS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <QAValueEditor label="value" value={effect.value} onChange={(v) => onChange({ ...effect, value: v })} />
            <input
              type="text"
              placeholder="condition (vs fear...)"
              value={effect.condition ?? ""}
              onInput={(e) =>
                onChange({ ...effect, condition: text((e.target as HTMLInputElement).value) || undefined })
              }
            />
          </>
        )}
        {effect.kind === "acChannels" && (
          <>
            <QAValueEditor label="AC" value={effect.normal ?? 0} onChange={(v) => onChange({ ...effect, normal: v })} />
            <QAValueEditor label="touch" value={effect.touch ?? 0} onChange={(v) => onChange({ ...effect, touch: v })} />
            <QAValueEditor label="flat-footed" value={effect.ff ?? 0} onChange={(v) => onChange({ ...effect, ff: v })} />
          </>
        )}
        {effect.kind === "extraAttacks" && (
          <>
            <QAValueEditor label="count" value={effect.count} onChange={(v) => onChange({ ...effect, count: v })} />
            <label>
              at penalty
              <input
                type="number"
                value={effect.penalty ?? 0}
                onInput={(e) => {
                  const n = Number((e.target as HTMLInputElement).value);
                  if (!Number.isNaN(n)) onChange({ ...effect, penalty: n });
                }}
              />
            </label>
          </>
        )}
        {effect.kind === "damageDice" && (
          <>
            <input
              type="text"
              placeholder="+1d6 fire"
              value={effect.dice}
              onInput={(e) => onChange({ ...effect, dice: (e.target as HTMLInputElement).value })}
            />
            <select
              value={effect.appliesTo}
              aria-label="Applies to"
              onChange={(e) =>
                onChange({ ...effect, appliesTo: (e.target as HTMLSelectElement).value as never })
              }
            >
              {APPLIES_TO.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </>
        )}
        {effect.kind === "keen" && (
          <select
            value={effect.appliesTo}
            aria-label="Applies to"
            onChange={(e) =>
              onChange({ ...effect, appliesTo: (e.target as HTMLSelectElement).value as never })
            }
          >
            {APPLIES_TO.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
        {effect.kind === "note" && (
          <>
            <input
              type="text"
              class="ms-qa__note-text"
              placeholder="note text (markdown ok)"
              value={effect.text}
              onInput={(e) => onChange({ ...effect, text: (e.target as HTMLInputElement).value })}
            />
            <select
              value={effect.placement ?? "sheet"}
              aria-label="Note placement"
              onChange={(e) =>
                onChange({ ...effect, placement: (e.target as HTMLSelectElement).value as never })
              }
            >
              <option value="sheet">sheet notes</option>
              <option value="attack">attack strings</option>
            </select>
          </>
        )}
        {effect.kind === "smite" && (
          <>
            <QAValueEditor label="attack" value={effect.attack} onChange={(v) => onChange({ ...effect, attack: v })} />
            <QAValueEditor label="damage" value={effect.damage} onChange={(v) => onChange({ ...effect, damage: v })} />
            <input
              type="text"
              placeholder="inline description"
              value={effect.description ?? ""}
              onInput={(e) =>
                onChange({ ...effect, description: (e.target as HTMLInputElement).value || undefined })
              }
            />
          </>
        )}
        {effect.kind === "preciseStrike" && (
          <QAValueEditor label="damage" value={effect.damage} onChange={(v) => onChange({ ...effect, damage: v })} />
        )}
        {effect.kind === "flurryAttacks" && (
          <QAValueEditor label="base attacks" value={effect.count} onChange={(v) => onChange({ ...effect, count: v })} />
        )}
        {effect.kind === "special" && (
          <select
            value={effect.op}
            aria-label="Special behavior"
            onChange={(e) => onChange({ ...effect, op: (e.target as HTMLSelectElement).value as never })}
          >
            <option value="agileWeapon">Agile weapon (DEX for melee when higher)</option>
            <option value="versatilePerformance">Versatile Performance (Bluff/Sense Motive use Perform)</option>
          </select>
        )}
      </div>
    </div>
  );
}

function EffectsEditor({
  effects,
  onChange,
}: {
  effects: QuickActionEffect[];
  onChange(effects: QuickActionEffect[]): void;
}) {
  return (
    <div class="ms-qa__effects">
      {effects.map((effect, idx) => (
        <EffectRow
          key={idx}
          effect={effect}
          onChange={(e) => onChange(effects.map((x, i) => (i === idx ? e : x)))}
          onRemove={() => onChange(effects.filter((_, i) => i !== idx))}
        />
      ))}
      <button class="ms-qa__add" onClick={() => onChange([...effects, defaultEffect("modifier")])}>
        + Add effect
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action editor (expand-in-place)
// ---------------------------------------------------------------------------

function IconButton({
  app,
  icon,
  onPick,
  label,
}: {
  app: App;
  icon: string;
  onPick(id: string): void;
  label?: string;
}) {
  return (
    <button
      class="ms-qa__icon-btn"
      title={label ?? "Choose icon"}
      onClick={() => new IconPickerModal(app, icon, onPick).open()}
    >
      <Icon id={icon} />
    </button>
  );
}

function ActionEditor({
  app,
  def,
  character,
  onChange,
}: {
  app: App;
  def: QuickActionDef;
  character: CharacterRecord;
  onChange(def: QuickActionDef): void;
}) {
  const patchStage = (idx: number, patch: Partial<QuickActionStage>) =>
    onChange({
      ...def,
      stages: def.stages.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });
  const patchVariant = (idx: number, patch: Partial<QuickActionVariant>) =>
    onChange({
      ...def,
      variants: def.variants!.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    });

  return (
    <div class="ms-qa__editor">
      <label class="ms-field">
        <span class="ms-field__label">Name</span>
        <input
          class="ms-field__input"
          type="text"
          value={def.name}
          onInput={(e) => onChange({ ...def, name: (e.target as HTMLInputElement).value })}
        />
      </label>
      <label class="ms-field">
        <span class="ms-field__label">Icon</span>
        <IconButton app={app} icon={def.icon} onPick={(icon) => onChange({ ...def, icon })} />
      </label>

      <div class="ms-qa__subhead">Stages (tap cycles: off → 1 → … → off)</div>
      {def.stages.map((stage, idx) => (
        <div class="ms-qa__stage" key={idx}>
          <div class="ms-qa__stage-head">
            <span class="ms-qa__stage-no">Stage {idx + 1}</span>
            <input
              type="text"
              placeholder="stage label (optional)"
              value={stage.name ?? ""}
              onInput={(e) =>
                patchStage(idx, { name: (e.target as HTMLInputElement).value || undefined })
              }
            />
            <IconButton
              app={app}
              icon={stage.icon ?? def.icon}
              label="Stage icon (overrides the action icon)"
              onPick={(icon) => patchStage(idx, { icon })}
            />
            <label title="pulse-glow styling (legacy double state)">
              <input
                type="checkbox"
                checked={Boolean(stage.emphasized)}
                onChange={(e) =>
                  patchStage(idx, { emphasized: (e.target as HTMLInputElement).checked || undefined })
                }
              />
              pulse
            </label>
            {def.stages.length > 1 && (
              <button
                class="ms-qa__remove"
                aria-label="Remove stage"
                onClick={() =>
                  onChange({ ...def, stages: def.stages.filter((_, i) => i !== idx) })
                }
              >
                ✕
              </button>
            )}
          </div>
          <EffectsEditor effects={stage.effects} onChange={(effects) => patchStage(idx, { effects })} />
        </div>
      ))}
      <button
        class="ms-qa__add"
        onClick={() => onChange({ ...def, stages: [...def.stages, { effects: [] }] })}
      >
        + Add stage
      </button>

      <div class="ms-qa__subhead">Variants (tap opens a menu instead of cycling)</div>
      {(def.variants ?? []).map((variant, idx) => (
        <div class="ms-qa__stage" key={variant.id}>
          <div class="ms-qa__stage-head">
            <input
              type="text"
              placeholder="variant name"
              value={variant.name}
              onInput={(e) => patchVariant(idx, { name: (e.target as HTMLInputElement).value })}
            />
            <IconButton
              app={app}
              icon={variant.icon ?? def.icon}
              label="Variant icon (optional override)"
              onPick={(icon) => patchVariant(idx, { icon })}
            />
            <button
              class="ms-qa__remove"
              aria-label="Remove variant"
              onClick={() =>
                onChange({ ...def, variants: def.variants!.filter((_, i) => i !== idx) })
              }
            >
              ✕
            </button>
          </div>
          <EffectsEditor effects={variant.effects} onChange={(effects) => patchVariant(idx, { effects })} />
        </div>
      ))}
      <button
        class="ms-qa__add"
        onClick={() =>
          onChange({
            ...def,
            variants: [
              ...(def.variants ?? []),
              { id: `${slug(def.name)}-v${(def.variants?.length ?? 0) + 1}`, name: "New variant", effects: [] },
            ],
          })
        }
      >
        + Add variant
      </button>

      <div class="ms-qa__subhead">Conditions</div>
      <label class="ms-field">
        <span class="ms-field__label">Needs pool</span>
        <select
          value={def.gate?.resourceId ?? ""}
          aria-label="Gating resource pool"
          onChange={(e) => {
            const id = (e.target as HTMLSelectElement).value;
            onChange({ ...def, gate: id ? { resourceId: id, min: def.gate?.min ?? 1 } : undefined });
          }}
        >
          <option value="">(none)</option>
          {character.resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {def.gate && (
          <input
            type="number"
            title="minimum points required"
            value={def.gate.min ?? 1}
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n)) onChange({ ...def, gate: { ...def.gate!, min: n } });
            }}
          />
        )}
      </label>
      <label class="ms-field">
        <span class="ms-field__label">Needs class</span>
        <input
          type="text"
          placeholder="(none)"
          value={def.requires?.className ?? ""}
          onInput={(e) => {
            const className = (e.target as HTMLInputElement).value;
            onChange({
              ...def,
              requires: className
                ? { className, minLevel: def.requires?.minLevel ?? 1 }
                : undefined,
            });
          }}
        />
        {def.requires && (
          <input
            type="number"
            title="minimum class level"
            value={def.requires.minLevel}
            onInput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(n))
                onChange({ ...def, requires: { ...def.requires!, minLevel: n } });
            }}
          />
        )}
      </label>
      <label class="ms-field">
        <span class="ms-field__label">Linked buff</span>
        <select
          value={def.linkedBuff ?? ""}
          aria-label="Linked buff"
          onChange={(e) => {
            const key = (e.target as HTMLSelectElement).value;
            onChange({ ...def, linkedBuff: key || undefined });
          }}
        >
          <option value="">(none)</option>
          {BUFF_DEFS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.name}
            </option>
          ))}
          {(character.customBuffs ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} (custom)
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor: list + pointer-event drag-and-drop reorder
// ---------------------------------------------------------------------------

export function QuickActionsEditor({ app, store, character }: EditorProps) {
  const actions = character.quickActions ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRects = useRef<DOMRect[]>([]);

  const setActions = (next: QuickActionDef[]) =>
    store.setCharacterField(character.id, "quickActions", next);
  const patchAction = (id: string, next: QuickActionDef) =>
    setActions(actions.map((a) => (a.id === id ? next : a)));

  const removeAction = (def: QuickActionDef) => {
    if (!window.confirm(`Remove quick action "${def.name}"?`)) return;
    const record = store.getCharacter(character.id)!;
    const state = { ...record.quickActionState };
    const wasOn = (state[def.id]?.stage ?? 0) > 0;
    delete state[def.id];
    store.updateCharacter(character.id, {
      quickActions: actions.filter((a) => a.id !== def.id),
      quickActionState: state,
      // drop a linked buff the active action had switched on
      ...(def.linkedBuff && wasOn
        ? { buffs: record.buffs.filter((b) => b !== def.linkedBuff) }
        : {}),
    });
    if (expanded === def.id) setExpanded(null);
  };

  // --- drag handlers (pointer capture keeps all events on the handle; the
  // --- handle has touch-action: none in scss so iPad doesn't scroll) -------
  const dragStart = (idx: number, e: PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // synthetic events (tests/MCP drives) carry no real pointer to capture
    }
    const rows = listRef.current
      ? ([...listRef.current.querySelectorAll(".ms-qa__row")] as HTMLElement[])
      : [];
    dragRects.current = rows.map((r) => r.getBoundingClientRect());
    setDrag({ from: idx, over: idx });
  };
  // `over` is an INSERTION index in the original list (0..length): the count
  // of row midpoints above the pointer.
  const dragMove = (e: PointerEvent) => {
    if (!drag) return;
    let over = 0;
    dragRects.current.forEach((r, i) => {
      if (e.clientY > r.top + r.height / 2) over = i + 1;
    });
    if (over !== drag.over) setDrag({ ...drag, over });
  };
  const dragEnd = () => {
    if (!drag) return;
    // removal shifts everything after `from` up one — adjust when moving down
    const insertAt = drag.from < drag.over ? drag.over - 1 : drag.over;
    if (insertAt !== drag.from) {
      const next = [...actions];
      const [moved] = next.splice(drag.from, 1);
      next.splice(insertAt, 0, moved);
      setActions(next);
    }
    setDrag(null);
  };

  const addFromCatalog = (e: MouseEvent) => {
    const present = new Set(actions.map((a) => a.id));
    const candidates = [...DEFAULT_QUICK_ACTIONS, FIGHTING_DEFENSIVELY_CRANE].filter(
      (d) => !present.has(d.id)
    );
    const menu = new Menu();
    if (candidates.length === 0) {
      menu.addItem((item) => item.setTitle("(everything's already here)").setDisabled(true));
    }
    for (const def of candidates) {
      menu.addItem((item) =>
        item.setTitle(def.name).onClick(() => setActions([...actions, structuredClone(def)]))
      );
    }
    menu.showAtMouseEvent(e);
  };

  const addBlank = () => {
    const def: QuickActionDef = {
      id: newId(),
      name: "New action",
      icon: "ra-crossed-swords",
      stages: [{ effects: [] }],
    };
    setActions([...actions, def]);
    setExpanded(def.id);
  };

  return (
    <section class="ms-config__section ms-qa">
      <div class="ms-config__section-title">Quick Actions</div>
      <div class="ms-qa__hint">
        The combat tab's action toggles. Drag to rearrange; the eye hides a
        button without losing its setup.
      </div>
      <div class="ms-qa__list" ref={listRef}>
        {actions.map((def, idx) => (
          <div
            key={def.id}
            class={`ms-qa__row${drag && drag.from === idx ? " is-dragging" : ""}${
              drag && drag.over === idx && drag.from !== idx ? " is-drop-target" : ""
            }`}
          >
            <div class="ms-qa__row-bar">
              <button
                class="ms-qa__handle"
                aria-label={`Drag to reorder ${def.name}`}
                onPointerDown={(e) => dragStart(idx, e as unknown as PointerEvent)}
                onPointerMove={(e) => dragMove(e as unknown as PointerEvent)}
                onPointerUp={dragEnd}
                onPointerCancel={dragEnd}
              >
                ⠿
              </button>
              <span class="ms-qa__row-icon">
                <Icon id={def.icon} />
              </span>
              <button
                class="ms-qa__row-name"
                title="Edit this action"
                onClick={() => setExpanded(expanded === def.id ? null : def.id)}
              >
                {def.name}
                {def.hidden ? " (hidden)" : ""}
              </button>
              <button
                class={`ms-qa__eye${def.hidden ? " is-off" : ""}`}
                title={def.hidden ? "Show on the combat tab" : "Hide from the combat tab"}
                onClick={() => patchAction(def.id, { ...def, hidden: !def.hidden || undefined })}
              >
                {def.hidden ? "🚫" : "👁"}
              </button>
              <button
                class="ms-qa__remove"
                aria-label={`Remove ${def.name}`}
                onClick={() => removeAction(def)}
              >
                ✕
              </button>
            </div>
            {expanded === def.id && (
              <ActionEditor
                app={app}
                def={def}
                character={character}
                onChange={(next) => patchAction(def.id, next)}
              />
            )}
          </div>
        ))}
      </div>
      <div class="ms-qa__actions">
        <button class="ms-config__add" onClick={(e) => addFromCatalog(e as unknown as MouseEvent)}>
          + From catalog
        </button>
        <button class="ms-config__add" onClick={addBlank}>
          + Blank action
        </button>
      </div>
    </section>
  );
}
