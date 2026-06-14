/**
 * Bundled metamagic feat catalog (scraped from aonprd — see
 * scripts/scrape-metamagic/). Drives the Spell Database's Metamagic tab and,
 * via the picker strings, the spellbook's metamagic adjustment math.
 */
import metamagicJson from "./metamagic.json";

export interface MetamagicFeat {
  id: string;
  name: string;
  /** spell-slot level increase; "var" when the feat's increase varies */
  adj: number | "var";
  desc: string;
  source: string;
  prerequisite: string;
}

export const METAMAGIC_FEATS = metamagicJson as unknown as MetamagicFeat[];

/**
 * Canonical display string used by the spellbook metamagic pickers and stored
 * in preparations / activeMetamagics / globalMetamagic. MUST match the legacy
 * five byte-for-byte ("Still Spell (+1 level)", "Empower Spell (+2 levels)", …)
 * so existing data and the calc characterization tests keep working.
 */
export function metamagicPickerString(feat: MetamagicFeat): string {
  if (feat.adj === "var") return `${feat.name} (variable)`;
  return `${feat.name} (+${feat.adj} level${feat.adj === 1 ? "" : "s"})`;
}

/** Short label for the adjustment pill: "+2 levels" / "variable". */
export function metamagicAdjLabel(feat: MetamagicFeat): string {
  if (feat.adj === "var") return "variable";
  return `+${feat.adj} level${feat.adj === 1 ? "" : "s"}`;
}
