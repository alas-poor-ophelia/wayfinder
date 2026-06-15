import type { ComputedCharacter } from "../../calc";

/** Ability-color-coded skill list (visual parity with the old skills tab). */
export function SkillsTab({ computed }: { computed: ComputedCharacter }) {
  return (
    <div class="ms-skills">
      {computed.skills.map((row) => {
        const sign = row.total >= 0 ? `+${row.total}` : `${row.total}`;
        const abilitySign =
          (computed.mods[row.ability] >= 0 ? "+" : "") +
          computed.mods[row.ability];
        const otherSign =
          row.otherMod === 0
            ? "0"
            : row.otherMod > 0
              ? `+${row.otherMod}`
              : `${row.otherMod}`;
        return (
          <div class={`ms-skill ms-skill--${row.ability}`} key={row.name}>
            <span class="ms-skill__icon" />
            <span class="ms-skill__name">{row.name}</span>
            <span class="ms-skill__total">{sign}</span>
            <span class="ms-skill__mods">
              <span class="ms-skill__class">{row.classSkill ? "✓" : " "}</span>
              Ranks: {row.ranks} / {row.ability.toUpperCase()}: {abilitySign} /
              Other: {otherSign}
              {row.usesPerform ? " (uses Perform)" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
