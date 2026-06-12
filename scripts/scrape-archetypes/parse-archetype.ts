/**
 * Archetype detail page parser: ArchetypeDisplay.aspx?FixedName=<Class Name>.
 *
 * The whole article is one rendered span:
 *   <h1 class="title">Name</h1><b>Source</b> <a><i>Book pg. N</i></a><br />
 *   intro text<br /><br /><b>Feature (Su)</b>:  text<br /><br /><b>...
 * Feature blocks split on the double-<br /> immediately before a <b> header;
 * double-<br /> inside a feature without a following header stays put.
 */
import type {
  ArchetypeDef,
  ArchetypeFeature,
  BaseClassFeature,
} from "../../src/types/archetypes";
import {
  cleanCell,
  detailBlock,
  parseSource,
  slugify,
} from "../scrape-equipment/common";
import { parseFeatureRefs } from "./parse-replaces";

const FEATURE_HEADER_RE = /^<b>([^<]+?)<\/b>:?\s*/;
const TYPE_RE = /\s*\(\s*(Ex|Su|Sp)[^)]*\)\s*/;
const AT_LEVEL_RE = /At (\d+)(?:st|nd|rd|th) level/;

export function parseArchetypePage(
  html: string,
  classKey: string,
  baseFeatures: BaseClassFeature[]
): ArchetypeDef | null {
  const block = detailBlock(html);
  if (!block) return null;

  const nameMatch = /<h1 class="title">(?:<img[^>]*>)?\s*([^<]+)<\/h1>/.exec(block);
  if (!nameMatch) return null;
  const name = cleanCell(nameMatch[1]);

  const segments = block.split(/<br \/>\s*<br \/>\s*(?=<b>)/);

  // Intro: first segment, after the <br /> that ends the Source line.
  const head = segments[0];
  const sourceIdx = head.indexOf("<b>Source</b>");
  const introStart = head.indexOf("<br />", sourceIdx >= 0 ? sourceIdx : 0);
  const description = introStart >= 0 ? cleanCell(head.slice(introStart + 6)) : "";

  const features: ArchetypeFeature[] = [];
  for (const segment of segments.slice(1)) {
    const header = FEATURE_HEADER_RE.exec(segment);
    if (!header) continue;
    let featureName = cleanCell(header[1]).replace(/:$/, "").trim();
    let type: ArchetypeFeature["type"];
    const typeMatch = TYPE_RE.exec(featureName);
    if (typeMatch) {
      type = typeMatch[1] as ArchetypeFeature["type"];
      featureName = featureName.replace(TYPE_RE, " ").replace(/\s+/g, " ").trim();
    }
    const text = cleanCell(segment.slice(header[0].length));
    const levelMatch = AT_LEVEL_RE.exec(text);
    const refs = parseFeatureRefs(text, baseFeatures);
    features.push({
      name: featureName,
      ...(type ? { type } : {}),
      ...(levelMatch ? { level: Number(levelMatch[1]) } : {}),
      text,
      replaces: refs.replaces,
      alters: refs.alters,
    });
  }

  return {
    id: slugify(name),
    classKey,
    name,
    source: parseSource(block),
    description,
    listAffects: [], // filled from the index grid by the caller
    features,
  };
}
