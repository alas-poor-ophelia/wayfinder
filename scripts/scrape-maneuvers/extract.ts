/**
 * d20pfsrd Path of War discipline page -> structured maneuver records.
 *
 * Unlike AoN (one entity per display page, content in
 * #MainContent_DetailedOutput), d20pfsrd is WordPress: every discipline page
 * holds ALL its maneuvers in `.entry-content`, each delimited by an <h4>
 * heading followed by sibling <p> stat lines and prose until the next heading.
 *
 * The layout has real inconsistencies across disciplines (the scout's trap
 * list), all handled here:
 *  - maneuver name lives in `<h4 id="slug">Name</h4>` OR `<h4><a>Name</a></h4>`
 *  - Discipline + Level share one line: "Discipline: X (Type); Level: N"
 *  - the type (Strike/Boost/Counter/Stance) is the parenthetical on that line
 *  - level group headings sit at h2 OR h3, text "Nth Level[ ...]"
 *  - a "DESCRIPTION" separator paragraph is present on some maneuvers, absent
 *    on others — so prose is "everything after the last recognised stat line"
 *  - a table-of-contents and per-level summary tables precede the h4 blocks
 *    (skipped: they are not inside any maneuver block), and footer noise
 *    (Discuss!/Discord/store) trails the last maneuver (filtered out)
 *
 * Pure TS over node-html-parser, matching src/rules/scrape.ts conventions.
 */
import { parse, NodeType, type HTMLElement, type Node } from "node-html-parser";

export type ManeuverType = "Strike" | "Boost" | "Counter" | "Stance";

export interface ManeuverRecord {
  name: string;
  discipline: string;
  level: number;
  type: ManeuverType;
  action: string;
  range: string;
  target: string;
  duration: string;
  save: string;
  prerequisites: string;
  markdown: string;
  /** book of origin, from the page's OGL Section 15 credit (see extractSource) */
  source: string;
}

/**
 * OGL Section 15 → book of origin. The §15 block lists the whole OGL chain
 * (SRD → Pathfinder → Psionics → Path of War → Path of War: Expanded → …), so
 * a page's source is the MOST-SPECIFIC product credited on it: a separate
 * product (Midgard, Lords of the Night) wins over Expanded, which wins over the
 * base book. The credit must sit near a copyright year so navigation links to
 * "Path of War" elsewhere on the page don't count (H-738: §15 is the only
 * authoritative signal). Returns the fallback when no §15 product is found.
 */
export function extractSource(html: string, fallback = "Path of War"): string {
  const text = decode(parse(html).text);
  const idx = text.search(/Section 15\s*:?\s*Copyright Notice/i);
  const scope = idx >= 0 ? text.slice(idx) : text;
  // a product name within a short span of a copyright marker/year is a §15
  // credit (so a navigation link to "Path of War" elsewhere doesn't count)
  const has = (m: string) =>
    new RegExp(`${m}[^.]{0,40}(©|copyright|20\\d\\d)`, "i").test(scope);
  // Separate products win (specific origin). Then the discriminator: the base
  // credit reads "Path of War, © 2014" (comma after War) while Expanded reads
  // "Path of War – Expanded, © 2016". d20pfsrd lists ONLY Expanded for pure
  // Expanded content but lists the base credit for base content (even when the
  // page also references Expanded), so the base credit's PRESENCE means the
  // page's book is the base one.
  if (has("Midgard Campaign Setting")) return "Midgard Campaign Setting";
  if (has("Lords of the Night")) return "Lords of the Night";
  if (has("Path of War,")) return "Path of War";
  if (has("Path of War\\s*[–—-]\\s*Expanded")) return "Path of War: Expanded";
  return fallback;
}

const STAT_LABELS =
  /^(Discipline|Prerequisites?|Prerequisite\(s\)|Initiation Action|Range|Targets?|Area|Effect|Duration|Saving Throw|Maneuver Type|Type)\s*:/i;

const TYPES: ManeuverType[] = ["Strike", "Boost", "Counter", "Stance"];

function isEl(n: Node): n is HTMLElement {
  return (n as HTMLElement).nodeType === NodeType.ELEMENT_NODE;
}

function tagOf(n: Node): string {
  return isEl(n) ? (n.rawTagName?.toLowerCase() ?? "") : "";
}

function decode(s: string): string {
  return s
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&lsquo;|&#8216;/g, "‘")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Inline markdown for a node, turning <br> into newlines (for stat lines). */
function inline(node: Node): string {
  if (!isEl(node))
    return decode((node as Node & { rawText: string }).rawText ?? "");
  const tag = node.rawTagName?.toLowerCase();
  const inner = node.childNodes.map(inline).join("");
  switch (tag) {
    case "b":
    case "strong":
      return inner.trim() ? `**${inner.trim()}**` : "";
    case "i":
    case "em":
      return inner.trim() ? `*${inner.trim()}*` : "";
    case "br":
      return "\n";
    case "a":
    case "u":
    case "span":
      return inner;
    default:
      return inner;
  }
}

/**
 * Like inline() but for STAT parsing: only <br> breaks a line. Literal source
 * newlines inside text nodes (HTML pretty-printing) are collapsed to spaces, so
 * a value split across a source newline (e.g. "1 \n<a>standard action</a>")
 * stays on one line. Bold markers are dropped — stat parsing doesn't need them.
 */
function inlineStat(node: Node): string {
  if (!isEl(node))
    return decode((node as Node & { rawText: string }).rawText ?? "").replace(
      /\s+/g,
      " ",
    );
  if (node.rawTagName?.toLowerCase() === "br") return "\n";
  return node.childNodes.map(inlineStat).join("");
}

/** Plain text of a node with <br> -> newline, entities decoded, ws tidy. */
function lines(node: Node): string[] {
  return inline(node)
    .replace(/\*\*?/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function cells(row: HTMLElement, tag: string): string[] {
  return row
    .querySelectorAll(tag)
    .map((c) => inline(c).replace(/\s+/g, " ").trim() || " ");
}

function tableToMarkdown(table: HTMLElement): string {
  const rows = table.querySelectorAll("tr");
  if (!rows.length) return "";
  const header = cells(rows[0]!, "th").length
    ? cells(rows[0]!, "th")
    : cells(rows[0]!, "td");
  const body = rows
    .slice(1)
    .map((r) => cells(r, "td"))
    .filter((r) => r.length);
  const width = header.length || (body[0]?.length ?? 0);
  if (!width) return "";
  const pad = (r: string[]) => {
    const c = r.slice(0, width);
    while (c.length < width) c.push(" ");
    return `| ${c.join(" | ")} |`;
  };
  return [
    pad(header),
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...body.map(pad),
  ].join("\n");
}

const FOOTER = /discuss!?|discord|patreon|paizo|latest pathfinder products|rss/i;

/** Convert body nodes (everything after the stat block) to markdown. */
function bodyToMarkdown(nodes: Node[]): string {
  let out = "";
  for (const n of nodes) {
    if (isEl(n)) {
      const tag = tagOf(n);
      const text = n.text.trim();
      if (!text && tag !== "table") continue;
      if (FOOTER.test(text) && text.length < 120) continue;
      if (tag === "table") {
        out += "\n\n" + tableToMarkdown(n) + "\n\n";
        continue;
      }
      if (tag === "ul" || tag === "ol") {
        const mark = tag === "ol" ? (i: number) => `${i + 1}.` : () => "-";
        out +=
          "\n\n" +
          n
            .querySelectorAll("li")
            .map((li, i) => `${mark(i)} ${inline(li).replace(/\s+/g, " ").trim()}`)
            .join("\n") +
          "\n\n";
        continue;
      }
      out += "\n\n" + inline(n).trim() + "\n\n";
      continue;
    }
    const raw = decode((n as Node & { rawText: string }).rawText ?? "").trim();
    if (raw) out += raw;
  }
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Maneuver name from an <h4>. The markup is
 * `<h4><span id="slug"><a name="TOC-…"></a>Name</span></h4>` — the empty
 * `<a name>` anchor has no text, so we take the heading's whole text, not the
 * anchor's. [edit] suffixes stripped.
 */
function headingName(h: HTMLElement): string {
  return decode(h.text)
    .replace(/\s*\[\s*edit\s*\]\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStat(rec: ManeuverRecord, line: string): void {
  let m: RegExpExecArray | null;
  if ((m = /^Discipline\s*:\s*(.+)$/i.exec(line))) {
    const rest = m[1]!;
    const typeM = /\(([^)]+)\)/.exec(rest);
    if (typeM) {
      const t = typeM[1]!.trim();
      const hit = TYPES.find((x) => x.toLowerCase() === t.toLowerCase());
      if (hit) rec.type = hit;
    }
    if (!rec.discipline) {
      rec.discipline = rest.replace(/\s*\([^)]*\)\s*/, " ").split(";")[0]!.trim();
    }
    const lvl = /Level\s*:\s*(\d+)/i.exec(rest);
    if (lvl) rec.level = Number(lvl[1]);
    return;
  }
  if ((m = /^Maneuver Type\s*:\s*(.+)$/i.exec(line)) || (m = /^Type\s*:\s*(.+)$/i.exec(line))) {
    const hit = TYPES.find((x) => x.toLowerCase() === m![1]!.trim().toLowerCase());
    if (hit) rec.type = hit;
    return;
  }
  if ((m = /^Level\s*:\s*(\d+)/i.exec(line))) {
    rec.level = Number(m[1]);
    return;
  }
  if ((m = /^Prerequisite(?:s|\(s\))?\s*:\s*(.+)$/i.exec(line))) {
    rec.prerequisites = m[1]!.trim();
    return;
  }
  if ((m = /^Initiation Action\s*:\s*(.+)$/i.exec(line))) {
    rec.action = m[1]!.trim();
    return;
  }
  if ((m = /^Range\s*:\s*(.+)$/i.exec(line))) {
    rec.range = m[1]!.trim();
    return;
  }
  if ((m = /^(?:Targets?|Area|Effect)\s*:\s*(.+)$/i.exec(line))) {
    if (!rec.target) rec.target = m[1]!.trim();
    return;
  }
  if ((m = /^Duration\s*:\s*(.+)$/i.exec(line))) {
    rec.duration = m[1]!.trim();
    return;
  }
  if ((m = /^Saving Throw\s*:\s*(.+)$/i.exec(line))) {
    rec.save = m[1]!.trim();
  }
}

/**
 * Turn a maneuver block (the stat <p> + DESCRIPTION divider + prose siblings)
 * into a record. Returns null when the block carries no Discipline stat line
 * (i.e. it isn't actually a maneuver — an intro/footer heading). Shared by both
 * the inline (h4-section) and detail-page paths, which differ only in how the
 * block is located.
 */
function buildRecord(
  name: string,
  block: Node[],
  discipline: string,
  source: string,
): ManeuverRecord | null {
  const rec: ManeuverRecord = {
    name,
    discipline,
    level: 0,
    type: "Strike",
    action: "",
    range: "",
    target: "",
    duration: "",
    save: "",
    prerequisites: "",
    markdown: "",
    source,
  };

  // The body begins at the DESCRIPTION divider or the first prose paragraph —
  // i.e. the first <p> whose lead line isn't a stat label. Everything before it
  // is stat text, which may be a single <p>, OR (malformed pages) a stat <p>
  // followed by NAKED <b>/<br> runs after the <p> closed early. So we collect
  // stat text from every node before the boundary, not just <p> elements.
  let boundary = block.length;
  for (let k = 0; k < block.length; k++) {
    const bn = block[k]!;
    if (!isEl(bn) || tagOf(bn) !== "p") continue;
    const ls = lines(bn);
    if (!ls.length) continue;
    if (STAT_LABELS.test(ls[0]!)) continue; // still a stat paragraph
    boundary = k; // DESCRIPTION divider or prose — body starts here
    break;
  }

  // Join inline() of every pre-boundary node into one string before splitting
  // into lines: on malformed pages a single field like "Initiation Action: 1
  // standard action" is fragmented across <b>, a bare text node, and <a>
  // siblings, so per-node parsing loses the value. Concatenation reassembles it.
  // A <p> is a hard line boundary (wrap its content in newlines); naked sibling
  // runs (<b>/text/<a>) concatenate so a fragmented field reassembles. Without
  // the <p> wrap, a closing </p> with no <br> merges its last field into the
  // next naked field on malformed pages.
  const statText = block
    .slice(0, boundary)
    .map((n) =>
      isEl(n) && tagOf(n) === "p" ? `\n${inlineStat(n)}\n` : inlineStat(n),
    )
    .join("");
  let sawDiscipline = false;
  for (const raw of statText.split("\n")) {
    const l = raw.replace(/\s+/g, " ").trim();
    if (!l || !STAT_LABELS.test(l)) continue;
    if (/^Discipline\s*:/i.test(l)) sawDiscipline = true;
    parseStat(rec, l);
  }
  if (!sawDiscipline) return null;

  // body = nodes from the boundary on, minus a leading DESCRIPTION divider
  const bodyNodes = block.slice(boundary).filter((bn) => {
    if (!isEl(bn) || tagOf(bn) !== "p") return true;
    const ls = lines(bn);
    return !(ls.length === 1 && /^DESCRIPTION$/i.test(ls[0]!));
  });
  rec.discipline = discipline; // trust the page, not a possibly-typoed line
  rec.markdown = bodyToMarkdown(bodyNodes);
  return rec;
}

/** Following siblings of a node within its parent, up to the next heading. */
function blockAfter(node: HTMLElement, include = false): Node[] {
  const parent = node.parentNode;
  if (!parent) return [];
  const sibs = parent.childNodes;
  const idx = sibs.indexOf(node);
  if (idx < 0) return [];
  const block: Node[] = include ? [node] : [];
  for (let j = idx + 1; j < sibs.length; j++) {
    const t = tagOf(sibs[j]!);
    if (t === "h2" || t === "h3" || t === "h4") break;
    block.push(sibs[j]!);
  }
  return block;
}

/**
 * Parse a discipline INDEX page that inlines its maneuvers as <h4> anchor
 * sections (11 of the 12 core disciplines). Returns [] for "link-only"
 * disciplines (e.g. Black Seraph) — the runner then falls back to detail pages.
 */
export function extractManeuvers(
  html: string,
  discipline: string,
  sourceFallback = "Path of War",
): ManeuverRecord[] {
  const root = parse(html);
  // §15 is per-page: one source for the index. Falls back to the discipline's
  // manual override (or "Path of War") when the page has no §15 footer.
  const source = extractSource(html, sourceFallback);
  const out: ManeuverRecord[] = [];
  for (const h of root.querySelectorAll("h4")) {
    if (/widget/i.test(h.getAttribute("class") ?? "")) continue;
    const name = headingName(h);
    if (!name) continue;
    const rec = buildRecord(name, blockAfter(h), discipline, source);
    if (rec) out.push(rec);
  }
  return out;
}

/**
 * Per-maneuver detail-page links on a link-only discipline index page. The
 * page's own links drop the `/3rd-party-rules-systems/` path segment and 404 on
 * a direct fetch; only the canonical path with that segment resolves, so we
 * normalise every harvested href back to it.
 */
export function maneuverDetailLinks(html: string, slug: string): string[] {
  const root = parse(html);
  const re = new RegExp(`/${slug}-maneuvers/[a-z0-9][a-z0-9-]*/?$`, "i");
  const canonical = (h: string) =>
    h.includes("/3rd-party-rules-systems/")
      ? h
      : h.replace(
          "/alternative-rule-systems/path-of-war/",
          "/alternative-rule-systems/3rd-party-rules-systems/path-of-war/",
        );
  const seen = new Set<string>();
  for (const a of root.querySelectorAll("a")) {
    const href = (a.getAttribute("href") ?? "").trim();
    if (re.test(href)) seen.add(canonical(href));
  }
  return [...seen];
}

/** Parse a single-maneuver DETAIL page (name in <h1>, same stat-block <p>). */
export function extractManeuverDetail(
  html: string,
  discipline: string,
  sourceFallback = "Path of War",
): ManeuverRecord | null {
  const root = parse(html);
  const h1 = root.querySelector("h1");
  const name = h1 ? headingName(h1) : "";
  if (!name) return null;
  const statP = root
    .querySelectorAll("p")
    .find((p) => {
      const ls = lines(p);
      return !!ls.length && /^Discipline\s*:/i.test(ls[0]!) && ls[0]!.includes("(");
    });
  if (!statP) return null;
  // detail pages carry their OWN §15 — this is how the 3 Black Seraph maneuvers
  // credited to Midgard get the right source even though the discipline is base.
  return buildRecord(
    name,
    blockAfter(statP, true),
    discipline,
    extractSource(html, sourceFallback),
  );
}
