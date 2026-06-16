/** Combat-tab energy-resistance chips. Reads the COMPUTED map (manual values
 *  merged with racial/gear energyRes.* modifiers), not the raw stored field. */
export function EnergyRes({
  energyRes,
}: {
  energyRes: Record<string, number>;
}) {
  const entries = Object.entries(energyRes).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  return (
    <div class="ms-energy">
      {entries.map(([kind, value]) => (
        <span class={`ms-energy__item ms-energy__item--${kind}`} key={kind}>
          {value}
        </span>
      ))}
    </div>
  );
}
