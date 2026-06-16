import { type AbilityKey } from "../../../types/character";
import { Icon } from "../../common/Icon";
import { InfoTip, Num, StatGrid } from "../primitives";
import { ABIL, hpBreakdown, type SectionProps, setter } from "./shared";

/** Base Abilities (75%) + Hit Points (25%) on one row. */
export function VitalsSection({ store, character }: SectionProps) {
  const set = setter(store, character);
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
        </div>
      </div>
    </section>
  );
}
