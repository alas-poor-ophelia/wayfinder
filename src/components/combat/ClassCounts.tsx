import type { ComputedCharacter } from "../../calc";

/** Display labels for the build-stat counts in ComputedCharacter.featureCounts.
 *  Unknown ids fall back to the raw key. */
const COUNT_LABELS: Record<string, string> = {
  arcanistExploits: "Arcanist Exploits",
};

/** Read-only count chips for class build-stats that aren't daily pools (e.g.
 *  arcanist exploits known). Renders nothing when there are no positive
 *  counts, so non-arcanists see no change. */
export function ClassCounts({
  featureCounts,
}: {
  featureCounts: ComputedCharacter["featureCounts"];
}) {
  const entries = Object.entries(featureCounts).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;
  return (
    <div class="ms-class-counts">
      {entries.map(([id, n]) => (
        <span key={id} class="ms-class-count">
          <span class="ms-class-count__label">{COUNT_LABELS[id] ?? id}</span>
          <span class="ms-class-count__value">{n}</span>
        </span>
      ))}
    </div>
  );
}
