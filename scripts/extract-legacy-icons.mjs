// One-time extractor: pulls the 10 toggle icon SVGs out of scss/_toggles.scss
// data-URIs into assets/icons/legacy/*.svg so the icon registry can be
// generated from real files. Safe to re-run; outputs are committed.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scss = readFileSync(path.join(root, "scss", "_toggles.scss"), "utf8");

// selector (as it appears in the scss) -> output file stem
const MAP = [
  ["ms-toggle--power-attack", "power-attack"],
  ["ms-toggle--fighting-defensively", "fighting-defensively"],
  ["ms-toggle--charge", "charge"],
  ["ms-toggle--flank", "flank"],
  ["ms-toggle--flurry", "flurry"],
  ["ms-toggle--weapon-song", "weapon-song"],
  ["ms-toggle--precise-strike.is-double", "precise-strike-double"],
  ["ms-toggle--precise-strike", "precise-strike"],
  ["ms-toggle--smite.is-double", "smite-double"],
  ["ms-toggle--smite", "smite"],
];

const taken = new Set();
let count = 0;
for (const [selector, stem] of MAP) {
  const re = new RegExp(
    `\\.${selector.replace(/[.\-]/g, "\\$&")}::before\\s*\\{[^}]*?url\\('data:image/svg\\+xml;utf8,(<svg.*?</svg>)'\\)`,
    "s"
  );
  const m = scss.match(re);
  if (!m) {
    console.error(`MISSING: ${selector}`);
    process.exitCode = 1;
    continue;
  }
  if (taken.has(m.index)) {
    console.error(`DUPLICATE MATCH for ${selector} (ordering bug in MAP)`);
    process.exitCode = 1;
    continue;
  }
  taken.add(m.index);
  const svg = m[1];
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 512 512";
  // keep only visible paths (the flank icon carries a fill="none" backdrop rect)
  const paths = [...svg.matchAll(/<path ([^>]*?)><\/path>|<path ([^>]*?)\/>/g)]
    .map((p) => p[1] ?? p[2])
    .filter((attrs) => !/fill="none"/.test(attrs))
    .map((attrs) => attrs.match(/d="([^"]+)"/)?.[1])
    .filter(Boolean);
  if (paths.length !== 1) {
    console.error(`EXPECTED 1 visible path for ${selector}, got ${paths.length}`);
    process.exitCode = 1;
    continue;
  }
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${paths[0]}"/></svg>\n`;
  writeFileSync(path.join(root, "assets", "icons", "legacy", `${stem}.svg`), out);
  count++;
}
console.log(`extracted ${count}/${MAP.length} legacy icons`);
