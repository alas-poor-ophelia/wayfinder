/**
 * Quick Actions surface (config Effects category) — the redesign.
 *
 *  - QuickActionsSection: a tight squircle grid that mirrors the combat-tab
 *    toggles, split into two zones (On your sheet / Bench & library) with
 *    pointer-drag to show/hide/reorder and tap-to-edit. Catalog actions not
 *    yet added render dimmed in the bench; tapping one adds it.
 *  - QAEditor: centered Simple/Advanced modal editing the real QuickActionDef
 *    (stages, variants, effects, gate, requires).
 *  - QAAddModal: catalog picker + "build a custom action" launcher.
 *  - QAWizard: 3-step Name → Effect → Done custom-action builder.
 *
 * All edits write through store.setCharacterField(id, "quickActions", ...);
 * the prototype's flat `spends`/`showFor` map to the real gate/requires.
 */
import { Fragment } from "preact";
import { useRef, useState } from "preact/hooks";
import {
  BONUS_TYPES,
  type BonusType,
  type ModifierTarget,
} from "../../calc/modifiers";
import {
  DEFAULT_QUICK_ACTIONS,
  FIGHTING_DEFENSIVELY_CRANE,
} from "../../data/quick-actions";
import { ICON_IDS } from "../../data/icons/registry";
import type { MiniSheetStore } from "../../state/store";
import {
  ABILITY_KEYS,
  type AbilityKey,
  type CharacterRecord,
} from "../../types/character";
import type {
  QAValue,
  QuickActionDef,
  QuickActionEffect,
  QuickActionFormula,
} from "../../types/quick-actions";
import { Icon } from "../common/Icon";
import { TARGET_GROUPS } from "../common/ModifierEditor";
import { UI } from "./glyphs";
import { Num, Sec, Seg, Sel, Txt, Check } from "./primitives";

const newId = () => `qa-${Date.now().toString(36)}`;

const CATALOG: QuickActionDef[] = [
  ...DEFAULT_QUICK_ACTIONS,
  FIGHTING_DEFENSIVELY_CRANE,
];

const TARGET_LABEL = new Map<string, string>();
for (const g of TARGET_GROUPS)
  for (const o of g.options) TARGET_LABEL.set(o.value, o.label);

/* ---------- effect catalog (plain-language) ------------------------------- */

interface EffectType {
  kind: QuickActionEffect["kind"];
  label: string;
  desc: string;
  icon: string;
}
/** The eight friendly effect types offered in the wizard/choice cards. */
const EFFECT_TYPES: EffectType[] = [
  {
    kind: "modifier",
    label: "Bonus or penalty",
    icon: "ra-crossed-swords",
    desc: "Adjust an attack, damage, AC, save, or skill by a number.",
  },
  {
    kind: "acChannels",
    label: "Adjust AC",
    icon: "ra-shield",
    desc: "Change normal, touch, and flat-footed AC directly.",
  },
  {
    kind: "extraAttacks",
    label: "Extra attacks",
    icon: "ra-double-team",
    desc: "Add attacks at a chosen penalty.",
  },
  {
    kind: "damageDice",
    label: "Bonus damage dice",
    icon: "ra-lightning-bolt",
    desc: "Add dice like +1d6 fire to your hits.",
  },
  {
    kind: "keen",
    label: "Keen",
    icon: "ra-plain-dagger",
    desc: "Double your weapon's threat range.",
  },
  {
    kind: "note",
    label: "Reminder note",
    icon: "ra-aware",
    desc: "Show a note on the sheet or in attack lines.",
  },
  {
    kind: "smite",
    label: "Smite",
    icon: "ra-angel-wings",
    desc: "Add an ability bonus to attack and a level bonus to damage.",
  },
  {
    kind: "special",
    label: "Special rule",
    icon: "ra-arcane-mask",
    desc: "Built-in behaviours like Agile weapon.",
  },
];
/** Full kind list for the row select (includes the two niche legacy channels). */
const EFFECT_KIND_OPTIONS: { value: string; label: string }[] = [
  ...EFFECT_TYPES.map((t) => ({ value: t.kind, label: t.label })),
  { value: "preciseStrike", label: "Precise strike damage" },
  { value: "flurryAttacks", label: "Flurry base attacks" },
];

const APPLIES_TO = ["melee", "ranged", "unarmed", "all"];

function defaultEffect(kind: QuickActionEffect["kind"]): QuickActionEffect {
  switch (kind) {
    case "modifier":
      return { kind, target: "attack.all", type: "untyped", value: 1 };
    case "acChannels":
      return { kind, normal: 1, touch: 1, ff: 0 };
    case "extraAttacks":
      return { kind, count: 1, penalty: 0 };
    case "damageDice":
      return { kind, dice: "+1d6 fire", appliesTo: "melee" };
    case "keen":
      return { kind, appliesTo: "melee" };
    case "note":
      return { kind, text: "", placement: "sheet" };
    case "smite":
      return {
        kind,
        attack: { source: "abilityMod", ability: "cha" },
        damage: { source: "classLevel", className: "" },
      };
    case "preciseStrike":
      return { kind, damage: { source: "classLevel", className: "" } };
    case "flurryAttacks":
      return { kind, count: 2 };
    case "special":
      return { kind, op: "agileWeapon" };
  }
}

function valueStr(v: QAValue): string {
  if (typeof v === "object") return "scaling";
  return v >= 0 ? `+${v}` : `${v}`;
}

function effectSummary(e: QuickActionEffect): string {
  switch (e.kind) {
    case "modifier":
      return `${valueStr(e.value)} ${e.type !== "untyped" ? e.type + " " : ""}to ${(TARGET_LABEL.get(e.target) ?? e.target).toLowerCase()}`;
    case "acChannels":
      return `AC ${valueStr(e.normal ?? 0)} / ${valueStr(e.touch ?? 0)} touch / ${valueStr(e.ff ?? 0)} flat`;
    case "extraAttacks":
      return `${valueStr(e.count)} extra attack(s)${e.penalty ? ` at ${e.penalty}` : ""}`;
    case "damageDice":
      return `${e.dice} (${e.appliesTo})`;
    case "keen":
      return `Keen (${e.appliesTo})`;
    case "note":
      return `Note: “${e.text}”`;
    case "smite":
      return `${valueStr(e.attack)} atk, ${valueStr(e.damage)} dmg`;
    case "preciseStrike":
      return `${valueStr(e.damage)} precise damage`;
    case "flurryAttacks":
      return `${valueStr(e.count)} flurry attacks`;
    case "special":
      return e.op === "agileWeapon"
        ? "DEX for melee attack"
        : e.op === "versatilePerformance"
          ? "Bluff/Sense Motive use Perform"
          : "Weapon Finesse";
  }
}

function defSummary(def: QuickActionDef): string {
  const effects = def.stages.flatMap((s) => s.effects);
  if (def.variants?.length) return `Tap-menu, ${def.variants.length} options.`;
  if (effects.length === 0) return "No effects yet.";
  return effects.map(effectSummary).join("; ") + ".";
}

/* ---------- value field (number | formula) -------------------------------- */

function FormulaBody({
  value,
  onChange,
}: {
  value: QuickActionFormula;
  onChange: (v: QAValue) => void;
}) {
  return (
    <>
      <select
        class="sel"
        value={value.source}
        aria-label="Formula source"
        onChange={(e) =>
          onChange({
            ...value,
            source: (e.target as HTMLSelectElement).value as never,
          })
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
          class="inp"
          type="text"
          placeholder="class name"
          value={value.className ?? ""}
          onInput={(e) =>
            onChange({
              ...value,
              className: (e.target as HTMLInputElement).value,
            })
          }
        />
      )}
      {(value.source === "abilityMod" || value.source === "abilityScore") && (
        <Sel
          value={value.ability ?? "str"}
          options={ABILITY_KEYS.map((k) => ({
            value: k,
            label: k.toUpperCase(),
          }))}
          onChange={(v) => onChange({ ...value, ability: v as AbilityKey })}
        />
      )}
      <span class="effect__num" title="divide before flooring">
        ÷{" "}
        <Num
          value={value.divisor ?? 1}
          onChange={(n) => onChange({ ...value, divisor: n })}
        />
      </span>
      <span class="effect__num" title="multiply after the floor">
        ×{" "}
        <Num
          value={value.multiplier ?? 1}
          onChange={(n) => onChange({ ...value, multiplier: n })}
        />
      </span>
      <span class="effect__num" title="flat bonus added last">
        +{" "}
        <Num
          value={value.flatBonus ?? 0}
          onChange={(n) => onChange({ ...value, flatBonus: n })}
        />
      </span>
    </>
  );
}

function ValueField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QAValue;
  onChange: (v: QAValue) => void;
}) {
  const isF = typeof value === "object";
  return (
    <span class="effect__num">
      {label}
      <button
        class={`effect__ftoggle${isF ? " is-on" : ""}`}
        title={
          isF
            ? "Switch to a fixed number"
            : "Switch to a level/BAB/ability formula"
        }
        onClick={() =>
          onChange(isF ? 0 : { source: "classLevel", className: "" })
        }
      >
        ƒ
      </button>
      {/* wrapping value column — keeps wrapped formula rows aligned under the
          inputs rather than flush below the label */}
      <span class="effect__num__vals">
        {!isF ? (
          <Num value={value} onChange={(n) => onChange(n)} />
        ) : (
          <FormulaBody
            value={value}
            onChange={onChange}
          />
        )}
      </span>
    </span>
  );
}

/* ---------- effect row ---------------------------------------------------- */

function EffectRow({
  e,
  onChange,
  onRemove,
}: {
  e: QuickActionEffect;
  onChange: (e: QuickActionEffect) => void;
  onRemove: () => void;
}) {
  const patch = (p: Partial<QuickActionEffect>) =>
    onChange({ ...e, ...p } as QuickActionEffect);
  return (
    <div class="effect">
      <div class="effect__head">
        <select
          class="sel"
          aria-label="Effect kind"
          value={e.kind}
          onChange={(ev) =>
            onChange(
              defaultEffect(
                (ev.target as HTMLSelectElement)
                  .value as QuickActionEffect["kind"],
              ),
            )
          }
        >
          {EFFECT_KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <button class="iconbtn" aria-label="Remove effect" onClick={onRemove}>
          <UI.x />
        </button>
      </div>
      <div class="effect__body">
        {e.kind === "modifier" && (
          <>
            <select
              class="sel"
              value={e.target}
              aria-label="Target"
              onChange={(ev) =>
                patch({
                  target: (ev.target as HTMLSelectElement)
                    .value as ModifierTarget,
                })
              }
            >
              {TARGET_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Sel
              value={e.type}
              options={BONUS_TYPES.map((t) => t)}
              onChange={(v) => patch({ type: v as BonusType })}
            />
            <ValueField
              label="value"
              value={e.value}
              onChange={(v) => patch({ value: v })}
            />
          </>
        )}
        {e.kind === "acChannels" && (
          <>
            <ValueField
              label="normal"
              value={e.normal ?? 0}
              onChange={(v) => patch({ normal: v })}
            />
            <ValueField
              label="touch"
              value={e.touch ?? 0}
              onChange={(v) => patch({ touch: v })}
            />
            <ValueField
              label="flat"
              value={e.ff ?? 0}
              onChange={(v) => patch({ ff: v })}
            />
          </>
        )}
        {e.kind === "extraAttacks" && (
          <>
            <ValueField
              label="count"
              value={e.count}
              onChange={(v) => patch({ count: v })}
            />
            <span class="effect__num">
              penalty{" "}
              <Num
                value={e.penalty ?? 0}
                onChange={(n) => patch({ penalty: n })}
              />
            </span>
          </>
        )}
        {e.kind === "damageDice" && (
          <>
            <input
              class="inp"
              value={e.dice}
              placeholder="+1d6 fire"
              onInput={(ev) =>
                patch({ dice: (ev.target as HTMLInputElement).value })
              }
            />
            <Sel
              value={e.appliesTo}
              options={APPLIES_TO}
              onChange={(v) => patch({ appliesTo: v as never })}
            />
          </>
        )}
        {e.kind === "keen" && (
          <Sel
            value={e.appliesTo}
            options={APPLIES_TO}
            onChange={(v) => patch({ appliesTo: v as never })}
          />
        )}
        {e.kind === "note" && (
          <>
            <input
              class="inp"
              value={e.text}
              placeholder="Reminder text"
              onInput={(ev) =>
                patch({ text: (ev.target as HTMLInputElement).value })
              }
            />
            <Sel
              value={e.placement ?? "sheet"}
              options={[
                { value: "sheet", label: "Sheet" },
                { value: "attack", label: "Attack lines" },
              ]}
              onChange={(v) => patch({ placement: v as never })}
            />
          </>
        )}
        {e.kind === "smite" && (
          <>
            <ValueField
              label="attack"
              value={e.attack}
              onChange={(v) => patch({ attack: v })}
            />
            <ValueField
              label="damage"
              value={e.damage}
              onChange={(v) => patch({ damage: v })}
            />
          </>
        )}
        {e.kind === "preciseStrike" && (
          <ValueField
            label="damage"
            value={e.damage}
            onChange={(v) => patch({ damage: v })}
          />
        )}
        {e.kind === "flurryAttacks" && (
          <ValueField
            label="attacks"
            value={e.count}
            onChange={(v) => patch({ count: v })}
          />
        )}
        {e.kind === "special" && (
          <Sel
            value={e.op}
            options={[
              { value: "agileWeapon", label: "Agile weapon (DEX for melee)" },
              { value: "versatilePerformance", label: "Versatile Performance" },
              { value: "weaponFinesse", label: "Weapon Finesse" },
            ]}
            onChange={(v) => patch({ op: v as never })}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- icon picker (nested in-config modal) -------------------------- */

const ICON_PAGE = 140;

function IconPicker({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const matches = ICON_IDS.filter((id) => !query || id.includes(query));
  const shown = matches.slice(0, ICON_PAGE);
  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <div class="modal__titles">
            <div class="modal__title">Choose icon</div>
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>
        <div class="modal__body">
          <div class="searchbox" style={{ marginBottom: 8 }}>
            <UI.search />
            <input
              placeholder="Search icons…"
              value={q}
              onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="icongrid">
            {shown.map((id) => (
              <button
                key={id}
                class={id === current ? "is-sel" : ""}
                title={id}
                onClick={() => {
                  onPick(id);
                  onClose();
                }}
              >
                <Icon id={id} />
              </button>
            ))}
          </div>
          <p class="help">
            {matches.length > shown.length
              ? `Showing ${shown.length} of ${matches.length} — refine your search.`
              : `${matches.length} icons. Game-icons.net (CC BY 3.0) via RPG Awesome.`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Two-zone grid                                                          */
/* ====================================================================== */

interface BenchItem {
  def: QuickActionDef;
  cat: boolean;
}
interface DragState {
  id: string;
  from: "sheet" | "bench";
  overZone: "sheet" | "bench" | null;
  overIndex: number;
}

export function QuickActionsSection({
  store,
  character,
  onEdit,
  onAdd,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  onEdit: (id: string) => void;
  onAdd: () => void;
}) {
  const actions = character.quickActions ?? [];
  const sheetRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const down = useRef<{
    id: string;
    item: BenchItem;
    from: "sheet" | "bench";
    x: number;
    y: number;
    moved: boolean;
    overZone: "sheet" | "bench" | null;
    overIndex: number;
  } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // The action whose details show in the strip — driven by hover, keyboard
  // focus, and touch (onDown), so an icon-only grid is still legible.
  const [focusId, setFocusId] = useState<string | null>(null);

  const setQa = (next: QuickActionDef[]) =>
    store.setCharacterField(character.id, "quickActions", next);

  const shown = actions.filter((a) => !a.hidden);
  const hiddenActions = actions.filter((a) => a.hidden);
  const catalog = CATALOG.filter((c) => !actions.some((a) => a.id === c.id));
  const bench: BenchItem[] = [
    ...hiddenActions.map((def) => ({ def, cat: false })),
    ...catalog.map((def) => ({ def, cat: true })),
  ];
  // Default to the first on-sheet action so the strip is never empty on a
  // touch device (where hover never fires).
  const focused =
    (focusId &&
      [...shown, ...bench.map((b) => b.def)].find((d) => d.id === focusId)) ||
    shown[0] ||
    bench[0]?.def ||
    null;

  const zoneOf = (x: number, y: number): "sheet" | "bench" | null => {
    const inR = (ref: typeof sheetRef) => {
      if (!ref.current) return false;
      const r = ref.current.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    if (inR(sheetRef)) return "sheet";
    if (inR(benchRef)) return "bench";
    return null;
  };

  const sheetIndex = (x: number, y: number): number => {
    const cells = sheetRef.current
      ? ([
          ...sheetRef.current.querySelectorAll(".qa-cell[data-id]"),
        ] as HTMLElement[])
      : [];
    if (!cells.length) return 0;
    let best = 0;
    let bestD = Infinity;
    cells.forEach((c) => {
      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = x > cx ? Number(c.dataset.i) + 1 : Number(c.dataset.i);
      }
    });
    return best;
  };

  const addToSheet = (item: BenchItem, index: number) => {
    const clone = structuredClone(item.def);
    delete clone.hidden;
    const newShown = shown.filter((a) => a.id !== item.def.id).map((a) => a);
    let insert = index < 0 ? newShown.length : index;
    const orig = shown.findIndex((a) => a.id === item.def.id);
    if (orig > -1 && orig < insert) insert--;
    insert = Math.max(0, Math.min(insert, newShown.length));
    newShown.splice(insert, 0, clone);
    setQa([...newShown, ...hiddenActions.filter((a) => a.id !== item.def.id)]);
  };

  const moveToBench = (id: string) => {
    const target = actions.find((a) => a.id === id);
    if (!target) return;
    setQa([
      ...shown.filter((a) => a.id !== id),
      ...hiddenActions.filter((a) => a.id !== id),
      { ...target, hidden: true },
    ]);
  };

  const onDown = (
    item: BenchItem,
    zone: "sheet" | "bench",
    e: PointerEvent,
  ) => {
    setFocusId(item.def.id);
    down.current = {
      id: item.def.id,
      item,
      from: zone,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      overZone: null,
      overIndex: -1,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events (MCP/tests) have no real pointer */
    }
  };
  const onMove = (e: PointerEvent) => {
    const dn = down.current;
    if (!dn) return;
    if (!dn.moved) {
      if (Math.abs(e.clientX - dn.x) + Math.abs(e.clientY - dn.y) < 6) return;
      dn.moved = true;
    }
    const z = zoneOf(e.clientX, e.clientY);
    const overIndex = z === "sheet" ? sheetIndex(e.clientX, e.clientY) : -1;
    dn.overZone = z;
    dn.overIndex = overIndex;
    setDrag({ id: dn.id, from: dn.from, overZone: z, overIndex });
  };
  const onUp = (item: BenchItem) => {
    const dn = down.current;
    down.current = null;
    if (!dn) return;
    if (!dn.moved) {
      if (item.cat) addToSheet(item, -1);
      else onEdit(item.def.id);
      setDrag(null);
      return;
    }
    // read the drop target from the ref (not the async `drag` state) so the
    // drop is correct even when move/up fire in one tick without a re-render
    if (dn.overZone === "sheet") addToSheet(dn.item, dn.overIndex);
    else if (dn.overZone === "bench" && !dn.item.cat) moveToBench(dn.id);
    setDrag(null);
  };

  const Cell = (item: BenchItem, i: number, zone: "sheet" | "bench") => {
    const a = item.def;
    return (
      <button
        key={a.id}
        data-id={a.id}
        data-i={zone === "sheet" ? i : undefined}
        title={a.name + (item.cat ? " — tap to add" : "")}
        aria-label={a.name}
        class={`qa-cell${drag && drag.id === a.id ? " is-drag" : ""}${
          zone === "sheet" &&
          drag &&
          drag.overZone === "sheet" &&
          drag.overIndex === i
            ? " is-drop"
            : ""
        }${focused && focused.id === a.id ? " is-focus" : ""}`}
        onPointerEnter={() => setFocusId(a.id)}
        onFocus={() => setFocusId(a.id)}
        onPointerDown={(e) => onDown(item, zone, e)}
        onPointerMove={(e) => onMove(e)}
        onPointerUp={() => onUp(item)}
        onPointerCancel={() => {
          down.current = null;
          setDrag(null);
        }}
      >
        <div class={`squircle${zone === "bench" ? " is-bench" : ""}`}>
          <Icon id={a.icon} />
        </div>
        {a.stages.length > 1 && (
          <span class="qa-cell__badge">{a.stages.length}</span>
        )}
      </button>
    );
  };

  return (
    <Sec
      icon="ra-lightning-bolt"
      title="Quick Actions"
      desc={`${shown.length} on sheet`}
      collapsible={false}
    >
      <p class="help qa-intro">
        Drag between zones to show or hide, drag within to reorder, tap to edit.
      </p>
      {focused && (
        <div class="qa-detail" aria-live="polite">
          <div class="qa-detail__head">
            <span class="qa-detail__icon">
              <Icon id={focused.icon} />
            </span>
            <span class="qa-detail__name">{focused.name}</span>
            <span class="qa-detail__where">
              {shown.some((a) => a.id === focused.id)
                ? "On sheet"
                : hiddenActions.some((a) => a.id === focused.id)
                  ? "Benched"
                  : "Library"}
            </span>
          </div>
          <div class="qa-detail__summary">{defSummary(focused)}</div>
          <div class="qa-detail__meta">
            {focused.stages.length > 1 && (
              <span class="qa-detail__tag">
                {focused.stages.length} stages:{" "}
                {focused.stages
                  .map((s, i) => s.name || `Stage ${i + 1}`)
                  .join(" → ")}
              </span>
            )}
            {focused.gate && (
              <span class="qa-detail__tag">
                Spends {focused.gate.resourceId}
                {focused.gate.min ? ` (≥${focused.gate.min})` : ""}
              </span>
            )}
            {focused.requires && (
              <span class="qa-detail__tag">
                Needs {focused.requires.className} {focused.requires.minLevel}+
              </span>
            )}
          </div>
        </div>
      )}
      <div class="qa-zone">
        <div class="qa-zone__label">
          On your sheet <span class="n">· {shown.length}</span>
        </div>
        <div
          class={`qa-tray${drag && drag.overZone === "sheet" ? " is-over" : ""}`}
          ref={sheetRef}
        >
          {shown.map((def, i) => Cell({ def, cat: false }, i, "sheet"))}
          <div
            class="qa-cell qa-add-cell"
            onClick={onAdd}
            title="Add an action"
          >
            <div class="squircle">
              <UI.plus />
            </div>
          </div>
          {shown.length === 0 && (
            <span class="qa-tray__empty">Drag actions here</span>
          )}
        </div>
      </div>
      <div class="qa-zone">
        <div class="qa-zone__label">
          Bench &amp; library <span class="n">· {bench.length}</span>
        </div>
        <div
          class={`qa-tray qa-tray--bench${drag && drag.overZone === "bench" ? " is-over" : ""}`}
          ref={benchRef}
        >
          {bench.map((item) => Cell(item, -1, "bench"))}
          {bench.length === 0 && (
            <span class="qa-tray__empty">
              Hidden &amp; available actions live here
            </span>
          )}
        </div>
      </div>
      <p class="qa-hint">
        Bench holds hidden toggles and class/combat actions you haven't added.
        <button class="btn btn--accent btn--sm" onClick={onAdd}>
          <UI.plus /> New custom action
        </button>
      </p>
    </Sec>
  );
}

/* ====================================================================== */
/* Editor modal (Simple / Advanced)                                       */
/* ====================================================================== */

export function QAEditor({
  store,
  character,
  def,
  onClose,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  def: QuickActionDef;
  onClose: () => void;
}) {
  const [m, setM] = useState<QuickActionDef>(() => structuredClone(def));
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [pick, setPick] = useState(false);
  const upd = (p: Partial<QuickActionDef>) => setM({ ...m, ...p });
  const patchStage = (
    i: number,
    p: Partial<QuickActionDef["stages"][number]>,
  ) => upd({ stages: m.stages.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const eff0 = m.stages[0].effects;

  const save = () => {
    const actions = character.quickActions ?? [];
    store.setCharacterField(
      character.id,
      "quickActions",
      actions.map((a) => (a.id === m.id ? m : a)),
    );
    onClose();
  };
  const remove = () => {
    const record = store.getCharacter(character.id)!;
    const state = { ...record.quickActionState };
    const wasOn = (state[m.id]?.stage ?? 0) > 0;
    delete state[m.id];
    store.updateCharacter(character.id, {
      quickActions: (record.quickActions ?? []).filter((a) => a.id !== m.id),
      quickActionState: state,
      ...(m.linkedBuff && wasOn
        ? { buffs: record.buffs.filter((b) => b !== m.linkedBuff) }
        : {}),
    });
    onClose();
  };

  const poolOptions = [
    { value: "", label: "Nothing" },
    ...character.resources.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <button
            class="squircle"
            onClick={() => setPick(true)}
            title="Change icon"
          >
            <Icon id={m.icon} />
          </button>
          <div class="modal__titles">
            <div class="modal__title">{m.name || "Action"}</div>
            <div class="modal__sub">Combat-tab toggle</div>
          </div>
          <div style={{ marginRight: 8 }}>
            <Seg
              value={mode}
              options={[
                { value: "simple", label: "Simple" },
                { value: "advanced", label: "Advanced" },
              ]}
              onChange={(v) => setMode(v as "simple" | "advanced")}
            />
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>

        <div class="modal__body">
          <div class="block">
            <div class="f">
              <span class="f__label">Name</span>
              <span class="f__control">
                <Txt value={m.name} onChange={(v) => upd({ name: v })} />
              </span>
            </div>
            <div class="f">
              <span class="f__label">Icon</span>
              <span class="f__control">
                <button class="iconpick__btn" onClick={() => setPick(true)}>
                  <Icon id={m.icon} />
                </button>
              </span>
            </div>
          </div>

          {mode === "simple" ? (
            <>
              <div class="block">
                <div class="block__label">
                  What it does <span class="ln" />
                </div>
                {eff0.length === 0 && <div class="empty">No effects yet.</div>}
                {eff0.map((e, i) => (
                  <EffectRow
                    key={i}
                    e={e}
                    onChange={(ne) =>
                      patchStage(0, {
                        effects: eff0.map((x, k) => (k === i ? ne : x)),
                      })
                    }
                    onRemove={() =>
                      patchStage(0, { effects: eff0.filter((_, k) => k !== i) })
                    }
                  />
                ))}
                <button
                  class="btn btn--ghost btn--sm"
                  onClick={() =>
                    patchStage(0, {
                      effects: [...eff0, defaultEffect("modifier")],
                    })
                  }
                >
                  <UI.plus /> Add effect
                </button>
                {(m.stages.length > 1 || (m.variants?.length ?? 0) > 0) && (
                  <p class="help">
                    {m.stages.length > 1 ? `Has ${m.stages.length} stages` : ""}
                    {m.stages.length > 1 && m.variants?.length ? " · " : ""}
                    {m.variants?.length
                      ? `a ${m.variants.length}-option menu`
                      : ""}
                    . Open Advanced to edit.
                  </p>
                )}
              </div>
              <div class="block">
                <div class="block__label">
                  Cost <span class="ln" />
                </div>
                <div class="f">
                  <span class="f__label">
                    Spends from<small>optional — links a pool</small>
                  </span>
                  <span class="f__control">
                    <Sel
                      value={m.gate?.resourceId ?? ""}
                      options={poolOptions}
                      onChange={(v) =>
                        upd({
                          gate: v
                            ? { resourceId: v, min: m.gate?.min ?? 1 }
                            : undefined,
                        })
                      }
                    />
                  </span>
                </div>
              </div>
            </>
          ) : (
            <AdvancedBody
              m={m}
              upd={upd}
              patchStage={patchStage}
              poolOptions={poolOptions}
            />
          )}
        </div>

        <div class="modal__foot">
          <button class="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <span class="spacer" />
          <button class="btn" onClick={remove}>
            <UI.trash /> Remove
          </button>
          <button class="btn btn--accent" onClick={save}>
            <UI.check /> Save
          </button>
        </div>
        {pick && (
          <IconPicker
            current={m.icon}
            onPick={(ic) => upd({ icon: ic })}
            onClose={() => setPick(false)}
          />
        )}
      </div>
    </div>
  );
}

function AdvancedBody({
  m,
  upd,
  patchStage,
  poolOptions,
}: {
  m: QuickActionDef;
  upd: (p: Partial<QuickActionDef>) => void;
  patchStage: (i: number, p: Partial<QuickActionDef["stages"][number]>) => void;
  poolOptions: { value: string; label: string }[];
}) {
  const variants = m.variants ?? [];
  return (
    <>
      <div class="block">
        <div class="block__label">
          Stages <span class="ln" />
        </div>
        <p class="help" style={{ marginTop: 0, marginBottom: 8 }}>
          Tapping cycles off → 1 → … → off. Add a stage for a stronger state.
        </p>
        {m.stages.map((s, i) => (
          <div class="ed-stage" key={i}>
            <div class="ed-stage__head">
              <span class="ed-stage__no">Stage {i + 1}</span>
              <input
                class="inp"
                placeholder="Label (optional)"
                value={s.name ?? ""}
                onInput={(e) =>
                  patchStage(i, {
                    name: (e.target as HTMLInputElement).value || undefined,
                  })
                }
              />
              <label class="chip" style={{ cursor: "pointer" }}>
                <Check
                  value={!!s.emphasized}
                  onChange={(v) =>
                    patchStage(i, { emphasized: v || undefined })
                  }
                />{" "}
                pulse
              </label>
              {m.stages.length > 1 && (
                <button
                  class="iconbtn"
                  onClick={() =>
                    upd({ stages: m.stages.filter((_, k) => k !== i) })
                  }
                >
                  <UI.x />
                </button>
              )}
            </div>
            {s.effects.map((e, k) => (
              <EffectRow
                key={k}
                e={e}
                onChange={(ne) =>
                  patchStage(i, {
                    effects: s.effects.map((x, j) => (j === k ? ne : x)),
                  })
                }
                onRemove={() =>
                  patchStage(i, {
                    effects: s.effects.filter((_, j) => j !== k),
                  })
                }
              />
            ))}
            <button
              class="btn btn--ghost btn--sm"
              onClick={() =>
                patchStage(i, {
                  effects: [...s.effects, defaultEffect("modifier")],
                })
              }
            >
              <UI.plus /> Add effect
            </button>
          </div>
        ))}
        <button
          class="btn btn--ghost btn--sm"
          onClick={() => upd({ stages: [...m.stages, { effects: [] }] })}
        >
          <UI.plus /> Add stage
        </button>
      </div>

      <div class="block">
        <div class="block__label">
          Tap-menu <span class="ln" />
        </div>
        <p class="help" style={{ marginTop: 0, marginBottom: 6 }}>
          Variants make a tap open a menu (like Weapon Song) instead of cycling.
        </p>
        {variants.map((v, i) => (
          <div class="menulist__item" key={v.id}>
            <Icon id={m.icon} />
            <input
              class="inp"
              value={v.name}
              onInput={(e) =>
                upd({
                  variants: variants.map((x, k) =>
                    k === i
                      ? { ...x, name: (e.target as HTMLInputElement).value }
                      : x,
                  ),
                })
              }
            />
            <span class="menulist__sum">
              {v.effects.map(effectSummary).join("; ")}
            </span>
            <button
              class="iconbtn"
              onClick={() =>
                upd({ variants: variants.filter((_, k) => k !== i) })
              }
            >
              <UI.x />
            </button>
          </div>
        ))}
        <button
          class="btn btn--ghost btn--sm"
          style={{ marginTop: 6 }}
          onClick={() =>
            upd({
              variants: [
                ...variants,
                {
                  id: `v-${Date.now().toString(36)}`,
                  name: "New variant",
                  effects: [],
                },
              ],
            })
          }
        >
          <UI.plus /> Add variant
        </button>
      </div>

      <div class="block">
        <div class="block__label">
          Availability <span class="ln" />
        </div>
        <div class="f">
          <span class="f__label">Spends from</span>
          <span class="f__control">
            <Sel
              value={m.gate?.resourceId ?? ""}
              options={poolOptions}
              onChange={(v) =>
                upd({
                  gate: v
                    ? { resourceId: v, min: m.gate?.min ?? 1 }
                    : undefined,
                })
              }
            />
          </span>
        </div>
        <div class="f">
          <span class="f__label">
            Show for class<small>blank = always shown</small>
          </span>
          <span class="f__control">
            <input
              class="inp"
              style={{ width: 150 }}
              placeholder="(any class)"
              value={m.requires?.className ?? ""}
              onInput={(e) => {
                const className = (e.target as HTMLInputElement).value;
                upd({
                  requires: className
                    ? { className, minLevel: m.requires?.minLevel ?? 1 }
                    : undefined,
                });
              }}
            />
          </span>
        </div>
      </div>
    </>
  );
}

/* ====================================================================== */
/* Add picker                                                             */
/* ====================================================================== */

export function QAAddModal({
  store,
  character,
  onClose,
  onCustom,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  onClose: () => void;
  onCustom: () => void;
}) {
  const actions = character.quickActions ?? [];
  const present = new Set(actions.map((a) => a.id));
  const add = (def: QuickActionDef) => {
    store.setCharacterField(character.id, "quickActions", [
      ...actions,
      structuredClone(def),
    ]);
    onClose();
  };
  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <div class="modal__titles">
            <div class="modal__title">Add action</div>
            <div class="modal__sub">Defaults for your class, or your own</div>
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>
        <div class="modal__body">
          <div class="picklist">
            {CATALOG.map((c) => {
              const has = present.has(c.id);
              return (
                <button
                  key={c.id}
                  class={`pickitem${has ? " is-disabled" : ""}`}
                  disabled={has}
                  onClick={() => add(c)}
                >
                  <span class="squircle">
                    <Icon id={c.icon} />
                  </span>
                  <span>
                    <span class="pickitem__t">{c.name}</span>
                    <br />
                    <span class="pickitem__d">{defSummary(c)}</span>
                  </span>
                  {has && <span class="pickitem__on">on sheet</span>}
                </button>
              );
            })}
          </div>
          <div class="divider" />
          <button
            class="btn btn--accent"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={onCustom}
          >
            <UI.wand /> Build a custom action
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Wizard (Name → Effect → Done)                                          */
/* ====================================================================== */

const WIZ = ["Name", "Effect", "Done"];

export function QAWizard({
  store,
  character,
  onClose,
}: {
  store: MiniSheetStore;
  character: CharacterRecord;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState(false);
  const [d, setD] = useState<{
    name: string;
    icon: string;
    effect: QuickActionEffect;
  }>(() => ({
    name: "",
    icon: "ra-crossed-swords",
    effect: defaultEffect("modifier"),
  }));
  const upd = (p: Partial<typeof d>) => setD({ ...d, ...p });
  const canNext = step !== 0 || d.name.trim().length > 0;

  const create = () => {
    const def: QuickActionDef = {
      id: newId(),
      name: d.name || "New action",
      icon: d.icon,
      stages: [{ effects: [d.effect] }],
    };
    store.setCharacterField(character.id, "quickActions", [
      ...(character.quickActions ?? []),
      def,
    ]);
    onClose();
  };

  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal__head">
          <div class="modal__titles">
            <div class="modal__title">New custom action</div>
          </div>
          <button class="iconbtn" onClick={onClose}>
            <UI.x />
          </button>
        </div>
        <div class="wizsteps">
          {WIZ.map((s, i) => (
            <Fragment key={s}>
              <div
                class={`wizstep${i === step ? " is-active" : i < step ? " is-done" : ""}`}
              >
                <span class="wizstep__dot">
                  {i < step ? <UI.check /> : i + 1}
                </span>
                <span class="wizstep__lbl">{s}</span>
              </div>
              {i < WIZ.length - 1 && (
                <span class={`wizstep__ln${i < step ? " is-done" : ""}`} />
              )}
            </Fragment>
          ))}
        </div>
        <div class="modal__body">
          {step === 0 && (
            <>
              <p class="help" style={{ marginTop: 0 }}>
                Name it and pick a squircle icon.
              </p>
              <div class="f">
                <span class="f__label">Name</span>
                <span class="f__control">
                  <Txt
                    value={d.name}
                    onChange={(v) => upd({ name: v })}
                    placeholder="e.g. Vital Strike"
                  />
                </span>
              </div>
              <div class="f">
                <span class="f__label">Icon</span>
                <span class="f__control">
                  <button class="iconpick__btn" onClick={() => setPick(true)}>
                    <Icon id={d.icon} />
                  </button>
                </span>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p class="help" style={{ marginTop: 0 }}>
                What does it do? Pick an effect type — add more later in
                Advanced.
              </p>
              <div class="choice">
                {EFFECT_TYPES.map((t) => (
                  <button
                    key={t.kind}
                    class={`choice__card${d.effect.kind === t.kind ? " is-sel" : ""}`}
                    onClick={() => upd({ effect: defaultEffect(t.kind) })}
                  >
                    <span class="choice__ic">
                      <Icon id={t.icon} />
                    </span>
                    <span>
                      <span class="choice__t">{t.label}</span>
                      <span class="choice__d">{t.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div class="divider" />
              <EffectRow
                e={d.effect}
                onChange={(e) => upd({ effect: e })}
                onRemove={() => upd({ effect: defaultEffect("modifier") })}
              />
            </>
          )}
          {step === 2 && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span class="squircle is-on">
                  <Icon id={d.icon} />
                </span>
                <div>
                  <div class="modal__title">{d.name || "New action"}</div>
                  <div class="muted" style={{ fontSize: 12.5 }}>
                    {effectSummary(d.effect)}.
                  </div>
                </div>
              </div>
              <div class="review__row">
                <b>Effect</b>
                <span>{effectSummary(d.effect)}</span>
              </div>
              <div class="review__row">
                <b>Cost</b>
                <span class="muted">Free — add a pool later if needed</span>
              </div>
              <p class="help">
                It'll drop onto your grid where you can drag, restage, or gate
                it.
              </p>
            </>
          )}
        </div>
        <div class="modal__foot">
          <button
            class="btn btn--ghost"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          >
            <UI.arrowL /> {step === 0 ? "Cancel" : "Back"}
          </button>
          <span class="spacer" />
          {step < 2 ? (
            <button
              class="btn btn--accent"
              disabled={!canNext}
              style={{ opacity: canNext ? 1 : 0.5 }}
              onClick={() => setStep(step + 1)}
            >
              Next <UI.arrowR />
            </button>
          ) : (
            <button class="btn btn--accent" onClick={create}>
              <UI.check /> Create
            </button>
          )}
        </div>
        {pick && (
          <IconPicker
            current={d.icon}
            onPick={(ic) => upd({ icon: ic })}
            onClose={() => setPick(false)}
          />
        )}
      </div>
    </div>
  );
}
