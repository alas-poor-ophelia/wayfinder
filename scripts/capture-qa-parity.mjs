// One-time capture: runs computeAll at the PRE-quick-action-conversion HEAD
// across the parity matrix and freezes the outputs. Run BEFORE flipping
// computeAll off character.toggles; the parity suite then proves the
// conversion byte-for-byte against this file.
//   bun scripts/capture-qa-parity.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeAll } from "../src/calc/index.ts";
import { buildMatrix, snapshot } from "../tests/unit/fixtures/qa-parity-matrix.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const out = {};
for (const { name, record } of buildMatrix()) {
  out[name] = snapshot(computeAll(record));
}

const file = path.join(root, "tests", "unit", "fixtures", "quick-action-parity.json");
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(`captured ${Object.keys(out).length} cases -> ${file}`);
