import { useState } from "preact/hooks";
import {
  CLASS_NAMES,
  getClassStats,
  totalBab,
  totalLevel,
} from "../../../calc/class-stats";
import { isPartialMechanics, listArchetypes } from "../../../data/archetypes";
import { type ClassEntry } from "../../../types/character";
import { Icon } from "../../common/Icon";
import { UI } from "../glyphs";
import { Check, Num, Sec, Sel } from "../primitives";
import { type SectionProps, setter } from "./shared";

export function ClassesSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const [archOpen, setArchOpen] = useState<number | null>(null);
  const classes = character.classes;
  const update = (idx: number, patch: Partial<ClassEntry>) =>
    set(
      "classes",
      classes.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );

  return (
    <Sec
      icon="ra-relic-blade"
      title="Classes &amp; Levels"
      desc={`Level ${totalLevel(classes)} · BAB +${totalBab(classes)}`}
    >
      {classes.map((entry, idx) => {
        const stats = getClassStats(entry.className);
        const archetypes = listArchetypes(entry.className);
        const selected = entry.archetypeKeys ?? [];
        return (
          <div class="classrow" key={idx}>
            <div class="classrow__main">
              <Sel
                value={entry.className}
                options={CLASS_NAMES}
                onChange={(v) => update(idx, { className: v })}
              />
              <Num
                value={entry.level}
                onChange={(v) => update(idx, { level: v })}
              />
              <span class="classrow__stat">
                {stats ? `${stats.hitDie} · ×${stats.bab}` : "—"}
              </span>
              <button
                class="iconbtn"
                aria-label={`Remove ${entry.className}`}
                onClick={() =>
                  set(
                    "classes",
                    classes.filter((_, i) => i !== idx),
                  )
                }
              >
                <UI.x />
              </button>
            </div>
            {archetypes.length > 0 && (
              <div class="archrow">
                <span class="archrow__lbl">Archetypes</span>
                {selected.map((id) => {
                  const a = archetypes.find((x) => x.id === id);
                  return (
                    <span key={id} class="chip">
                      {a?.name ?? id}
                    </span>
                  );
                })}
                <button
                  class="btn btn--ghost btn--sm"
                  onClick={() => setArchOpen(archOpen === idx ? null : idx)}
                >
                  {archOpen === idx ? "Done" : "Edit"}
                </button>
              </div>
            )}
            {archOpen === idx && (
              <div class="archlist">
                {archetypes.map((a) => {
                  const checked = selected.includes(a.id);
                  return (
                    <label
                      class="skillrow"
                      key={a.id}
                      style={{ cursor: "pointer" }}
                    >
                      <Check
                        value={checked}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((k) => k !== a.id)
                            : [...selected, a.id];
                          update(idx, {
                            archetypeKeys: next.length > 0 ? next : undefined,
                          });
                        }}
                      />
                      <span class="skillrow__name" title={a.description}>
                        {a.name}
                      </span>
                      {isPartialMechanics(a.id, a.classKey) && (
                        <span class="chip">partial</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, margin: "8px 0 4px" }}>
        <button
          class="btn btn--ghost btn--sm"
          onClick={() =>
            set("classes", [
              ...classes,
              { className: CLASS_NAMES[0], level: 1 },
            ])
          }
        >
          <UI.plus /> Add class
        </button>
      </div>
      <div class="miniheads">
        Apply class defaults — runs only when tapped, never overwrites your
        edits
      </div>
      <div class="synccards">
        <button
          class="synccard"
          onClick={() => store.applyClassSkills(character.id)}
        >
          <div class="synccard__t">
            <Icon id="ra-targeted" /> Class skills
          </div>
          <div class="synccard__d">Flag class skills on your skill rows.</div>
        </button>
        <button
          class="synccard"
          onClick={() => store.syncClassResources(character.id)}
        >
          <div class="synccard__t">
            <Icon id="ra-round-bottom-flask" /> Resource pools
          </div>
          <div class="synccard__d">Add class pools like Lay on Hands.</div>
        </button>
        <button
          class="synccard"
          onClick={() => store.syncClassQuickActions(character.id)}
        >
          <div class="synccard__t">
            <Icon id="ra-lightning-bolt" /> Quick actions
          </div>
          <div class="synccard__d">Add class actions like Smite Evil.</div>
        </button>
      </div>
    </Sec>
  );
}
