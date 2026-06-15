import { Fragment } from "preact";
import { useRef, useState } from "preact/hooks";
import { CONDITION_NAMES } from "../../calc/conditions";
import { BUFF_DEFS } from "../../data/buffs";
import { BUFF_EFF, CONDITION_META } from "../../data/adjust-effects";
import type { ComputedCharacter } from "../../calc";
import type { MiniSheetStore } from "../../state/store";
import type { CharacterRecord } from "../../types/character";
import { ABILITY_KEYS } from "../../types/character";
import { AdjIcon } from "./icons";
import { XpTracker } from "./XpTracker";

interface AdjustmentsTabProps {
  store: MiniSheetStore;
  character: CharacterRecord;
  computed: ComputedCharacter;
}

interface ActiveEntry {
  key: string;
  label: string;
  eff: string;
  kind: "neg" | "pos";
  remove: () => void;
}

export function AdjustmentsTab({
  store,
  character,
  computed,
}: AdjustmentsTabProps) {
  const set = (path: string, value: unknown) =>
    store.setCharacterField(character.id, path, value);

  const toggleIn = (field: "conditions" | "buffs", name: string) => {
    const list = character[field];
    set(
      field,
      list.includes(name) ? list.filter((x) => x !== name) : [...list, name],
    );
  };

  const rest = () => {
    set(
      "hp.current",
      Math.min(
        computed.hpMaxEffective,
        character.hp.current + computed.totalLevel,
      ),
    );
    // panache refills with the rest of the pools (a resources[] entry since v4)
    character.resources.forEach((pool, idx) => {
      set(`resources.${idx}.current`, pool.max);
    });
  };

  // UI-only collapse state (not persisted).
  const [activeOpen, setActiveOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(true);
  const [buffOpen, setBuffOpen] = useState(true);
  const [showStats, setShowStats] = useState(false);

  // Rest pulse-ring (replay the keyframe by toggling the class).
  const restRef = useRef<HTMLButtonElement>(null);
  const fireRest = () => {
    rest();
    const el = restRef.current;
    if (el) {
      el.classList.remove("is-pulse");
      void el.offsetWidth;
      el.classList.add("is-pulse");
    }
  };

  const isPc = character.characterType === "pc";
  const customBuffs = character.customBuffs ?? [];

  const activeConditions = CONDITION_NAMES.filter((c) =>
    character.conditions.includes(c),
  );
  const activeRegistryBuffs = BUFF_DEFS.filter((d) =>
    character.buffs.includes(d.key),
  );
  const activeCustomBuffs = customBuffs.filter((b) =>
    character.buffs.includes(b.id),
  );
  const buffActiveCount = activeRegistryBuffs.length + activeCustomBuffs.length;

  // Now Active tray: conditions (neg) then buffs (pos), in registry order.
  const active: ActiveEntry[] = [
    ...activeConditions.map((c) => ({
      key: c,
      label: CONDITION_META[c]?.label ?? c,
      eff: CONDITION_META[c]?.eff ?? "",
      kind: "neg" as const,
      remove: () => toggleIn("conditions", c),
    })),
    ...activeRegistryBuffs.map((d) => ({
      key: d.key,
      label: d.name,
      eff: BUFF_EFF[d.key] ?? "",
      kind: "pos" as const,
      remove: () => toggleIn("buffs", d.key),
    })),
    ...activeCustomBuffs.map((b) => ({
      key: b.id,
      label: b.name,
      eff: "",
      kind: "pos" as const,
      remove: () => toggleIn("buffs", b.id),
    })),
  ];

  const adj = character.adjustments;

  const numInput = (
    value: number,
    onChange: (v: number) => void,
    min?: number,
  ) => (
    <input
      class="ms-adjust__input"
      type="number"
      placeholder="0"
      min={min}
      value={value || ""}
      onInput={(e) => {
        const v = (e.target as HTMLInputElement).value;
        onChange(v === "" ? 0 : Number(v));
      }}
    />
  );

  return (
    <div class="ms-adjust">
      {/* Campaign-day header: Rest fused with XP */}
      <div class={`ms-adjust__day${isPc ? "" : " is-rest-only"}`}>
        <div class="ms-adjust__day-top">
          <button ref={restRef} class="ms-adjust__rest" onClick={fireRest}>
            <AdjIcon name="moon" size={18} />
            Rest
            <span class="ms-adjust__rest-sub">HP · POOLS</span>
          </button>
          {isPc && (
            <XpTracker
              store={store}
              character={character}
              computed={computed}
            />
          )}
        </div>
      </div>

      {/* Now Active tray — collapsible, collapsed by default */}
      <div class={`ms-adjust__active${activeOpen ? " is-open" : ""}`}>
        <div
          class="ms-adjust__active-head"
          role="button"
          tabIndex={0}
          onClick={() => setActiveOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveOpen((o) => !o);
            }
          }}
        >
          <AdjIcon name="bolt" size={13} />
          Now Active
          {active.length > 0 && (
            <span class="ms-adjust__pill">{active.length}</span>
          )}
          <span class="ms-adjust__active-chev">
            <AdjIcon name="chev" size={14} />
          </span>
        </div>
        {activeOpen && (
          <div class="ms-adjust__active-body">
            {active.length === 0 ? (
              <div class="ms-adjust__active-empty">
                <div>
                  <AdjIcon name="leaf" size={22} />
                </div>
                Nothing affecting you right now.
              </div>
            ) : (
              <div class="ms-adjust__active-list">
                {active.map((d) => (
                  <div
                    key={d.key}
                    class="ms-adjust__token"
                    style={`--tint:${d.kind === "neg" ? "var(--adj-red-lit)" : "var(--adj-green)"}`}
                  >
                    <span class="ms-adjust__token-bar" />
                    <div class="ms-adjust__token-main">
                      <div class="ms-adjust__token-name">{d.label}</div>
                      {d.eff && <div class="ms-adjust__token-eff">{d.eff}</div>}
                    </div>
                    <button
                      class="ms-adjust__token-x"
                      title="Remove"
                      onClick={d.remove}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conditions — collapsible (default open) */}
      <CollSection
        icon="skull"
        title="Conditions"
        open={condOpen}
        onToggle={() => setCondOpen((o) => !o)}
        activeCount={activeConditions.length}
      >
        <div class="ms-adjust__chips">
          {CONDITION_NAMES.map((name) => (
            <Chip
              key={name}
              label={CONDITION_META[name]?.label ?? name}
              eff={CONDITION_META[name]?.eff ?? ""}
              kind="neg"
              on={character.conditions.includes(name)}
              onClick={() => toggleIn("conditions", name)}
            />
          ))}
        </div>
      </CollSection>

      {/* Buffs — collapsible (default open) */}
      <CollSection
        icon="sparkles"
        title="Buffs"
        open={buffOpen}
        onToggle={() => setBuffOpen((o) => !o)}
        activeCount={buffActiveCount}
      >
        <div class="ms-adjust__chips">
          {BUFF_DEFS.map((def) => (
            <Chip
              key={def.key}
              label={def.name}
              eff={BUFF_EFF[def.key] ?? ""}
              kind="pos"
              on={character.buffs.includes(def.key)}
              onClick={() => toggleIn("buffs", def.key)}
            />
          ))}
          {customBuffs.map((buff) => (
            <Chip
              key={buff.id}
              label={buff.name}
              eff=""
              kind="pos"
              on={character.buffs.includes(buff.id)}
              onClick={() => toggleIn("buffs", buff.id)}
            />
          ))}
        </div>
      </CollSection>

      {/* One-off Adjustment (always open) */}
      <section class="ms-adjust__sec">
        <div class="ms-adjust__sechead">
          <span class="ms-adjust__sechead-ic">
            <AdjIcon name="sliders" size={14} />
          </span>
          One-off Adjustment
          <span class="ms-adjust__sechead-rule" />
        </div>
        <div class="ms-adjust__quick">
          <div class="ms-adjust__trio">
            <label class="ms-adjust__field">
              <span class="ms-adjust__field-label">Attack</span>
              {numInput(adj.atk, (v) => set("adjustments.atk", v))}
            </label>
            <label class="ms-adjust__field">
              <span class="ms-adjust__field-label">Damage</span>
              {numInput(adj.dmg, (v) => set("adjustments.dmg", v))}
            </label>
            <label class="ms-adjust__field">
              <span class="ms-adjust__field-label">AC</span>
              {numInput(adj.ac, (v) => set("adjustments.ac", v))}
            </label>
          </div>

          <label class="ms-adjust__negrow">
            <span class="ms-adjust__field-label">Negative levels</span>
            {numInput(
              adj.negativeLevels,
              (v) => set("adjustments.negativeLevels", Math.max(0, v)),
              0,
            )}
          </label>

          <button
            class="ms-adjust__more"
            onClick={() => setShowStats((s) => !s)}
          >
            <AdjIcon name={showStats ? "chev" : "plus"} size={12} />
            {showStats ? "Hide ability scores" : "Adjust ability scores"}
          </button>

          {showStats && (
            <div class="ms-adjust__statgrid">
              <span />
              <span class="ms-adjust__statgrid-h">Other</span>
              <span class="ms-adjust__statgrid-h">Drain</span>
              <span class="ms-adjust__statgrid-h">Damage</span>
              {ABILITY_KEYS.map((key) => (
                <Fragment key={key}>
                  <span class="ms-adjust__statgrid-ab">
                    {key.toUpperCase()}
                  </span>
                  {numInput(adj.ability[key] ?? 0, (v) =>
                    set(`adjustments.ability.${key}`, v),
                  )}
                  {numInput(adj.drain[key] ?? 0, (v) =>
                    set(`adjustments.drain.${key}`, v),
                  )}
                  {numInput(adj.damage[key] ?? 0, (v) =>
                    set(`adjustments.damage.${key}`, v),
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* Collapsible Codex section header + body (Conditions / Buffs). */
function CollSection({
  icon,
  title,
  open,
  onToggle,
  activeCount,
  children,
}: {
  icon: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  activeCount: number;
  children: preact.ComponentChildren;
}) {
  return (
    <section class="ms-adjust__sec">
      <button
        class="ms-adjust__sechead ms-adjust__sechead--btn"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span class="ms-adjust__sechead-ic">
          <AdjIcon name={icon} size={14} />
        </span>
        {title}
        <span class="ms-adjust__sechead-rule" />
        {!open && activeCount > 0 && (
          <span class="ms-adjust__sechead-active">{activeCount}</span>
        )}
        <span class={`ms-adjust__sechead-chev${open ? " is-open" : ""}`}>
          <AdjIcon name="chev" size={13} />
        </span>
      </button>
      {open && <div class="ms-adjust__secbody">{children}</div>}
    </section>
  );
}

/* Condition / buff chip. */
function Chip({
  label,
  eff,
  kind,
  on,
  onClick,
}: {
  label: string;
  eff: string;
  kind: "neg" | "pos";
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      class={`ms-adjust__chip ms-adjust__chip--${kind}${on ? " is-on" : ""}`}
      title={eff || undefined}
      onClick={onClick}
    >
      <span class="ms-adjust__chip-dot" />
      {label}
    </button>
  );
}
