import { POW_CLASSES } from "../../../data/maneuvers";
import { setInitiatingClass } from "../../../state/maneuver-actions";
import { Sec } from "../primitives";
import { type SectionProps } from "./shared";

const CLASS_OPTIONS = Object.values(POW_CLASSES);

/**
 * Path of War config: choose the initiating class (which creates the
 * maneuverbook with that class's initiating stat), or "None" to remove it.
 * Maneuvers are then managed from the Maneuvers tab + database.
 */
export function ManeuversSection({ store, character }: SectionProps) {
  const book = character.maneuverbook;
  const current = book?.initiatingClass ?? "";
  const meta = CLASS_OPTIONS.find((c) => c.key === current);

  return (
    <Sec icon="ra-crossed-swords" title="Path of War">
      <p class="help" style={{ marginTop: 2 }}>
        Make this character a martial initiator. Maneuvers known, readied, and
        stances are managed from the Maneuvers tab.
      </p>
      <div class="respool" style={{ borderBottom: 0 }}>
        <label class="help" style={{ marginRight: 8 }}>
          Initiating class
        </label>
        <select
          class="inp"
          value={current}
          onChange={(e) =>
            setInitiatingClass(
              store,
              character,
              (e.target as HTMLSelectElement).value,
            )
          }
        >
          <option value="">None</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {meta && (
        <p class="help" style={{ marginTop: 6 }}>
          Initiating stat: <b>{meta.stat.toUpperCase()}</b>. {meta.recovery}
        </p>
      )}
    </Sec>
  );
}
