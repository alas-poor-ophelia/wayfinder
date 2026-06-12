/**
 * Scraped archetype data shapes (JSON-serializable; produced by
 * scripts/scrape-archetypes/, consumed by src/data/archetypes/).
 *
 * The scraped layer carries names, rules text, and the replaces/alters
 * graph. It deliberately carries NO math — resource formulas are functions
 * and live in the hand-authored mechanics layer (src/data/archetypes/
 * mechanics/). See ArchetypeMechanics in src/data/types.ts.
 */

/** A reference to a base-class feature, normalized against the class table. */
export interface FeatureRef {
  /** Slug of the base feature ("smite-evil"), or best-effort slug if unmatched. */
  feature: string;
  /**
   * Present when the ref targets specific instances of a leveled feature
   * ("mercies gained at 3rd, 9th, and 15th level" → [3, 9, 15]). A ref with
   * levels never suppresses a whole pool.
   */
  levels?: number[];
  /** The original sentence fragment, kept as an audit trail. */
  raw: string;
  /** True when the slug didn't resolve against the base-class feature table. */
  unmatched?: boolean;
}

export interface ArchetypeFeature {
  name: string;
  type?: "Ex" | "Su" | "Sp";
  /** First "At Nth level" mentioned in the text, when present. */
  level?: number;
  text: string;
  replaces: FeatureRef[];
  alters: FeatureRef[];
}

export interface ArchetypeDef {
  /** slugified name, unique within the class ("gray-paladin"). */
  id: string;
  /** Matches ClassData.key exactly ("Paladin"). */
  classKey: string;
  name: string;
  source: string;
  /** Intro paragraph from the detail page. */
  description: string;
  /**
   * The list page's "Replaces" column entries (display/cross-check only —
   * AoN conflates replaced and altered features in this column).
   */
  listAffects: string[];
  features: ArchetypeFeature[];
}

/** A row of the base class's progression-table Special column. */
export interface BaseClassFeature {
  id: string;
  name: string;
  /** First level at which the feature appears. */
  level: number;
}

/** One scraped file per class: src/data/archetypes/<class>.json. */
export interface ClassArchetypeFile {
  classKey: string;
  baseFeatures: BaseClassFeature[];
  archetypes: ArchetypeDef[];
}
