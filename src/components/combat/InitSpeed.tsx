import type { ComputedCharacter } from "../../calc";
import type { CharacterRecord } from "../../types/character";

interface InitSpeedProps {
  character: CharacterRecord;
  computed: ComputedCharacter;
}

export function InitSpeed({ character, computed }: InitSpeedProps) {
  const mult = computed.movementMultiplier;
  const baseSpeed = parseInt(character.speed) || 0;
  const speed = mult === 1 ? character.speed : `${Math.floor(baseSpeed * mult)}ft`;
  return (
    <div class="ms-initspeed">
      <span class="ms-init">{computed.initiative}</span>
      <span class="ms-speed">{speed.toUpperCase()}</span>
    </div>
  );
}
