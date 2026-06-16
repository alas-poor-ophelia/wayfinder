import { type AbilityKey } from "../../../types/character";
import { Icon } from "../../common/Icon";
import { InfoTip, Num, StatGrid } from "../primitives";
import {
  ABIL,
  hpAverage,
  hpBreakdown,
  type SectionProps,
  setter,
} from "./shared";

/** Base Abilities (75%) + Hit Points (25%) on one row. */
export function VitalsSection({ store, character }: SectionProps) {
  const set = setter(store, character);
  const avg = hpAverage(character);
  // write the PF average to max; carry current along when it's at full (or 0),
  // otherwise just clamp it under the new max
  const applyAverage = () => {
    const atFull =
      character.hp.current === 0 || character.hp.current === character.hp.max;
    set("hp.max", avg);
    set("hp.current", atFull ? avg : Math.min(character.hp.current, avg));
  };
  return (
    <section class="sec">
      <div class="vitals">
        <div class="vitals__abil">
          <header class="sec__head">
            <span class="sec__ic">
              <Icon id="ra-knight-helmet" />
            </span>
            <span class="sec__title">Base Abilities</span>
            <span class="sec__desc">before race, items &amp; buffs</span>
          </header>
          <StatGrid
            items={ABIL}
            get={(k) => character.baseAbilities[k as AbilityKey]}
            set={(k, v) => set(`baseAbilities.${k}`, v)}
          />
        </div>
        <div class="vitals__hp">
          <header class="sec__head">
            <span class="sec__ic">
              <Icon id="ra-shield" />
            </span>
            <span class="sec__title">Hit Points</span>
            <InfoTip text={hpBreakdown(character)} />
          </header>
          <div class="vitals__hpfields">
            <label class="vital-f">
              <span>Maximum</span>
              <Num
                value={character.hp.max}
                onChange={(v) => set("hp.max", v)}
              />
            </label>
            <label class="vital-f">
              <span>Current</span>
              <Num
                value={character.hp.current}
                onChange={(v) => set("hp.current", v)}
              />
            </label>
          </div>
          {character.classes.length > 0 && avg > 0 && (
            <button
              class="btn btn--ghost btn--sm vitals__hpavg"
              onClick={applyAverage}
              title="Set max HP to the Pathfinder average for these classes"
            >
              Use average ({avg})
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
