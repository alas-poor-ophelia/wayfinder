import { useRef, useState } from "preact/hooks";
import type { MiniSheetStore } from "../../../state/store";
import type { CharacterRecord } from "../../../types/character";
import type { QuickActionDef } from "../../../types/quick-actions";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";
import { Sec } from "../primitives";
import { CATALOG, defSummary } from "./shared";

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
  const focusMatch = focusId
    ? [...shown, ...bench.map((b) => b.def)].find((d) => d.id === focusId)
    : undefined;
  const focused = focusMatch ?? shown[0] ?? bench[0]?.def ?? null;

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
                  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty stage name falls back to the positional label
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
