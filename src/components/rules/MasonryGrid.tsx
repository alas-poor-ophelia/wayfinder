/* Masonry body — ported from the prototype's OptionMasonry.jsx. Compact
   slate cards in a JS row-span masonry; tapping a card expands it to full
   width (grid-column 1/-1) and siblings reflow with a staggered FLIP slide.
   The cascade fires only on expand/collapse, never on search keystrokes. */
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type MiniSheetPlugin from "../../main";
import type { RuleDoc } from "../../rules/model";
import { CONTENT_TYPES } from "../../rules/registry";
import { refIconId } from "../../rules/icons";
import { Icon } from "../common/Icon";
import { Blocks, MetaChips, StarButton, TypeBadge, hl, hlFuzzy } from "./blocks";

const ROW = 4;
const GAP = 8;

export interface MasonrySection {
  label: string;
  docs: RuleDoc[];
  results: boolean;
}

function StarGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.86L12 17.9l-5.25 2.76 1-5.86L3.5 9.66l5.9-.86z" />
    </svg>
  );
}

function findScroller(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null;
  while (n) {
    const s = getComputedStyle(n).overflowY;
    if ((s === "auto" || s === "scroll") && n.scrollHeight > n.clientHeight + 4) return n;
    n = n.parentElement;
  }
  return null;
}

interface CardProps {
  plugin: MiniSheetPlugin;
  doc: RuleDoc;
  isOpen: boolean;
  q: string;
  titlePos: number[] | undefined;
  pinned: boolean;
  onToggle: () => void;
  onPin: () => void;
  checklistState: Record<string, boolean>;
  onToggleCheck: (key: string, value: boolean) => void;
}

function Card({ plugin, doc, isOpen, q, titlePos, pinned, onToggle, onPin, checklistState, onToggleCheck }: CardProps) {
  const bc = CONTENT_TYPES[doc.type].color;
  return (
    <div class={"mz-card" + (isOpen ? " is-open" : "")} style={{ "--bc": bc }} onClick={isOpen ? undefined : onToggle}>
      {isOpen && <span class="mz-card__accent" />}
      <div class="mz-card__head" onClick={isOpen ? onToggle : undefined}>
        <span class="mz-card__ic">
          <Icon id={refIconId(doc.icon)} />
        </span>
        <div class="mz-card__headmain">
          <div class="mz-card__title">{titlePos && titlePos.length ? hlFuzzy(doc.title, titlePos) : doc.title}</div>
          {isOpen ? (
            <div class="mz-card__metarow">
              <TypeBadge type={doc.type} mini />
            </div>
          ) : (
            <span class="mz-card__type">{CONTENT_TYPES[doc.type].label}</span>
          )}
        </div>
        <StarButton active={pinned} onToggle={onPin} />
        {isOpen && (
          <button
            class="mz-card__close"
            title="Collapse"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            ✕
          </button>
        )}
      </div>
      {isOpen ? (
        <div class="mz-card__body">
          <MetaChips meta={doc.meta} />
          <Blocks plugin={plugin} doc={doc} q={q} checklistState={checklistState} onToggleCheck={onToggleCheck} />
        </div>
      ) : (
        <p class="mz-card__sum">{hl(doc.summary, q)}</p>
      )}
    </div>
  );
}

interface MasonryBodyProps {
  plugin: MiniSheetPlugin;
  sections: MasonrySection[];
  open: string | null;
  setOpen: (id: string | null) => void;
  query: string;
  titlePos: Map<string, number[]>;
  pins: Set<string>;
  togglePin: (path: string) => void;
  checklistState: Record<string, boolean>;
  onToggleCheck: (key: string, value: boolean) => void;
}

export function MasonryBody({ plugin, sections, open, setOpen, query, titlePos, pins, togglePin, checklistState, onToggleCheck }: MasonryBodyProps) {
  const cells = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());
  const lastOpen = useRef(open);
  const lastQuery = useRef(query);
  const [, force] = useState(0);

  const reg = (id: string) => (el: HTMLElement | null) => {
    if (el) cells.current.set(id, el);
    else cells.current.delete(id);
  };
  const toggle = (id: string) => setOpen(open === id ? null : id);

  // masonry row-spans + FLIP slide; cascade only when `open` changed and the
  // query is unchanged (don't thrash on every keystroke)
  useLayoutEffect(() => {
    const map = cells.current;
    const animate = lastOpen.current !== open && lastQuery.current === query;
    lastOpen.current = open;
    lastQuery.current = query;
    map.forEach((cell, id) => {
      const card = cell.firstElementChild as HTMLElement | null;
      if (!card) return;
      cell.style.gridColumn = id === open ? "1 / -1" : "";
      const h = card.getBoundingClientRect().height;
      cell.style.gridRowEnd = "span " + Math.max(1, Math.ceil((h + GAP) / (ROW + GAP)));
    });
    const movers: { cell: HTMLElement; id: string; dx: number; dy: number; top: number }[] = [];
    if (animate)
      map.forEach((cell, id) => {
        const nr = cell.getBoundingClientRect();
        const old = prev.current.get(id);
        if (old) {
          const dx = old.left - nr.left;
          const dy = old.top - nr.top;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) movers.push({ cell, id, dx, dy, top: nr.top });
        }
      });
    if (movers.length && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      const minTop = Math.min(...movers.map((m) => m.top));
      const SPRING = "cubic-bezier(.34,1.28,.4,1)";
      movers.forEach(({ cell, id, dx, dy, top }) => {
        const lead = id === open;
        const delay = Math.min(150, (top - minTop) * 0.13);
        const dip = lead ? 1 : 0.962;
        cell.style.transition = "none";
        cell.style.transformOrigin = "50% 0";
        cell.style.transform = `translate(${dx}px, ${dy}px) scale(${dip})`;
        if (!lead) cell.style.opacity = "0.72";
        cell.style.zIndex = lead ? "3" : "1";
        requestAnimationFrame(() => {
          cell.style.transition = `transform .6s ${SPRING} ${delay}ms, opacity .4s ease ${delay}ms`;
          cell.style.transform = "translate(0,0) scale(1)";
          cell.style.opacity = "1";
        });
        const clear = (e: TransitionEvent) => {
          if (e.propertyName !== "transform") return;
          cell.style.zIndex = "";
          cell.style.transition = "";
          cell.style.transformOrigin = "";
          cell.style.opacity = "";
          cell.removeEventListener("transitionend", clear);
        };
        cell.addEventListener("transitionend", clear);
      });
    }
    const m = new Map<string, DOMRect>();
    map.forEach((cell, id) => m.set(id, cell.getBoundingClientRect()));
    prev.current = m;
  });

  // recompute spans once fonts load / on resize
  useEffect(() => {
    const f = () => force((x) => x + 1);
    if (document.fonts) void document.fonts.ready.then(f);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  // keep the opened card in view
  useEffect(() => {
    if (!open) return;
    const cell = cells.current.get(open);
    if (!cell) return;
    const sc = findScroller(cell);
    if (!sc) return;
    const cr = cell.getBoundingClientRect();
    const sr = sc.getBoundingClientRect();
    if (cr.top < sr.top + 56 || cr.bottom > sr.bottom - 8) {
      sc.scrollTo({ top: Math.max(0, cr.top - sr.top + sc.scrollTop - 66), behavior: "smooth" });
    }
  }, [open]);

  return (
    <>
      {sections.map((sec) => (
        <section key={sec.label}>
          <div class={"r-cat" + (sec.results ? " r-cat--results" : "")}>
            {sec.results && <StarGlyph />}
            {sec.label}
            <span class="r-cat__count">{sec.docs.length}</span>
          </div>
          <div class="mz-grid">
            {sec.docs.map((d, i) => (
              <div class="mz-cell r-anim" style={{ "--i": i }} key={d.path} ref={reg(d.path)}>
                <Card
                  plugin={plugin}
                  doc={d}
                  isOpen={open === d.path}
                  q={query}
                  titlePos={titlePos.get(d.path)}
                  pinned={pins.has(d.path)}
                  onToggle={() => toggle(d.path)}
                  onPin={() => togglePin(d.path)}
                  checklistState={checklistState}
                  onToggleCheck={onToggleCheck}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
