/**
 * Shared helpers for the aonprd scraper: HTML text cleanup and the
 * number-format parsers for AoN's printed stat strings.
 */

/** Decode the handful of entities AoN actually emits, strip tags, collapse ws. */
export function cleanCell(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDash(s: string): boolean {
  return s === "" || s === "—" || s === "-";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "2 gp", "1,000 gp", "5 sp", "1 gp (5)", "—" → gp (fractional for sp/cp). */
export function parseCostGp(s: string): number {
  const m = /([\d,]+(?:\.\d+)?)\s*(gp|sp|cp)/i.exec(s);
  if (!m) return 0;
  const value = Number(m[1].replace(/,/g, ""));
  const unit = m[2].toLowerCase();
  return value * (unit === "gp" ? 1 : unit === "sp" ? 0.1 : 0.01);
}

/** "4 lbs.", "1 lb.", "1/2 lb.", "1-1/2 lbs.", "—" → pounds. */
export function parseWeightLbs(s: string): number {
  if (isDash(s)) return 0;
  const mixed = /(\d+)-(\d+)\/(\d+)/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /(\d+)\/(\d+)/.exec(s);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const plain = /([\d.]+)/.exec(s);
  return plain ? Number(plain[1]) : 0;
}

/** "10 ft.", "—" → feet or null. */
export function parseRangeFt(s: string): number | null {
  const m = /(\d+)\s*ft/.exec(s);
  return m ? Number(m[1]) : null;
}

/** "19-20/x2", "x3", "—" → { critRange, critMult } ("" when no crit). */
export function parseCrit(s: string): { critRange: string; critMult: string } {
  if (isDash(s)) return { critRange: "", critMult: "" };
  const mult = /x\s*(\d+)/i.exec(s);
  const range = /(\d+\s*-\s*\d+)/.exec(s);
  return {
    critRange: range ? range[1].replace(/\s/g, "") : mult ? "20" : "",
    critMult: mult ? mult[1] : "",
  };
}

/** "+6" → 6, "-1" → -1, "0" → 0, "—" → null. */
export function parseSignedInt(s: string): number | null {
  if (isDash(s)) return null;
  const m = /([+-]?\d+)/.exec(s);
  return m ? Number(m[1]) : null;
}

/**
 * The rendered item block on AoN display pages
 * (<span id="MainContent_DataListTypes_LabelName_0">...</span>).
 */
export function detailBlock(html: string): string {
  const i = html.indexOf("MainContent_DataListTypes_LabelName_0");
  if (i < 0) return "";
  const end = html.indexOf("</span>", i);
  return end < 0 ? html.slice(i) : html.slice(i, end);
}

/** First source book from a detail block, page reference stripped. */
export function parseSource(block: string): string {
  const m = /<b>Source<\/b>.*?<i>([^<]+)<\/i>/s.exec(block);
  if (!m) return "";
  return m[1].replace(/\s+pg\.\s*\d+.*$/, "").trim();
}

/** A "<b>Label</b> value" field from a detail block (value up to ; or <). */
export function parseDetailField(block: string, label: string): string {
  const m = new RegExp(`<b>${label}</b>\\s*([^;<]+)`).exec(block);
  return m ? cleanCell(m[1]) : "";
}
