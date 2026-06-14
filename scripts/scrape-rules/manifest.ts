/**
 * Curated AoN rules pages to seed a vault's Reference tab. Kept Adarin-focused
 * (a martial paladin/skald/monk): the combat maneuvers and core combat actions
 * she actually reaches for. Each entry resolves to
 * `Rules.aspx?Name=<name>&Category=<category>`. Grapple is intentionally absent
 * — the hand-authored flowchart demo note owns that title.
 */
export interface RuleSource {
  name: string;
  category: string;
}

export const MANIFEST: RuleSource[] = [
  { name: "Bull Rush", category: "Combat" },
  { name: "Disarm", category: "Combat" },
  { name: "Overrun", category: "Combat" },
  { name: "Sunder", category: "Combat" },
  { name: "Trip", category: "Combat" },
  { name: "Aid Another", category: "Combat" },
  { name: "Charge", category: "Combat" },
  { name: "Fighting Defensively", category: "Combat" },
  { name: "Flanking", category: "Combat" },
  { name: "Cover", category: "Combat" },
  { name: "Concealment", category: "Combat" },
  { name: "Two-Weapon Fighting", category: "Combat" },
];

export function ruleUrl(src: RuleSource): string {
  const p = (s: string) => encodeURIComponent(s);
  return `https://www.aonprd.com/Rules.aspx?Name=${p(src.name)}&Category=${p(src.category)}`;
}
