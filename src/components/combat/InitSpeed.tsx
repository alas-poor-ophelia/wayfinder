import type { ComputedCharacter } from "../../calc";

interface InitSpeedProps {
  computed: ComputedCharacter;
}

export function InitSpeed({ computed }: InitSpeedProps) {
  return (
    <div class="ms-initspeed">
      <span class="ms-init">{computed.initiative}</span>
      <span
        class="ms-speed"
        title={computed.speed.notes.join("\n") || undefined}
      >
        {computed.speed.text.toUpperCase()}
      </span>
    </div>
  );
}
