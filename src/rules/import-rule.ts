import { TFile, normalizePath, requestUrl } from "obsidian";
import type MiniSheetPlugin from "../main";
import { extractNote } from "./scrape";

export interface ImportResult {
  ok: boolean;
  path?: string;
  title?: string;
  category?: string;
  created?: boolean;
  /** the note already exists and overwrite wasn't requested */
  exists?: boolean;
  error?: string;
}

// chars Obsidian/OSes reject in a note basename
const ILLEGAL = /[\\/:*?"<>|#^[\]]/g;

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Accept a full URL, or a bare rule name we turn into an AoN lookup. */
function buildUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://www.aonprd.com/Rules.aspx?Name=${encodeURIComponent(t)}`;
}

/**
 * Fetch a single AoN rule page (via Obsidian's mobile-safe requestUrl), convert
 * it to a typed note with the shared scrape seam, write it to the rules folder,
 * and link it to the active character. The in-Obsidian counterpart to the CLI
 * scraper — no Node APIs, so it works on iPad.
 */
export async function importRuleFromUrl(
  plugin: MiniSheetPlugin,
  input: string,
  opts: { category?: string; overwrite?: boolean } = {},
): Promise<ImportResult> {
  const url = buildUrl(input);
  if (!url) return { ok: false, error: "Enter an AoN rule URL or name." };

  let html: string;
  try {
    const res = await requestUrl({ url });
    if (res.status >= 400)
      return { ok: false, error: `Fetch failed (HTTP ${res.status}).` };
    html = res.text;
  } catch (e) {
    return {
      ok: false,
      error: `Network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const note = extractNote(html);
  if (!note || !note.markdown.trim()) {
    // AoN serves the parent book's table-of-contents (not a 404) when a name
    // isn't a standalone rule page — extractNote yields no body (see H-622).
    return {
      ok: false,
      error:
        "No rule content found at that URL. AoN shows a table-of-contents page when a name isn't a standalone rule — open the specific rule and copy its URL.",
    };
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty category should fall through to the next source
  const category = (opts.category || note.category || "Reference").trim();
  const fm = [
    "---",
    `category: ${yamlString(category)}`,
    note.source ? `source: ${yamlString(note.source)}` : null,
    `summary: ${yamlString(note.summary)}`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  const content = `${fm}\n# ${note.title}\n\n${note.markdown}\n`;

  const folder = plugin.rulesIndex.folder();
  const safeTitle = note.title.replace(ILLEGAL, "").trim() || "Rule";
  const path = normalizePath(`${folder}/${safeTitle}.md`);

  const vault = plugin.app.vault;
  const existing = vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    if (!opts.overwrite)
      return { ok: false, exists: true, path, title: note.title, category };
    await vault.modify(existing, content);
  } else {
    if (folder && !vault.getAbstractFileByPath(folder)) {
      try {
        await vault.createFolder(folder);
      } catch {
        /* folder may already exist from a race */
      }
    }
    await vault.create(path, content);
  }

  // link to the active character so it shows in browse mode (not behind All vault)
  const ch = plugin.store.getCharacter();
  if (ch) {
    const links = ch.ruleLinks ?? [];
    if (!links.some((l) => l.path === path)) {
      plugin.store.updateCharacter(ch.id, {
        ruleLinks: [...links, { path, category }],
      });
    }
  }

  return {
    ok: true,
    path,
    title: note.title,
    category,
    created: !(existing instanceof TFile),
  };
}
