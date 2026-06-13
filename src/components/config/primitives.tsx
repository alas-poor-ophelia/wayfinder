/**
 * Flat native-Obsidian setting-row primitives for the config redesign:
 * Sec (collapsible section), Row, Txt, Num, Sel, Seg, Toggle, Check,
 * InfoTip, StatGrid. Ported from the design handoff's `sections.jsx`
 * field primitives; class names match _config.scss.
 */
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Icon } from "../common/Icon";
import { UI } from "./glyphs";

export function Sec({
  icon,
  title,
  desc,
  children,
  defaultOpen = true,
  collapsible = true,
}: {
  icon: string;
  title: string;
  desc?: string;
  children: ComponentChildren;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section class="sec">
      <header
        class={`sec__head${collapsible ? " is-clickable" : ""}`}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <span class="sec__ic">
          <Icon id={icon} />
        </span>
        <span class="sec__title">{title}</span>
        {desc && <span class="sec__desc">{desc}</span>}
        {collapsible && (
          <span class={`sec__chev${open ? " is-open" : ""}`}>
            <UI.chev />
          </span>
        )}
      </header>
      {open && <div class="sec__body">{children}</div>}
    </section>
  );
}

export function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: ComponentChildren;
}) {
  return (
    <label class="f">
      <span class="f__label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <span class="f__control">{children}</span>
    </label>
  );
}

export function Txt({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      class="inp"
      type="text"
      value={value}
      placeholder={placeholder}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
    />
  );
}

export function Num({
  value,
  width,
  onChange,
}: {
  value: number;
  width?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      class="num"
      type="number"
      value={value}
      style={width ? { width } : undefined}
      onInput={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        if (raw === "") return;
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

type Opt = string | { value: string; label: string };
const optValue = (o: Opt) => (typeof o === "string" ? o : o.value);
const optLabel = (o: Opt) => (typeof o === "string" ? o : o.label);

export function Sel({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      class="sel"
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
    >
      {options.map((o) => (
        <option key={optValue(o)} value={optValue(o)} selected={optValue(o) === value}>
          {optLabel(o)}
        </option>
      ))}
    </select>
  );
}

export function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
}) {
  return (
    <div class="seg">
      {options.map((o) => (
        <button
          key={optValue(o)}
          class={value === optValue(o) ? "is-active" : ""}
          onClick={() => onChange(optValue(o))}
        >
          {optLabel(o)}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      class={`tog${value ? " is-on" : ""}`}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    />
  );
}

export function Check({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      class={`chk${value ? " is-on" : ""}`}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      {value && <UI.check />}
    </button>
  );
}

export function InfoTip({ text }: { text: string }) {
  // No aria-label/title: Obsidian renders its own native tooltip for any
  // element carrying one, which would double up with our styled bubble.
  // The breakdown text lives in the .infotip__bub node, readable on its own.
  return (
    <span class="infotip" tabIndex={0} role="note">
      <UI.info />
      <span class="infotip__bub">{text}</span>
    </span>
  );
}

export function StatGrid({
  items,
  get,
  set,
  cols = 3,
}: {
  items: [string, string][];
  get: (key: string) => number;
  set: (key: string, value: number) => void;
  cols?: 2 | 3;
}) {
  return (
    <div class={cols === 2 ? "grid2" : "grid3"}>
      {items.map(([key, label]) => (
        <Row key={key} label={label}>
          <Num value={get(key)} onChange={(v) => set(key, v)} />
        </Row>
      ))}
    </div>
  );
}
